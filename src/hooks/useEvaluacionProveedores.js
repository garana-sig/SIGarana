// src/hooks/useEvaluacionProveedores.js
// CRUD evaluaciones de proveedores (RE-GR-01) — Garana SIG

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ── Escala de confiabilidad ──────────────────────────────────────────────────
export function calcularConfiabilidad(totalScore) {
  if (totalScore >= 4)    return 'confiable';
  if (totalScore >= 3)    return 'aceptable';
  return 'deficiente';
}

export function confiabilidadLabel(valor) {
  const map = {
    confiable:  'Confiable',
    aceptable:  'Aceptable',
    deficiente: 'Deficiente',
  };
  return map[valor] || valor;
}

export function confiabilidadColor(valor) {
  const map = {
    confiable:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    aceptable:  { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
    deficiente: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  };
  return map[valor] || { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' };
}

// ── Pesos por defecto del formato RE-GR-01 ───────────────────────────────────
export const PESOS_DEFAULT = {
  calidad:     0.40,
  servicio:    0.35,
  precio:      0.25,
  contratista: 0.00, // activado solo si is_contractor = true
};

// ── Calcular total ponderado ────────────────────────────────────────────────
export function calcularTotal(scores, isContractor = false) {
  const { calidad, servicio, precio, contratista } = scores;
  if (isContractor) {
    return (
      (calidad?.resultado     || 0) +
      (servicio?.resultado    || 0) +
      (precio?.resultado      || 0) +
      (contratista?.resultado || 0)
    );
  }
  return (
    (calidad?.resultado  || 0) +
    (servicio?.resultado || 0) +
    (precio?.resultado   || 0)
  );
}

// ════════════════════════════════════════════════════════════════════════════
export function useEvaluacionProveedores() {
  const { user } = useAuth();

  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  // ── Cargar evaluaciones con sus scores ────────────────────────────────
  const loadEvaluaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('supplier_evaluation')
        .select(`
          *,
          realizado_por_profile:profile!supplier_evaluation_realizado_por_fkey(id, full_name),
          aprobado_por_profile:profile!supplier_evaluation_aprobado_por_fkey(id, full_name),
          created_by_profile:profile!supplier_evaluation_created_by_fkey(id, full_name),
          scores:supplier_evaluation_score(
            *,
            supplier:supplier(id, nombre, nit, tipo)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setEvaluaciones(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvaluaciones(); }, [loadEvaluaciones]);

  // ── Crear evaluación + scores ─────────────────────────────────────────
  const createEvaluacion = useCallback(async (formData, scores) => {
    setSaving(true);
    setError(null);
    try {
      // 1. Insertar cabecera
      const { data: evalData, error: evalErr } = await supabase
        .from('supplier_evaluation')
        .insert({
          fecha_inicio:         formData.fecha_inicio,
          fecha_fin:            formData.fecha_fin,
          fecha_evaluacion:     formData.fecha_evaluacion || null,
          conclusiones:         formData.conclusiones?.trim()        || null,
          aspectos_por_mejorar: formData.aspectos_por_mejorar?.trim() || null,
          realizado_por:        formData.realizado_por || null,
          aprobado_por:         formData.aprobado_por  || null,
          status:               'draft',
          created_by:           user?.id,
        })
        .select()
        .single();

      if (evalErr) throw evalErr;

      // 2. Insertar scores por proveedor
      if (scores && scores.length > 0) {
        const scoresToInsert = scores.map((s, idx) => ({
          evaluation_id:    evalData.id,
          supplier_id:      s.supplier_id,
          orden:            idx + 1,
          calidad:          s.calidad     || {},
          servicio:         s.servicio    || {},
          precio:           s.precio      || {},
          contratista:      s.contratista || {},
          is_contractor:    s.is_contractor || false,
          total_score:      s.total_score   || 0,
          confiabilidad:    s.confiabilidad || null,
          aspectos_mejorar: s.aspectos_mejorar?.trim() || null,
        }));

        const { error: scoresErr } = await supabase
          .from('supplier_evaluation_score')
          .insert(scoresToInsert);

        if (scoresErr) throw scoresErr;
      }

      await loadEvaluaciones();
      return { success: true, data: evalData };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [user, loadEvaluaciones]);

  // ── Editar evaluación ─────────────────────────────────────────────────
  const updateEvaluacion = useCallback(async (id, formData, scores) => {
    setSaving(true);
    setError(null);
    try {
      // 1. Actualizar cabecera
      const { error: evalErr } = await supabase
        .from('supplier_evaluation')
        .update({
          fecha_inicio:         formData.fecha_inicio,
          fecha_fin:            formData.fecha_fin,
          fecha_evaluacion:     formData.fecha_evaluacion || null,
          conclusiones:         formData.conclusiones?.trim()         || null,
          aspectos_por_mejorar: formData.aspectos_por_mejorar?.trim() || null,
          realizado_por:        formData.realizado_por || null,
          aprobado_por:         formData.aprobado_por  || null,
        })
        .eq('id', id);

      if (evalErr) throw evalErr;

      // 2. Borrar scores anteriores y reinsertar
      const { error: delErr } = await supabase
        .from('supplier_evaluation_score')
        .delete()
        .eq('evaluation_id', id);

      if (delErr) throw delErr;

      if (scores && scores.length > 0) {
        const scoresToInsert = scores.map((s, idx) => ({
          evaluation_id:    id,
          supplier_id:      s.supplier_id,
          orden:            idx + 1,
          calidad:          s.calidad     || {},
          servicio:         s.servicio    || {},
          precio:           s.precio      || {},
          contratista:      s.contratista || {},
          is_contractor:    s.is_contractor || false,
          total_score:      s.total_score   || 0,
          confiabilidad:    s.confiabilidad || null,
          aspectos_mejorar: s.aspectos_mejorar?.trim() || null,
        }));

        const { error: scoresErr } = await supabase
          .from('supplier_evaluation_score')
          .insert(scoresToInsert);

        if (scoresErr) throw scoresErr;
      }

      await loadEvaluaciones();
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadEvaluaciones]);

  // ── Aprobar evaluación ────────────────────────────────────────────────
  const aprobarEvaluacion = useCallback(async (id) => {
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('supplier_evaluation')
        .update({ status: 'approved' })
        .eq('id', id);

      if (err) throw err;
      await loadEvaluaciones();
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadEvaluaciones]);

  // ── Soft delete evaluación ────────────────────────────────────────────
  const deleteEvaluacion = useCallback(async (id) => {
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('supplier_evaluation')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (err) throw err;
      await loadEvaluaciones();
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadEvaluaciones]);

  return {
    evaluaciones,
    loading,
    saving,
    error,
    loadEvaluaciones,
    createEvaluacion,
    updateEvaluacion,
    aprobarEvaluacion,
    deleteEvaluacion,
  };
}