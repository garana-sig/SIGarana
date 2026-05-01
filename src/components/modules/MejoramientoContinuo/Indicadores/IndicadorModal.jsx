// src/components/modules/MejoramientoContinuo/Indicadores/IndicadorModal.jsx
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Loader2, X, Save, Plus, Trash2, BarChart2, Info, Pencil, Check } from 'lucide-react';
import {
  PERSPECTIVES, FREQUENCIES, INDICATOR_TYPES, INDICATOR_SUBTYPES,
  validateFormulaExpression, evaluateFormula, getMeasurementStatus,
} from '@/hooks/useIndicadores';
import { useProcesses } from '@/hooks/useDocuments';

// ─── Sección coloreada (mismo patrón que AccionMejoraModal) ──────────────────
function Section({ title, color = '#2e5244', children }) {
  return (
    <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: color }}>
      <div className="px-4 py-2 text-white text-xs font-bold uppercase tracking-wider"
        style={{ backgroundColor: color }}>
        {title}
      </div>
      <div className="p-4 space-y-3 bg-white">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2e5244' }}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

const inputStyle = {
  fontSize: 12, height: 32, borderColor: '#D1D5DB',
};
const taStyle = {
  fontSize: 12, borderColor: '#D1D5DB', borderRadius: 6,
  padding: '6px 10px', width: '100%', outline: 'none',
  border: '1px solid #D1D5DB', resize: 'vertical',
};

const FORM_INICIAL = {
  indicator_type:        'bsc',
  perspective:           '',
  strategic_initiative:  '',
  objective:             '',
  indicator_name:        '',
  indicator_subtype:     'RESULTADOS',
  formula:               '',
  formula_expression:    '',
  formula_variables:     [],        // [{ key: 'a', label: 'Ingresos totales' }]
  process_id:            '',        // proceso fuente (de tabla process)
  definition:            '',
  goal:                  '',

  disclosed_to:          '',
  responsible_id:        '',
  frequency:             'mensual',
  measurement_start_date: '',
  measurement_end_date:  '',
};

