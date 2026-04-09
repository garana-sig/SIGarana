// src/components/modules/SSTBienestar/MatrizPeligros/MatrizPeligrosModal.jsx
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { X, Save, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ACEPTABILIDAD_CONFIG,
  PELIGRO_CLASES,
  NIVELES_DEFICIENCIA,
  NIVELES_EXPOSICION,
  NIVELES_CONSECUENCIAS,
  calcularAceptabilidad,
} from '@/hooks/useMatrizPeligros';

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────
const C = { primary: '#2e5244', mint: '#6dbd96', amber: '#d97706', olive: '#6f7b2c' };

const SEC_COLORS = {
  1: C.primary,
  2: C.olive,
  3: '#185FA5',
  4: C.amber,
  5: '#0F6E56',
  6: '#534AB7',
  7: '#993556',
};

// ─────────────────────────────────────────────────────────────
// FORM INICIAL
// ─────────────────────────────────────────────────────────────
const FORM_VACIO = {
  // Sección 1 — Identificación
  actividad_id:        '',
  tarea:               '',
  rutinario:           true,
  peligro_clase:       '',
  peligro_descripcion: '',
  efectos_posibles:    '',
  // Sección 2 — Controles
  control_fuente:      '',
  control_medio:       '',
  control_trabajador:  '',
  // Sección 3 — Evaluación
  nivel_deficiencia:   2,
  nivel_exposicion:    2,
  interpretacion_np:   '',
  nivel_consecuencias: 25,
  aceptabilidad:       '',   // se calcula automático
  // Sección 4 — Criterios
  num_expuestos:       '',
  por_consecuencias:   '',
  requisito_legal:     '',
  // Sección 5 — Medidas
  medida_eliminacion:    '',
  medida_sustitucion:    '',
  medida_ingenieria:     '',
  medida_administrativa: '',
  medida_epp:            '',
  // Sección 6 — Plan
  fecha_realizacion:   '',
  responsable_plan:    '',
  // Sección 7 — Verificación
  fecha_cierre:            '',
  cierre_efectivo:         false,
  hallazgo_evidencia:      '',
  responsable_verificacion:'',
};

// ─────────────────────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────────────────────
function SecHeader({ num, label, open, onToggle }) {
  const color = SEC_COLORS[num];
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: `${color}12`, transition: 'background 0.1s',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: color, color: '#fff',
        fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>{num}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color, flex: 1, textAlign: 'left' }}>{label}</span>
      {open
        ? <ChevronUp   size={15} color={color} />
        : <ChevronDown size={15} color={color} />}
    </button>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: '#dc2626' }}>{error}</span>}
    </div>
  );
}

function TA({ value, onChange, placeholder, rows = 2, disabled }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{
        width: '100%', padding: '7px 10px', fontSize: 12,
        border: '0.5px solid #d1d5db', borderRadius: 8,
        resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
        background: disabled ? '#f9fafb' : '#fff',
        color: '#1f2937', outline: 'none',
      }}
    />
  );
}

function Sel({ value, onChange, options, placeholder, disabled, error }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%', padding: '7px 10px', fontSize: 12,
        border: `0.5px solid ${error ? '#dc2626' : '#d1d5db'}`, borderRadius: 8,
        background: disabled ? '#f9fafb' : '#fff',
        color: value ? '#1f2937' : '#9ca3af', cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
      }}
    >
      <option value="">{placeholder || '— Seleccionar —'}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Mini display de la fórmula GTC-45
