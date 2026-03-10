// src/hooks/usePlaneacionEstrategica.js
// Hook adaptado a la estructura REAL de la tabla indicator en Supabase
// La tabla indicator es PLANA: perspective (text), objective (text), indicator_name (text)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function getSemaphore(actual, target, direction = 'higher_better') {
  if (target == null || target === 0)
    return { status: 'sin_meta', color: '#9ca3af', emoji: '⚪', label: 'Sin meta', pct: null };
  const pct = direction === 'lower_better'
    ? (target / Math.max(actual, 0.001)) * 100
    : (actual / target) * 100;
  if (pct >= 100) return { status: 'bueno',   color: '#16a34a', emoji: '🟢', label: 'Cumplido',  pct };
  if (pct >= 80)  return { status: 'alerta',  color: '#d97706', emoji: '🟡', label: 'En alerta', pct };
  return             { status: 'critico', color: '#dc2626', emoji: '🔴', label: 'Crítico',   pct };
}

export function formatPeriod(period) {
  if (!period) return '';
  if (period.includes('-Q')) { const [y,q] = period.split('-Q'); return `T${q} ${y}`; }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-');
    return `${'Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic'.split(' ')[+m-1]} ${y}`;
  }
  return period;
}

export function getCurrentPeriod(frequency) {
  const now = new Date(), y = now.getFullYear(),
        m = String(now.getMonth()+1).padStart(2,'0'),
        q = Math.ceil((now.getMonth()+1)/3);
  switch(frequency) {
    case 'monthly':    return `${y}-${m}`;
    case 'quarterly':  return `${y}-Q${q}`;
    case 'semiannual': return `${y}-S${now.getMonth()<6?1:2}`;
    case 'annual':     return `${y}`;
    default:           return `${y}-${m}`;
  }
}

