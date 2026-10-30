// src/hooks/useSeleccionProveedores.js
// CRUD selección de proveedores (RE-GR-05 v2) — Garana SIG

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ── Criterios del formato RE-GR-05 v2 (oct 2026) ─────────────────────────────
// Escala 1–3 por criterio. Resultado = Σ puntaje × peso.
// Clasificación: AAA = 3 · AA = 2,1 a 2,9 · A ≤ 2
export const CRITERIOS_SELECCION = [
  { key: 'certificado_score', label: 'Certificado de seguridad', corto: 'Cert. seg.', peso: 0.15 },
  { key: 'sgsst_score',       label: 'Implementación SST',       corto: 'SST',        peso: 0.15 },
  { key: 'calidad_score',     label: 'Calidad',                  corto: 'Calidad',    peso: 0.25 },
  { key: 'precio_score',      label: 'Precio',                   corto: 'Precio',     peso: 0.15 },
  { key: 'entrega_score',     label: 'Tiempo de entrega',        corto: 'Entrega',    peso: 0.15 },
  { key: 'pago_score',        label: 'Facilidad de pago',        corto: 'Pago',       peso: 0.15 },
];

export const PESOS_SELECCION = Object.fromEntries(CRITERIOS_SELECCION.map(c => [c.key, c.peso]));

// ── Calcular resultado ponderado ─────────────────────────────────────────────
export function calcularPuntajeSeleccion(option) {
  return CRITERIOS_SELECCION.reduce((s, c) => s + (Number(option?.[c.key]) || 0) * c.peso, 0);
}

// ── Clasificación del proveedor según el resultado ───────────────────────────
export function clasificarSeleccion(resultado) {
  const r = Number(resultado) || 0;
  if (r <= 0) return null;
  if (r >= 3) return 'AAA';
  if (r > 2)  return 'AA';
  return 'A';
}

// Fila de supplier_selection_option a partir de una opción del formulario
const opcionPayload = (o, selectionId, idx) => {
  const resultado = calcularPuntajeSeleccion(o);
  return {
    selection_id:      selectionId,
    supplier_id:       o.supplier_id || null,
    proveedor_nombre:  o.proveedor_nombre?.trim() || null,
    orden:             idx + 1,
    ...Object.fromEntries(CRITERIOS_SELECCION.map(c => [c.key, Number(o[c.key]) || 0])),
    // Criterios de la versión anterior del formato (ya no se usan)
    descuento_vol_score: 0, descuento_pp_score: 0, rendimiento_score: 0, composicion_score: 0,
    puntaje_total:     Number(resultado.toFixed(2)),
    clasificacion:     clasificarSeleccion(resultado),
    es_seleccionado:   o.es_seleccionado || false,
  };
};

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
        const opcionesToInsert = opciones.map((o, idx) => opcionPayload(o, selData.id, idx));

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
        const opcionesToInsert = opciones.map((o, idx) => opcionPayload(o, id, idx));

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