export default function IndicadorModal({
  mode, indicator, profiles = [],
  onSave, onClose,
  fetchMeasurements, deleteMeasurement, updateMeasurement,
}) {
  const isView   = mode === 'view';
  const isEdit   = mode === 'edit';
  const isCreate = mode === 'create';

  const { processes } = useProcesses();

  const [form,        setForm]        = useState(FORM_INICIAL);
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState({});
  const [formulaErr,  setFormulaErr]  = useState('');
  const [measurements,   setMeasurements]   = useState([]);
  const [editingMId,     setEditingMId]     = useState(null);  // id de la medición en edición
  const [editingMData,   setEditingMData]   = useState({});    // datos editados
  const [loadingMed,  setLoadingMed]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('form'); // form | history

  // ── Cargar datos al abrir ──────────────────────────────────────────────────
  useEffect(() => {
    if (indicator && (isEdit || isView)) {
      setForm({
        indicator_type:        indicator.indicator_type        || 'bsc',
        perspective:           indicator.perspective           || '',
        strategic_initiative:  indicator.strategic_initiative  || '',
        objective:             indicator.objective             || '',
        indicator_name:        indicator.indicator_name        || '',
        indicator_subtype:     indicator.indicator_subtype     || 'RESULTADOS',
        formula:               indicator.formula               || '',
        formula_expression:    indicator.formula_expression    || '',
        formula_variables:     indicator.formula_variables     || [],
        process_id:            indicator.process_id            || '',
        definition:            indicator.definition            || '',
        goal:                  indicator.goal                  || '',

        disclosed_to:          indicator.disclosed_to          || '',
        responsible_id:        indicator.responsible_id        || '',
        frequency:             indicator.frequency             || 'mensual',
        measurement_start_date: indicator.measurement_start_date || '',
        measurement_end_date:  indicator.measurement_end_date  || '',
      });
    }
  }, [indicator, mode]);

  // ── Cargar historial de mediciones al ver ──────────────────────────────────
  useEffect(() => {
    if ((isView || isEdit) && indicator && activeTab === 'history' && fetchMeasurements) {
      setLoadingMed(true);
      fetchMeasurements(indicator.id, indicator.goal_direction || 'asc').then(data => {
        setMeasurements(data);
        setLoadingMed(false);
      });
    }
  }, [activeTab, indicator]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ── Variables de fórmula ───────────────────────────────────────────────────
  const addVariable = () => {
    const next = String.fromCharCode(97 + form.formula_variables.length); // a, b, c...
    set('formula_variables', [...form.formula_variables, { key: next, label: '' }]);
  };

  const updateVariable = (idx, field, value) => {
    const updated = form.formula_variables.map((v, i) =>
      i === idx ? { ...v, [field]: value } : v
    );
    set('formula_variables', updated);
  };

  const removeVariable = (idx) => {
    set('formula_variables', form.formula_variables.filter((_, i) => i !== idx));
  };

  // ── Validar fórmula en tiempo real ────────────────────────────────────────
  const handleFormulaBlur = () => {
    if (!form.formula_expression) { setFormulaErr(''); return; }
    const v = validateFormulaExpression(form.formula_expression, form.formula_variables);
    setFormulaErr(v.valid ? '' : v.error);
  };

  // ── Validación del formulario ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.objective.trim())      e.objective      = 'Requerido';
    if (!form.indicator_name.trim()) e.indicator_name = 'Requerido';
    if (!form.goal.trim())           e.goal           = 'Requerido';
    if (!form.responsible_id)        e.responsible_id = 'Requerido';
    if (form.indicator_type === 'bsc' && !form.perspective) e.perspective = 'Requerido para BSC';

    if (form.formula_expression) {
      const v = validateFormulaExpression(form.formula_expression, form.formula_variables);
      if (!v.valid) e.formula_expression = v.error;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const title = isCreate ? 'Nuevo Indicador' : isEdit ? 'Editar Indicador' : `Indicador ${indicator?.consecutive}`;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, padding:16,
    }}>
      <div style={{
        backgroundColor:'white', borderRadius:12, width:'100%', maxWidth:860,
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'14px 20px', borderBottom:'1px solid #E5E7EB',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          backgroundColor:'#2e5244', borderRadius:'12px 12px 0 0',
        }}>
          <div>
            <h3 style={{ color:'white', fontWeight:700, fontSize:15, margin:0 }}>{title}</h3>
            {!isCreate && (
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, margin:0 }}>
                {indicator?.consecutive} · {FREQUENCIES.find(f => f.value === indicator?.frequency)?.label}
              </p>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Tabs (solo en view/edit) */}
            {!isCreate && (
              <div style={{ display:'flex', gap:4 }}>
                {[
                  { key:'form',    label:'📋 Datos' },
                  { key:'history', label:'📊 Mediciones' },
                ].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    style={{
                      padding:'4px 12px', fontSize:11, borderRadius:6, border:'none',
                      cursor:'pointer',
                      backgroundColor: activeTab === t.key ? 'rgba(255,255,255,0.25)' : 'transparent',
                      color:'white', fontWeight: activeTab === t.key ? 700 : 400,
                    }}>{t.label}</button>
                ))}
              </div>
            )}
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:6,
                cursor:'pointer', color:'white', padding:6, display:'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Cuerpo ── */}
        <div style={{ overflowY:'auto', padding:20, flex:1 }}>

          {/* ════ TAB: FORMULARIO ════ */}
          {activeTab === 'form' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* ── Sección 1: Identificación ── */}
              <Section title="1. Identificación" color="#2e5244">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

                  <Field label="Tipo de Indicador" required>
                    <select value={form.indicator_type} disabled={isView}
                      onChange={e => set('indicator_type', e.target.value)}
                      style={{ ...inputStyle, width:'100%', borderRadius:6, border:'1px solid #D1D5DB', padding:'0 8px' }}>
                      {INDICATOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>

                  {form.indicator_type === 'bsc' && (
                    <Field label="Perspectiva" required>
                      <select value={form.perspective} disabled={isView}
                        onChange={e => set('perspective', e.target.value)}
                        style={{ ...inputStyle, width:'100%', borderRadius:6, border:`1px solid ${errors.perspective ? '#EF4444' : '#D1D5DB'}`, padding:'0 8px' }}>
                        <option value="">Seleccionar...</option>
                        {PERSPECTIVES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      {errors.perspective && <p style={{ color:'#EF4444', fontSize:10 }}>{errors.perspective}</p>}
                    </Field>
                  )}

                  <Field label="Tipo de Resultado">
                    <select value={form.indicator_subtype} disabled={isView}
                      onChange={e => set('indicator_subtype', e.target.value)}
                      style={{ ...inputStyle, width:'100%', borderRadius:6, border:'1px solid #D1D5DB', padding:'0 8px' }}>
                      {INDICATOR_SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Frecuencia de Medición" required>
                    <select value={form.frequency} disabled={isView}
                      onChange={e => set('frequency', e.target.value)}
                      style={{ ...inputStyle, width:'100%', borderRadius:6, border:'1px solid #D1D5DB', padding:'0 8px' }}>
                      {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Inicio período medición">
                    <Input type="date" value={form.measurement_start_date} disabled={isView}
                      onChange={e => set('measurement_start_date', e.target.value)} style={inputStyle} />
                  </Field>

                  <Field label="Fin período medición">
                    <Input type="date" value={form.measurement_end_date} disabled={isView}
                      onChange={e => set('measurement_end_date', e.target.value)} style={inputStyle} />
                  </Field>
                </div>

                <Field label="Iniciativa Estratégica">
                  <textarea rows={2} value={form.strategic_initiative} disabled={isView}
                    onChange={e => set('strategic_initiative', e.target.value)}
                    style={taStyle} placeholder="Describe la iniciativa estratégica..." />
                </Field>

                <Field label="Objetivo" required>
                  <textarea rows={2} value={form.objective} disabled={isView}
                    onChange={e => set('objective', e.target.value)}
                    style={{ ...taStyle, borderColor: errors.objective ? '#EF4444' : '#D1D5DB' }}
                    placeholder="Objetivo del indicador..." />
                  {errors.objective && <p style={{ color:'#EF4444', fontSize:10 }}>{errors.objective}</p>}
                </Field>

                <Field label="Nombre del Indicador" required>
                  <Input value={form.indicator_name} disabled={isView}
                    onChange={e => set('indicator_name', e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.indicator_name ? '#EF4444' : '#D1D5DB' }}
                    placeholder="Ej: % de rentabilidad" />
                  {errors.indicator_name && <p style={{ color:'#EF4444', fontSize:10 }}>{errors.indicator_name}</p>}
                </Field>
              </Section>

              {/* ── Sección 2: Fórmula ── */}
              <Section title="2. Fórmula de Cálculo" color="#2E75B6">

                <Field label="Descripción de cómo se mide (texto libre)"
                  hint="Escribe la fórmula tal como aparece en el formato Excel">
                  <textarea rows={2} value={form.formula} disabled={isView}
                    onChange={e => set('formula', e.target.value)}
                    style={taStyle}
                    placeholder="Ej: (Ingresos totales - Gastos totales) / Ingresos totales" />
                </Field>

                {/* Constructor de variables */}
                <div style={{ backgroundColor:'#EFF6FF', borderRadius:8, padding:12, border:'1px solid #BFDBFE' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#1D4ED8', margin:0 }}>
                      🔢 Variables para cálculo automático
                    </p>
                    {!isView && (
                      <button onClick={addVariable}
                        disabled={form.formula_variables.length >= 8}
                        style={{
                          display:'flex', alignItems:'center', gap:4, fontSize:10,
                          backgroundColor:'#2E75B6', color:'white', border:'none',
                          borderRadius:4, padding:'3px 8px', cursor:'pointer',
                        }}>
                        <Plus size={10} /> Agregar variable
                      </button>
                    )}
                  </div>

                  {form.formula_variables.length === 0 ? (
                    <p style={{ fontSize:10, color:'#6B7280', textAlign:'center', padding:'8px 0' }}>
                      Sin variables definidas. El resultado se ingresará manualmente.
                    </p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {form.formula_variables.map((v, idx) => (
                        <div key={idx} style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <div style={{
                            width:28, height:28, backgroundColor:'#2E75B6', color:'white',
                            borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:12, fontWeight:700, flexShrink:0,
                          }}>{v.key}</div>
                          <Input
                            value={v.label} disabled={isView}
                            onChange={e => updateVariable(idx, 'label', e.target.value)}
                            placeholder={`Nombre de la variable "${v.key}"`}
                            style={{ ...inputStyle, flex:1 }} />
                          {!isView && (
                            <button onClick={() => removeVariable(idx)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', padding:4 }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expresión ejecutable */}
                {form.formula_variables.length > 0 && (
                  <Field label="Expresión ejecutable"
                    hint={`Usa las letras ${form.formula_variables.map(v => v.key).join(', ')} como variables. Ej: (a - b) / a * 100`}>
                    <Input
                      value={form.formula_expression} disabled={isView}
                      onChange={e => set('formula_expression', e.target.value)}
                      onBlur={handleFormulaBlur}
                      style={{
                        ...inputStyle, fontFamily:'monospace',
                        borderColor: (formulaErr || errors.formula_expression) ? '#EF4444' : '#D1D5DB',
                      }}
                      placeholder="Ej: (a - b) / a * 100" />
                    {(formulaErr || errors.formula_expression) && (
                      <p style={{ color:'#EF4444', fontSize:10 }}>⚠️ {formulaErr || errors.formula_expression}</p>
                    )}
                    {!formulaErr && form.formula_expression && (
                      <p style={{ color:'#16A34A', fontSize:10 }}>✅ Expresión válida</p>
                    )}
                  </Field>
                )}
              </Section>

              {/* ── Sección 3: Meta y divulgación ── */}
              <Section title="3. Meta y Divulgación" color="#6f7b2c">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="Meta (texto)" required
                    hint='Ej: ">=5%", ">80%", "<2%", ">19 acciones"'>
                    <Input value={form.goal} disabled={isView}
                      onChange={e => set('goal', e.target.value)}
                      style={{ ...inputStyle, borderColor: errors.goal ? '#EF4444' : '#D1D5DB' }}
                      placeholder=">= 5%" />
                    {errors.goal && <p style={{ color:'#EF4444', fontSize:10 }}>{errors.goal}</p>}
                  </Field>



                  <Field label="Proceso Fuente de Información">
                    <select value={form.process_id} disabled={isView}
                      onChange={e => set('process_id', e.target.value)}
                      style={{ ...inputStyle, width:'100%', borderRadius:6, border:'1px solid #D1D5DB', padding:'0 8px' }}>
                      <option value="">Sin proceso asociado</option>
                      {processes.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="A quién se divulga">
                    <Input value={form.disclosed_to} disabled={isView}
                      onChange={e => set('disclosed_to', e.target.value)}
                      style={inputStyle} placeholder="Ej: Gerente, Todo el personal" />
                  </Field>
                </div>

                <Field label="Definición / Interpretación">
                  <textarea rows={2} value={form.definition} disabled={isView}
                    onChange={e => set('definition', e.target.value)}
                    style={taStyle} placeholder="¿Qué mide y cómo se interpreta el resultado?" />
                </Field>
              </Section>

              {/* ── Sección 4: Responsable ── */}
              <Section title="4. Responsable" color="#6dbd96">
                <Field label="Responsable del Indicador" required>
                  <select value={form.responsible_id} disabled={isView}
                    onChange={e => set('responsible_id', e.target.value)}
                    style={{ ...inputStyle, width:'100%', borderRadius:6, border:`1px solid ${errors.responsible_id ? '#EF4444' : '#D1D5DB'}`, padding:'0 8px' }}>
                    <option value="">Seleccionar responsable...</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  {errors.responsible_id && <p style={{ color:'#EF4444', fontSize:10 }}>{errors.responsible_id}</p>}
                </Field>
              </Section>

            </div>
          )}

          {/* ════ TAB: HISTORIAL DE MEDICIONES ════ */}
          {activeTab === 'history' && (
            <div>
              <h4 style={{ fontSize:13, fontWeight:700, color:'#2e5244', marginBottom:12 }}>
                📊 Historial de Mediciones — {indicator?.indicator_name}
              </h4>

              {loadingMed ? (
                <div style={{ textAlign:'center', padding:24, color:'#6B7280' }}>
                  <Loader2 size={20} className="animate-spin mx-auto" />
                </div>
              ) : measurements.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, color:'#9CA3AF' }}>
                  <BarChart2 size={32} style={{ margin:'0 auto 8px', opacity:0.4 }} />
                  <p style={{ fontSize:12 }}>Aún no hay mediciones registradas</p>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ backgroundColor:'#F3F4F6' }}>
                      {['Período','Fecha','Resultado','Meta','% Cumplimiento','Estado','Registrado por','Notas',''].map(h => (
                        <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontSize:10, fontWeight:700, color:'#374151', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m, idx) => {
                      const si = m.status_info;
                      return (
                        <tr key={m.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB' }}>
                          {/* Período — editable */}
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6', fontWeight:600 }}>
                            {editingMId === m.id
                              ? <input value={editingMData.period_label}
                                  onChange={e => setEditingMData(p => ({...p, period_label: e.target.value}))}
                                  style={{ fontSize:11, border:'1px solid #D1D5DB', borderRadius:4, padding:'2px 6px', width:120 }} />
                              : m.period_label}
                          </td>
                          {/* Fecha cierre — editable */}
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6' }}>
                            {editingMId === m.id
                              ? <input type="date" value={editingMData.measurement_date}
                                  onChange={e => setEditingMData(p => ({...p, measurement_date: e.target.value}))}
                                  style={{ fontSize:11, border:'1px solid #D1D5DB', borderRadius:4, padding:'2px 4px' }} />
                              : m.measurement_date ? new Date(m.measurement_date + 'T00:00:00').toLocaleDateString('es-CO') : '—'}
                          </td>
                          {/* Valor medido — editable */}
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6', fontWeight:700, color:'#2e5244' }}>
                            {editingMId === m.id
                              ? <input type="number" value={editingMData.measured_value}
                                  onChange={e => setEditingMData(p => ({...p, measured_value: parseFloat(e.target.value)}))}
                                  style={{ fontSize:11, border:'1px solid #D1D5DB', borderRadius:4, padding:'2px 4px', width:70 }} />
                              : <>{m.measured_value ?? '—'} {m.unit || ''}</>}
                          </td>
                          {/* Meta — editable */}
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6' }}>
                            {editingMId === m.id
                              ? <input type="number" value={editingMData.goal_value}
                                  onChange={e => setEditingMData(p => ({...p, goal_value: parseFloat(e.target.value)}))}
                                  style={{ fontSize:11, border:'1px solid #D1D5DB', borderRadius:4, padding:'2px 4px', width:60 }} />
                              : <>{m.goal_value ?? '—'} {m.unit || ''}</>}
                          </td>
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6', fontWeight:600, color: si?.color }}>
                            {m.measured_value != null ? `${Math.round(m.measured_value * 100) / 100} ${m.unit || '%'}` : '—'}
                          </td>
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6' }}>
                            <span style={{
                              backgroundColor: si?.color + '20', color: si?.color,
                              borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700,
                            }}>{si?.label}</span>
                          </td>
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6', color:'#6B7280' }}>{m.created_by_name}</td>
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6', color:'#6B7280', maxWidth:140 }}>
                            {editingMId === m.id
                              ? <input value={editingMData.notes}
                                  onChange={e => setEditingMData(p => ({...p, notes: e.target.value}))}
                                  style={{ fontSize:10, border:'1px solid #D1D5DB', borderRadius:4, padding:'2px 6px', width:'100%' }} />
                              : <span style={{ fontSize:10 }}>{m.notes || '—'}</span>}
                          </td>
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid #F3F4F6', textAlign:'center' }}>
                            <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                              {/* Botón editar */}
                              {updateMeasurement && editingMId !== m.id && (
                                <button title="Editar medición"
                                  onClick={() => {
                                    setEditingMId(m.id);
                                    setEditingMData({
                                      period_label:     m.period_label,
                                      measurement_date: m.measurement_date,
                                      measured_value:   m.measured_value,
                                      goal_value:       m.goal_value,
                                      unit:             m.unit || '%',
                                      notes:            m.notes || '',
                                    });
                                  }}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'#2E75B6', padding:2 }}>
                                  <Pencil size={12} />
                                </button>
                              )}
                              {/* Botón guardar edición */}
                              {updateMeasurement && editingMId === m.id && (
                                <button title="Guardar cambios"
                                  onClick={async () => {
                                    const r = await updateMeasurement(m.id, editingMData);
                                    if (r.success) {
                                      setMeasurements(prev => prev.map(x =>
                                        x.id === m.id ? { ...x, ...editingMData } : x
                                      ));
                                      setEditingMId(null);
                                    }
                                  }}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'#16A34A', padding:2 }}>
                                  <Check size={12} />
                                </button>
                              )}
                              {/* Botón cancelar edición */}
                              {editingMId === m.id && (
                                <button title="Cancelar"
                                  onClick={() => setEditingMId(null)}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', padding:2 }}>
                                  <X size={12} />
                                </button>
                              )}
                              {/* Botón eliminar */}
                              {deleteMeasurement && editingMId !== m.id && (
                                <button title="Eliminar medición"
                                  onClick={async () => {
                                    if (!window.confirm(`¿Eliminar la medición del período "${m.period_label}"?`)) return;
                                    await deleteMeasurement(m.id);
                                    setMeasurements(prev => prev.filter(x => x.id !== m.id));
                                  }}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:2 }}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding:'12px 20px', borderTop:'1px solid #E5E7EB',
          display:'flex', justifyContent:'flex-end', gap:8,
          backgroundColor:'#F9FAFB', borderRadius:'0 0 12px 12px',
        }}>
          <Button variant="outline" onClick={onClose} style={{ fontSize:12 }}>
            {isView ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isView && (
            <Button onClick={handleSave} disabled={saving}
              style={{ backgroundColor:'#2e5244', color:'white', fontSize:12 }}>
              {saving ? <><Loader2 size={13} className="animate-spin mr-1" /> Guardando...</> : <><Save size={13} className="mr-1" /> Guardar</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}