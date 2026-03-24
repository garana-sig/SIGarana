// src/hooks/useWorkPlan.js
// ═══════════════════════════════════════════════════════════════════════
// Hook reutilizable para los 3 planes de trabajo SST:
//   convivencia · copasst · bienestar
// Uso: const hook = useWorkPlan('convivencia')
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const MONTH_KEYS = [
  'month_jan','month_feb','month_mar','month_apr','month_may','month_jun',
  'month_jul','month_aug','month_sep','month_oct','month_nov','month_dec',
];

export function useWorkPlan(planType) {
  const [plans, setPlans]         = useState([]);
  const [items, setItems]         = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // ── Cargar planes del tipo dado ────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase
        .from('work_plan')
        .select('*')
        .eq('plan_type', planType)
        .order('year', { ascending: false });
      if (err) throw err;
      setPlans(data || []);
      if (data?.length && !activePlan) setActivePlan(data[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [planType]); // eslint-disable-line

  // ── Cargar ítems del plan activo ───────────────────────────────────
  const fetchItems = useCallback(async (planId) => {
    if (!planId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('work_plan_item')
        .select('*')
        .eq('plan_id', planId)
        .order('order_num');
      if (err) throw err;
      setItems(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Crear nuevo plan anual ─────────────────────────────────────────
  const createPlan = async (year, copyFromPlanId = null) => {
    const exists = plans.find(p => p.year === year);
    if (exists) throw new Error(`Ya existe un plan ${planType} para el año ${year}.`);

    const { data: newPlan, error: err } = await supabase
      .from('work_plan')
      .insert({ year, plan_type: planType })
      .select().single();
    if (err) throw err;

    if (copyFromPlanId) {
      const { data: sourceItems } = await supabase
        .from('work_plan_item')
        .select('order_num,activity,responsible,resources,num_persons,hours,unit_price,budget')
        .eq('plan_id', copyFromPlanId)
        .order('order_num');
      if (sourceItems?.length) {
        await supabase.from('work_plan_item')
          .insert(sourceItems.map(it => ({ ...it, plan_id: newPlan.id })));
      }
    }

    await fetchPlans();
    setActivePlan(newPlan);
    return newPlan;
  };

  // ── CRUD ítems ─────────────────────────────────────────────────────
  const createItem = async (planId, payload) => {
    const maxOrder = items.reduce((m, it) => Math.max(m, it.order_num), 0);
    const { data, error: err } = await supabase
      .from('work_plan_item')
      .insert({ ...payload, plan_id: planId, order_num: maxOrder + 1 })
      .select().single();
    if (err) throw err;
    setItems(prev => [...prev, data]);
    return data;
  };

  const updateItem = async (itemId, patch) => {
    const { data, error: err } = await supabase
      .from('work_plan_item')
      .update(patch)
      .eq('id', itemId)
      .select().single();
    if (err) throw err;
    setItems(prev => prev.map(it => it.id === itemId ? data : it));
    return data;
  };

  // Toggle de mes: si ya tiene valor lo borra, si está vacío pone 'x'
  const toggleMonth = async (itemId, monthKey, currentValue) => {
    const newVal = currentValue ? null : 'x';
    setItems(prev => prev.map(it =>
      it.id === itemId ? { ...it, [monthKey]: newVal } : it
    ));
    try {
      await updateItem(itemId, { [monthKey]: newVal });
    } catch (e) {
      setItems(prev => prev.map(it =>
        it.id === itemId ? { ...it, [monthKey]: currentValue } : it
      ));
      throw e;
    }
  };

  // Actualizar valor de un mes (texto libre: "Tema 1", "cuando se presente", etc.)
  const setMonthValue = async (itemId, monthKey, value) => {
    const trimmed = value?.trim() || null;
    setItems(prev => prev.map(it =>
      it.id === itemId ? { ...it, [monthKey]: trimmed } : it
    ));
    try {
      await updateItem(itemId, { [monthKey]: trimmed });
    } catch (e) {
      await fetchItems(activePlan?.id);
      throw e;
    }
  };

  const deleteItem = async (itemId) => {
    const { error: err } = await supabase
      .from('work_plan_item').delete().eq('id', itemId);
    if (err) throw err;
    setItems(prev => prev.filter(it => it.id !== itemId));
  };

  // ── Efectos ────────────────────────────────────────────────────────
  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => {
    if (activePlan?.id) fetchItems(activePlan.id);
  }, [activePlan?.id, fetchItems]);

  // ── Trazabilidad calculada ─────────────────────────────────────────
  // "Planeada" = mes con valor corto (x, Tema 1, 1...) 
  // NO cuenta valores condicionales largos como "cuando se presente"
  const isScheduled = (val) => val && val.trim() && val.trim().length <= 12;

  const trazabilidad = MONTH_KEYS.map((key) => {
    const planeadas  = items.filter(it => isScheduled(it[key])).length;
    const ejecutadas = items.filter(it => isScheduled(it[key]) && it.is_executed).length;
    const pct        = planeadas > 0 ? Math.round((ejecutadas / planeadas) * 100) : 0;
    return { key, planeadas, ejecutadas, pct };
  });

  const totalBudget = items.reduce((s, it) => s + (Number(it.budget) || 0), 0);

  return {
    plans, items, activePlan, setActivePlan,
    loading, error, totalBudget, trazabilidad,
    createPlan, createItem, updateItem,
    toggleMonth, setMonthValue, deleteItem,
    refetch: fetchPlans,
  };
}