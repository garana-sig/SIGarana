// src/components/modules/MejoramientoContinuo/Reportes/FormSugerencia.jsx
// Formulario RE-GH-05 · Buzón de sugerencias (queja, reclamo, sugerencia, felicitación)
import { useState } from 'react';
import { etiquetaFormato } from '@/hooks/useFormatoVinculado';
import { Modal, Radio, PieForm, DesdeReporte, lbl, inp, hoyISO, horaAhora, horaDe } from './ui';

export const CLASIFICACIONES = [
  { key: 'queja',        label: 'Queja' },
  { key: 'reclamo',      label: 'Reclamo' },
  { key: 'sugerencia',   label: 'Sugerencia' },
  { key: 'felicitacion', label: 'Felicitación' },
];

export default function FormSugerencia({ formato, reporte, registro, onClose, onGuardar }) {
  const anonimo = reporte?.is_anonimo || registro?.reporte?.is_anonimo;
  const [f, setF] = useState(() => registro ? {
    fecha: registro.fecha, hora: (registro.hora || '').slice(0, 5), clasificacion: registro.clasificacion,
    descripcion: registro.descripcion, respuesta: registro.respuesta || '', reportado_por: registro.reportado_por, area: registro.area || '',
  } : {
    fecha: reporte ? String(reporte.created_at).slice(0, 10) : hoyISO(),
    hora: reporte ? horaDe(reporte.created_at) : horaAhora(),
    clasificacion: 'sugerencia', descripcion: reporte?.descripcion || '', respuesta: '',
    reportado_por: reporte ? (reporte.is_anonimo ? 'Anónimo' : reporte.autor?.full_name || '') : '',
    area: reporte?.area || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (f.descripcion.trim().length < 5) { setErr('La descripción del caso es obligatoria.'); return; }
    setSaving(true); setErr(null);
    try {
      await onGuardar({
        fecha: f.fecha, hora: f.hora || null, clasificacion: f.clasificacion,
        descripcion: f.descripcion.trim(), respuesta: f.respuesta.trim() || null,
        reportado_por: anonimo ? 'Anónimo' : (f.reportado_por.trim() || 'Anónimo'),
        area: f.area || null,
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal titulo={registro ? `Registro ${registro.numero}` : 'Diligenciar formato'}
      sub={`${etiquetaFormato(formato)} · Buzón de sugerencias`} onClose={onClose} ancho={680}>
      <DesdeReporte reporte={reporte} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
        <div><label style={lbl}>Hora</label><input type="time" style={inp} value={f.hora} onChange={(e) => set('hora', e.target.value)} /></div>
        <div>
          <label style={lbl}>Quien la envía <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
          <input style={{ ...inp, background: anonimo ? '#f3f4f6' : 'white' }} value={anonimo ? 'Anónimo' : f.reportado_por} disabled={anonimo}
            onChange={(e) => set('reportado_por', e.target.value)} placeholder="Anónimo" />
        </div>
      </div>

      <label style={lbl}>Clasificación *</label>
      <div className="flex flex-wrap gap-2">
        {CLASIFICACIONES.map((c) => (
          <Radio key={c.key} name="clasif" value={c.key} checked={f.clasificacion === c.key} onChange={() => set('clasificacion', c.key)}>{c.label}</Radio>
        ))}
      </div>

      <label style={lbl}>Descripción del caso *</label>
      <textarea rows={5} style={{ ...inp, resize: 'vertical' }} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />

      <label style={lbl}>Gestión / respuesta dada <span style={{ fontWeight: 400, color: '#9ca3af' }}>(seguimiento interno, no va en el formato)</span></label>
      <textarea rows={3} style={{ ...inp, resize: 'vertical' }} value={f.respuesta} onChange={(e) => set('respuesta', e.target.value)} />

      <PieForm err={err} saving={saving} editando={!!registro} onClose={onClose} onGuardar={guardar} />
    </Modal>
  );
}