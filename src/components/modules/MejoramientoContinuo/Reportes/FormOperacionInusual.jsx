// src/components/modules/MejoramientoContinuo/Reportes/FormOperacionInusual.jsx
// Formulario RE-GF-10 · Reporte interno de operación inusual (BASC)
import { useState } from 'react';
import { etiquetaFormato } from '@/hooks/useFormatoVinculado';
import { Modal, Check, Radio, PieForm, DesdeReporte, lbl, inp, hoyISO, horaAhora, horaDe, C } from './ui';

export const CONTRAPARTES = [
  { key: 'proveedor', label: 'Proveedor' }, { key: 'cliente', label: 'Cliente' }, { key: 'socio', label: 'Socio' },
  { key: 'contratista', label: 'Contratista' }, { key: 'transportador', label: 'Transportador' },
];
export const OPERACIONES = [
  { key: 'realizada', label: 'Realizada' }, { key: 'rechazada', label: 'Rechazada' }, { key: 'suspendida', label: 'Suspendida en proceso' },
];
export const SENALES = [
  { key: 'origen_destino',         label: 'Origen y destino de operación de comercio' },
  { key: 'frecuencia',             label: 'Frecuencia de operaciones' },
  { key: 'modalidad_transporte',   label: 'Modalidad de transporte' },
  { key: 'listas_restrictivas',    label: 'Coincidencia en listas restrictivas' },
  { key: 'documentacion_alterada', label: 'Documentación alterada, inconsistente o falsa' },
  { key: 'operacion_financiera',   label: 'Operaciones financieras que no concuerdan con la actividad económica o tamaño' },
  { key: 'negativa_informacion',   label: 'Negativa a entregar información o a actualizar datos' },
  { key: 'pago_fraccionado',       label: 'Solicitud de pago fraccionado, en efectivo o a cuentas de terceros' },
  { key: 'otra',                   label: 'Otra, ¿cuál?' },
];

const SiNo = ({ value, onChange, name }) => (
  <div className="flex gap-2">
    {[[true, 'Sí'], [false, 'No']].map(([v, l]) => (
      <Radio key={l} name={name} value={String(v)} checked={value === v} onChange={() => onChange(v)}>{l}</Radio>
    ))}
  </div>
);

