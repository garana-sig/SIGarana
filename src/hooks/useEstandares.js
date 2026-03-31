// src/hooks/useEstandares.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useEstandares() {
  const [evaluations, setEvaluations] = useState([]);
  const [activeEval,  setActiveEval]  = useState(null);
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // ── Cargar todas las evaluaciones (años disponibles) ─────────────────
  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('standard_evaluation')
        .select('*')
        .order('year', { ascending: false });
      if (err) throw err;
      setEvaluations(data || []);
      if (data?.length) setActiveEval(data[0]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  // ── Cargar ítems de la evaluación activa ──────────────────────────────
  const fetchItems = useCallback(async (evalId) => {
    if (!evalId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('standard_item')
        .select('*')
        .eq('evaluation_id', evalId)
        .order('numeral');
      if (err) throw err;
      setItems(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvaluations(); }, [fetchEvaluations]);
  useEffect(() => {
    if (activeEval) fetchItems(activeEval.id);
  }, [activeEval, fetchItems]);

  // ── Actualizar un ítem (estado + campos de plan) ──────────────────────
  const updateItem = useCallback(async (itemId, changes) => {
    setSaving(true);
    try {
      const { data: updated, error: err } = await supabase
        .from('standard_item')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single();
      if (err) throw err;

      // Actualizar local
      setItems(prev => prev.map(it => it.id === itemId ? updated : it));

      // Recalcular puntaje total
      await recalcScore(activeEval.id);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
    finally { setSaving(false); }
  }, [activeEval]);

  // ── Recalcular y guardar puntaje total de la evaluación ───────────────
  const recalcScore = useCallback(async (evalId) => {
    const { data: itemsData } = await supabase
      .from('standard_item')
      .select('score')
      .eq('evaluation_id', evalId);
    const total = (itemsData || []).reduce((s, i) => s + (i.score || 0), 0);
    const rounded = Math.round(total * 100) / 100;
    await supabase
      .from('standard_evaluation')
      .update({ total_score: rounded })
      .eq('id', evalId);
    setEvaluations(prev =>
      prev.map(e => e.id === evalId ? { ...e, total_score: rounded } : e)
    );
    if (activeEval?.id === evalId)
      setActiveEval(prev => ({ ...prev, total_score: rounded }));
  }, [activeEval]);

  // ── Crear nueva evaluación copiando ítems del año anterior ────────────
  const createEvaluation = useCallback(async (year) => {
    setSaving(true);
    try {
      // Verificar que no exista
      const exists = evaluations.find(e => e.year === year);
      if (exists) return { ok: false, error: `Ya existe una evaluación para ${year}` };

      // Crear evaluación
      const { data: newEval, error: evalErr } = await supabase
        .from('standard_evaluation')
        .insert({ year, total_score: 0, status: 'active' })
        .select()
        .single();
      if (evalErr) throw evalErr;

      // Copiar ítems del año más reciente como base (sin evidencias/resultados)
      const sourceEval = evaluations[0]; // el más reciente
      if (sourceEval) {
        const { data: sourceItems } = await supabase
          .from('standard_item')
          .select('*')
          .eq('evaluation_id', sourceEval.id)
          .order('numeral');

        if (sourceItems?.length) {
          const newItems = sourceItems.map(({ id, evaluation_id, created_at, updated_at,
            eval_status, score, evidence, action_plan, responsible, due_date, updated_by,
            ...rest }) => ({
            ...rest,
            evaluation_id: newEval.id,
            eval_status:   'pendiente',
            score:         0,
            evidence:      null,
            action_plan:   null,
            responsible:   null,
            due_date:      null,
            updated_by:    null,
          }));
          const { error: itemsErr } = await supabase
            .from('standard_item')
            .insert(newItems);
          if (itemsErr) throw itemsErr;
        }
      }

      await fetchEvaluations();
      setActiveEval(newEval);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
    finally { setSaving(false); }
  }, [evaluations, fetchEvaluations]);

  // ── Helpers de agrupación ─────────────────────────────────────────────
  const groupedByCiclo = useCallback(() => {
    const ciclos = ['PLANEAR','HACER','VERIFICAR','ACTUAR'];
    return ciclos.map(ciclo => {
      const cicloItems = items.filter(i => i.ciclo === ciclo);
      const groups = [...new Set(cicloItems.map(i => i.standard_group))].map(grp => ({
        group:  grp,
        items:  cicloItems.filter(i => i.standard_group === grp),
        score:  cicloItems.filter(i => i.standard_group === grp)
                  .reduce((s, i) => s + (i.score || 0), 0),
        maxScore: cicloItems.filter(i => i.standard_group === grp)
                  .reduce((s, i) => s + (i.max_score || 0), 0),
      }));
      return {
        ciclo,
        groups,
        score:    cicloItems.reduce((s, i) => s + (i.score || 0), 0),
        maxScore: cicloItems.reduce((s, i) => s + (i.max_score || 0), 0),
        total:    cicloItems.length,
        cumple:   cicloItems.filter(i => i.eval_status === 'cumple').length,
        noCumple: cicloItems.filter(i => i.eval_status === 'no_cumple').length,
        noAplica: cicloItems.filter(i => i.eval_status?.startsWith('no_aplica')).length,
        pendiente:cicloItems.filter(i => i.eval_status === 'pendiente').length,
      };
    });
  }, [items]);

  return {
    evaluations, activeEval, setActiveEval,
    items, loading, saving, error,
    updateItem, createEvaluation,
    groupedByCiclo,
    totalScore: activeEval?.total_score || 0,
    refresh: fetchEvaluations,
  };
}