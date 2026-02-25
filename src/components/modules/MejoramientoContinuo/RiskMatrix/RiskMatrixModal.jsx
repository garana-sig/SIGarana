// src/components/modules/MejoramientoContinuo/RiskMatrix/RiskMatrixModal.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { X, Save, Loader2 } from 'lucide-react';
import { useRiskMatrix, useProcesses, getImpactInfo, getProbabilityInfo, getRiskLevelInfo } from '@/hooks/useRiskMatrix';
import { useAuth } from '@/context/AuthContext';

const MANAGEMENT_OPTIONS = [
  'EVITAR EL RIESGO',
  'REDUCIR EL RIESGO',
  'COMPARTIR O TRANSFERIR EL RIESGO',
  'ASUMIR EL RIESGO',
];

const CLASSIFICATION_OPTIONS = ['ESTRATEGICO','OPERATIVO','FINANCIERO','CUMPLIMIENTO','TECNOLÓGICO'];
const TYPE_OPTIONS = ['INTERNO','EXTERNO'];

const LabelField = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
      {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const SectionTitle = ({ children, color = '#2e5244' }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    color, borderBottom: `2px solid ${color}20`, paddingBottom: 4,
    marginTop: 4, letterSpacing: '0.05em',
  }}>{children}</div>
);

// Chip de valoración en tiempo real
const LiveChip = ({ label, bg, color }) => {
  if (!label || label === '—') return <span style={{ color: '#9CA3AF', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      backgroundColor: bg, color, padding: '2px 10px',
      borderRadius: 4, fontSize: 11, fontWeight: 700,
    }}>{label}</span>
  );
};

const inputStyle = {
  fontSize: 12, height: 32, padding: '4px 8px',
  border: '1px solid #D1D5DB', borderRadius: 6,
};

const selectStyle = {
  width: '100%', padding: '4px 8px', fontSize: 12, height: 32,
  border: '1px solid #D1D5DB', borderRadius: 6, background: 'white',
};

const textareaStyle = {
  width: '100%', padding: '6px 8px', fontSize: 12,
  border: '1px solid #D1D5DB', borderRadius: 6,
  resize: 'vertical', minHeight: 60, fontFamily: 'inherit',
};

