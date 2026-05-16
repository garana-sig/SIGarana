// src/hooks/useSeleccionProveedores.js
// CRUD selección de proveedores (RE-GR-05) — Garana SIG

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ── Pesos del formato RE-GR-05 ───────────────────────────────────────────────
export const PESOS_SELECCION = {
  precio:          0.50,
  entrega:         0.25,
  descuento_vol:   0.0625,
  descuento_pp:    0.0625,
  sgsst:           0.0625,
  rendimiento:     0.0625,
  composicion:     0.00, // criterio libre sin peso fijo
};

// ── Calcular puntaje total ponderado ─────────────────────────────────────────
export function calcularPuntajeSeleccion(option) {
  return (
    (option.precio_score        || 0) * PESOS_SELECCION.precio        +
    (option.entrega_score       || 0) * PESOS_SELECCION.entrega       +
    (option.descuento_vol_score || 0) * PESOS_SELECCION.descuento_vol +
    (option.descuento_pp_score  || 0) * PESOS_SELECCION.descuento_pp  +
    (option.sgsst_score         || 0) * PESOS_SELECCION.sgsst         +
    (option.rendimiento_score   || 0) * PESOS_SELECCION.rendimiento
  );
}

// ════════════════════════════════════════════════════════════════════════════
export function useSeleccionProveedores() {
  const { user } = useAuth();

  const [selecciones, setSelecciones] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  // ── Cargar selecciones con sus opciones ───────────────────────────────
  const loadSelecciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('supplier_selection')
        .select(`
          *,
          realizado_por_profile:profile!supplier_selection_realizado_por_fkey(id, full_name),
          aprobado_por_profile:profile!supplier_selection_aprobado_por_fkey(id, full_name),
          created_by_profile:profile!supplier_selection_created_by_fkey(id, full_name),
          opciones:supplier_selection_option(
            *,
            supplier:supplier(id, nombre, nit, tipo)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setSelecciones(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSelecciones(); }, [loadSelecciones]);

  // ── Crear selección + opciones ────────────────────────────────────────
  const createSeleccion = useCallback(async (formData, opciones) => {
    setSaving(true);
    setError(null);
    try {
      // 1. Insertar cabecera
      const { data: selData, error: selErr } = await supabase
        .from('supplier_selection')
        .insert({
          insumo_nombre:     formData.insumo_nombre?.trim().toUpperCase(),
          fecha_realizacion: formData.fecha_realizacion,
          observaciones:     formData.observaciones?.trim() || null,
          realizado_por:     formData.realizado_por || null,
          aprobado_por:      formData.aprobado_por  || null,
          status:            'draft',
          created_by:        user?.id,
        })
        .select()
        .single();

      if (selErr) throw selErr;

      // 2. Insertar opciones
      if (opciones && opciones.length > 0) {
        const opcionesToInsert = opciones.map((o, idx) => ({
          selection_id:         selData.id,
          supplier_id:          o.supplier_id      || null,
          proveedor_nombre:     o.proveedor_nombre?.trim() || null,
          orden:                idx + 1,
          precio_score:         o.precio_score        || 0,
          entrega_score:        o.entrega_score       || 0,
          descuento_vol_score:  o.descuento_vol_score || 0,
          descuento_pp_score:   o.descuento_pp_score  || 0,
          sgsst_score:          o.sgsst_score         || 0,
          rendimiento_score:    o.rendimiento_score   || 0,
          composicion_score:    o.composicion_score   || 0,
          puntaje_total:        calcularPuntajeSeleccion(o),
          es_seleccionado:      o.es_seleccionado || false,
        }));

        const { error: opcionesErr } = await supabase
          .from('supplier_selection_option')
          .insert(opcionesToInsert);

        if (opcionesErr) throw opcionesErr;
      }

      await loadSelecciones();
      return { success: true, data: selData };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [user, loadSelecciones]);

  // ── Editar selección ──────────────────────────────────────────────────
  const updateSeleccion = useCallback(async (id, formData, opciones) => {
    setSaving(true);
    setError(null);
    try {
      // 1. Actualizar cabecera
      const { error: selErr } = await supabase
        .from('supplier_selection')
        .update({
          insumo_nombre:     formData.insumo_nombre?.trim(),
          fecha_realizacion: formData.fecha_realizacion,
          observaciones:     formData.observaciones?.trim() || null,
          realizado_por:     formData.realizado_por || null,
          aprobado_por:      formData.aprobado_por  || null,
        })
        .eq('id', id);

      if (selErr) throw selErr;

      // 2. Borrar opciones anteriores y reinsertar
      const { error: delErr } = await supabase
        .from('supplier_selection_option')
        .delete()
        .eq('selection_id', id);

      if (delErr) throw delErr;

      if (opciones && opciones.length > 0) {
        const opcionesToInsert = opciones.map((o, idx) => ({
          selection_id:         id,
          supplier_id:          o.supplier_id      || null,
          proveedor_nombre:     o.proveedor_nombre?.trim() || null,
          orden:                idx + 1,
          precio_score:         o.precio_score        || 0,
          entrega_score:        o.entrega_score       || 0,
          descuento_vol_score:  o.descuento_vol_score || 0,
          descuento_pp_score:   o.descuento_pp_score  || 0,
          sgsst_score:          o.sgsst_score         || 0,
          rendimiento_score:    o.rendimiento_score   || 0,
          composicion_score:    o.composicion_score   || 0,
          puntaje_total:        calcularPuntajeSeleccion(o),
          es_seleccionado:      o.es_seleccionado || false,
        }));

        const { error: opcionesErr } = await supabase
          .from('supplier_selection_option')
          .insert(opcionesToInsert);

        if (opcionesErr) throw opcionesErr;
      }

      await loadSelecciones();
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadSelecciones]);

  // ── Aprobar selección ─────────────────────────────────────────────────
  const aprobarSeleccion = useCallback(async (id) => {
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('supplier_selection')
        .update({ status: 'approved' })
        .eq('id', id);

      if (err) throw err;
      await loadSelecciones();
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadSelecciones]);

  // ── Soft delete selección ─────────────────────────────────────────────
const deleteSeleccion = useCallback(async (id) => {
  setSaving(true);
  setError(null);
  try {
    // Primero eliminar opciones (CASCADE debería hacerlo, pero por seguridad)
    await supabase
      .from('supplier_selection_option')
      .delete()
      .eq('selection_id', id);

    // Luego eliminar la selección
    const { error: err } = await supabase
      .from('supplier_selection')
      .delete()
      .eq('id', id);

    if (err) throw err;
    await loadSelecciones();
    return { success: true };
  } catch (e) {
    setError(e.message);
    return { success: false, error: e.message };
  } finally {
    setSaving(false);
  }
}, [loadSelecciones]);

  return {
    selecciones,
    loading,
    saving,
    error,
    loadSelecciones,
    createSeleccion,
    updateSeleccion,
    aprobarSeleccion,
    deleteSeleccion,
  };
}