// Convierte fila real de BD → objeto normalizado para el componente
function normalize(raw) {
  return {
    id:            raw.id,
    consecutive:   raw.consecutive,
    name:          raw.indicator_name || '(sin nombre)',   // ← campo real es indicator_name
    perspective:   raw.perspective    || 'Sin perspectiva',
    objective:     raw.objective      || 'Sin objetivo',
    formula:       raw.formula        || raw.formula_expression || '',
    unit:          raw.goal           || '',               // "goal" = unidad/descripción meta
    target:        raw.goal_value_parsed ?? raw.goal_value ?? 0,
    frequency:     raw.frequency      || 'monthly',
    responsible_id:raw.responsible_id,
    goal_direction:raw.goal_direction || 'higher_better',
    definition:    raw.definition,
    indicator_type:raw.indicator_type,
    is_active:     raw.is_active !== false,
    created_at:    raw.created_at,
  };
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function usePlaneacionEstrategica() {
  const [indicators, setIndicators] = useState([]);
  const [values,     setValues]     = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [iRes, vRes, uRes] = await Promise.all([
        supabase.from('indicator').select('*').eq('is_active', true).order('created_at'),
        supabase.from('indicator_value').select('*').order('created_at', { ascending: false }),
        supabase.from('profile').select('id, full_name, email').eq('is_active', true).order('full_name'),
      ]);
      if (iRes.error) throw iRes.error;
      // indicator_value puede no existir aún — ignorar ese error específico
      if (vRes.error && !vRes.error.message?.includes('does not exist')) throw vRes.error;

      setIndicators((iRes.data || []).map(normalize));
      setValues(vRes.data || []);
      setUsers(uRes.data  || []);
    } catch(e) {
      console.error('usePlaneacionEstrategica:', e);
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── CRUD ──────────────────────────────────
  const createIndicator = async (data) => {
    const { error } = await supabase.from('indicator').insert({
      indicator_name:    data.name,
      perspective:       data.perspective,
      objective:         data.objective,
      formula:           data.formula,
      goal:              data.unit,
      goal_value:        parseFloat(data.target) || 0,
      goal_value_parsed: parseFloat(data.target) || 0,
      frequency:         data.frequency,
      responsible_id:    data.responsible_id || null,
      goal_direction:    data.goal_direction || 'higher_better',
      definition:        data.definition || null,
      is_active:         true,
    });
    if (error) throw error;
    await loadAll();
  };

  const updateIndicator = async (id, data) => {
    const { error } = await supabase.from('indicator').update({
      indicator_name:    data.name,
      perspective:       data.perspective,
      objective:         data.objective,
      formula:           data.formula,
      goal:              data.unit,
      goal_value:        parseFloat(data.target) || 0,
      goal_value_parsed: parseFloat(data.target) || 0,
      frequency:         data.frequency,
      responsible_id:    data.responsible_id || null,
      goal_direction:    data.goal_direction || 'higher_better',
      definition:        data.definition || null,
    }).eq('id', id);
    if (error) throw error;
    await loadAll();
  };

  const deleteIndicator = async (id) => {
    const { error } = await supabase.from('indicator').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    await loadAll();
  };

  const registerValue = async (indicatorId, period, actualValue, notes, userId) => {
    const existing = values.find(v => v.indicator_id === indicatorId && v.period === period);
    if (existing) {
      const { error } = await supabase.from('indicator_value')
        .update({ actual_value: actualValue, notes, registered_by: userId }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('indicator_value').insert({
        indicator_id: indicatorId, period, actual_value: actualValue, notes, registered_by: userId,
      });
      if (error) throw error;
    }
    await loadAll();
  };

  // ── Computed ──────────────────────────────
  const getLatestValue = useCallback((indicatorId) => {
    return values
      .filter(v => v.indicator_id === indicatorId)
      .sort((a, b) => (b.period || '').localeCompare(a.period || ''))[0] || null;
  }, [values]);

  const getIndicatorHistory = useCallback((indicatorId, limit = 6) => {
    return values
      .filter(v => v.indicator_id === indicatorId)
      .sort((a, b) => (a.period || '').localeCompare(b.period || ''))
      .slice(-limit)
      .map(v => ({ period: formatPeriod(v.period), rawPeriod: v.period, value: v.actual_value, notes: v.notes }));
  }, [values]);

  // Colores por nombre de perspectiva
  const perspColor = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('financ'))   return '#2e5244';
    if (n.includes('client'))   return '#6dbd96';
    if (n.includes('proceso'))  return '#6f7b2c';
    if (n.includes('aprendiz') || n.includes('crec')) return '#d97706';
    return '#2e5244';
  };

  const getTree = useCallback(() => {
    const perspNames = [...new Set(indicators.map(i => i.perspective))];
    return perspNames.map(pName => {
      const pInds = indicators.filter(i => i.perspective === pName);
      const objNames = [...new Set(pInds.map(i => i.objective))];

      const allWithSem = pInds.map(ind => {
        const latest = getLatestValue(ind.id);
        const semaphore = latest
          ? getSemaphore(latest.actual_value, ind.target, ind.goal_direction)
          : { status: 'sin_dato', color: '#9ca3af', emoji: '⚪', label: 'Sin datos', pct: null };
        return { ...ind, latest, semaphore };
      });

      const withPct = allWithSem.filter(i => i.semaphore.pct != null);
      const avgPct  = withPct.length
        ? withPct.reduce((s, i) => s + i.semaphore.pct, 0) / withPct.length : null;

      return {
        id:   pName,
        name: pName,
        color: perspColor(pName),
        objectives: objNames.map(oName => ({
          id:         `${pName}__${oName}`,
          name:       oName,
          indicators: allWithSem.filter(i => i.objective === oName),
        })),
        indicators: allWithSem,
        avgPct,
        semaphore: avgPct != null ? getSemaphore(avgPct, 100) : null,
      };
    });
  }, [indicators, getLatestValue]);

  const getSummary = useCallback(() => {
    const tree = getTree();
    const all  = tree.flatMap(p => p.indicators);
    const buenos   = all.filter(i => i.semaphore.status === 'bueno').length;
    const alertas  = all.filter(i => i.semaphore.status === 'alerta').length;
    const criticos = all.filter(i => i.semaphore.status === 'critico').length;
    const withPct  = all.filter(i => i.semaphore.pct != null);
    const avgCumplimiento = withPct.length
      ? withPct.reduce((s, i) => s + i.semaphore.pct, 0) / withPct.length : 0;
    return { total: all.length, buenos, alertas, criticos, sinDato: all.length - buenos - alertas - criticos, avgCumplimiento, tree };
  }, [getTree]);

  // Para los selects de los forms (perspectivas y objetivos únicos existentes)
  const getPerspectiveOptions = useCallback(() =>
    [...new Set(indicators.map(i => i.perspective))].filter(Boolean), [indicators]);

  const getObjectiveOptions = useCallback((perspName) =>
    [...new Set(indicators.filter(i => i.perspective === perspName).map(i => i.objective))].filter(Boolean),
  [indicators]);

  return {
    indicators, values, users, loading, error, loadAll,
    createIndicator, updateIndicator, deleteIndicator, registerValue,
    getTree, getSummary, getIndicatorHistory, getLatestValue,
    getPerspectiveOptions, getObjectiveOptions,
  };
}