export default function FormOperacionInusual({ formato, reporte, registro, onClose, onGuardar }) {
  const anonimo = reporte?.is_anonimo || registro?.reporte?.is_anonimo;
  const r = registro;
  const [f, setF] = useState(() => ({
    fecha: r?.fecha || (reporte ? String(reporte.created_at).slice(0, 10) : hoyISO()),
    hora: r ? (r.hora || '').slice(0, 5) : (reporte ? horaDe(reporte.created_at) : horaAhora()),
    reportado_por: r?.reportado_por ?? (reporte ? (reporte.is_anonimo ? 'Anónimo' : reporte.autor?.full_name || '') : ''),
    reportado_cargo: r?.reportado_cargo || '', reportado_proceso: r?.reportado_proceso || '',
    contraparte_tipo: r?.contraparte_tipo || '', contraparte_nombre: r?.contraparte_nombre || '', persona_asociada: r?.persona_asociada || '',
    tipo_operacion: r?.tipo_operacion || '', descripcion: r?.descripcion || reporte?.descripcion || '',
    senales: r?.senales || [], senal_otra: r?.senal_otra || '',
    soporte_listas: r?.soporte_listas || false, soporte_documentos: r?.soporte_documentos || false,
    soporte_correos: r?.soporte_correos || false, soporte_otros: r?.soporte_otros || '',
    fecha_recepcion: r?.fecha_recepcion || hoyISO(),
    requiere_investigacion: r?.requiere_investigacion ?? null, reporte_uiaf: r?.reporte_uiaf ?? null,
    area: r?.area || reporte?.area || '',
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleSenal = (k) => set('senales', f.senales.includes(k) ? f.senales.filter((x) => x !== k) : [...f.senales, k]);

  const guardar = async () => {
    if (f.descripcion.trim().length < 5) { setErr('La descripción de los hechos es obligatoria.'); return; }
    setSaving(true); setErr(null);
    const t = (s) => (s || '').trim() || null;
    try {
      await onGuardar({
        fecha: f.fecha, hora: f.hora || null,
        reportado_por: anonimo ? 'Anónimo' : (t(f.reportado_por) || 'Anónimo'),
        reportado_cargo: anonimo ? null : t(f.reportado_cargo),
        reportado_proceso: anonimo ? null : t(f.reportado_proceso),
        contraparte_tipo: f.contraparte_tipo || null, contraparte_nombre: t(f.contraparte_nombre), persona_asociada: t(f.persona_asociada),
        tipo_operacion: f.tipo_operacion || null, descripcion: f.descripcion.trim(),
        senales: f.senales, senal_otra: f.senales.includes('otra') ? t(f.senal_otra) : null,
        soporte_listas: f.soporte_listas, soporte_documentos: f.soporte_documentos, soporte_correos: f.soporte_correos,
        soporte_otros: t(f.soporte_otros),
        fecha_recepcion: f.fecha_recepcion, requiere_investigacion: f.requiere_investigacion, reporte_uiaf: f.reporte_uiaf,
        area: f.area || null,
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  const Seccion = ({ children }) => (
    <p style={{ fontSize: 12, fontWeight: 800, color: C.dark, background: '#f6f6ef', borderRadius: 8, padding: '6px 10px', margin: '18px 0 0', letterSpacing: '0.03em', textTransform: 'uppercase' }}>{children}</p>
  );

  return (
    <Modal titulo={registro ? `Registro ${registro.numero}` : 'Diligenciar formato'}
      sub={`${etiquetaFormato(formato)} · Reporte interno de operación inusual`} onClose={onClose} ancho={760}>
      <DesdeReporte reporte={reporte} />

      <Seccion>Información de quien reporta</Seccion>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
        <div><label style={lbl}>Hora</label><input type="time" style={inp} value={f.hora} onChange={(e) => set('hora', e.target.value)} /></div>
        <div><label style={lbl}>Nombre</label>
          <input style={{ ...inp, background: anonimo ? '#f3f4f6' : 'white' }} disabled={anonimo} value={anonimo ? 'Anónimo' : f.reportado_por} onChange={(e) => set('reportado_por', e.target.value)} /></div>
        <div><label style={lbl}>Cargo</label>
          <input style={{ ...inp, background: anonimo ? '#f3f4f6' : 'white' }} disabled={anonimo} value={anonimo ? '' : f.reportado_cargo} onChange={(e) => set('reportado_cargo', e.target.value)} /></div>
        <div><label style={lbl}>Proceso</label>
          <input style={{ ...inp, background: anonimo ? '#f3f4f6' : 'white' }} disabled={anonimo} value={anonimo ? '' : f.reportado_proceso} onChange={(e) => set('reportado_proceso', e.target.value)} /></div>
      </div>

      <Seccion>Datos de la contraparte</Seccion>
      <label style={lbl}>Tipo</label>
      <div className="flex flex-wrap gap-2">
        {CONTRAPARTES.map((c) => <Radio key={c.key} name="contraparte" value={c.key} checked={f.contraparte_tipo === c.key} onChange={() => set('contraparte_tipo', c.key)}>{c.label}</Radio>)}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div><label style={lbl}>Nombre o razón social</label><input style={inp} value={f.contraparte_nombre} onChange={(e) => set('contraparte_nombre', e.target.value)} /></div>
        <div><label style={lbl}>Nombre de persona asociada</label><input style={inp} value={f.persona_asociada} onChange={(e) => set('persona_asociada', e.target.value)} /></div>
      </div>

      <Seccion>Tipo de operación</Seccion>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {OPERACIONES.map((o) => <Radio key={o.key} name="operacion" value={o.key} checked={f.tipo_operacion === o.key} onChange={() => set('tipo_operacion', o.key)}>{o.label}</Radio>)}
      </div>

      <Seccion>Descripción de hechos *</Seccion>
      <textarea rows={4} style={{ ...inp, resize: 'vertical', marginTop: 8 }} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />

      <Seccion>Señal de alerta identificada</Seccion>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2, marginTop: 6 }}>
        {SENALES.map((s) => <Check key={s.key} checked={f.senales.includes(s.key)} onChange={() => toggleSenal(s.key)}>{s.label}</Check>)}
      </div>
      {f.senales.includes('otra') && <input style={{ ...inp, marginTop: 6 }} value={f.senal_otra} onChange={(e) => set('senal_otra', e.target.value)} placeholder="¿Cuál?" />}

      <Seccion>Soporte</Seccion>
      <div className="flex flex-col" style={{ marginTop: 6 }}>
        <Check checked={f.soporte_listas} onChange={(e) => set('soporte_listas', e.target.checked)}>Captura de pantalla de la consulta en listas restrictivas</Check>
        <Check checked={f.soporte_documentos} onChange={(e) => set('soporte_documentos', e.target.checked)}>Documentos comerciales o propuestas inconsistentes</Check>
        <Check checked={f.soporte_correos} onChange={(e) => set('soporte_correos', e.target.checked)}>Correos electrónicos de respaldo</Check>
      </div>
      <input style={{ ...inp, marginTop: 6 }} value={f.soporte_otros} onChange={(e) => set('soporte_otros', e.target.value)} placeholder="Otros soportes…" />

      <Seccion>Recepción (responsable BASC)</Seccion>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div><label style={lbl}>Fecha de recepción</label><input type="date" style={inp} value={f.fecha_recepcion} onChange={(e) => set('fecha_recepcion', e.target.value)} /></div>
        <div><label style={lbl}>Radicado interno</label><input style={{ ...inp, background: '#f3f4f6' }} disabled value={registro?.numero || reporte?.consecutivo || 'Se asigna al guardar'} /></div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div><label style={lbl}>¿Requiere investigación ampliada?</label><SiNo name="inv" value={f.requiere_investigacion} onChange={(v) => set('requiere_investigacion', v)} /></div>
        <div><label style={lbl}>¿Constituye operación sospechosa para reporte externo a la UIAF?</label><SiNo name="uiaf" value={f.reporte_uiaf} onChange={(v) => set('reporte_uiaf', v)} /></div>
      </div>

      <PieForm err={err} saving={saving} editando={!!registro} onClose={onClose} onGuardar={guardar} />
    </Modal>
  );
}