export default function RiskMatrixModal({ isOpen, mode, risk, onClose, onSuccess }) {
  const { profile } = useAuth();
  const { createRisk, updateRisk } = useRiskMatrix();
  const { processes } = useProcesses();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const empty = {
    process_id: '', risk_name: '', description: '', cause: '', effect: '',
    impact_value: '', probability_value: '',
    controls_description: '', management_option: '', preventive_actions: '',
    classification: '', risk_type: '', is_new: 'SI',
  };

  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});

  useEffect(() => {
    if (risk && (isEdit || isView)) {
      setForm({
        process_id:           risk.process_id           || '',
        risk_name:            risk.risk_name            || '',
        description:          risk.description          || '',
        cause:                risk.cause                || '',
        effect:               risk.effect              || '',
        impact_value:         risk.impact_value         || '',
        probability_value:    risk.probability_value    || '',
        controls_description: risk.controls_description || '',
        management_option:    risk.management_option    || '',
        preventive_actions:   risk.preventive_actions   || '',
        classification:       risk.classification       || '',
        risk_type:            risk.risk_type            || '',
        is_new:               risk.is_new               || 'SI',
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [risk, mode]);

  // Cálculos en tiempo real
  const impactInfo      = getImpactInfo(form.impact_value);
  const probabilityInfo = getProbabilityInfo(form.probability_value);
  const riskLevelInfo   = getRiskLevelInfo(form.impact_value, form.probability_value);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.process_id)    e.process_id = 'Requerido';
    if (!form.risk_name?.trim()) e.risk_name = 'Requerido';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        impact_value:      form.impact_value      ? Number(form.impact_value)      : null,
        probability_value: form.probability_value ? Number(form.probability_value) : null,
        process_id:        form.process_id        || null,
        classification:    form.classification    || null,
        risk_type:         form.risk_type         || null,
        management_option: form.management_option || null,
      };
      const res = isEdit
        ? await updateRisk(risk.id, payload)
        : await createRisk(payload);
      if (res.success) onSuccess();
      else setErrors({ general: res.error || 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 780,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: '1px solid #E5E7EB',
          background: '#2e5244', borderRadius: '12px 12px 0 0',
        }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0 }}>
              {isView ? '👁 Ver Riesgo' : isEdit ? '✏️ Editar Riesgo' : '➕ Nuevo Riesgo'}
            </h2>
            {risk?.consecutive && (
              <span style={{ color: '#6dbd96', fontSize: 11 }}>{risk.consecutive}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ color: 'white', width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {errors.general && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', color: '#DC2626', fontSize: 12 }}>
              {errors.general}
            </div>
          )}

          {/* ── SECCIÓN 1: IDENTIFICACIÓN ───────────────────────────────── */}
          <SectionTitle color="#2e5244">📋 Identificación del Riesgo</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <LabelField label="Proceso" required>
              <select value={form.process_id} onChange={set('process_id')} disabled={isView} style={selectStyle}>
                <option value="">— Seleccionar proceso —</option>
                {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.process_id && <span style={{ color: '#EF4444', fontSize: 10 }}>{errors.process_id}</span>}
            </LabelField>

            <LabelField label="Riesgo" required>
              <Input value={form.risk_name} onChange={set('risk_name')} disabled={isView}
                placeholder="Nombre del riesgo" style={inputStyle} />
              {errors.risk_name && <span style={{ color: '#EF4444', fontSize: 10 }}>{errors.risk_name}</span>}
            </LabelField>
          </div>

          <LabelField label="Descripción">
            <textarea value={form.description} onChange={set('description')} disabled={isView}
              placeholder="Descripción detallada del riesgo..." style={textareaStyle} />
          </LabelField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <LabelField label="Causa">
              <textarea value={form.cause} onChange={set('cause')} disabled={isView}
                placeholder="¿Por qué puede ocurrir?" style={{ ...textareaStyle, minHeight: 52 }} />
            </LabelField>
            <LabelField label="Efecto">
              <textarea value={form.effect} onChange={set('effect')} disabled={isView}
                placeholder="¿Qué consecuencias tendría?" style={{ ...textareaStyle, minHeight: 52 }} />
            </LabelField>
          </div>

          {/* ── SECCIÓN 2: VALORACIÓN ────────────────────────────────────── */}
          <SectionTitle color="#2563EB">📊 Valoración</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Impacto */}
            <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 6 }}>IMPACTO</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <select value={form.impact_value} onChange={set('impact_value')} disabled={isView} style={selectStyle}>
                    <option value="">— Valor —</option>
                    <option value="5">5 — LEVE</option>
                    <option value="10">10 — MODERADO</option>
                    <option value="20">20 — CATASTRÓFICO</option>
                  </select>
                </div>
                <div style={{ minWidth: 100, textAlign: 'center' }}>
                  <LiveChip {...impactInfo} />
                </div>
              </div>
            </div>

            {/* Probabilidad */}
            <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 6 }}>PROBABILIDAD</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <select value={form.probability_value} onChange={set('probability_value')} disabled={isView} style={selectStyle}>
                    <option value="">— Valor —</option>
                    <option value="1">1 — BAJA</option>
                    <option value="2">2 — MEDIO</option>
                    <option value="3">3 — ALTA</option>
                  </select>
                </div>
                <div style={{ minWidth: 100, textAlign: 'center' }}>
                  <LiveChip {...probabilityInfo} />
                </div>
              </div>
            </div>
          </div>

          {/* Resultado cálculo en tiempo real */}
          {(form.impact_value && form.probability_value) && (
            <div style={{
              background: riskLevelInfo.bg + '22', border: `2px solid ${riskLevelInfo.bg}`,
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 12, color: '#374151' }}>
                <strong>Evaluación (IxP):</strong>{' '}
                <span style={{ fontSize: 16, fontWeight: 800, color: '#1F2937' }}>
                  {riskLevelInfo.evaluation}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#374151' }}>
                <strong>Nivel de riesgo:</strong>{' '}
                <LiveChip label={riskLevelInfo.label} bg={riskLevelInfo.bg} color={riskLevelInfo.color} />
              </div>
            </div>
          )}

          {/* ── SECCIÓN 3: ACCIÓN PREVENTIVA ─────────────────────────────── */}
          <SectionTitle color="#16a34a">🛡️ Acción Preventiva</SectionTitle>

          <LabelField label="Descripción de los controles">
            <textarea value={form.controls_description} onChange={set('controls_description')} disabled={isView}
              placeholder="Describa los controles existentes para este riesgo..." style={textareaStyle} />
          </LabelField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <LabelField label="Opciones de manejo">
              <select value={form.management_option} onChange={set('management_option')} disabled={isView} style={selectStyle}>
                <option value="">— Seleccionar —</option>
                {MANAGEMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </LabelField>

            <LabelField label="¿Es riesgo nuevo?">
              <select value={form.is_new} onChange={set('is_new')} disabled={isView} style={selectStyle}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
                <option value="N/A">N/A</option>
              </select>
            </LabelField>
          </div>

          <LabelField label="Acciones Preventivas">
            <textarea value={form.preventive_actions} onChange={set('preventive_actions')} disabled={isView}
              placeholder="Acciones concretas para prevenir o mitigar el riesgo..." style={textareaStyle} />
          </LabelField>

          {/* ── SECCIÓN 4: CLASIFICACIÓN (opcional) ─────────────────────── */}
          <SectionTitle color="#7C3AED">🏷️ Clasificación</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <LabelField label="Clasificación del riesgo">
              <select value={form.classification} onChange={set('classification')} disabled={isView} style={selectStyle}>
                <option value="">— Seleccionar —</option>
                {CLASSIFICATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </LabelField>
            <LabelField label="Tipo">
              <select value={form.risk_type} onChange={set('risk_type')} disabled={isView} style={selectStyle}>
                <option value="">— Seleccionar —</option>
                {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </LabelField>
          </div>

          {/* Datos de auditoría en modo ver */}
          {isView && risk && (
            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#6B7280' }}>
              <strong>Creado por:</strong> {risk.creator_name} ·{' '}
              <strong>Consecutivo:</strong> {risk.consecutive} ·{' '}
              <strong>Fecha:</strong> {risk.created_at ? new Date(risk.created_at).toLocaleDateString('es-CO') : '—'}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isView && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #E5E7EB',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            background: '#F9FAFB', borderRadius: '0 0 12px 12px',
          }}>
            <Button variant="outline" onClick={onClose} disabled={saving} style={{ fontSize: 12 }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}
              style={{ backgroundColor: '#2e5244', color: 'white', fontSize: 12 }}>
              {saving
                ? <><Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" />Guardando...</>
                : <><Save style={{ width: 14, height: 14, marginRight: 6 }} />{isEdit ? 'Guardar cambios' : 'Crear riesgo'}</>
              }
            </Button>
          </div>
        )}
        {isView && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', background: '#F9FAFB', borderRadius: '0 0 12px 12px' }}>
            <Button variant="outline" onClick={onClose} style={{ fontSize: 12 }}>Cerrar</Button>
          </div>
        )}
      </div>
    </div>
  );
}