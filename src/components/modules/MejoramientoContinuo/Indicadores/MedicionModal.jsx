// src/components/modules/MejoramientoContinuo/Indicadores/MedicionModal.jsx
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Loader2, X, Save, Calculator, TrendingUp } from 'lucide-react';
import { evaluateFormula, getMeasurementStatus, FREQUENCIES } from '@/hooks/useIndicadores';

const inputStyle = {
  fontSize: 12, height: 34, borderColor: '#D1D5DB',
};

// Calcula la fecha de cierre del período según frecuencia
const getPeriodEndDate = (frequency) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  switch (frequency) {
    case 'diaria':
      return now.toISOString().split('T')[0];
    case 'semanal': {
      // Último día de la semana actual (domingo)
      const day = now.getDay(); // 0=dom
      const sun = new Date(now);
      sun.setDate(now.getDate() + (day === 0 ? 0 : 7 - day));
      return sun.toISOString().split('T')[0];
    }
    case 'mensual': {
      // Último día del mes actual
      const last = new Date(y, m + 1, 0);
      return last.toISOString().split('T')[0];
    }
    case 'trimestral': {
      // Último día del trimestre actual
      const trimEnd = [2, 5, 8, 11][Math.floor(m / 3)];
      const last = new Date(y, trimEnd + 1, 0);
      return last.toISOString().split('T')[0];
    }
    case 'semestral': {
      const last = m < 6 ? new Date(y, 6, 0) : new Date(y, 12, 0);
      return last.toISOString().split('T')[0];
    }
    case 'anual': {
      return `${y}-12-31`;
    }
    default:
      return now.toISOString().split('T')[0];
  }
};

const PERIOD_LABELS = {
  diaria:     () => new Date().toLocaleDateString('es-CO'),
  semanal:    () => {
    const now = new Date();
    const week = Math.ceil(now.getDate() / 7);
    return `Semana ${week} - ${now.toLocaleString('es-CO', { month: 'long', year: 'numeric' })}`;
  },
  mensual:    () => new Date().toLocaleString('es-CO', { month: 'long', year: 'numeric' }),
  trimestral: () => {
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    return `Q${q} ${new Date().getFullYear()}`;
  },
  semestral:  () => {
    const s = new Date().getMonth() < 6 ? 1 : 2;
    return `Semestre ${s} ${new Date().getFullYear()}`;
  },
  anual:      () => `${new Date().getFullYear()}`,
};

