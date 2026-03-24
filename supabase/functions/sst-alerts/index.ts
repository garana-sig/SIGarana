// supabase/functions/sst-alerts/index.ts
// ═══════════════════════════════════════════════════════════════════════
// Edge Function — Alertas automáticas de Planes de Trabajo SST
// Disparada por pg_cron diariamente a las 7am Colombia
//
// Lógica:
//  1. Recordatorio: 5 días antes de fin de mes si hay actividades no ejecutadas
//  2. Vencida: mes ya pasó, actividad no ejecutada → email al responsable
//
// Llama a send-document-notification con tipos:
//   "sst_recordatorio_actividad" | "sst_actividad_vencida"
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_URL   = `${SUPABASE_URL}/functions/v1/send-email`;

const MONTH_KEYS = [
  "month_jan","month_feb","month_mar","month_apr","month_may","month_jun",
  "month_jul","month_aug","month_sep","month_oct","month_nov","month_dec",
];
const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const PLAN_LABELS: Record<string, string> = {
  convivencia:          "Comité de Convivencia",
  copasst:              "COPASST",
  bienestar:            "Bienestar Social",
  sst:                  "SST",
  promocion_prevencion: "Promoción y Prevención",
  gerencia:             "Plan de Gerencia",
};

// Días que quedan hasta fin del mes actual
function daysUntilEndOfMonth(now: Date): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diff = lastDay.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Envía email vía send-document-notification
async function sendAlert(type: string, to: string | string[], data: Record<string, any>) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  await fetch(NOTIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ type, to, data }),
  });
}

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const now      = new Date();
    const monthIdx = now.getMonth();         // 0-11
    const monthKey = MONTH_KEYS[monthIdx];
    const daysLeft = daysUntilEndOfMonth(now);
    const isReminderWindow = daysLeft <= 5;  // últimos 5 días del mes

    console.log(`🗓 Corriendo alertas SST — ${now.toISOString()}`);
    console.log(`   Mes actual: ${MONTH_NAMES[monthIdx]} | Días hasta fin: ${daysLeft}`);

    let reminders = 0;
    let overdues  = 0;

    // ── A. Recordatorios: mes actual, no ejecutadas, últimos 5 días ───
    if (isReminderWindow) {
      const { data: items } = await supabase
        .from("work_plan_item")
        .select(`
          id, activity, responsible,
          plan_id, is_executed, responsible_user_ids,
          ${monthKey},
          work_plan!inner(year, plan_type),
          profile:responsible_user_id(id, email, full_name)
        `)
        .eq(`${monthKey}`, null)               // que tenga valor
        .not(monthKey, "is", null)
        .eq("is_executed", false)
        .eq("work_plan.year", now.getFullYear());

      // Re-filtrar: que tengan valor en el mes actual
      const pending = (items || []).filter((it: any) => it[monthKey]?.trim());

      for (const item of pending) {
        // Verificar que no se haya enviado ya este mes
        const { data: logged } = await supabase
          .from("work_plan_alert_log")
          .select("id")
          .eq("item_id", item.id)
          .eq("alert_type", "reminder")
          .eq("month_key", monthKey)
          .maybeSingle();

        if (logged) continue;

        // Destinatario: responsable del ítem (usuario o email de gerencia)
        const plan  = (item as any).work_plan;
        const prof  = (item as any).profile;

        // Para gerencia → buscar emails de todos los gerentes
        let to: string[] = [];
        if (plan.plan_type === "gerencia") {
          const { data: gerentes } = await supabase
            .from("profile")
            .select("email")
            .eq("role", "gerencia")
            .eq("is_active", true);
          to = (gerentes || []).map((g: any) => g.email).filter(Boolean);
        } else {
          // Usar el array completo si existe, si no el campo singular
          const userIds: string[] = item.responsible_user_ids?.length > 0
            ? item.responsible_user_ids
            : prof?.id ? [prof.id] : [];
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profile")
              .select("email")
              .in("id", userIds);
            to = (profiles || []).map((p: any) => p.email).filter(Boolean);
          }
        }

        if (to.length === 0) continue;

        await sendAlert("sst_recordatorio_actividad", to, {
          plan_label:  PLAN_LABELS[plan.plan_type] || plan.plan_type,
          plan_year:   plan.year,
          activity:    item.activity,
          month_name:  MONTH_NAMES[monthIdx],
          days_left:   daysLeft,
          responsible: prof?.full_name || item.responsible || "—",
        });

        // Registrar en log para no duplicar
        await supabase.from("work_plan_alert_log").insert({
          item_id:    item.id,
          alert_type: "reminder",
          month_key:  monthKey,
        });

        reminders++;
      }
    }

    // ── B. Vencidas: meses anteriores, no ejecutadas ──────────────────
    for (let m = 0; m < monthIdx; m++) {
      const pastKey  = MONTH_KEYS[m];

      const { data: items } = await supabase
        .from("work_plan_item")
        .select(`
          id, activity, responsible,
          plan_id, is_executed, responsible_user_ids,
          ${pastKey},
          work_plan!inner(year, plan_type),
          profile:responsible_user_id(id, email, full_name)
        `)
        .not(pastKey, "is", null)
        .eq("is_executed", false)
        .eq("work_plan.year", now.getFullYear());

      const overdue = (items || []).filter((it: any) => it[pastKey]?.trim());

      for (const item of overdue) {
        // Solo notificar una vez
        const { data: logged } = await supabase
          .from("work_plan_alert_log")
          .select("id")
          .eq("item_id", item.id)
          .eq("alert_type", "overdue")
          .eq("month_key", pastKey)
          .maybeSingle();

        if (logged) continue;

        const plan = (item as any).work_plan;
        const prof = (item as any).profile;

        // Vencida → todos los responsables del array
        let to: string[] = [];
        const userIds: string[] = item.responsible_user_ids?.length > 0
          ? item.responsible_user_ids
          : prof?.id ? [prof.id] : [];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profile")
            .select("email")
            .in("id", userIds);
          to = (profiles || []).map((p: any) => p.email).filter(Boolean);
        }

        if (to.length === 0) continue;

        await sendAlert("sst_actividad_vencida", to, {
          plan_label:  PLAN_LABELS[plan.plan_type] || plan.plan_type,
          plan_year:   plan.year,
          activity:    item.activity,
          month_name:  MONTH_NAMES[m],
          responsible: prof?.full_name || item.responsible || "—",
        });

        await supabase.from("work_plan_alert_log").insert({
          item_id:    item.id,
          alert_type: "overdue",
          month_key:  pastKey,
        });

        overdues++;
      }
    }

    console.log(`✅ Alertas enviadas — Recordatorios: ${reminders} | Vencidas: ${overdues}`);
    return new Response(
      JSON.stringify({ success: true, reminders, overdues }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("❌ Error en sst-alerts:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});