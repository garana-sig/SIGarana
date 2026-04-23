// src/hooks/useIndicadores.js
// Hook para el módulo de Indicadores CMI
// Incluye: CRUD, fórmulas ejecutables, mediciones, emails

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES EXPORTADAS
// ─────────────────────────────────────────────────────────────────────────────

export const PERSPECTIVES = [
  { value: 'financiera',             label: 'Financiera' },
  { value: 'cliente',                label: 'Cliente' },
  { value: 'procesos_internos',      label: 'Procesos Internos' },
  { value: 'crecimiento_desarrollo', label: 'Crecimiento y Desarrollo' },
];

export const FREQUENCIES = [
  { value: 'diaria',     label: 'Diaria' },
  { value: 'semanal',    label: 'Semanal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
];

export const INDICATOR_TYPES = [
  { value: 'bsc',     label: 'Balanced Score Card (BSC)' },
  { value: 'process', label: 'Indicador de Proceso' },
];

export const INDICATOR_SUBTYPES = [
  { value: 'RESULTADOS', label: 'Resultados' },
  { value: 'PROCESO',    label: 'Proceso' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE FÓRMULAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evalúa una expresión matemática reemplazando variables por sus valores.
 *
 * Ejemplo:
 *   expression: "(a - b) / a * 100"
 *   inputs:     { a: 3271651530, b: 2376890490 }
 *   resultado:  27.4
 */
export const evaluateFormula = (expression, inputs) => {
  if (!expression || !inputs) {
    return { result: null, error: 'Fórmula o valores vacíos' };
  }

  try {
    let expr = expression;

    // Reemplazar cada variable por su valor numérico
    for (const [key, value] of Object.entries(inputs)) {
      if (value === '' || value === null || value === undefined) {
        return { result: null, error: `Falta el valor de "${key}"` };
      }
      const num = parseFloat(value);
      if (isNaN(num)) {
        return { result: null, error: `"${key}" no es un número válido` };
      }
      // Reemplazar todas las ocurrencias (word boundary)
      expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), num);
    }

    // Validar que solo queden números y operadores seguros
    if (!/^[\d\s+\-*/().,%]+$/.test(expr)) {
      return { result: null, error: 'La expresión contiene caracteres inválidos' };
    }

    // Evaluar de forma segura
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();

    if (!isFinite(result)) {
      return { result: null, error: 'División por cero u operación inválida' };
    }

    return { result: Math.round(result * 10000) / 10000, error: null };

  } catch {
    return { result: null, error: 'Error al evaluar la fórmula' };
  }
};

/**
 * Valida que la expresión sea matemáticamente correcta
 * usando valores ficticios (1) para cada variable.
 * Se usa al guardar el indicador.
 */
export const validateFormulaExpression = (expression, variables) => {
  if (!expression) return { valid: true };
  if (!variables || variables.length === 0) {
    return { valid: false, error: 'Define al menos una variable' };
  }
  const testInputs = {};
  variables.forEach(v => { testInputs[v.key] = 1; });
  const { error } = evaluateFormula(expression, testInputs);
  if (error) return { valid: false, error };
  return { valid: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEMÁFORO
// ─────────────────────────────────────────────────────────────────────────────

export const getMeasurementStatus = (measuredValue, goalValue, direction = 'asc') => {
  if (measuredValue == null || goalValue == null || goalValue === 0) {
    return { key: 'no_data', label: '⚫ Sin datos', color: '#9CA3AF', pct: null };
  }

  let pct;
  if (direction === 'desc') {
    // Menor es mejor: <2% → si mido 1.5% estoy bien (100%), si mido 3% estoy mal
    if (measuredValue <= goalValue) {
      pct = 100;
    } else {
      pct = Math.round((goalValue / measuredValue) * 100 * 10) / 10;
    }
  } else {
    // Mayor es mejor: >=5% → (medido / meta) * 100
    pct = Math.round((measuredValue / goalValue) * 100 * 10) / 10;
  }

  if (pct >= 100) return { key: 'good',     label: '🟢 Cumple',      color: '#16A34A', pct };
  if (pct >= 80)  return { key: 'warning',  label: '🟡 Advertencia', color: '#D97706', pct };
  return              { key: 'critical', label: '🔴 Crítico',     color: '#DC2626', pct };
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSER DE META
// Extrae número y dirección del texto de meta
// ">= 5%"  → { value: 5,   direction: 'asc'  }
// "<2%"    → { value: 2,   direction: 'desc' }
// ">80%"   → { value: 80,  direction: 'asc'  }
// "<100 dias" → { value: 100, direction: 'desc' }
// ─────────────────────────────────────────────────────────────────────────────
export const parseGoalText = (goalText) => {
  if (!goalText) return { value: null, direction: 'asc' };

  // Extraer operador
  const isDesc = /^</.test(goalText.trim()); // empieza con < → desc
  const direction = isDesc ? 'desc' : 'asc';

  // Extraer primer número del texto (incluye decimales y comas)
  const match = goalText.replace(',', '.').match(/[\d]+\.?[\d]*/);
  const value = match ? parseFloat(match[0]) : null;

  return { value, direction };
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK DE PERFILES
// ─────────────────────────────────────────────────────────────────────────────

export function useProfiles() {
  const [profiles, setProfiles]               = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const { data } = await supabase
      .from('profile')
      .select('id, full_name, email, role')
      .eq('is_active', true)
      .order('full_name');
    setProfiles(data || []);
    setLoadingProfiles(false);
  }, []);

  return { profiles, loadingProfiles, fetchProfiles };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SILENCIOSO
// ─────────────────────────────────────────────────────────────────────────────

const sendEmailSilent = async (type, to, data) => {
  if (!to) return;
  try {
    await supabase.functions.invoke('send-email', {
      body: { type, to, data },
    });
  } catch (err) {
    console.warn(`⚠️ Email no enviado a ${to}:`, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function useIndicadores() {
  const { user, profile } = useAuth();
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const getManagerEmails = async () => {
    const { data } = await supabase
      .from('profile')
      .select('email')
      .eq('role', 'gerencia')
      .eq('is_active', true);
    return (data || []).map(p => p.email).filter(Boolean);
  };

  // ── FETCH ──────────────────────────────────────────────────────────────────
  const fetchIndicators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Admin y gerencia ven todos; usuarios solo los que tienen a cargo
      const isPrivileged = profile?.role === 'admin' || profile?.role === 'gerencia';

      let query = supabase
        .from('indicator')
        .select('*')
        .neq('status', 'archived')
        .is('deleted_at', null)
        .order('indicator_type')
        .order('created_at', { ascending: false });

      if (!isPrivileged && profile?.id) {
        query = query.eq('responsible_id', profile.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!data || data.length === 0) { setIndicators([]); return; }

      const userIds = [...new Set([
        ...data.map(i => i.responsible_id),
        ...data.map(i => i.created_by),
      ].filter(Boolean))];

      const { data: profilesData } = await supabase
        .from('profile')
        .select('id, full_name, email')
        .in('id', userIds);

      const pm = {};
      (profilesData || []).forEach(p => { pm[p.id] = p; });

      // Cargar nombres de procesos
      const processIds = [...new Set(data.map(i => i.process_id).filter(Boolean))];
      let procMap = {};
      if (processIds.length > 0) {
        const { data: procs } = await supabase
          .from('process')
          .select('id, name')
          .in('id', processIds);
        (procs || []).forEach(p => { procMap[p.id] = p.name; });
      }

      // Última medición por indicador (para semáforo en tabla)
      const indicatorIds = data.map(i => i.id);
      const { data: lastMeasurements } = await supabase
        .from('indicator_measurement')
        .select('indicator_id, measured_value, goal_value, measurement_status, period_label, measurement_date, created_at')
        .in('indicator_id', indicatorIds)
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false });  // desempate: la más reciente primero

      const lastByInd = {};
      (lastMeasurements || []).forEach(m => {
        if (!lastByInd[m.indicator_id]) lastByInd[m.indicator_id] = m;
      });

      setIndicators(data.map(ind => {
        const last = lastByInd[ind.id] || null;
        return {
          ...ind,
          process_name:            procMap[ind.process_id] || '—',
          responsible:             pm[ind.responsible_id] || null,
          responsible_name:        pm[ind.responsible_id]?.full_name || '—',
          created_by_name:         pm[ind.created_by]?.full_name     || '—',
          formula_variables:       Array.isArray(ind.formula_variables)
            ? ind.formula_variables
            : (ind.formula_variables ? JSON.parse(ind.formula_variables) : []),
          last_measurement_status: last?.measurement_status || 'no_data',
          last_measurement_value:  last?.measured_value ?? null,
          last_period_label:       last?.period_label || null,
        };
      }));

    } catch (err) {
      console.error('❌ fetchIndicators:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const createIndicator = async (formData) => {
    try {
      // Validar fórmula si existe
      if (formData.formula_expression) {
        const v = validateFormulaExpression(
          formData.formula_expression,
          formData.formula_variables || []
        );
        if (!v.valid) return { success: false, error: `Fórmula inválida: ${v.error}` };
      }

      // Auto-parsear meta para extraer valor numérico y dirección
      const parsedGoal = parseGoalText(formData.goal);

      const { data, error: insertError } = await supabase
        .from('indicator')
        .insert({
          ...formData,
          created_by:          user.id,
          status:              'active',
          perspective:         formData.indicator_type === 'process' ? null : formData.perspective,
          formula_variables:   formData.formula_variables || [],
          goal_value_parsed:   parsedGoal.value,
          goal_direction:      parsedGoal.direction,
          // goal_value manual sigue siendo opcional
          goal_value: formData.goal_value !== '' && formData.goal_value != null
            ? parseFloat(formData.goal_value) : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchIndicators();

      // Emails
      const emailData = {
        consecutive:     data.consecutive,
        indicator_name:  data.indicator_name,
        objective:       data.objective,
        goal:            data.goal,
        frequency:       FREQUENCIES.find(f => f.value === data.frequency)?.label || data.frequency,
        created_by_name: profile?.full_name || 'Usuario',
      };

      const { data: resp } = await supabase
        .from('profile').select('email, full_name').eq('id', data.responsible_id).single();
      if (resp?.email) {
        sendEmailSilent('indicador_creacion', resp.email,
          { ...emailData, recipient_name: resp.full_name });
      }
      const managers = await getManagerEmails();
      managers.forEach(email =>
        sendEmailSilent('indicador_creacion', email,
          { ...emailData, recipient_name: 'Equipo de Gerencia' })
      );

      return { success: true, data };

    } catch (err) {
      console.error('❌ createIndicator:', err);
      return { success: false, error: err.message };
    }
  };

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  const updateIndicator = async (id, formData) => {
    try {
      if (formData.formula_expression) {
        const v = validateFormulaExpression(
          formData.formula_expression,
          formData.formula_variables || []
        );
        if (!v.valid) return { success: false, error: `Fórmula inválida: ${v.error}` };
      }

      const parsedGoal = parseGoalText(formData.goal);

      // Extraer solo campos editables (evitar RLS por campos como created_by, consecutive)
      const {
        indicator_type, perspective, strategic_initiative, objective,
        indicator_name, indicator_subtype, formula, formula_expression,
        formula_variables, process_id, definition, goal, disclosed_to,
        responsible_id, frequency, measurement_start_date, measurement_end_date,
        status,
      } = formData;

      const { error: updateError } = await supabase
        .from('indicator')
        .update({
          indicator_type,
          perspective:          indicator_type === 'process' ? null : perspective,
          strategic_initiative, objective, indicator_name, indicator_subtype,
          formula, formula_expression,
          formula_variables:    formula_variables || [],
          process_id:           process_id || null,
          definition, goal, disclosed_to, responsible_id,
          frequency, measurement_start_date, measurement_end_date,
          status,
          goal_value_parsed: parsedGoal.value,
          goal_direction:    parsedGoal.direction,
        })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchIndicators();

      // Email al responsable cuando se edita
      const { data: resp } = await supabase
        .from('profile').select('email, full_name').eq('id', formData.responsible_id).single();
      if (resp?.email) {
        sendEmailSilent('indicador_edicion', resp.email, {
          consecutive:      formData.consecutive || '',
          indicator_name:   formData.indicator_name,
          goal:             formData.goal,
          frequency:        FREQUENCIES.find(f => f.value === formData.frequency)?.label || formData.frequency,
          start_date:       formData.measurement_start_date || null,
          end_date:         formData.measurement_end_date   || null,
          formula_expression: formData.formula_expression   || null,
          formula_variables:  formData.formula_variables    || [],
          updated_by_name:  profile?.full_name || 'Usuario',
          recipient_name:   resp.full_name,
        });
      }

      return { success: true };

    } catch (err) {
      console.error('❌ updateIndicator:', err);
      return { success: false, error: err.message };
    }
  };

  // ── DELETE (soft) ──────────────────────────────────────────────────────────
  const deleteIndicator = async (id) => {
    try {
      // Primero eliminar mediciones asociadas (FK constraint)
      const { error: delMedError } = await supabase
        .from('indicator_measurement')
        .delete()
        .eq('indicator_id', id);
      if (delMedError) throw delMedError;

      // Luego eliminar el indicador permanentemente
      const { error: deleteError } = await supabase
        .from('indicator')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchIndicators();
      return { success: true };

    } catch (err) {
      console.error('❌ deleteIndicator:', err);
      return { success: false, error: err.message };
    }
  };

  // ── FETCH MEDICIONES ───────────────────────────────────────────────────────
  const fetchMeasurements = async (indicatorId, goalDirection = 'asc') => {
    try {
      const { data, error: fetchError } = await supabase
        .from('indicator_measurement')
        .select('*')
        .eq('indicator_id', indicatorId)
        .order('measurement_date', { ascending: false });

      if (fetchError) throw fetchError;

      const userIds = [...new Set((data || []).map(m => m.created_by).filter(Boolean))];
      let pm = {};
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from('profile').select('id, full_name').in('id', userIds);
        (pData || []).forEach(p => { pm[p.id] = p; });
      }

      return (data || []).map(m => ({
        ...m,
        created_by_name: pm[m.created_by]?.full_name || '—',
        status_info:     getMeasurementStatus(m.measured_value, m.goal_value, goalDirection),
        formula_inputs:  Array.isArray(m.formula_inputs) ? {} :
          (typeof m.formula_inputs === 'string'
            ? JSON.parse(m.formula_inputs)
            : (m.formula_inputs || {})),
      }));

    } catch (err) {
      console.error('❌ fetchMeasurements:', err);
      return [];
    }
  };

  // ── REGISTRAR MEDICIÓN ─────────────────────────────────────────────────────
  /**
   * measurementData:
   * {
   *   period_label:     "Q1 2026",
   *   measurement_date: "2026-03-31",
   *   formula_inputs:   { a: 3271651530, b: 2376890490 },
   *   measured_value:   27.4,   ← calculado en frontend con evaluateFormula()
   *   goal_value:       5,      ← viene del indicador
   *   unit:             "%",
   *   notes:            "..."
   * }
   */
  const addMeasurement = async (indicatorId, measurementData) => {
    try {
      // Obtener meta numérica del indicador (ya parseada en BD)
      const ind = indicators.find(i => i.id === indicatorId);
      const parsedGoal = parseGoalText(ind?.goal || '');
      const goalValue  = parsedGoal.value;

      const { data, error: insertError } = await supabase
        .from('indicator_measurement')
        .insert({
          ...measurementData,
          indicator_id: indicatorId,
          created_by:   user.id,
          // Siempre pasar goal_value para que el trigger calcule el estado
          goal_value: measurementData.goal_value || goalValue || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchIndicators();

      // Alerta crítica
      if (data.measurement_status === 'critical') {
        const ind = indicators.find(i => i.id === indicatorId);
        const emailData = {
          consecutive:    ind?.consecutive    || '—',
          indicator_name: ind?.indicator_name || '—',
          period_label:   data.period_label,
          measured_value: data.measured_value,
          goal_value:     data.goal_value,
          unit:           data.unit || '%',
          registered_by:  profile?.full_name  || 'Usuario',
        };
        if (ind?.responsible?.email) {
          sendEmailSilent('indicador_critico', ind.responsible.email,
            { ...emailData, recipient_name: ind.responsible_name });
        }
        const managers = await getManagerEmails();
        managers.forEach(email =>
          sendEmailSilent('indicador_critico', email,
            { ...emailData, recipient_name: 'Equipo de Gerencia' })
        );
      }

      return { success: true, data };

    } catch (err) {
      console.error('❌ addMeasurement:', err);
      return { success: false, error: err.message };
    }
  };

  // ── ELIMINAR MEDICIÓN ──────────────────────────────────────────────────────
  const deleteMeasurement = async (measurementId) => {
    try {
      const { error: deleteError } = await supabase
        .from('indicator_measurement')
        .delete()
        .eq('id', measurementId);

      if (deleteError) throw deleteError;
      return { success: true };

    } catch (err) {
      console.error('❌ deleteMeasurement:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    indicators,
    loading,
    error,
    fetchIndicators,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    fetchMeasurements,
    addMeasurement,
    deleteMeasurement,
  };
}