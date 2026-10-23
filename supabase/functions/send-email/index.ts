// supabase/functions/send-email/index.ts
// ══════════════════════════════════════════════════════════════════════
// Edge Function unificada: Documentos + Acciones de Mejora + Informes
// Usa nodemailer + Gmail. Logo corporativo desde Supabase Storage.
// v52 (oct 2026): se restauran/agregan los tipos que la app ya enviaba y
//   no existían (respondían 400 "Tipo de email no reconocido"):
//   user_bienvenida · accion_mejora_m1/_m2/_m3_verificacion ·
//   sst_asignacion_actividad · sst_recordatorio_actividad · sst_actividad_vencida ·
//   indicador_creacion · indicador_edicion · indicador_critico
//   Deploy SIEMPRE con verify_jwt = false.
// ══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
  ...CORS_HEADERS,
};

const LOGO_URL =
  "https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/garana1.png";

const APP_URL = "https://garana-sig.vercel.app";

// ── Tipos ─────────────────────────────────────────────────────────────
interface EmailRequest {
  type:
    | "pending"
    | "approved"
    | "rejected"
    | "accion_mejora_creacion"
    | "accion_mejora_cierre_definitivo"
    | "accion_mejora_seguimiento_pendiente"
    // ── Actas de Reunión ──────────────────────────────────────────────
    | "acta_compromiso_asignacion"
    | "evaluacion_retroalimentacion"
    // ── Informes de Gestión ──────────────────────────────────────────
    | "informe_enviado"
    | "informe_revisado_ok"
    | "informe_revision_solicitada"
    // ── Usuarios ─────────────────────────────────────────────────────
    | "user_bienvenida"
    // ── Acciones de Mejora por momentos ─────────────────────────────
    | "accion_mejora_m1"
    | "accion_mejora_m2"
    | "accion_mejora_m3_verificacion"
    // ── SST y Bienestar ──────────────────────────────────────────────
    | "sst_asignacion_actividad"
    | "sst_recordatorio_actividad"
    | "sst_actividad_vencida"
    // ── Indicadores ──────────────────────────────────────────────────
    | "indicador_creacion"
    | "indicador_edicion"
    | "indicador_critico";
  to: string | string[];
  document?: {
    id: string;
    name: string;
    code: string;
    version: number;
    created_by_name: string;
  };
  rejection_reason?: string;
  data?: {
    // Acciones de mejora
    consecutive?: string;
    finding?: string;
    responsible_name?: string;
    closure_reason?: string;
    reviewed_by?: string;
    proposed_date?: string;
    closure_type?: string;
    created_by_name?: string;
    // Actas de reunión — compromisos
    activity?: string;
    due_date?: string;
    meeting_date?: string;
    objective?: string;
    // Evaluación de Competencias
    empleado_nombre?: string;
    empleado_cargo?: string;
    empleado_depto?: string;
    periodo?: string;
    puntaje?: number;
    nivel?: string;
    evaluador_nombre?: string;
    fecha?: string;
    notas?: string;
    resumen_categorias?: { categoria: string; promedio: number; total: number }[];
    tabla_completa?: {
      categoria: string;
      preguntas: { texto: string; respuesta: number }[];
    }[];
    // Informes de gestión
    title?: string;
    process_name?: string;
    period?: string;
    created_by?: string;
    reviewer_name?: string;
    review_notes?: string;
    // Campos de los tipos v52 (bienvenida, M1-M3, SST, indicadores)
    [key: string]: any;
  };
}

