// supabase/functions/create-user/index.ts
// ══════════════════════════════════════════════════════════════════════
// Crea un usuario sin desloguear al admin
// v7 (oct 2026):
//   · FIX 401: la llamada a send-email ya no envía el header "apikey"
//     (con él el gateway respondía 401). Igual que sst-alerts: solo Authorization.
//   · Revisa la respuesta de send-email. Si falla, responde email_sent=false y
//     devuelve temp_password para que el admin se la entregue al usuario.
//   · Acepta process_id / process_name (lo que envía GestionUsuarios.jsx)
//     además de department_id / department_name.
// ══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Genera contraseña tipo: Garana7394#
function generateTempPassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const sym = ["#", "@", "!", "*"][Math.floor(Math.random() * 4)];
  return `Garana${num}${sym}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // ── DELETE: eliminar usuario de auth.users ────────────────────────
  // v8: solo admin. (La app ya no lo usa: hard_delete_user borra auth.users.)
  if (req.method === "DELETE") {
    try {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const sbAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: { user: caller } } = await sbAdmin.auth.getUser(token);
      const { data: callerProf } = caller
        ? await sbAdmin.from("profile").select("role").eq("id", caller.id).single()
        : { data: null };
      if (callerProf?.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Solo un administrador puede eliminar usuarios" }),
          { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
      const { userId } = await req.json();
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Falta userId" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  }

  try {
    // ── Verificar que quien llama es admin o gerencia ─────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Verificar el JWT con Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Verificar rol desde profile
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: callerProfile } = await supabaseAdmin
      .from("profile")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (!callerProfile || !["admin", "gerencia"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: "Solo admin o gerencia pueden crear usuarios" }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    const {
      email,
      full_name,
      role,
      department_id,
      department_name,
      process_name,
      phone,
      created_by_name,
    } = await req.json();

    // Validar campos obligatorios
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: email, full_name, role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Generar contraseña temporal
    const tempPassword = generateTempPassword();

    // 1️⃣ Crear usuario en auth.users
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password:      tempPassword,
      email_confirm: true,
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const newUserId = authData.user.id;

    // 2️⃣ Insertar perfil
    await supabaseAdmin.from("profile").upsert({
      id:                   newUserId,
      email,
      full_name,
      role,
      department_id:        department_id || null,
      phone:                phone || null,
      username:             email.split("@")[0],
      is_active:            true,
      must_change_password: true,
    }, { onConflict: "id" });

    // 3️⃣ Enviar email de bienvenida via send-email (sin header apikey → evita 401)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    let emailSent  = false;
    let emailError = "";
    try {
      const mailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          type: "user_bienvenida",
          to:   email,
          data: {
            full_name,
            email,
            temp_password:   tempPassword,
            role,
            department:      process_name || department_name || null,
            created_by_name: created_by_name || "Administrador",
          },
        }),
      });
      emailSent = mailRes.ok;
      if (!mailRes.ok) emailError = `send-email ${mailRes.status}: ${(await mailRes.text()).slice(0, 200)}`;
    } catch (e: any) {
      emailError = e?.message || "Error de red al llamar send-email";
    }
    if (!emailSent) console.error("❌ Email de bienvenida no enviado:", emailError);

    return new Response(
      JSON.stringify({
        success:    true,
        userId:     newUserId,
        email_sent: emailSent,
        // Solo si el correo NO salió: el admin/gerente que creó el usuario
        // necesita la contraseña temporal para entregársela personalmente.
        ...(emailSent ? {} : { temp_password: tempPassword, email_error: emailError }),
        message: emailSent
          ? `Usuario ${full_name} creado. Se envió email de bienvenida a ${email}.`
          : `Usuario ${full_name} creado, pero el email de bienvenida NO se pudo enviar.`,
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Error interno", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});