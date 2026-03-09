// supabase/functions/create-user/index.ts
// ══════════════════════════════════════════════════════════════════════
// Crea un usuario sin desloguear al admin
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
  if (req.method === "DELETE") {
    try {
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

    // 3️⃣ Enviar email de bienvenida via send-email
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "apikey":        Deno.env.get("SUPABASE_ANON_KEY")!,
      },
      body: JSON.stringify({
        type: "user_bienvenida",
        to:   email,
        data: {
          full_name,
          email,
          temp_password:   tempPassword,
          role,
          department:      department_name || null,
          created_by_name: created_by_name || "Administrador",
        },
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId:  newUserId,
        message: `Usuario ${full_name} creado. Se envió email de bienvenida a ${email}.`,
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