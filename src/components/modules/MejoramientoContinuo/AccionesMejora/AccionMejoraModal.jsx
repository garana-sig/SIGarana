// src/components/modules/MejoramientoContinuo/AccionesMejora/AccionMejoraModal.jsx
// v2.0 — Modal con stepper de 3 momentos
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Loader2, X, Save, CheckCircle2, Lock } from 'lucide-react';
import { useAccionesMejora, useProfiles } from '@/hooks/useAccionesMejora';
import { useProcesses } from '@/hooks/useDocuments';

const M_COLOR = { 1: '#2e5244', 2: '#6f7b2c', 3: '#1a3a5c' };

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Section({ title, color, children, locked = false, done = false }) {
  return (
    <div className="rounded-lg border-2 overflow-hidden"
      style={{ borderColor: locked ? '#e5e7eb' : color }}>
      <div className="px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: locked ? '#f3f4f6' : color }}>
        <span className={`text-xs font-bold uppercase tracking-wider
          ${locked ? 'text-gray-400' : 'text-white'}`}>{title}</span>
        {done   && !locked && <CheckCircle2 className="h-4 w-4 text-white opacity-80" />}
        {locked && <Lock className="h-3.5 w-3.5 text-gray-400" />}
      </div>
      <div className={`p-4 space-y-3 ${locked ? 'bg-gray-50 opacity-75' : 'bg-white'}`}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: '#2e5244' }}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

function CheckItem({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 p-2 rounded border text-xs
      ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
      ${checked ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled}
        className="w-3 h-3" style={{ accentColor: '#2e5244' }} />
      {label}
    </label>
  );
}

function TA({ value, onChange, disabled, rows = 3, placeholder, ring = 'green' }) {
  return (
    <textarea value={value} onChange={onChange} disabled={disabled} rows={rows}
      placeholder={disabled ? '' : placeholder}
      className={`w-full p-3 border rounded text-sm resize-none focus:outline-none focus:ring-2
        ${disabled
          ? 'bg-gray-50 text-gray-600 border-gray-200'
          : `border-gray-300 focus:ring-${ring}-300`}`} />
  );
}

