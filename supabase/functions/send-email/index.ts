// supabase/functions/send-document-notification/index.ts
// ══════════════════════════════════════════════════════════════════════
// Edge Function unificada: Documentos + Acciones de Mejora + Indicadores CMI
//                        + Bienvenida de Usuarios  ← NUEVO
// Usa nodemailer + Gmail. Logo corporativo desde Supabase Storage.
// ══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const LOGO_URL =
  "https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/garana1.png";

const APP_URL = "https://garanasig.vercel.app/";

// ── Tipos ─────────────────────────────────────────────────────────────
interface EmailRequest {
  type:
    // Gestión Documental
    | "pending"
    | "approved"
    | "rejected"
    // Acciones de Mejora
    | "accion_mejora_creacion"
    | "accion_mejora_cierre_definitivo"
    | "accion_mejora_seguimiento_pendiente"
    // Indicadores CMI
    | "indicador_creacion"
    | "indicador_edicion"
    | "indicador_critico"
    | "indicador_vencimiento"
    | "indicador_recordatorio"
    // Usuarios ← NUEVO
    | "user_bienvenida";
  to: string | string[];
  document?: {
    id: string;
    name: string;
    code: string;
    version: number;
    created_by_name: string;
  };
  rejection_reason?: string;
  data?: Record<string, any>;
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
    .info-box-blue { background-color: #eff6ff; border-left: 4px solid #2E75B6; padding: 18px 20px; margin: 20px 0; border-radius: 4px; }
    .info-box-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 18px 20px; margin: 20px 0; border-radius: 4px; }
    .info-row { display: flex; margin-bottom: 10px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-weight: 700; color: #2e5244; min-width: 160px; }
    .info-value { color: #333; }
    .reason-box { background-color: #f0f7f4; border-left: 4px solid #2e5244; padding: 16px 20px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #333; line-height: 1.6; }
    .credentials-box { background-color: #1a2e25; border-radius: 8px; padding: 24px; margin: 24px 0; }
    .credentials-label { color: #6dbd96; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
    .credentials-value { color: #ffffff; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px; }
    .credentials-divider { height: 1px; background: #2e5244; margin: 16px 0; }
    .formula-box { background-color: #1e293b; border-radius: 6px; padding: 14px 18px; margin: 12px 0; font-family: monospace; color: #7dd3fc; font-size: 15px; letter-spacing: 0.5px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6dbd96 0%, #2e5244 100%); color: white !important; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; margin-top: 10px; }
    .btn-red { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%); color: white !important; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; margin-top: 10px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-green  { background: #dcfce7; color: #166534; }
    .badge-amber  { background: #fef3c7; color: #92400e; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-blue   { background: #dbeafe; color: #1e40af; }
    .alert-danger { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 16px 0; border-radius: 4px; color: #7f1d1d; font-size: 14px; }
    .alert-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 16px 0; border-radius: 4px; color: #78350f; font-size: 14px; }
    .alert-info { background-color: #f0fdf4; border-left: 4px solid #6dbd96; padding: 14px 18px; margin: 16px 0; border-radius: 4px; color: #14532d; font-size: 14px; }
    .footer { background-color: #2e5244; color: white; padding: 28px 20px; text-align: center; }
    .footer-title { font-size: 16px; margin-bottom: 8px; color: #6dbd96; font-weight: 700; }
    .footer-text  { font-size: 13px; color: #dedecc; margin: 4px 0; }
    .footer-note  { margin-top: 14px; font-size: 11px; color: #dedecc; opacity: 0.7; }
    .divider { height: 1px; background: linear-gradient(to right, transparent, #6dbd96, transparent); margin: 28px 0; }
    .steps-list { list-style: none; padding: 0; margin: 16px 0; }
    .steps-list li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #444; }
    .steps-list li:last-child { border-bottom: none; }
    .step-num { background: #2e5244; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Garana Art" />
      <div class="header-sub">SISTEMA INTEGRADO DE GESTIÓN </div>
    </div>
    ${content}
    <div class="footer">
      <div class="footer-title">Garana Art</div>
      <div class="footer-text">Sistema Integrado de Gestión  · SIG</div>
      <div class="footer-text">Riosucio, Caldas — Colombia</div>
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
        ${d.proposed_date ? `<div class="info-row"><div class="info-label">Fecha límite:</div><div class="info-value"><strong>${d.proposed_date}</strong></div></div>` : ""}
        <div class="info-row"><div class="info-label">Creado por:</div><div class="info-value">${d.created_by_name || "—"}</div></div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Hallazgo:</p>
      <div class="reason-box">${d.finding || "—"}</div>
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
      <div class="message">La siguiente acción de mejora ha sido cerrada en el sistema.</div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Consecutivo:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Responsable:</div><div class="info-value">${d.responsible_name}</div></div>
        <div class="info-row"><div class="info-label">Revisado por:</div><div class="info-value">${d.reviewed_by || "—"}</div></div>
        <div class="info-row"><div class="info-label">Tipo de cierre:</div><div class="info-value">${d.closure_type || "—"}</div></div>
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-green">✅ Cerrada</span></div></div>
      </div>
      ${d.closure_reason ? `<div class="divider"></div><p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Evidencia / Resultado:</p><div class="reason-box">${d.closure_reason}</div>` : ""}
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
      <div class="message">
        La siguiente acción de mejora <strong>permanece activa</strong> y requiere seguimiento.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Consecutivo:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Responsable:</div><div class="info-value">${d.responsible_name}</div></div>
        ${d.proposed_date ? `<div class="info-row"><div class="info-label">Fecha límite:</div><div class="info-value"><strong>${d.proposed_date}</strong></div></div>` : ""}
        <div class="info-row"><div class="info-label">Estado:</div><div class="info-value"><span class="badge badge-amber">🕐 En espera</span></div></div>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Hallazgo:</p>
      <div class="reason-box">${d.finding || "—"}</div>
      <p style="font-size:13px;font-weight:700;color:#2e5244;margin:16px 0 8px;">📝 Plan de acción pendiente:</p>
      <div class="reason-box">${d.closure_reason || "—"}</div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Acción de Mejora</a>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// TEMPLATES — INDICADORES CMI
// ══════════════════════════════════════════════════════════════════════
const formulaBlock = (d: Record<string, any>): string => {
  if (!d.formula_expression) return "";
  const variables = Array.isArray(d.formula_variables)
    ? d.formula_variables.map((v: any) => `<strong>${v.key}</strong> = ${v.label}`).join("<br>")
    : "";
  return `
    <div class="divider"></div>
    <p style="font-size:13px;font-weight:700;color:#1D4ED8;margin-bottom:8px;">🔢 Fórmula de cálculo:</p>
    <div class="formula-box">${d.formula_expression}</div>
    ${variables ? `<p style="font-size:12px;color:#6B7280;margin-top:8px;line-height:1.8;">Donde:<br>${variables}</p>` : ""}
  `;
};

const getIndicadorCreacionTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Indicador CMI Asignado", `
    <div class="content">
      <div class="title">📊 Indicador CMI Asignado</div>
      <div class="message">
        Hola <strong>${d.recipient_name || "equipo"}</strong>,<br><br>
        Se te ha asignado la responsabilidad de medir y registrar el siguiente indicador
        en el Cuadro de Mando Integral de Garana Art.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Indicador:</div><div class="info-value"><strong>${d.indicator_name}</strong></div></div>
        <div class="info-row"><div class="info-label">Objetivo:</div><div class="info-value">${d.objective || "—"}</div></div>
        ${d.perspective ? `<div class="info-row"><div class="info-label">Perspectiva:</div><div class="info-value">${d.perspective}</div></div>` : ""}
        <div class="info-row"><div class="info-label">Meta:</div><div class="info-value"><strong>${d.goal}</strong></div></div>
        <div class="info-row"><div class="info-label">Frecuencia:</div><div class="info-value">${d.frequency}</div></div>
        ${d.start_date ? `<div class="info-row"><div class="info-label">Inicio período:</div><div class="info-value"><strong>${d.start_date}</strong></div></div>` : ""}
        ${d.end_date ? `<div class="info-row"><div class="info-label">Fin período:</div><div class="info-value"><strong>${d.end_date}</strong></div></div>` : ""}
        <div class="info-row"><div class="info-label">Asignado por:</div><div class="info-value">${d.created_by_name}</div></div>
      </div>
      ${formulaBlock(d)}
      ${d.definition ? `<div class="divider"></div><p style="font-size:13px;font-weight:700;color:#2e5244;margin-bottom:8px;">📋 Definición / Interpretación:</p><div class="reason-box">${d.definition}</div>` : ""}
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Indicadores CMI</a>
      </div>
    </div>`);
};

const getIndicadorEdicionTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Indicador CMI Actualizado", `
    <div class="content">
      <div class="title">✏️ Indicador CMI Actualizado</div>
      <div class="message">
        Hola <strong>${d.recipient_name || "equipo"}</strong>,<br><br>
        El indicador del que eres responsable ha sido modificado.
        Por favor revisa los nuevos parámetros para tu próxima medición.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Indicador:</div><div class="info-value"><strong>${d.indicator_name}</strong></div></div>
        <div class="info-row"><div class="info-label">Meta:</div><div class="info-value"><strong>${d.goal}</strong></div></div>
        <div class="info-row"><div class="info-label">Frecuencia:</div><div class="info-value">${d.frequency}</div></div>
        ${d.start_date ? `<div class="info-row"><div class="info-label">Nuevo inicio:</div><div class="info-value"><strong>${d.start_date}</strong></div></div>` : ""}
        ${d.end_date ? `<div class="info-row"><div class="info-label">Nuevo fin:</div><div class="info-value"><strong>${d.end_date}</strong></div></div>` : ""}
        <div class="info-row"><div class="info-label">Modificado por:</div><div class="info-value">${d.updated_by_name}</div></div>
      </div>
      ${formulaBlock(d)}
      <div class="alert-warning">
        <strong>⚠️ Importante:</strong> Si las fechas o la meta cambiaron, ten en cuenta los nuevos valores para tus próximas mediciones.
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Ver Indicador</a>
      </div>
    </div>`);
};

const getIndicadorCriticoTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Alerta: Indicador en Estado Crítico", `
    <div class="content">
      <div class="title">🔴 Indicador en Estado Crítico</div>
      <div class="message">
        Hola <strong>${d.recipient_name || "equipo"}</strong>,<br><br>
        El siguiente indicador ha registrado una medición por <strong>debajo del umbral de advertencia</strong>.
        Se requiere atención inmediata.
      </div>
      <div class="alert-danger">
        <strong>🚨 Estado: CRÍTICO</strong> — El resultado no alcanza el 80% de la meta establecida.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Indicador:</div><div class="info-value"><strong>${d.indicator_name}</strong></div></div>
        <div class="info-row"><div class="info-label">Período:</div><div class="info-value">${d.period_label}</div></div>
        <div class="info-row"><div class="info-label">Resultado obtenido:</div><div class="info-value"><strong style="color:#dc2626;font-size:16px;">${d.measured_value} ${d.unit || "%"}</strong></div></div>
        <div class="info-row"><div class="info-label">Meta:</div><div class="info-value"><strong>${d.goal}</strong></div></div>
        <div class="info-row"><div class="info-label">Registrado por:</div><div class="info-value">${d.registered_by}</div></div>
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn-red">Ver Indicador Ahora</a>
      </div>
    </div>`);
};

const getIndicadorVencimientoTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Recordatorio: Indicador por Vencer", `
    <div class="content">
      <div class="title">⏰ Indicador próximo a vencer</div>
      <div class="message">
        Hola <strong>${d.recipient_name || "equipo"}</strong>,<br><br>
        El período de medición del siguiente indicador está por finalizar.
      </div>
      <div class="alert-warning">
        ⚠️ Quedan <strong>${d.days_remaining} día(s)</strong> para el cierre del período.
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Indicador:</div><div class="info-value"><strong>${d.indicator_name}</strong></div></div>
        <div class="info-row"><div class="info-label">Meta:</div><div class="info-value"><strong>${d.goal}</strong></div></div>
        <div class="info-row"><div class="info-label">Frecuencia:</div><div class="info-value">${d.frequency}</div></div>
        <div class="info-row"><div class="info-label">Fin del período:</div><div class="info-value"><strong style="color:#dc2626;">${d.end_date}</strong></div></div>
        <div class="info-row"><div class="info-label">Última medición:</div><div class="info-value">${d.last_period_label || "Sin mediciones registradas"}</div></div>
      </div>
      ${formulaBlock(d)}
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Registrar Medición</a>
      </div>
    </div>`);
};

const getIndicadorRecordatorioTemplate = (data: EmailRequest): string => {
  const d = data.data!;
  return getBaseTemplate("Nuevo Período de Medición", `
    <div class="content">
      <div class="title">🔄 Nuevo Período de Medición</div>
      <div class="message">
        Hola <strong>${d.recipient_name || "equipo"}</strong>,<br><br>
        Ha iniciado un nuevo período de medición para el siguiente indicador.
        Recuerda registrar tu medición según la frecuencia establecida.
      </div>
      <div class="info-box-blue">
        <div class="info-row"><div class="info-label">Código:</div><div class="info-value"><strong>${d.consecutive}</strong></div></div>
        <div class="info-row"><div class="info-label">Indicador:</div><div class="info-value"><strong>${d.indicator_name}</strong></div></div>
        <div class="info-row"><div class="info-label">Nuevo período:</div><div class="info-value"><strong>${d.new_period}</strong></div></div>
        <div class="info-row"><div class="info-label">Frecuencia:</div><div class="info-value">${d.frequency}</div></div>
        <div class="info-row"><div class="info-label">Meta:</div><div class="info-value"><strong>${d.goal}</strong></div></div>
      </div>
      ${formulaBlock(d)}
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/mejoramiento-continuo" class="btn">Registrar Medición</a>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════════
// TEMPLATE — BIENVENIDA DE USUARIO  ← NUEVO
// ══════════════════════════════════════════════════════════════════════
const getUserBienvenidaTemplate = (data: EmailRequest): string => {
  const d = data.data!;

  const rolLabels: Record<string, string> = {
    admin:    "Administrador",
    gerencia: "Gerencia",
    usuario:  "Usuario",
  };
  const rolLabel = rolLabels[d.role] || d.role;

  return getBaseTemplate("Bienvenido al Sistema SIG Garana ", `
    <div class="content">
      <div class="title">👋 ¡Bienvenido a SIG Garana !</div>
      <div class="message">
        Hola <strong>${d.full_name}</strong>,<br><br>
        Tu cuenta ha sido creada en el <strong>Sistema Integrado de Gestión de Garana Art</strong>.
        A continuación encontrarás tus credenciales de acceso.
      </div>

      <!-- Credenciales -->
      <div class="credentials-box">
        <div class="credentials-label">📧 Correo de acceso</div>
        <div class="credentials-value">${d.email}</div>
        <div class="credentials-divider"></div>
        <div class="credentials-label">🔑 Contraseña temporal</div>
        <div class="credentials-value">${d.temp_password}</div>
      </div>

      <!-- Info de perfil -->
      <div class="info-box">
        <div class="info-row"><div class="info-label">Nombre completo:</div><div class="info-value">${d.full_name}</div></div>
        <div class="info-row"><div class="info-label">Rol asignado:</div><div class="info-value"><span class="badge badge-green">${rolLabel}</span></div></div>
        ${d.department ? `<div class="info-row"><div class="info-label">Departamento:</div><div class="info-value">${d.department}</div></div>` : ""}
        <div class="info-row"><div class="info-label">Cuenta creada por:</div><div class="info-value">${d.created_by_name}</div></div>
      </div>

      <!-- Alerta cambio de contraseña -->
      <div class="alert-warning">
        <strong>⚠️ Importante:</strong> Al ingresar por primera vez, el sistema te pedirá
        que cambies tu contraseña temporal por una segura y personal.
      </div>

      <!-- Pasos para ingresar -->
      <div class="divider"></div>
      <p style="font-size:14px;font-weight:700;color:#2e5244;margin-bottom:12px;">📋 Pasos para ingresar:</p>
      <ul class="steps-list">
        <li>
          <div class="step-num">1</div>
          <span>Haz clic en el botón <strong>"Ingresar al Sistema"</strong> de abajo</span>
        </li>
        <li>
          <div class="step-num">2</div>
          <span>Ingresa tu correo <strong>${d.email}</strong> y la contraseña temporal</span>
        </li>
        <li>
          <div class="step-num">3</div>
          <span>El sistema te pedirá crear una <strong>nueva contraseña segura</strong></span>
        </li>
        <li>
          <div class="step-num">4</div>
          <span>¡Listo! Ya puedes usar el sistema con tus módulos asignados</span>
        </li>
      </ul>

      <div style="text-align:center;margin-top:32px;">
        <a href="${APP_URL}" class="btn">🚀 Ingresar al Sistema</a>
      </div>

      <div class="divider"></div>
      <p style="font-size:12px;color:#888;text-align:center;line-height:1.6;">
        Si tienes algún inconveniente para ingresar, comunícate con el administrador del sistema.<br>
        Por seguridad, no compartas tus credenciales con nadie.
      </p>
    </div>`);
};


// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const isAccionType    = type.startsWith("accion_mejora");
    const isIndicadorType = type.startsWith("indicador");
    const isUserType      = type.startsWith("user_");

    if (!isAccionType && !isIndicadorType && !isUserType && !document) {
      return new Response(
        JSON.stringify({ error: "Falta el campo document para tipos de documento" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if ((isAccionType || isIndicadorType || isUserType) && !data) {
      return new Response(
        JSON.stringify({ error: "Falta el campo data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const GMAIL_USER         = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Credenciales Gmail no configuradas" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
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
        html    = getPendingTemplate({ type, to, document, rejection_reason });
        break;
      case "approved":
        subject = `✅ Documento aprobado: ${document!.code}`;
        html    = getApprovedTemplate({ type, to, document, rejection_reason });
        break;
      case "rejected":
        subject = `❌ Documento rechazado: ${document!.code}`;
        html    = getRejectedTemplate({ type, to, document, rejection_reason });
        break;

      // ── Acciones de Mejora ──────────────────────────────────────────
      case "accion_mejora_creacion":
        subject = `🎯 Nueva Acción de Mejora asignada: ${data!.consecutive}`;
        html    = getAccionCreacionTemplate({ type, to, data });
        break;
      case "accion_mejora_cierre_definitivo":
        subject = `✅ Acción de Mejora cerrada: ${data!.consecutive}`;
        html    = getAccionCierreTemplate({ type, to, data });
        break;
      case "accion_mejora_seguimiento_pendiente":
        subject = `🕐 Seguimiento pendiente — Acción de Mejora: ${data!.consecutive}`;
        html    = getAccionSeguimientoTemplate({ type, to, data });
        break;

      // ── Indicadores CMI ─────────────────────────────────────────────
      case "indicador_creacion":
        subject = `📊 Indicador CMI asignado: ${data!.indicator_name} (${data!.consecutive})`;
        html    = getIndicadorCreacionTemplate({ type, to, data });
        break;
      case "indicador_edicion":
        subject = `✏️ Indicador CMI actualizado: ${data!.indicator_name} (${data!.consecutive})`;
        html    = getIndicadorEdicionTemplate({ type, to, data });
        break;
      case "indicador_critico":
        subject = `🔴 CRÍTICO — ${data!.indicator_name}: ${data!.measured_value}${data!.unit || "%"} vs meta ${data!.goal}`;
        html    = getIndicadorCriticoTemplate({ type, to, data });
        break;
      case "indicador_vencimiento":
        subject = `⏰ Indicador por vencer en ${data!.days_remaining} día(s): ${data!.indicator_name}`;
        html    = getIndicadorVencimientoTemplate({ type, to, data });
        break;
      case "indicador_recordatorio":
        subject = `🔄 Nuevo período de medición — ${data!.indicator_name}: ${data!.new_period}`;
        html    = getIndicadorRecordatorioTemplate({ type, to, data });
        break;

      // ── Usuarios ────────────────────────────────────────────────────
      case "user_bienvenida":
        subject = `👋 Bienvenido a SIG Garana  — Tus credenciales de acceso`;
        html    = getUserBienvenidaTemplate({ type, to, data });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Tipo de email no reconocido: ${type}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const recipients = Array.isArray(to) ? to : [to];
    console.log(`📧 Enviando [${type}] a:`, recipients);

    const info = await transporter.sendMail({
      from: `SIG Garana <${GMAIL_USER}>`,
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
      { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Error al enviar email", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});