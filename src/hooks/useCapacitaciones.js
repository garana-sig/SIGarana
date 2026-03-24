// src/hooks/useCapacitaciones.js
// ═══════════════════════════════════════════════════════════════════════
// Hook principal para el módulo de Capacitaciones SST
// Gestiona: planes anuales + ítems + CRUD completo
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useCapacitaciones() {
  const [plans, setPlans]     = useState([]);   // todos los años
  const [items, setItems]     = useState([]);   // ítems del año activo
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Cargar todos los planes ────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('training_plan')
        .select('*')
        .order('year', { ascending: false });

      if (err) throw err;
      setPlans(data || []);

      // Seleccionar el más reciente por defecto
      if (data?.length && !activePlan) {
        setActivePlan(data[0]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  // ── Cargar ítems del plan activo ───────────────────────────────────
  const fetchItems = useCallback(async (planId) => {
    if (!planId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('training_item')
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
    // Verificar si ya existe
    const exists = plans.find(p => p.year === year);
    if (exists) throw new Error(`Ya existe un plan para el año ${year}.`);

    const { data: newPlan, error: err } = await supabase
      .from('training_plan')
      .insert({ year })
      .select()
      .single();

    if (err) throw err;

    // Opción: copiar ítems del año anterior (sin meses ni control de ejecución)
    if (copyFromPlanId) {
      const { data: sourceItems } = await supabase
        .from('training_item')
        .select('order_num,title,objective,instructor,participants,duration,resources,budget')
        .eq('plan_id', copyFromPlanId)
        .order('order_num');

      if (sourceItems?.length) {
        const copies = sourceItems.map(it => ({ ...it, plan_id: newPlan.id }));
        const { error: copyErr } = await supabase.from('training_item').insert(copies);
        if (copyErr) throw copyErr;
      }
    }

    await fetchPlans();
    setActivePlan(newPlan);
    return newPlan;
  };

  // ── Crear ítem ─────────────────────────────────────────────────────
  const createItem = async (planId, payload) => {
    // Calcular order_num automático
    const maxOrder = items.reduce((m, it) => Math.max(m, it.order_num), 0);
    const { data, error: err } = await supabase
      .from('training_item')
      .insert({ ...payload, plan_id: planId, order_num: maxOrder + 1 })
      .select()
      .single();

    if (err) throw err;
    setItems(prev => [...prev, data]);
    return data;
  };

  // ── Actualizar ítem (cualquier campo, incluidos meses) ─────────────
  const updateItem = async (itemId, patch) => {
    const { data, error: err } = await supabase
      .from('training_item')
      .update(patch)
      .eq('id', itemId)
      .select()
      .single();

    if (err) throw err;
    setItems(prev => prev.map(it => it.id === itemId ? data : it));
    return data;
  };

  // ── Toggle de mes (helper optimista) ──────────────────────────────
  const toggleMonth = async (itemId, monthKey, currentValue) => {
    // Actualización optimista local inmediata
    setItems(prev =>
      prev.map(it =>
        it.id === itemId ? { ...it, [monthKey]: !currentValue } : it
      )
    );
    try {
      await updateItem(itemId, { [monthKey]: !currentValue });
    } catch (e) {
      // Revertir si falla
      setItems(prev =>
        prev.map(it =>
          it.id === itemId ? { ...it, [monthKey]: currentValue } : it
        )
      );
      throw e;
    }
  };

  // ── Eliminar ítem (hard delete) ────────────────────────────────────
  const deleteItem = async (itemId) => {
    const { error: err } = await supabase
      .from('training_item')
      .delete()
      .eq('id', itemId);

    if (err) throw err;
    setItems(prev => prev.filter(it => it.id !== itemId));
  };

  // ── Efectos ────────────────────────────────────────────────────────
  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => {
    if (activePlan?.id) fetchItems(activePlan.id);
  }, [activePlan?.id, fetchItems]);

  // ── Totales ────────────────────────────────────────────────────────
  const totalBudget = items.reduce((s, it) => s + (Number(it.budget) || 0), 0);
  const completedItems = items.filter(it => it.execution_date && it.evaluation_done).length;

  return {
    plans,
    items,
    activePlan,
    setActivePlan,
    loading,
    error,
    totalBudget,
    completedItems,
    createPlan,
    createItem,
    updateItem,
    toggleMonth,
    deleteItem,
    refetch: fetchPlans,
  };
}