function FormulaGTC({ nd, ne, nc, aceptabilidad }) {
  const np = nd * ne;
  const nr = np * nc;
  const acept = aceptabilidad || calcularAceptabilidad(nd, ne, nc);
  const cfg   = ACEPTABILIDAD_CONFIG[acept] || ACEPTABILIDAD_CONFIG.III;

  return (
    <div style={{
      background: '#f9fafb', borderRadius: 10, padding: '12px 16px',
      border: '0.5px solid #e5e7eb',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
        Cálculo automático GTC-45
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {[
          { n: nd, l: 'ND' }, { sep: '×' },
          { n: ne, l: 'NE' }, { sep: '=' },
          { n: np, l: 'NP', bold: true }, { sep: '×' },
          { n: nc, l: 'NC' }, { sep: '=' },
          { n: nr, l: 'NR', result: true },
        ].map((item, i) => {
          if (item.sep) return <span key={i} style={{ fontSize: 18, color: '#9ca3af', fontWeight: 300 }}>{item.sep}</span>;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: item.result ? cfg.bg : '#fff',
              border: `1px solid ${item.result ? cfg.border : '#e5e7eb'}`,
              borderRadius: 8, padding: '6px 14px', minWidth: 52,
            }}>
              <span style={{ fontSize: item.result ? 20 : 18, fontWeight: 700, color: item.result ? cfg.color : '#1f2937' }}>
                {item.n}
              </span>
              <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600 }}>{item.l}</span>
            </div>
          );
        })}
        <div style={{
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderRadius: 20, padding: '6px 14px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function MatrizPeligrosModal({ peligro, hook, onClose }) {
  const esEdicion = !!peligro;
  const {
    procesos, secciones, actividades,
    createPeligro, updatePeligro,
    canEdit,
  } = hook;

  const [form,    setForm]    = useState(FORM_VACIO);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [secOpen, setSecOpen] = useState({ 1:true, 2:true, 3:true, 4:false, 5:false, 6:false, 7:false });

  // Secciones filtradas en cascada dentro del modal
  const [selProceso,  setSelProceso]  = useState('');
  const [selSeccion,  setSelSeccion]  = useState('');
  const secsFilt  = secciones.filter(s => s.proceso_id === selProceso);
  const actsFilt  = actividades.filter(a => a.seccion_id === selSeccion);

  // Calcular NR en tiempo real
  const nd   = Number(form.nivel_deficiencia)  || 0;
  const ne   = Number(form.nivel_exposicion)   || 0;
  const nc   = Number(form.nivel_consecuencias)|| 0;
  const acept = form.aceptabilidad || calcularAceptabilidad(nd, ne, nc);

  // ── Cargar datos al editar ──────────────────────────────
  useEffect(() => {
    if (!peligro) { setForm(FORM_VACIO); return; }

    // Reconstruir selección de cascada
    const act  = actividades.find(a => a.id === peligro.actividad_id);
    const sec  = act ? secciones.find(s => s.id === act.seccion_id) : null;
    const proc = sec ? procesos.find(p => p.id === sec.proceso_id) : null;

    if (proc) setSelProceso(proc.id);
    if (sec)  setSelSeccion(sec.id);

    setForm({
      actividad_id:             peligro.actividad_id        || '',
      tarea:                    peligro.tarea               || '',
      rutinario:                peligro.rutinario           ?? true,
      peligro_clase:            peligro.peligro_clase       || '',
      peligro_descripcion:      peligro.peligro_descripcion || '',
      efectos_posibles:         peligro.efectos_posibles    || '',
      control_fuente:           peligro.control_fuente      || '',
      control_medio:            peligro.control_medio       || '',
      control_trabajador:       peligro.control_trabajador  || '',
      nivel_deficiencia:        peligro.nivel_deficiencia   ?? 2,
      nivel_exposicion:         peligro.nivel_exposicion    ?? 2,
      interpretacion_np:        peligro.interpretacion_np   || '',
      nivel_consecuencias:      peligro.nivel_consecuencias ?? 25,
      aceptabilidad:            peligro.aceptabilidad       || '',
      num_expuestos:            peligro.num_expuestos != null ? String(peligro.num_expuestos) : '',
      por_consecuencias:        peligro.por_consecuencias   || '',
      requisito_legal:          peligro.requisito_legal     || '',
      medida_eliminacion:       peligro.medida_eliminacion    || '',
      medida_sustitucion:       peligro.medida_sustitucion    || '',
      medida_ingenieria:        peligro.medida_ingenieria     || '',
      medida_administrativa:    peligro.medida_administrativa || '',
      medida_epp:               peligro.medida_epp            || '',
      fecha_realizacion:        peligro.fecha_realizacion     || '',
      responsable_plan:         peligro.responsable_plan      || '',
      fecha_cierre:             peligro.fecha_cierre          || '',
      cierre_efectivo:          peligro.cierre_efectivo       ?? false,
      hallazgo_evidencia:       peligro.hallazgo_evidencia    || '',
      responsable_verificacion: peligro.responsable_verificacion || '',
    });
  }, [peligro]);

  const set = (field) => (value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleSec = (n) => setSecOpen(prev => ({ ...prev, [n]: !prev[n] }));

  // ── Validación ─────────────────────────────────────────
  const validar = () => {
    const e = {};
    if (!form.actividad_id)        e.actividad_id        = 'Selecciona una actividad';
    if (!form.peligro_clase)       e.peligro_clase       = 'Selecciona la clasificación';
    if (!form.peligro_descripcion?.trim()) e.peligro_descripcion = 'Ingresa la descripción del peligro';
    if (!form.nivel_deficiencia && form.nivel_deficiencia !== 0) e.nivel_deficiencia = 'Requerido';
    if (!form.nivel_exposicion)    e.nivel_exposicion    = 'Requerido';
    if (!form.nivel_consecuencias) e.nivel_consecuencias = 'Requerido';

    // Abrir secciones con errores
    if (e.actividad_id || e.peligro_clase || e.peligro_descripcion)
      setSecOpen(prev => ({ ...prev, 1: true }));
    if (e.nivel_deficiencia || e.nivel_exposicion || e.nivel_consecuencias)
      setSecOpen(prev => ({ ...prev, 3: true }));

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Guardar ─────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!validar()) return;

    setSaving(true);
    const payload = {
      ...form,
      aceptabilidad: acept,
      num_expuestos: form.num_expuestos ? Number(form.num_expuestos) : null,
    };

    const result = esEdicion
      ? await updatePeligro(peligro.id, payload)
      : await createPeligro(payload);

    setSaving(false);

    if (result.success) {
      onClose(true);
    } else {
      setErrors({ _general: result.error });
    }
  };

  const cfgAcept = ACEPTABILIDAD_CONFIG[acept] || ACEPTABILIDAD_CONFIG.III;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '20px 16px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 780,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>

        {/* ── Cabecera ─────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.amber}, ${C.amber}cc)`,
          borderRadius: '18px 18px 0 0', padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: 10,
              width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                {esEdicion ? 'Editar peligro' : 'Nuevo peligro GTC-45'}
              </h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                Matriz de Identificación de Peligros · RE-GS-10
              </p>
            </div>
          </div>
          <button onClick={() => onClose(false)} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* ── Cuerpo scrollable ─────────────────────────── */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {errors._general && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#b91c1c' }}>
              {errors._general}
            </div>
          )}

          {/* ══ SECCIÓN 1: Identificación ════════════════ */}
          <SecHeader num={1} label="Identificación del peligro" open={secOpen[1]} onToggle={() => toggleSec(1)} />
          {secOpen[1] && (
            <div style={{ padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Cascada proceso → sección → actividad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <Field label="Proceso" required>
                  <Sel
                    value={selProceso}
                    onChange={v => { setSelProceso(v); setSelSeccion(''); set('actividad_id')(''); }}
                    options={procesos.map(p => ({ value: p.id, label: p.nombre }))}
                    placeholder="— Proceso —"
                  />
                </Field>
                <Field label="Sección" required>
                  <Sel
                    value={selSeccion}
                    onChange={v => { setSelSeccion(v); set('actividad_id')(''); }}
                    options={secsFilt.map(s => ({ value: s.id, label: s.nombre }))}
                    placeholder="— Sección —"
                    disabled={!selProceso}
                  />
                </Field>
                <Field label="Actividad" required error={errors.actividad_id}>
                  <Sel
                    value={form.actividad_id}
                    onChange={set('actividad_id')}
                    options={actsFilt.map(a => ({ value: a.id, label: a.nombre }))}
                    placeholder="— Actividad —"
                    disabled={!selSeccion}
                    error={errors.actividad_id}
                  />
                </Field>
              </div>

              <Field label="Tarea específica">
                <TA value={form.tarea} onChange={set('tarea')} placeholder="Describir los pasos de la tarea..." rows={2} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Clasificación del peligro" required error={errors.peligro_clase}>
                  <Sel
                    value={form.peligro_clase}
                    onChange={set('peligro_clase')}
                    options={PELIGRO_CLASES.map(c => ({ value: c, label: c }))}
                    placeholder="— Tipo de peligro —"
                    error={errors.peligro_clase}
                  />
                </Field>
                <Field label="Rutinario">
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    {[true, false].map(v => (
                      <label key={String(v)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        background: form.rutinario === v ? `${C.primary}12` : '#f9fafb',
                        border: `1px solid ${form.rutinario === v ? C.primary : '#e5e7eb'}`,
                        fontWeight: form.rutinario === v ? 600 : 400,
                        color: form.rutinario === v ? C.primary : '#6b7280',
                      }}>
                        <input type="radio" style={{ display:'none' }} checked={form.rutinario === v}
                          onChange={() => set('rutinario')(v)} />
                        {v ? 'Sí' : 'No'}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Descripción del peligro" required error={errors.peligro_descripcion}>
                <TA
                  value={form.peligro_descripcion}
                  onChange={set('peligro_descripcion')}
                  placeholder="Ej: Fibras por cortar y manipular telas..."
                  rows={2}
                />
                {errors.peligro_descripcion && <span style={{ fontSize: 11, color: '#dc2626' }}>{errors.peligro_descripcion}</span>}
              </Field>

              <Field label="Efectos posibles">
                <TA value={form.efectos_posibles} onChange={set('efectos_posibles')} placeholder="Ej: Enfermedades respiratorias, alergias..." rows={2} />
              </Field>
            </div>
          )}

          {/* ══ SECCIÓN 2: Controles existentes ═════════ */}
          <SecHeader num={2} label="Controles existentes" open={secOpen[2]} onToggle={() => toggleSec(2)} />
          {secOpen[2] && (
            <div style={{ padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="En la fuente">
                <TA value={form.control_fuente} onChange={set('control_fuente')} placeholder="Controles aplicados en la fuente del peligro..." />
              </Field>
              <Field label="En el medio">
                <TA value={form.control_medio} onChange={set('control_medio')} placeholder="Controles aplicados en el medio de transmisión..." />
              </Field>
              <Field label="En el trabajador">
                <TA value={form.control_trabajador} onChange={set('control_trabajador')} placeholder="Controles aplicados directamente al trabajador..." />
              </Field>
            </div>
          )}

          {/* ══ SECCIÓN 3: Evaluación del riesgo ════════ */}
          <SecHeader num={3} label="Evaluación del riesgo GTC-45" open={secOpen[3]} onToggle={() => toggleSec(3)} />
          {secOpen[3] && (
            <div style={{ padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <Field label="Nivel de Deficiencia (ND)" required error={errors.nivel_deficiencia}>
                  <Sel
                    value={String(form.nivel_deficiencia)}
                    onChange={v => set('nivel_deficiencia')(Number(v))}
                    options={NIVELES_DEFICIENCIA.map(n => ({ value: String(n.value), label: n.label }))}
                    error={errors.nivel_deficiencia}
                  />
                </Field>
                <Field label="Nivel de Exposición (NE)" required error={errors.nivel_exposicion}>
                  <Sel
                    value={String(form.nivel_exposicion)}
                    onChange={v => set('nivel_exposicion')(Number(v))}
                    options={NIVELES_EXPOSICION.map(n => ({ value: String(n.value), label: n.label }))}
                    error={errors.nivel_exposicion}
                  />
                </Field>
                <Field label="Nivel de Consecuencias (NC)" required error={errors.nivel_consecuencias}>
                  <Sel
                    value={String(form.nivel_consecuencias)}
                    onChange={v => set('nivel_consecuencias')(Number(v))}
                    options={NIVELES_CONSECUENCIAS.map(n => ({ value: String(n.value), label: n.label }))}
                    error={errors.nivel_consecuencias}
                  />
                </Field>
              </div>

              {/* Fórmula calculada en tiempo real */}
              <FormulaGTC nd={nd} ne={ne} nc={nc} aceptabilidad={form.aceptabilidad} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Interpretación NP">
                  <Input
                    value={form.interpretacion_np}
                    onChange={e => set('interpretacion_np')(e.target.value)}
                    placeholder="Ej: (M) Media, (MA) Muy Alta..."
                    style={{ fontSize: 12 }}
                  />
                </Field>
                <Field label="Aceptabilidad (se calcula automáticamente)">
                  <Sel
                    value={form.aceptabilidad || acept}
                    onChange={set('aceptabilidad')}
                    options={Object.entries(ACEPTABILIDAD_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ══ SECCIÓN 4: Criterios ════════════════════ */}
          <SecHeader num={4} label="Criterios para evaluar controles" open={secOpen[4]} onToggle={() => toggleSec(4)} />
          {secOpen[4] && (
            <div style={{ padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Número de expuestos">
                  <Input
                    type="number" min="0" value={form.num_expuestos}
                    onChange={e => set('num_expuestos')(e.target.value)}
                    placeholder="0" style={{ fontSize: 12 }}
                  />
                </Field>
                <Field label="Por consecuencias">
                  <Input
                    value={form.por_consecuencias}
                    onChange={e => set('por_consecuencias')(e.target.value)}
                    placeholder="Ej: DAÑO MODERADO, DAÑO GRAVE..."
                    style={{ fontSize: 12 }}
                  />
                </Field>
              </div>
              <Field label="Requisito legal específico asociado">
                <TA value={form.requisito_legal} onChange={set('requisito_legal')} placeholder="Ej: Ley 9 1979 art 122-124 / Res 2400 1979..." />
              </Field>
            </div>
          )}

          {/* ══ SECCIÓN 5: Medidas ══════════════════════ */}
          <SecHeader num={5} label="Medidas de intervención" open={secOpen[5]} onToggle={() => toggleSec(5)} />
          {secOpen[5] && (
            <div style={{ padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Eliminación">
                  <TA value={form.medida_eliminacion} onChange={set('medida_eliminacion')} placeholder="Medidas de eliminación del peligro..." />
                </Field>
                <Field label="Sustitución">
                  <TA value={form.medida_sustitucion} onChange={set('medida_sustitucion')} placeholder="Sustitución por algo menos peligroso..." />
                </Field>
              </div>
              <Field label="Controles de ingeniería">
                <TA value={form.medida_ingenieria} onChange={set('medida_ingenieria')} placeholder="Guardas, ventilación, aislamiento..." />
              </Field>
              <Field label="Controles administrativos / señalización / advertencia">
                <TA value={form.medida_administrativa} onChange={set('medida_administrativa')} placeholder="Capacitaciones, procedimientos, señalización..." rows={3} />
              </Field>
              <Field label="EPP (Equipos de Protección Personal)">
                <TA value={form.medida_epp} onChange={set('medida_epp')} placeholder="Casco, guantes, tapabocas..." />
              </Field>
            </div>
          )}

          {/* ══ SECCIÓN 6: Plan de acción ═══════════════ */}
          <SecHeader num={6} label="Plan de acción" open={secOpen[6]} onToggle={() => toggleSec(6)} />
          {secOpen[6] && (
            <div style={{ padding: '4px 4px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Fecha de realización">
                <Input type="date" value={form.fecha_realizacion} onChange={e => set('fecha_realizacion')(e.target.value)} style={{ fontSize: 12 }} />
              </Field>
              <Field label="Responsable">
                <Input value={form.responsable_plan} onChange={e => set('responsable_plan')(e.target.value)} placeholder="Nombre del responsable" style={{ fontSize: 12 }} />
              </Field>
            </div>
          )}

          {/* ══ SECCIÓN 7: Verificación ═════════════════ */}
          <SecHeader num={7} label="Verificación" open={secOpen[7]} onToggle={() => toggleSec(7)} />
          {secOpen[7] && (
            <div style={{ padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Fecha de cierre">
                  <Input type="date" value={form.fecha_cierre} onChange={e => set('fecha_cierre')(e.target.value)} style={{ fontSize: 12 }} />
                </Field>
                <Field label="¿Cierre efectivo?">
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    {[true, false].map(v => (
                      <label key={String(v)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        background: form.cierre_efectivo === v ? `${C.primary}12` : '#f9fafb',
                        border: `1px solid ${form.cierre_efectivo === v ? C.primary : '#e5e7eb'}`,
                        fontWeight: form.cierre_efectivo === v ? 600 : 400,
                        color: form.cierre_efectivo === v ? C.primary : '#6b7280',
                      }}>
                        <input type="radio" style={{ display:'none' }} checked={form.cierre_efectivo === v}
                          onChange={() => set('cierre_efectivo')(v)} />
                        {v ? 'Sí' : 'No'}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Hallazgo / Evidencia de verificación">
                <TA value={form.hallazgo_evidencia} onChange={set('hallazgo_evidencia')} placeholder="Describe la evidencia del cierre..." rows={3} />
              </Field>
              <Field label="Responsable de verificación">
                <Input value={form.responsable_verificacion} onChange={e => set('responsable_verificacion')(e.target.value)} placeholder="Nombre del responsable de verificación" style={{ fontSize: 12 }} />
              </Field>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────── */}
        <div style={{
          padding: '14px 24px', borderTop: '0.5px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: '#fafafa', borderRadius: '0 0 18px 18px',
        }}>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={saving}
            style={{ background: C.amber, color: '#fff', border: 'none', minWidth: 120 }}
          >
            {saving
              ? <><Loader2 size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Guardando...</>
              : <><Save size={14} style={{ marginRight: 6 }} />{esEdicion ? 'Guardar cambios' : 'Crear peligro'}</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}