export default function MedicionModal({ indicator, onSave, onClose }) {
  const hasFormula = indicator?.formula_expression && indicator?.formula_variables?.length > 0;

  const [inputs,       setInputs]       = useState({});    // { a: '', b: '' }
  const [manualValue,  setManualValue]  = useState('');    // cuando no hay fórmula
  const [goalValue,    setGoalValue]    = useState(indicator?.goal_value || '');
  const [unit,         setUnit]         = useState('%');
  const [periodLabel,  setPeriodLabel]  = useState('');
  const [measureDate,  setMeasureDate]  = useState(getPeriodEndDate(indicator?.frequency));
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);

  // Resultado calculado en tiempo real
  const [calcResult,   setCalcResult]   = useState(null);
  const [calcError,    setCalcError]    = useState('');

  // ── Inicializar variables y período ───────────────────────────────────────
  useEffect(() => {
    // Inicializar inputs vacíos para cada variable
    if (hasFormula) {
      const init = {};
      indicator.formula_variables.forEach(v => { init[v.key] = ''; });
      setInputs(init);
    }
    // Sugerir etiqueta de período según frecuencia
    const freq = indicator?.frequency || 'mensual';
    const fn = PERIOD_LABELS[freq] || PERIOD_LABELS.mensual;
    setPeriodLabel(fn());
  }, [indicator]);

  // ── Calcular resultado en tiempo real al cambiar inputs ───────────────────
  useEffect(() => {
    if (!hasFormula) return;

    // Verificar que todos los inputs tengan valor
    const allFilled = indicator.formula_variables.every(v => inputs[v.key] !== '');
    if (!allFilled) {
      setCalcResult(null);
      setCalcError('');
      return;
    }

    const { result, error } = evaluateFormula(indicator.formula_expression, inputs);
    if (error) {
      setCalcError(error);
      setCalcResult(null);
    } else {
      setCalcError('');
      setCalcResult(result);
    }
  }, [inputs, indicator]);

  const setInput = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // El valor final a guardar (calculado o manual)
  const finalValue = hasFormula ? calcResult : (manualValue !== '' ? parseFloat(manualValue) : null);
  const statusInfo = getMeasurementStatus(finalValue, parseFloat(goalValue) || null);

  const handleSave = async () => {
    if (finalValue === null) return;
    setSaving(true);
    await onSave(indicator.id, {
      period_label:     periodLabel,
      measurement_date: measureDate,
      formula_inputs:   hasFormula ? inputs : {},
      measured_value:   finalValue,
      goal_value:       parseFloat(goalValue) || null,
      unit,
      notes,
    });
    setSaving(false);
  };

  const canSave = finalValue !== null && periodLabel.trim() && !calcError;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1100, padding:16,
    }}>
      <div style={{
        backgroundColor:'white', borderRadius:12, width:'100%', maxWidth:560,
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'14px 20px', backgroundColor:'#2E75B6',
          borderRadius:'12px 12px 0 0',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <h3 style={{ color:'white', fontWeight:700, fontSize:14, margin:0 }}>
              <Calculator size={14} style={{ display:'inline', marginRight:6 }} />
              Registrar Medición
            </h3>
            <p style={{ color:'rgba(255,255,255,0.75)', fontSize:11, margin:0 }}>
              {indicator?.indicator_name} · Meta: {indicator?.goal}
            </p>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.2)', border:'none', borderRadius:6,
            cursor:'pointer', color:'white', padding:6, display:'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Cuerpo ── */}
        <div style={{ overflowY:'auto', padding:20, flex:1, display:'flex', flexDirection:'column', gap:16 }}>

          {/* ── Período ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                Etiqueta del Período *
              </label>
              <Input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)}
                style={inputStyle} placeholder="Ej: Q1 2026, Enero 2026..." />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                Fecha cierre del período *
              </label>
              <Input type="date" value={measureDate}
                onChange={e => setMeasureDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* ── Variables / Resultado ── */}
          {hasFormula ? (
            // ─ CON FÓRMULA: el usuario ingresa los valores de cada variable ─
            <div style={{ backgroundColor:'#EFF6FF', borderRadius:8, padding:14, border:'1px solid #BFDBFE' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#1D4ED8', marginBottom:10 }}>
                🔢 Ingresa los valores de cada variable
              </p>

              {/* Recordatorio de la fórmula */}
              <div style={{ backgroundColor:'white', borderRadius:6, padding:'6px 10px', marginBottom:10, border:'1px solid #BFDBFE' }}>
                <p style={{ fontSize:10, color:'#6B7280', margin:0 }}>
                  Fórmula: <code style={{ color:'#1D4ED8', fontWeight:700 }}>{indicator.formula_expression}</code>
                </p>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {indicator.formula_variables.map(v => (
                  <div key={v.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:32, height:32, backgroundColor:'#2E75B6', color:'white',
                      borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, fontWeight:700, flexShrink:0,
                    }}>{v.key}</div>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:10, color:'#374151', display:'block', marginBottom:2 }}>
                        {v.label || `Variable ${v.key}`}
                      </label>
                      <Input
                        type="number" value={inputs[v.key] || ''}
                        onChange={e => setInput(v.key, e.target.value)}
                        style={inputStyle}
                        placeholder="Ingresa el valor..." />
                    </div>
                  </div>
                ))}
              </div>

              {/* Resultado calculado */}
              <div style={{
                marginTop:14, padding:12, borderRadius:8,
                backgroundColor: calcError ? '#FEF2F2' : (calcResult !== null ? '#F0FDF4' : '#F9FAFB'),
                border: `1px solid ${calcError ? '#FECACA' : (calcResult !== null ? '#BBF7D0' : '#E5E7EB')}`,
                textAlign:'center',
              }}>
                {calcError ? (
                  <p style={{ color:'#DC2626', fontSize:12, margin:0 }}>⚠️ {calcError}</p>
                ) : calcResult !== null ? (
                  <>
                    <p style={{ fontSize:11, color:'#6B7280', margin:'0 0 4px' }}>Resultado calculado:</p>
                    <p style={{ fontSize:26, fontWeight:800, color:'#2e5244', margin:'0 0 4px' }}>
                      {calcResult} {unit}
                    </p>
                    <span style={{
                      fontSize:12, fontWeight:700, color: statusInfo.color,
                      backgroundColor: statusInfo.color + '20',
                      borderRadius:6, padding:'2px 10px',
                    }}>{statusInfo.label}</span>
                  </>
                ) : (
                  <p style={{ color:'#9CA3AF', fontSize:12, margin:0 }}>
                    Ingresa todos los valores para ver el resultado
                  </p>
                )}
              </div>
            </div>
          ) : (
            // ─ SIN FÓRMULA: el usuario ingresa el resultado directamente ─
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                Resultado medido *
              </label>
              <div style={{ display:'flex', gap:8 }}>
                <Input type="number" value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  style={{ ...inputStyle, flex:1 }}
                  placeholder="Ingresa el valor obtenido..." />
                <Input value={unit} onChange={e => setUnit(e.target.value)}
                  style={{ ...inputStyle, width:70 }} placeholder="%" />
              </div>
              {manualValue !== '' && (
                <div style={{ marginTop:8, textAlign:'center' }}>
                  <span style={{
                    fontSize:12, fontWeight:700, color: statusInfo.color,
                    backgroundColor: statusInfo.color + '20',
                    borderRadius:6, padding:'2px 10px',
                  }}>{statusInfo.label}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Meta numérica y unidad (editable por si cambia el período) ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                Meta numérica para este período
              </label>
              <Input type="number" value={goalValue}
                onChange={e => setGoalValue(e.target.value)}
                style={inputStyle} placeholder={indicator?.goal_value || 'Ej: 80'} />
            </div>
            {!hasFormula && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                  Unidad
                </label>
                <Input value={unit} onChange={e => setUnit(e.target.value)}
                  style={inputStyle} placeholder="%" />
              </div>
            )}
          </div>

          {/* ── Notas ── */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
              Observaciones
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              style={{
                fontSize:12, borderColor:'#D1D5DB', borderRadius:6,
                padding:'6px 10px', width:'100%', outline:'none',
                border:'1px solid #D1D5DB', resize:'vertical',
              }}
              placeholder="Observaciones o contexto de la medición..." />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding:'12px 20px', borderTop:'1px solid #E5E7EB',
          display:'flex', justifyContent:'flex-end', gap:8,
          backgroundColor:'#F9FAFB', borderRadius:'0 0 12px 12px',
        }}>
          <Button variant="outline" onClick={onClose} style={{ fontSize:12 }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}
            style={{ backgroundColor: canSave ? '#2E75B6' : '#9CA3AF', color:'white', fontSize:12 }}>
            {saving
              ? <><Loader2 size={13} className="animate-spin mr-1" /> Guardando...</>
              : <><Save size={13} className="mr-1" /> Guardar Medición</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}