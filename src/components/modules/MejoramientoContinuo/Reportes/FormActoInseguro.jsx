// src/components/modules/MejoramientoContinuo/Reportes/FormActoInseguro.jsx
// Formulario RE-GS-02 · Reporte de actos y/o condiciones inseguras o condiciones de salud
import { useState } from 'react';
import { etiquetaFormato } from '@/hooks/useFormatoVinculado';
import { Modal, Check, PieForm, DesdeReporte, lbl, inp, hoyISO } from './ui';

export const EPP_OPCIONES = [
  { key: 'tapabocas',           label: 'Tapabocas' },
  { key: 'guante_metalico',     label: 'Guante metálico' },
  { key: 'cabello_sin_recoger', label: 'Cabello sin recoger' },
  { key: 'medias_ortopedicas',  label: 'Medias ortopédicas' },
  { key: 'dotacion',            label: 'Dotación' },
  { key: 'uso_accesorios',      label: 'Uso de accesorios' },
  { key: 'tapaoidos',           label: 'Tapaoídos' },
  { key: 'guante_tela',         label: 'Guante de tela' },
  { key: 'otro',                label: 'Otro, ¿cuál?' },
];

export default function FormActoInseguro({ formato, reporte, registro, onClose, onGuardar }) {
  const anonimo = reporte?.is_anonimo || registro?.reporte?.is_anonimo;
  const [f, setF] = useState(() => registro ? {
    fecha: registro.fecha, reportado_por: registro.reportado_por, area: registro.area || '',
    es_acto_inseguro: registro.es_acto_inseguro, es_condicion_insegura: registro.es_condicion_insegura,
    es_condicion_salud: registro.es_condicion_salud, descripcion: registro.descripcion,
    epp_omitidos: registro.epp_omitidos || [], epp_otro: registro.epp_otro || '', correctivos: registro.correctivos || '',
  } : {
    fecha: reporte ? String(reporte.created_at).slice(0, 10) : hoyISO(),
    reportado_por: reporte ? (reporte.is_anonimo ? 'Anónimo' : reporte.autor?.full_name || '') : '',
    area: reporte?.area || '', es_acto_inseguro: false, es_condicion_insegura: false, es_condicion_salud: false,
    descripcion: reporte?.descripcion || '', epp_omitidos: [], epp_otro: '', correctivos: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleEpp = (k) => set('epp_omitidos', f.epp_omitidos.includes(k) ? f.epp_omitidos.filter((x) => x !== k) : [...f.epp_omitidos, k]);

  const guardar = async () => {
    if (!f.es_acto_inseguro && !f.es_condicion_insegura && !f.es_condicion_salud) { setErr('Marca qué se reporta: acto inseguro, condición insegura o condición de salud.'); return; }
    if (f.descripcion.trim().length < 5) { setErr('La descripción es obligatoria.'); return; }
    if (!anonimo && !f.reportado_por.trim()) { setErr('Escribe el nombre de quien reporta.'); return; }
    setSaving(true); setErr(null);
    try {
      await onGuardar({
        fecha: f.fecha,
        reportado_por: anonimo ? 'Anónimo' : f.reportado_por.trim(),
        area: f.area || null,
        es_acto_inseguro: f.es_acto_inseguro, es_condicion_insegura: f.es_condicion_insegura, es_condicion_salud: f.es_condicion_salud,
        descripcion: f.descripcion.trim(),
        epp_omitidos: f.epp_omitidos,
        epp_otro: f.epp_omitidos.includes('otro') ? (f.epp_otro.trim() || null) : null,
        correctivos: f.correctivos.trim() || null,
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal titulo={registro ? `Registro ${registro.numero}` : 'Diligenciar formato'}
      sub={`${etiquetaFormato(formato)} · Reporte de actos y/o condiciones inseguras o condiciones de salud`}
      onClose={onClose} ancho={720}>
      <DesdeReporte reporte={reporte} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
        <div>
          <label style={lbl}>Nombre de quien reporta</label>
          <input style={{ ...inp, background: anonimo ? '#f3f4f6' : 'white' }} value={anonimo ? 'Anónimo' : f.reportado_por} disabled={anonimo}
            onChange={(e) => set('reportado_por', e.target.value)} placeholder="Nombre" />
        </div>
        <div><label style={lbl}>Área</label><input style={inp} value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="Área o proceso" /></div>
      </div>

      <label style={lbl}>¿Qué se reporta? *</label>
      <div className="flex flex-wrap gap-1">
        <Check checked={f.es_acto_inseguro} onChange={(e) => set('es_acto_inseguro', e.target.checked)}>Acto inseguro</Check>
        <Check checked={f.es_condicion_insegura} onChange={(e) => set('es_condicion_insegura', e.target.checked)}>Condición insegura</Check>
        <Check checked={f.es_condicion_salud} onChange={(e) => set('es_condicion_salud', e.target.checked)}>Condición de salud</Check>
      </div>

      <label style={lbl}>Descripción del acto y/o condición insegura o condición de salud *</label>
      <textarea rows={4} style={{ ...inp, resize: 'vertical' }} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />

      <label style={lbl}>Omisión de uso de elementos de protección personal y normas de seguridad</label>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 2 }}>
        {EPP_OPCIONES.map((o) => (
          <Check key={o.key} checked={f.epp_omitidos.includes(o.key)} onChange={() => toggleEpp(o.key)}>{o.label}</Check>
        ))}
      </div>
      {f.epp_omitidos.includes('otro') && (
        <input style={{ ...inp, marginTop: 6 }} value={f.epp_otro} onChange={(e) => set('epp_otro', e.target.value)} placeholder="¿Cuál?" />
      )}

      <label style={lbl}>Correctivos emprendidos o propuestos / comportamiento a mejorar</label>
      <textarea rows={4} style={{ ...inp, resize: 'vertical' }} value={f.correctivos} onChange={(e) => set('correctivos', e.target.value)} />

      <PieForm err={err} saving={saving} editando={!!registro} onClose={onClose} onGuardar={guardar} />
    </Modal>
  );
}