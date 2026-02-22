// supabase/functions/indicadores-cron/index.ts
// ══════════════════════════════════════════════════════════════════════
// Cron job diario: Revisa indicadores y envía recordatorios
//
// Se ejecuta todos los días a las 7:00 AM (Colombia UTC-5)
// Configurar en Supabase → Edge Functions → Schedules:
//   Cron: 0 12 * * *   (12:00 UTC = 7:00 AM Colombia)
//
// Envía:
//  1. Alerta de vencimiento — indicadores que vencen en los próximos 7 días
//  2. Recordatorio de nuevo período — según frecuencia del indicador
// ══════════════════════════════════════════════════════════════════════

import { serve }       from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEND_EMAIL_URL    = `${SUPABASE_URL}/functions/v1/send-document-notification`;
const ANON_KEY          = Deno.env.get("SUPABASE_ANON_KEY")!;

// ── Frecuencias → días del período ────────────────────────────────────
const FREQUENCY_DAYS: Record<string, number> = {
  diaria:     1,
  semanal:    7,
  mensual:    30,
  trimestral: 90,
  semestral:  180,
  anual:      365,
};

// ── Frecuencias → label del nuevo período ─────────────────────────────
const getPeriodLabel = (frequency: string): string => {
  const now   = new Date();
  const month = now.toLocaleString("es-CO", { month: "long", year: "numeric" });
  const q     = Math.ceil((now.getMonth() + 1) / 3);
  const sem   = now.getMonth() < 6 ? 1 : 2;

  const map: Record<string, string> = {
    diaria:     now.toLocaleDateString("es-CO"),
    semanal:    `Semana ${Math.ceil(now.getDate() / 7)} — ${month}`,
    mensual:    month,
    trimestral: `Q${q} ${now.getFullYear()}`,
    semestral:  `Semestre ${sem} ${now.getFullYear()}`,
    anual:      `${now.getFullYear()}`,
  };
  return map[frequency] || month;
};

// ── ¿Es inicio de período hoy? ─────────────────────────────────────────
// Devuelve true si hoy corresponde enviar el recordatorio periódico
const isStartOfPeriod = (frequency: string): boolean => {
  const now = new Date();
  const d   = now.getDate();
  const m   = now.getMonth() + 1; // 1-12

  switch (frequency) {
    case "diaria":
      return true; // Todos los días
    case "semanal":
      return now.getDay() === 1; // Lunes
    case "mensual":
      return d === 1; // Día 1 de cada mes
    case "trimestral":
      return d === 1 && [1, 4, 7, 10].includes(m); // 1 ene, 1 abr, 1 jul, 1 oct
    case "semestral":
      return d === 1 && [1, 7].includes(m); // 1 ene, 1 jul
    case "anual":
      return d === 1 && m === 1; // 1 de enero
    default:
      return false;
  }
};

// ── Enviar email ──────────────────────────────────────────────────────
const sendEmail = async (type: string, to: string | string[], data: Record<string, any>) => {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  try {
    await fetch(SEND_EMAIL_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey":        ANON_KEY,
      },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (err) {
    console.warn(`⚠️ Email no enviado a ${to}:`, err);
  }
};

serve(async () => {
  console.log("🕐 Cron indicadores iniciado:", new Date().toISOString());

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // ── Traer todos los indicadores activos con responsable ──────────────
  const { data: indicators, error } = await supabase
    .from("indicator")
    .select(`
      id, consecutive, indicator_name, goal, frequency,
      measurement_start_date, measurement_end_date,
      formula_expression, formula_variables,
      responsible_id, objective
    `)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    console.error("❌ Error cargando indicadores:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!indicators || indicators.length === 0) {
    console.log("ℹ️ Sin indicadores activos");
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  // ── Traer emails de gerencia ─────────────────────────────────────────
  const { data: managers } = await supabase
    .from("profile")
    .select("email")
    .eq("role", "gerencia")
    .eq("is_active", true);
  const managerEmails = (managers || []).map((m: any) => m.email).filter(Boolean);

  // ── Traer perfiles de responsables ───────────────────────────────────
  const respIds = [...new Set(indicators.map((i: any) => i.responsible_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("profile")
    .select("id, email, full_name")
    .in("id", respIds);
  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  let vencimientoCount  = 0;
  let recordatorioCount = 0;

  for (const ind of indicators as any[]) {
    const resp       = profileMap[ind.responsible_id];
    const respEmail  = resp?.email;
    const respName   = resp?.full_name || "Responsable";
    const endDate    = ind.measurement_end_date ? new Date(ind.measurement_end_date) : null;

    const emailData = {
      consecutive:       ind.consecutive,
      indicator_name:    ind.indicator_name,
      goal:              ind.goal,
      frequency:         ind.frequency,
      formula_expression: ind.formula_expression || null,
      formula_variables:  ind.formula_variables  || [],
      objective:         ind.objective,
    };

    // ── 1. ALERTA DE VENCIMIENTO (faltan ≤ 7 días) ──────────────────
    if (endDate) {
      const msLeft    = endDate.getTime() - today.getTime();
      const daysLeft  = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0 && daysLeft <= 7) {
        const vencData = {
          ...emailData,
          end_date:       endDate.toLocaleDateString("es-CO"),
          days_remaining: daysLeft,
          last_period_label: null, // se podría enriquecer si se necesita
        };

        const recipients = [respEmail, ...managerEmails].filter(Boolean);

        await sendEmail("indicador_vencimiento", recipients, {
          ...vencData,
          recipient_name: respName,
        });

        vencimientoCount++;
        console.log(`⏰ Vencimiento enviado: ${ind.consecutive} — ${daysLeft} días`);
      }
    }

    // ── 2. RECORDATORIO DE NUEVO PERÍODO ────────────────────────────
    if (isStartOfPeriod(ind.frequency) && respEmail) {
      const recData = {
        ...emailData,
        new_period:     getPeriodLabel(ind.frequency),
        recipient_name: respName,
      };

      await sendEmail("indicador_recordatorio", respEmail, recData);
      recordatorioCount++;
      console.log(`🔄 Recordatorio enviado: ${ind.consecutive} — ${ind.frequency}`);
    }
  }

  console.log(`✅ Cron completado. Vencimientos: ${vencimientoCount}, Recordatorios: ${recordatorioCount}`);

  return new Response(
    JSON.stringify({
      ok:              true,
      processed:       indicators.length,
      vencimientos:    vencimientoCount,
      recordatorios:   recordatorioCount,
      timestamp:       todayStr,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});