// ══════════════════════════════════════════════════════════════════════
// TEMPLATE BASE
// ══════════════════════════════════════════════════════════════════════
const getBaseTemplate = (title: string, content: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #6dbd96 0%, #2e5244 100%); padding: 24px 20px; text-align: center; }
    .header img { max-height: 70px; max-width: 220px; object-fit: contain; display: block; margin: 0 auto; }
    .header-sub { color: #dedecc; font-size: 13px; margin-top: 10px; letter-spacing: 2px; }
    .content { padding: 36px 30px; }
    .title { font-size: 22px; color: #2e5244; margin-bottom: 16px; font-weight: 700; }
    .message { font-size: 15px; color: #444; line-height: 1.65; margin-bottom: 24px; }
    .info-box { background-color: #f8f9fa; border-left: 4px solid #6dbd96; padding: 18px 20px; margin: 20px 0; border-radius: 4px; }
    .info-row { display: flex; margin-bottom: 10px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-weight: 700; color: #2e5244; min-width: 140px; }
    .info-value { color: #333; }
    .reason-box { background-color: #f0f7f4; border-left: 4px solid #2e5244; padding: 16px 20px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #333; line-height: 1.6; }
    .reason-box-warn { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #333; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6dbd96 0%, #2e5244 100%); color: white !important; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; margin-top: 10px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-green  { background: #dcfce7; color: #166534; }
    .badge-amber  { background: #fef3c7; color: #92400e; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .alert-danger { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 16px 0; border-radius: 4px; color: #7f1d1d; font-size: 14px; }
    .footer { background-color: #2e5244; color: white; padding: 28px 20px; text-align: center; }
    .footer-title { font-size: 16px; margin-bottom: 8px; color: #6dbd96; font-weight: 700; }
    .footer-text  { font-size: 13px; color: #dedecc; margin: 4px 0; }
    .footer-note  { margin-top: 14px; font-size: 11px; color: #dedecc; opacity: 0.7; }
    .divider { height: 1px; background: linear-gradient(to right, transparent, #6dbd96, transparent); margin: 28px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Garana Art" />
      <div class="header-sub">SISTEMA DE GESTIÓN INTEGRAL</div>
    </div>
    ${content}
    <div class="footer">
      <div class="footer-title">Garana Art</div>
      <div class="footer-text">Sistema de Gestión Integral · SIG</div>
      <div class="footer-text">Manizales, Caldas — Colombia</div>
      <div class="footer-note">Este es un correo automático, por favor no responder.</div>
    </div>
  </div>
</body>
</html>`;

// ══════════════════════════════════════════════════════════════════════
// TEMPLATES — GESTIÓN DOCUMENTAL
// ══════════════════════════════════════════════════════════════════════
const getPendingTemplate = (data: EmailRequest): string => {
  const d = data.document!;
  return getBaseTemplate("Documento Pendiente", `
    <div class="content">
      <div class="title">📄 Nuevo Documento Pendiente de Aprobación</div>
      <div class="message">
        Se ha ${d.version > 1 ? "modificado un documento existente que" : "creado un nuevo documento que"} requiere tu aprobación.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Documento:</div><div class="info-value"><strong>${d.name}</strong></div></div>
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.code}</strong></div></div>
        <div class="info-row"><div class="info-label">Versión:</div><div class="info-value">v${d.version}</div></div>
        <div class="info-row"><div class="info-label">Creado por:</div><div class="info-value">${d.created_by_name}</div></div>
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/gestion-documental" class="btn">Ver Listado de Documentos</a>
      </div>
    </div>`);
};

const getApprovedTemplate = (data: EmailRequest): string => {
  const d = data.document!;
  return getBaseTemplate("Documento Aprobado", `
    <div class="content">
      <div class="title">✅ Documento Aprobado</div>
      <div class="message">¡Tu documento ha sido aprobado exitosamente!</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Documento:</div><div class="info-value"><strong>${d.name}</strong></div></div>
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.code}</strong></div></div>
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/gestion-documental" class="btn">Ver Documento</a>
      </div>
    </div>`);
};

const getRejectedTemplate = (data: EmailRequest): string => {
  const d = data.document!;
  return getBaseTemplate("Documento Rechazado", `
    <div class="content">
      <div class="title">❌ Documento Rechazado</div>
      <div class="message">Tu documento no ha sido aprobado en esta revisión.</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Documento:</div><div class="info-value"><strong>${d.name}</strong></div></div>
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.code}</strong></div></div>
      </div>
      ${data.rejection_reason
        ? `<div class="alert-danger"><strong>Motivo del rechazo:</strong><br>${data.rejection_reason}</div>`
        : ""}
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/gestion-documental" class="btn">Ver Documento</a>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// TEMPLATES — ACCIONES DE MEJORA
// ══════════════════════════════════════════════════════════════════════
const getAccionCreacionTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Nueva Acción de Mejora Asignada", `
    <div class="content">
      <div class="title">🎯 Nueva Acción de Mejora Asignada</div>
      <div class="message">
        Se ha registrado una nueva acción de mejora en el sistema.
        Por favor revisa los detalles y realiza el seguimiento correspondiente.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Consecutivo:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Responsable:</div><div class="info-value">${d.responsible_name}</div></div>
        <div class="info-row"><div class="info-label">Creado por:</div><div class="info-value">${d.created_by_name || "—"}</div></div>
        ${d.proposed_date ? `<div class="info-row"><div class="info-label">Fecha límite:</div><div class="info-value"><strong>${d.proposed_date}</strong></div></div>` : ""}
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Hallazgo:</p>
      <div class="reason-box">${d.finding || "Sin descripción"}</div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Acción de Mejora</a>
      </div>
    </div>`);
};

const getAccionCierreTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Acción de Mejora Cerrada", `
    <div class="content">
      <div class="title">✅ Acción de Mejora Cerrada Definitivamente</div>
      <div class="message">La siguiente acción de mejora ha sido <strong>cerrada con éxito</strong> y archivada en el sistema.</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Consecutivo:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Responsable:</div><div class="info-value">${d.responsible_name}</div></div>
        <div class="info-row"><div class="info-label">Revisado por:</div><div class="info-value">${d.reviewed_by || "—"}</div></div>
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-green">✅ Cierre definitivo</span></div></div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Hallazgo original:</p>
      <div class="reason-box">${d.finding || "—"}</div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin:16px 0 8px;">📝 Evidencia de cierre:</p>
      <div class="reason-box">${d.closure_reason || "—"}</div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Registro</a>
      </div>
    </div>`);
};

const getAccionSeguimientoTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Seguimiento Pendiente — Acción de Mejora", `
    <div class="content">
      <div class="title">🕐 Acción de Mejora — Seguimiento Pendiente</div>
      <div class="message">La siguiente acción de mejora <strong>permanece activa</strong> y requiere seguimiento.</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Consecutivo:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Responsable:</div><div class="info-value">${d.responsible_name}</div></div>
        <div class="info-row"><div class="info-label">Revisado por:</div><div class="info-value">${d.reviewed_by || "—"}</div></div>
        ${d.proposed_date ? `<div class="info-row"><div class="info-label">Fecha límite:</div><div class="info-value"><strong>${d.proposed_date}</strong></div></div>` : ""}
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-amber">🕐 En espera de solución</span></div></div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Hallazgo:</p>
      <div class="reason-box">${d.finding || "—"}</div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin:16px 0 8px;">📝 Pendiente / Plan de acción:</p>
      <div class="reason-box">${d.closure_reason || "—"}</div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Acción de Mejora</a>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// TEMPLATE — ACTAS DE REUNIÓN (COMPROMISOS)
// ══════════════════════════════════════════════════════════════════════
const getActaCompromisoTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Nuevo Compromiso de Acta de Reunión", `
    <div class="content">
      <div class="title">📝 Nuevo Compromiso Asignado</div>
      <div class="message">
        En la reunión registrada en el acta <strong>${d.consecutive}</strong> quedaste
        asignado como responsable de un compromiso. Por favor revisa los detalles
        y realiza el seguimiento antes de la fecha límite.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Acta:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        ${d.meeting_date ? `<div class="info-row"><div class="info-label">Fecha reunión:</div><div class="info-value">${d.meeting_date}</div></div>` : ""}
        ${d.objective ? `<div class="info-row"><div class="info-label">Objetivo:</div><div class="info-value">${d.objective}</div></div>` : ""}
        <div class="info-row"><div class="info-label">Responsable:</div><div class="info-value">${d.responsible_name}</div></div>
        <div class="info-row"><div class="info-label">Elaborado por:</div><div class="info-value">${d.created_by_name || "—"}</div></div>
        <div class="info-row"><div class="info-label">Fecha límite:</div><div class="info-value"><strong>${d.due_date}</strong></div></div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Compromiso:</p>
      <div class="reason-box">${d.activity || "Sin descripción"}</div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Acta</a>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// TEMPLATE — EVALUACIÓN DE COMPETENCIAS
// ══════════════════════════════════════════════════════════════════════
const getEvaluacionTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  const nivelColor: Record<string, string> = {
    "Sobresaliente":                  "#2e5244",
    "Mejora Expectativas":            "#6dbd96",
    "Alcanza Expectativas":           "#6f7b2c",
    "Debajo de las Expectativas":     "#d97706",
    "Muy debajo de las Expectativas": "#dc2626",
  };
  const nivelShort: Record<number, { texto: string; color: string }> = {
    1: { texto: "Muy debajo", color: "#dc2626" },
    2: { texto: "Debajo",     color: "#d97706" },
    3: { texto: "Alcanza",    color: "#6f7b2c" },
    4: { texto: "Mejora",     color: "#6dbd96" },
    5: { texto: "Sobres.",    color: "#2e5244" },
  };
  const color = nivelColor[d.nivel || ""] || "#6dbd96";

  const tablaHtml = (d.tabla_completa || []).map(cat => {
    const filasHtml = cat.preguntas.map((p, idx) => {
      const op = nivelShort[p.respuesta] || { texto: "—", color: "#888" };
      const bg = idx % 2 === 0 ? "#ffffff" : "#f9fbf9";
      const celdas = [1, 2, 3, 4, 5].map(v => {
        const marcado = p.respuesta === v;
        const c = nivelShort[v]?.color || "#888";
        return `<td style="text-align:center;padding:5px 4px;border-right:1px solid #f0f0f0;background:${marcado ? c + "18" : "transparent"}">
          ${marcado ? `<span style="display:inline-block;width:16px;height:16px;background:${c};border-radius:3px;color:white;font-size:11px;font-weight:bold;line-height:16px;text-align:center;">✓</span>` : ""}
        </td>`;
      }).join("");
      return `<tr style="background:${bg};border-bottom:1px solid #e5e7eb;">
        <td style="padding:6px 8px;font-size:11px;color:#333;line-height:1.4;">${p.texto}</td>
        ${celdas}
        <td style="padding:6px 8px;text-align:center;">
          <span style="background:${op.color}20;color:${op.color};padding:1px 7px;border-radius:10px;font-size:10px;font-weight:bold;">${op.texto}</span>
        </td>
      </tr>`;
    }).join("");
    return `
      <tr style="background:#2e5244;">
        <td colspan="7" style="padding:7px 10px;color:white;font-size:12px;font-weight:bold;">${cat.categoria}</td>
      </tr>
      ${filasHtml}`;
  }).join("");

  const tablaSeccion = tablaHtml ? `
    <div style="margin-top:24px;">
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:10px;border-bottom:2px solid #6dbd96;padding-bottom:6px;">Detalle de la Evaluación</p>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#1a3330;color:white;">
            <th style="padding:7px 8px;text-align:left;">Pregunta</th>
            <th style="padding:7px 4px;text-align:center;width:38px;font-size:10px;line-height:1.2;">Muy<br>debajo</th>
            <th style="padding:7px 4px;text-align:center;width:38px;font-size:10px;line-height:1.2;">Debajo</th>
            <th style="padding:7px 4px;text-align:center;width:38px;font-size:10px;line-height:1.2;">Alcanza</th>
            <th style="padding:7px 4px;text-align:center;width:38px;font-size:10px;line-height:1.2;">Mejora</th>
            <th style="padding:7px 4px;text-align:center;width:38px;font-size:10px;line-height:1.2;">Sobres.</th>
            <th style="padding:7px 8px;text-align:center;width:60px;font-size:10px;">Nivel</th>
          </tr>
        </thead>
        <tbody>${tablaHtml}</tbody>
      </table>
    </div>` : "";

  return getBaseTemplate("Resultados de Evaluación de Competencias", `
    <div class="content">
      <div class="title">📊 Resultados de tu Evaluación de Competencias</div>
      <div class="message">
        Estimado(a) <strong>${d.empleado_nombre}</strong>, a continuación encontrarás
        los resultados de tu evaluación de desempeño correspondiente al período
        <strong>${d.periodo}</strong>.
      </div>
      <div style="background:${color}18;border:2px solid ${color}40;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <div style="font-size:48px;font-weight:900;color:${color};font-family:monospace;line-height:1">
          ${d.puntaje}<span style="font-size:24px;opacity:0.6">/85</span>
        </div>
        <div style="margin-top:8px;display:inline-block;background:${color};color:white;padding:6px 20px;border-radius:20px;font-size:14px;font-weight:700">${d.nivel}</div>
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Empleado:</div><div class="info-value"><strong>${d.empleado_nombre}</strong></div></div>
        <div class="info-row"><div class="info-label">Cargo:</div><div class="info-value">${d.empleado_cargo}</div></div>
        <div class="info-row"><div class="info-label">Departamento:</div><div class="info-value">${d.empleado_depto}</div></div>
        <div class="info-row"><div class="info-label">Período:</div><div class="info-value">${d.periodo}</div></div>
        <div class="info-row"><div class="info-label">Fecha:</div><div class="info-value">${d.fecha}</div></div>
        <div class="info-row"><div class="info-label">Evaluado por:</div><div class="info-value">${d.evaluador_nombre}</div></div>
      </div>
      ${tablaSeccion}
      ${d.notas ? `<div class="divider"></div><p style="font-size:14px;font-weight:700;color:#2e5244;margin-bottom:8px;">📝 Aspectos a Mejorar / Relevantes</p><div class="reason-box">${d.notas}</div>` : ""}
      <div class="divider"></div>
      <p style="font-size:12px;color:#888;text-align:center;font-style:italic;">Este informe es confidencial. Comunícate con Gestión Humana si tienes preguntas.</p>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// TEMPLATES — INFORMES DE GESTIÓN  ← NUEVOS
// ══════════════════════════════════════════════════════════════════════

// Notificación a gerencia cuando un usuario sube un informe
const getInformeEnviadoTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Nuevo Informe de Gestión", `
    <div class="content">
      <div class="title">📄 Nuevo Informe Subido para Revisión</div>
      <div class="message">
        Se ha subido un nuevo informe de gestión al sistema que requiere tu revisión.
      </div>
      <div class="info-box">
        <div class="info-row">
          <div class="info-label">Consecutivo:</div>
          <div class="info-value"><strong style="font-family:monospace;color:#2e5244">${d.consecutive}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Título:</div>
          <div class="info-value"><strong>${d.title}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Proceso / Área:</div>
          <div class="info-value">${d.process_name}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Período:</div>
          <div class="info-value">${d.period}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Subido por:</div>
          <div class="info-value">${d.created_by}</div>
        </div>
      </div>
      <div style="background:#fff7ed;border-left:3px solid #d97706;padding:12px 16px;margin:16px 0;border-radius:4px;font-size:13px;color:#92400e">
        ⏳ Este informe está pendiente de revisión.
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Revisar Informe</a>
      </div>
    </div>`);
};

// Notificación al autor cuando gerencia aprueba el informe
const getInformeRevisadoOkTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Informe Aprobado", `
    <div class="content">
      <div class="title">✅ Tu Informe Fue Aprobado</div>
      <div class="message">
        ¡Excelente! Tu informe de gestión ha sido <strong>revisado y aprobado</strong>
        por la dirección.
      </div>
      <div class="info-box">
        <div class="info-row">
          <div class="info-label">Consecutivo:</div>
          <div class="info-value"><strong style="font-family:monospace;color:#2e5244">${d.consecutive}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Título:</div>
          <div class="info-value"><strong>${d.title}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Proceso / Área:</div>
          <div class="info-value">${d.process_name}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Período:</div>
          <div class="info-value">${d.period}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Revisado por:</div>
          <div class="info-value">${d.reviewer_name}</div>
        </div>
      </div>
      ${d.review_notes ? `
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📝 Observaciones de gerencia:</p>
      <div class="reason-box">${d.review_notes}</div>` : ""}
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Informe</a>
      </div>
    </div>`);
};

// Notificación al autor cuando gerencia solicita correcciones
const getInformeRevisionSolicitadaTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Se Solicitaron Correcciones en tu Informe", `
    <div class="content">
      <div class="title">🔄 Tu Informe Requiere Correcciones</div>
      <div class="message">
        La dirección ha revisado tu informe y ha solicitado que realices
        algunas correcciones antes de aprobarlo.
      </div>
      <div class="info-box">
        <div class="info-row">
          <div class="info-label">Consecutivo:</div>
          <div class="info-value"><strong style="font-family:monospace;color:#2e5244">${d.consecutive}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Título:</div>
          <div class="info-value"><strong>${d.title}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Proceso / Área:</div>
          <div class="info-value">${d.process_name}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Período:</div>
          <div class="info-value">${d.period}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Revisado por:</div>
          <div class="info-value">${d.reviewer_name}</div>
        </div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:8px;">📋 Correcciones solicitadas:</p>
      <div class="reason-box-warn">${d.review_notes || "Sin observaciones adicionales"}</div>
      <p style="font-size:13px;color:#666;margin-top:16px;">
        Por favor ingresa al sistema, realiza las correcciones indicadas y vuelve a enviar tu informe.
      </p>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Editar y Reenviar Informe</a>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// v52 — HELPERS + TEMPLATES RESTAURADOS
// ══════════════════════════════════════════════════════════════════════
const esc = (v: unknown): string =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const row = (label: string, value: unknown, strong = false): string =>
  value === undefined || value === null || value === ""
    ? ""
    : `<div class="info-row"><div class="info-label">${label}</div><div class="info-value">${strong ? `<strong>${esc(value)}</strong>` : esc(value)}</div></div>`;
const block = (title: string, text: unknown, warn = false): string =>
  text
    ? `<p style="font-size:13px;font-weight:700;color:${warn ? "#dc2626" : "#2e5244"};margin:16px 0 8px;">${title}</p>
       <div class="${warn ? "reason-box-warn" : "reason-box"}" style="white-space:pre-line">${esc(text)}</div>`
    : "";
const button = (path: string, label: string): string =>
  `<div style="text-align:center;margin-top:28px;"><a href="${APP_URL}${path}" class="btn">${label}</a></div>`;
const checks = (items: [string, boolean | undefined][]): string => {
  const on = items.filter(([, v]) => !!v).map(([l]) => l);
  return on.length ? on.join(" · ") : "—";
};

// ── Usuarios: bienvenida con contraseña temporal ─────────────────────
const getUserBienvenidaTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Bienvenido(a) a Garana SIG", `
    <div class="content">
      <div class="title">👋 ¡Bienvenido(a) a Garana SIG!</div>
      <div class="message">
        Hola <strong>${esc(d.full_name)}</strong>, ${esc(d.created_by_name || "el administrador")} creó tu usuario
        en el Sistema de Gestión Integral. Estos son tus datos de acceso:
      </div>
      <div class="info-box">
        ${row("Usuario (email):", d.email, true)}
        <div class="info-row"><div class="info-label">Contraseña temporal:</div>
          <div class="info-value"><strong style="font-family:monospace;font-size:16px;letter-spacing:1px;color:#2e5244">${esc(d.temp_password)}</strong></div></div>
        ${row("Rol:", d.role)}
        ${row("Proceso / Área:", d.department)}
      </div>
      <div style="background:#fff7ed;border-left:3px solid #d97706;padding:12px 16px;margin:16px 0;border-radius:4px;font-size:13px;color:#92400e">
        🔐 Al ingresar por primera vez el sistema te pedirá cambiar esta contraseña. No la compartas con nadie.
      </div>
      ${button("", "Ingresar al sistema")}
    </div>`);
};

// ── Acciones de Mejora: Momento 1 (registro del hallazgo) ────────────
const getAccionM1Template = (req: EmailRequest): string => {
  const d = req.data!;
  const origen = checks([
    ["Auditoría", d.origin_audit], ["Satisfacción del cliente", d.origin_satisfaction],
    ["QRS", d.origin_qrs], ["Autocontrol", d.origin_autocontrol],
    ["Análisis de riesgos", d.origin_risk_analysis], ["Producto no conforme", d.origin_nonconforming],
  ]);
  return getBaseTemplate("Nueva Acción de Mejora", `
    <div class="content">
      <div class="title">🎯 Nueva Acción de Mejora registrada</div>
      <div class="message">Se registró un nuevo hallazgo en tu proceso. Está pendiente el análisis y plan de acción (Momento 2).</div>
      <div class="info-box">
        ${row("Consecutivo:", d.consecutive, true)}
        ${row("Origen:", origen)}
        ${row("Registrado por:", d.created_by_name)}
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-amber">Abierta · Momento 1</span></div></div>
      </div>
      ${block("📋 Hallazgo:", d.finding)}
      ${button("/mejoramiento-continuo", "Ver Acción de Mejora")}
    </div>`);
};

// ── Acciones de Mejora: Momento 2 (análisis + plan) ──────────────────
const getAccionM2Template = (req: EmailRequest): string => {
  const d = req.data!;
  const tipos = checks([
    ["Corrección", d.action_correction], ["Acción correctiva/mejora", d.action_corrective],
    ["Acción Preventiva", d.action_preventive], ["Acción de Mejora", d.action_improvement],
  ]);
  return getBaseTemplate("Acción de Mejora — Plan de acción", `
    <div class="content">
      <div class="title">🛠️ Acción de Mejora — Análisis y plan registrados</div>
      <div class="message">Se completó el análisis de causas y el plan de acción (Momento 2).</div>
      <div class="info-box">
        ${row("Consecutivo:", d.consecutive, true)}
        ${row("Responsable:", d.responsible_name)}
        ${row("Tipo de acción:", tipos)}
        ${row("Fecha propuesta:", d.proposed_date, true)}
        ${row("Registrado por:", d.created_by_name)}
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-amber">En proceso · Momento 2</span></div></div>
      </div>
      ${block("🔍 Causas:", d.causes)}
      ${block("📝 Acción a realizar:", d.action_description)}
      ${block("🎯 Resultados esperados:", d.expected_results)}
      ${block("💰 Recursos / presupuesto:", d.resources_budget)}
      ${button("/mejoramiento-continuo", "Ver Acción de Mejora")}
    </div>`);
};

// ── Acciones de Mejora: Momento 3 (verificación) ─────────────────────
const getAccionM3Template = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Acción de Mejora — Verificación", `
    <div class="content">
      <div class="title">✔️ Acción de Mejora — Verificación registrada</div>
      <div class="message">El auditor registró la verificación de la acción (Momento 3). Queda pendiente el cierre.</div>
      <div class="info-box">
        ${row("Consecutivo:", d.consecutive, true)}
        ${row("Responsable:", d.responsible_name)}
        ${row("Auditor:", d.auditor_name)}
        ${row("Fecha verificación:", d.verification_date)}
        ${row("Fecha eficacia:", d.efficacy_date)}
      </div>
      ${block("📏 Criterio de verificación:", d.verification_criteria)}
      ${block("📋 Hallazgo de la verificación:", d.verification_finding)}
      ${button("/mejoramiento-continuo", "Ver Acción de Mejora")}
    </div>`);
};

// ── SST y Bienestar ──────────────────────────────────────────────────
const getSstAsignacionTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Actividad asignada", `
    <div class="content">
      <div class="title">📅 ${d.is_edit ? "Actividad actualizada" : "Nueva actividad asignada"}</div>
      <div class="message">Eres responsable de una actividad del plan de trabajo <strong>${esc(d.plan_label)} ${esc(d.plan_year)}</strong>.</div>
      <div class="info-box">
        ${row("Plan:", `${d.plan_label ?? ""} ${d.plan_year ?? ""}`.trim(), true)}
        ${row("Responsable(s):", d.responsible_name)}
        ${row("Meses programados:", d.months_scheduled)}
        ${row("Presupuesto:", d.budget)}
      </div>
      ${block("📋 Actividad:", d.activity)}
      ${block("🧰 Recursos:", d.resources)}
      ${button("", "Ver plan de trabajo")}
    </div>`);
};

const getSstRecordatorioTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Recordatorio de actividad", `
    <div class="content">
      <div class="title">⏰ Recordatorio: actividad por ejecutar</div>
      <div class="message">Quedan <strong>${esc(d.days_left)} día(s)</strong> para terminar <strong>${esc(d.month_name)}</strong> y esta actividad aún no está ejecutada.</div>
      <div class="info-box">
        ${row("Plan:", `${d.plan_label ?? ""} ${d.plan_year ?? ""}`.trim(), true)}
        ${row("Mes:", d.month_name)}
        ${row("Responsable:", d.responsible)}
      </div>
      ${block("📋 Actividad:", d.activity)}
      ${button("", "Registrar ejecución")}
    </div>`);
};

const getSstVencidaTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Actividad vencida", `
    <div class="content">
      <div class="title">⚠️ Actividad sin ejecutar</div>
      <div class="message">El mes de <strong>${esc(d.month_name)}</strong> terminó y esta actividad quedó sin ejecutar.</div>
      <div class="info-box">
        ${row("Plan:", `${d.plan_label ?? ""} ${d.plan_year ?? ""}`.trim(), true)}
        ${row("Mes:", d.month_name)}
        ${row("Responsable:", d.responsible)}
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-red">Vencida</span></div></div>
      </div>
      ${block("📋 Actividad:", d.activity, true)}
      ${button("", "Ver plan de trabajo")}
    </div>`);
};

// ── Indicadores ──────────────────────────────────────────────────────
const getIndicadorTemplate = (req: EmailRequest, kind: "creacion" | "edicion"): string => {
  const d = req.data!;
  const titulo = kind === "creacion" ? "📊 Nuevo indicador asignado" : "✏️ Indicador actualizado";
  return getBaseTemplate(kind === "creacion" ? "Nuevo indicador asignado" : "Indicador actualizado", `
    <div class="content">
      <div class="title">${titulo}</div>
      <div class="message">Hola <strong>${esc(d.recipient_name || "")}</strong>, ${kind === "creacion"
        ? "se creó un indicador en el Cuadro de Mando Integral del que eres responsable o seguimiento."
        : "se modificó un indicador del que eres responsable."}</div>
      <div class="info-box">
        ${row("Consecutivo:", d.consecutive, true)}
        ${row("Indicador:", d.indicator_name, true)}
        ${row("Meta:", d.goal)}
        ${row("Frecuencia:", d.frequency)}
        ${row("Inicio medición:", d.start_date)}
        ${row("Fin medición:", d.end_date)}
        ${row("Fórmula:", d.formula_expression)}
        ${row(kind === "creacion" ? "Creado por:" : "Modificado por:", d.created_by_name || d.updated_by_name)}
      </div>
      ${block("🎯 Objetivo:", d.objective)}
      ${button("/mejoramiento-continuo", "Ver indicador")}
    </div>`);
};

const getIndicadorCriticoTemplate = (req: EmailRequest): string => {
  const d = req.data!;
  return getBaseTemplate("Indicador en estado crítico", `
    <div class="content">
      <div class="title">🚨 Indicador en estado crítico</div>
      <div class="message">Hola <strong>${esc(d.recipient_name || "")}</strong>, la última medición quedó por debajo del 80% de la meta.</div>
      <div class="info-box">
        ${row("Consecutivo:", d.consecutive, true)}
        ${row("Indicador:", d.indicator_name, true)}
        ${row("Período:", d.period_label)}
        ${row("Valor medido:", `${d.measured_value ?? "—"} ${d.unit ?? ""}`.trim(), true)}
        ${row("Meta:", `${d.goal_value ?? "—"} ${d.unit ?? ""}`.trim())}
        ${row("Registrado por:", d.registered_by)}
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-red">Crítico</span></div></div>
      </div>
      ${button("/mejoramiento-continuo", "Ver indicador")}
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    console.log("🚀 Iniciando envío de email...");

    const body = await req.json();
    const { type, to, document, rejection_reason, data }: EmailRequest = body;

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros: type y to son requeridos" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // Clasificar el tipo para validación del payload
    const isDocType    = ["pending", "approved", "rejected"].includes(type);
    const isAccionType = type.startsWith("accion_mejora");
    const isActaType   = type.startsWith("acta_");
    const isEvalType   = type === "evaluacion_retroalimentacion";
    const isInformeType = type.startsWith("informe_");

    if (isDocType && !document) {
      return new Response(
        JSON.stringify({ error: "Falta el campo document para tipos de documento" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    // v52: todo tipo que no sea de documento necesita "data"
    if (!isDocType && !data) {
      return new Response(
        JSON.stringify({ error: "Falta el campo data para este tipo de email" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // Credenciales Gmail
    const GMAIL_USER         = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("❌ Credenciales Gmail no configuradas");
      return new Response(
        JSON.stringify({ error: "Credenciales Gmail no configuradas" }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    let subject = "";
    let html    = "";

    switch (type) {

      // ── Gestión Documental ──────────────────────────────────────────
      case "pending":
        subject = `📄 Documento pendiente de aprobación: ${document!.code}`;
        html = getPendingTemplate({ type, to, document, rejection_reason });
        break;
      case "approved":
        subject = `✅ Documento aprobado: ${document!.code}`;
        html = getApprovedTemplate({ type, to, document, rejection_reason });
        break;
      case "rejected":
        subject = `❌ Documento rechazado: ${document!.code}`;
        html = getRejectedTemplate({ type, to, document, rejection_reason });
        break;

      // ── Acciones de Mejora ──────────────────────────────────────────
      case "accion_mejora_creacion":
        subject = `🎯 Nueva Acción de Mejora asignada: ${data!.consecutive}`;
        html = getAccionCreacionTemplate({ type, to, data });
        break;
      case "accion_mejora_cierre_definitivo":
        subject = `✅ Acción de Mejora cerrada: ${data!.consecutive}`;
        html = getAccionCierreTemplate({ type, to, data });
        break;
      case "accion_mejora_seguimiento_pendiente":
        subject = `🕐 Seguimiento pendiente — Acción de Mejora: ${data!.consecutive}`;
        html = getAccionSeguimientoTemplate({ type, to, data });
        break;

      // ── Actas de Reunión ──────────────────────────────────────────────
      case "acta_compromiso_asignacion":
        subject = `📝 Nuevo compromiso asignado — Acta ${data!.consecutive}`;
        html = getActaCompromisoTemplate({ type, to, data });
        break;

      // ── Evaluación de Competencias ──────────────────────────────────
      case "evaluacion_retroalimentacion":
        subject = `📊 Resultados de tu Evaluación de Competencias — ${data!.periodo}`;
        html = getEvaluacionTemplate({ type, to, data });
        break;

      // ── Informes de Gestión ─────────────────────────────────────────
      case "informe_enviado":
        subject = `📄 Nuevo informe para revisión: ${data!.consecutive} — ${data!.title}`;
        html = getInformeEnviadoTemplate({ type, to, data });
        break;
      case "informe_revisado_ok":
        subject = `✅ Tu informe fue aprobado: ${data!.consecutive}`;
        html = getInformeRevisadoOkTemplate({ type, to, data });
        break;
      case "informe_revision_solicitada":
        subject = `🔄 Se solicitaron correcciones en tu informe: ${data!.consecutive}`;
        html = getInformeRevisionSolicitadaTemplate({ type, to, data });
        break;

      // ── v52: Usuarios ──────────────────────────────────────────────
      case "user_bienvenida":
        subject = `👋 Bienvenido(a) a Garana SIG — tus datos de acceso`;
        html = getUserBienvenidaTemplate({ type, to, data });
        break;

      // ── v52: Acciones de Mejora por momentos ────────────────────────
      case "accion_mejora_m1":
        subject = `🎯 Nueva Acción de Mejora: ${data!.consecutive}`;
        html = getAccionM1Template({ type, to, data });
        break;
      case "accion_mejora_m2":
        subject = `🛠️ Plan de acción registrado — Acción de Mejora ${data!.consecutive}`;
        html = getAccionM2Template({ type, to, data });
        break;
      case "accion_mejora_m3_verificacion":
        subject = `✔️ Verificación registrada — Acción de Mejora ${data!.consecutive}`;
        html = getAccionM3Template({ type, to, data });
        break;

      // ── v52: SST y Bienestar ────────────────────────────────────────
      case "sst_asignacion_actividad":
        subject = `📅 ${data!.is_edit ? "Actividad actualizada" : "Nueva actividad asignada"} — ${data!.plan_label} ${data!.plan_year ?? ""}`;
        html = getSstAsignacionTemplate({ type, to, data });
        break;
      case "sst_recordatorio_actividad":
        subject = `⏰ Recordatorio: actividad de ${data!.month_name} — ${data!.plan_label}`;
        html = getSstRecordatorioTemplate({ type, to, data });
        break;
      case "sst_actividad_vencida":
        subject = `⚠️ Actividad sin ejecutar en ${data!.month_name} — ${data!.plan_label}`;
        html = getSstVencidaTemplate({ type, to, data });
        break;

      // ── v52: Indicadores ────────────────────────────────────────────
      case "indicador_creacion":
        subject = `📊 Nuevo indicador: ${data!.indicator_name}`;
        html = getIndicadorTemplate({ type, to, data }, "creacion");
        break;
      case "indicador_edicion":
        subject = `✏️ Indicador actualizado: ${data!.indicator_name}`;
        html = getIndicadorTemplate({ type, to, data }, "edicion");
        break;
      case "indicador_critico":
        subject = `🚨 Indicador crítico: ${data!.indicator_name} (${data!.period_label ?? ""})`;
        html = getIndicadorCriticoTemplate({ type, to, data });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Tipo de email no reconocido: ${type}` }),
          { status: 400, headers: JSON_HEADERS }
        );
    }

    const recipients = Array.isArray(to) ? to : [to];
    console.log(`📧 Enviando [${type}] a:`, recipients);

    const info = await transporter.sendMail({
      from: `Garana SIG <${GMAIL_USER}>`,
      to:   recipients.join(", "),
      subject,
      html,
    });

    console.log("✅ Email enviado:", info.messageId);

    return new Response(
      JSON.stringify({
        success:    true,
        message:    `Email enviado a ${recipients.length} destinatario(s)`,
        type,
        recipients,
        messageId:  info.messageId,
      }),
      { status: 200, headers: JSON_HEADERS }
    );

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Error al enviar email", details: error.message }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
});