function Stepper({ activeMoment, statusActual }) {
  const m1done = ['open','in_progress','archived'].includes(statusActual);
  const m2done = ['in_progress','archived'].includes(statusActual);
  const m3done = ['archived'].includes(statusActual);
  const steps = [
    { n:1, label:'Identificación', done: m1done },
    { n:2, label:'Análisis y Plan', done: m2done },
    { n:3, label:'Verificación', done: m3done },
  ];
  return (
    <div className="flex items-center px-6 py-3 border-b bg-gray-50">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center
              text-xs font-bold border-2 transition-all
              ${s.done
                ? 'bg-green-500 border-green-500 text-white'
                : s.n === activeMoment
                  ? 'text-white'
                  : 'bg-white border-gray-300 text-gray-400'}`}
              style={s.n === activeMoment && !s.done
                ? { backgroundColor: M_COLOR[s.n], borderColor: M_COLOR[s.n] }
                : {}}>
              {s.done
                ? <CheckCircle2 className="h-4 w-4" />
                : s.n}
            </div>
            <span className={`text-[10px] mt-1 font-medium text-center leading-tight
              ${s.done ? 'text-green-600'
              : s.n === activeMoment ? 'text-gray-800'
              : 'text-gray-400'}`}>{s.label}</span>
          </div>
          {i < 2 && (
            <div className={`h-0.5 w-8 mx-1 mb-4 transition-all
              ${s.done ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Valores iniciales ─────────────────────────────────────────────────────────
const M1_INIT = {
  date: new Date().toISOString().split('T')[0],
  process_id: '',
  origin_audit: false, origin_satisfaction: false, origin_qrs: false,
  origin_autocontrol: false, origin_risk_analysis: false, origin_nonconforming: false,
  finding_description: '',
};
const M2_INIT = {
  action_correction: false, action_corrective: false, action_preventive: false,
  causes: '', action_description: '', expected_results: '',
  resources_budget: '', responsible_id: '', proposed_date: '',
};
const M3_INIT = {
  verification_criteria: '', verification_finding: '',
  verification_date: '', efficacy_date: '',
};

// ── Modal principal ───────────────────────────────────────────────────────────
// modes: 'create' | 'momento2' | 'momento3' | 'view' | 'edit'
export default function AccionMejoraModal({ isOpen, mode, accion, onClose, onSuccess }) {
  const { createAccion, completarMomento2, completarMomento3, updateAccion } = useAccionesMejora();
  const { profiles }       = useProfiles();
  const { processes = [] } = useProcesses() || {};

  const [f1,     setF1]     = useState(M1_INIT);
  const [f2,     setF2]     = useState(M2_INIT);
  const [f3,     setF3]     = useState(M3_INIT);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isView   = mode === 'view';
  const isCreate = mode === 'create';
  const isMom2   = mode === 'momento2';
  const isMom3   = mode === 'momento3';
  const isEdit   = mode === 'edit';

  const activeMoment = isCreate ? 1 : isMom2 ? 2 : isMom3 ? 3 : 0;
  const statusActual = accion?.status || 'open';

  // Cargar datos al abrir
  useEffect(() => {
    if (!isOpen) return;
    if (accion) {
      setF1({
        date:                 accion.date                || '',
        process_id:           accion.process_id          || '',
        origin_audit:         !!accion.origin_audit,
        origin_satisfaction:  !!accion.origin_satisfaction,
        origin_qrs:           !!accion.origin_qrs,
        origin_autocontrol:   !!accion.origin_autocontrol,
        origin_risk_analysis: !!accion.origin_risk_analysis,
        origin_nonconforming: !!accion.origin_nonconforming,
        finding_description:  accion.finding_description || '',
      });
      setF2({
        action_correction:  !!accion.action_correction,
        action_corrective:  !!accion.action_corrective,
        action_preventive:  !!accion.action_preventive,
        causes:             accion.causes             || '',
        action_description: accion.action_description || '',
        expected_results:   accion.expected_results   || '',
        resources_budget:   accion.resources_budget   || '',
        responsible_id:     accion.responsible_id     || '',
        proposed_date:      accion.proposed_date      || '',
      });
      setF3({
        verification_criteria: accion.verification_criteria || '',
        verification_finding:  accion.verification_finding  || '',
        verification_date:     accion.verification_date     || '',
        efficacy_date:         accion.efficacy_date         || '',
      });
    } else {
      setF1(M1_INIT); setF2(M2_INIT); setF3(M3_INIT);
    }
    setErrors({});
  }, [isOpen, accion, mode]);

  const s1 = (f, v) => { setF1(p => ({...p,[f]:v})); setErrors(p => ({...p,[f]:null})); };
  const s2 = (f, v) => { setF2(p => ({...p,[f]:v})); setErrors(p => ({...p,[f]:null})); };
  const s3 = (f, v) => { setF3(p => ({...p,[f]:v})); setErrors(p => ({...p,[f]:null})); };

  const validateM1 = () => {
    const e = {};
    if (!f1.date)                        e.date               = 'Obligatorio';
    if (!f1.process_id)                  e.process_id         = 'Obligatorio';
    if (!f1.finding_description?.trim()) e.finding_description = 'Obligatorio';
    const hasOrigin = f1.origin_audit || f1.origin_satisfaction || f1.origin_qrs
      || f1.origin_autocontrol || f1.origin_risk_analysis || f1.origin_nonconforming;
    if (!hasOrigin) e.origin = 'Selecciona al menos uno';
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateM2 = () => {
    const e = {};
    if (!f2.responsible_id) e.responsible_id = 'Obligatorio';
    if (!f2.proposed_date)  e.proposed_date  = 'Obligatorio';
    const hasType = f2.action_correction || f2.action_corrective || f2.action_preventive;
    if (!hasType) e.action_type = 'Selecciona al menos uno';
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateM3 = () => {
    const e = {};
    if (!f3.verification_finding?.trim()) e.verification_finding = 'Obligatorio';
    if (!f3.verification_date)            e.verification_date    = 'Obligatorio';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    let valid = false;
    if      (isCreate) valid = validateM1();
    else if (isMom2)   valid = validateM2();
    else if (isMom3)   valid = validateM3();
    else if (isEdit)   valid = validateM1() && validateM2();
    if (!valid) return;

    setSaving(true);
    let result;
    if      (isCreate) result = await createAccion(f1);
    else if (isMom2)   result = await completarMomento2(accion.id, f2);
    else if (isMom3)   result = await completarMomento3(accion.id, f3);
    else if (isEdit)   result = await updateAccion(accion.id, { ...f1, ...f2, ...f3 });
    setSaving(false);

    if (result?.success) onSuccess();
    else if (result?.error) alert('Error: ' + result.error);
  };

  if (!isOpen) return null;

  // Layout: qué secciones mostrar y cuáles están bloqueadas
  const showM1  = true;
  const showM2  = !isCreate;
  const showM3  = isMom3 || isView || isEdit;
  const m1Lock  = isView || isMom2 || isMom3;
  const m2Lock  = isView || isCreate || isMom3;
  const m3Lock  = isView || isCreate || isMom2;

  const titleMap = {
    create:   '➕ Nueva Acción — M1: Identificación',
    momento2: `📋 M2 Análisis y Plan · ${accion?.consecutive}`,
    momento3: `✅ M3 Verificación · ${accion?.consecutive}`,
    view:     `👁️ Ver · ${accion?.consecutive}`,
    edit:     `✏️ Editar · ${accion?.consecutive}`,
  };

  const btnLabel = {
    create:   'Crear Acción (M1)',
    momento2: 'Guardar Análisis (M2)',
    momento3: 'Guardar Verificación (M3)',
    edit:     'Guardar Cambios',
  };

  const noteMap = {
    create:   '✉️ Se notificará a todos los usuarios del proceso',
    momento2: '✉️ Se notificará al responsable asignado',
    momento3: '→ Después usa el botón SI/NO para cerrar la acción',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative flex flex-col bg-white rounded-xl shadow-2xl w-full"
        style={{ maxWidth:'860px', maxHeight:'92vh' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 rounded-t-xl flex items-center justify-between"
          style={{ background:`linear-gradient(135deg, ${M_COLOR[activeMoment||1]} 0%, #6dbd96 100%)` }}>
          <div>
            <h2 className="text-lg font-bold text-white">{titleMap[mode] || ''}</h2>
            <p className="text-xs mt-0.5" style={{ color:'#dedecc' }}>
              Formato AM · Mejoramiento Continuo · Garana SIG
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper (solo en modos de edición por momento) */}
        {(isCreate || isMom2 || isMom3) && (
          <Stepper activeMoment={activeMoment} statusActual={statusActual} />
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── M1 IDENTIFICACIÓN ─────────────────────────────────────── */}
          {showM1 && (
            <Section title="🔍 M1 · Identificación" color={M_COLOR[1]}
              locked={m1Lock} done={m1Lock && !!accion?.finding_description}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha" required error={errors.date}>
                  <Input type="date" value={f1.date} disabled={m1Lock}
                    onChange={e => s1('date', e.target.value)}
                    className={errors.date ? 'border-red-400' : ''} />
                </Field>
                <Field label="Proceso" required error={errors.process_id}>
                  <select value={f1.process_id} disabled={m1Lock}
                    onChange={e => s1('process_id', e.target.value)}
                    className={`w-full p-2 border rounded text-sm
                      ${errors.process_id ? 'border-red-400' : 'border-gray-300'}
                      ${m1Lock ? 'bg-gray-50 text-gray-600' : ''}`}>
                    <option value="">Seleccionar...</option>
                    {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Origen del hallazgo" required error={errors.origin}>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['origin_audit',         'Auditoría'],
                    ['origin_satisfaction',  'Satisfacción del cliente'],
                    ['origin_qrs',           'QRS'],
                    ['origin_autocontrol',   'Autocontrol / Gest. cambio'],
                    ['origin_risk_analysis', 'Análisis de riesgos'],
                    ['origin_nonconforming', 'Pto no conforme'],
                  ].map(([key, lbl]) => (
                    <CheckItem key={key} label={lbl} checked={f1[key]} disabled={m1Lock}
                      onChange={() => s1(key, !f1[key])} />
                  ))}
                </div>
              </Field>
              <Field label="Descripción del hallazgo" required error={errors.finding_description}>
                <TA value={f1.finding_description} disabled={m1Lock}
                  onChange={e => s1('finding_description', e.target.value)}
                  placeholder="Describa detalladamente el hallazgo..." />
              </Field>
            </Section>
          )}

          {/* ── M2 ANÁLISIS + PLAN ────────────────────────────────────── */}
          {showM2 && (
            <Section title="🔬 M2 · Análisis y Plan de Acción" color={M_COLOR[2]}
              locked={m2Lock} done={m2Lock && !!accion?.action_description}>
              <Field label="Tipo de acción" required error={errors.action_type}>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['action_correction', 'Corrección'],
                    ['action_corrective', 'Acción Correctiva'],
                    ['action_preventive', 'Acción Preventiva'],
                  ].map(([key, lbl]) => (
                    <CheckItem key={key} label={lbl} checked={f2[key]} disabled={m2Lock}
                      onChange={() => s2(key, !f2[key])} />
                  ))}
                </div>
              </Field>
              <Field label="Causas (análisis raíz)">
                <TA value={f2.causes} disabled={m2Lock}
                  onChange={e => s2('causes', e.target.value)}
                  placeholder="5 ¿Por qué?, Ishikawa..." ring="yellow" />
              </Field>
              <Field label="Descripción de las acciones">
                <TA value={f2.action_description} disabled={m2Lock}
                  onChange={e => s2('action_description', e.target.value)}
                  placeholder="Acciones a implementar..." ring="yellow" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Logros esperados">
                  <TA value={f2.expected_results} disabled={m2Lock} rows={2}
                    onChange={e => s2('expected_results', e.target.value)}
                    placeholder="Resultados esperados..." ring="yellow" />
                </Field>
                <Field label="Recursos / Presupuesto">
                  <TA value={f2.resources_budget} disabled={m2Lock} rows={2}
                    onChange={e => s2('resources_budget', e.target.value)}
                    placeholder="Recursos requeridos..." ring="yellow" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Responsable" required error={errors.responsible_id}>
                  <select value={f2.responsible_id} disabled={m2Lock}
                    onChange={e => s2('responsible_id', e.target.value)}
                    className={`w-full p-2 border rounded text-sm
                      ${errors.responsible_id ? 'border-red-400' : 'border-gray-300'}
                      ${m2Lock ? 'bg-gray-50 text-gray-600' : ''}`}>
                    <option value="">Seleccionar responsable...</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </Field>
                <Field label="Fecha propuesta de verificación" required error={errors.proposed_date}>
                  <Input type="date" value={f2.proposed_date} disabled={m2Lock}
                    onChange={e => s2('proposed_date', e.target.value)}
                    className={errors.proposed_date ? 'border-red-400' : ''} />
                </Field>
              </div>
            </Section>
          )}

          {/* ── M3 VERIFICACIÓN ──────────────────────────────────────── */}
          {showM3 && (
            <Section title="✅ M3 · Verificación" color={M_COLOR[3]}
              locked={m3Lock} done={m3Lock && !!accion?.verification_finding}>
              <Field label="Criterios de verificación">
                <TA value={f3.verification_criteria} disabled={m3Lock}
                  onChange={e => s3('verification_criteria', e.target.value)}
                  placeholder="¿Cómo se verifica la efectividad?" ring="blue" />
              </Field>
              <Field label="Hallazgo de verificación" required error={errors.verification_finding}>
                <TA value={f3.verification_finding} disabled={m3Lock}
                  onChange={e => s3('verification_finding', e.target.value)}
                  placeholder="Resultado de la verificación realizada..." ring="blue" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha verificación" required error={errors.verification_date}>
                  <Input type="date" value={f3.verification_date} disabled={m3Lock}
                    onChange={e => s3('verification_date', e.target.value)} />
                </Field>
                <Field label="Fecha eficacia">
                  <Input type="date" value={f3.efficacy_date} disabled={m3Lock}
                    onChange={e => s3('efficacy_date', e.target.value)} />
                </Field>
              </div>
            </Section>
          )}

          {/* Info cierre en modo vista */}
          {isView && accion?.closure_approved && (
            <Section title="🔒 Cierre" color="#5c1a1a" locked={false}>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Decisión</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold
                    ${accion.closure_approved === 'SI'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'}`}>
                    {accion.closure_approved === 'SI' ? '✅ Cerrada' : '⏳ En seguimiento'}
                  </span>
                </div>
                {accion.closure_reason && (
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Razón del cierre</p>
                    <p className="text-sm">{accion.closure_reason}</p>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t rounded-b-xl flex items-center justify-between"
          style={{ backgroundColor:'#f8fafb' }}>
          {!isView && !isEdit && noteMap[mode] && (
            <p className="text-xs text-gray-400">{noteMap[mode]}</p>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {isView ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isView && (
              <Button onClick={handleSubmit} disabled={saving}
                style={{ backgroundColor: M_COLOR[activeMoment || 1] }} className="text-white">
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                  : <><Save className="h-4 w-4 mr-2" />{btnLabel[mode] || 'Guardar'}</>
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}