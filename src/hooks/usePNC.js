// src/hooks/usePNC.js
// Hook de datos para el módulo Producto No Conforme

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export { MESES };

export function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Hook principal ─────────────────────────────────────────────────────────────
export function usePNC() {
  const [defectos,    setDefectos]    = useState([]);
  const [referencias, setReferencias] = useState([]);
  const [registros,   setRegistros]   = useState([]);
  const [produccion,  setProduccion]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  // ── Carga todos los datos ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: defs,  error: e1 },
        { data: refs,  error: e2 },
        { data: regs,  error: e3 },
        { data: prod,  error: e4 },
      ] = await Promise.all([
        supabase.from('pnc_defecto').select('*').eq('is_active', true).order('codigo'),
        supabase.from('pnc_referencia').select('*').eq('is_active', true).order('ref'),
        supabase
          .from('pnc_registro')
          .select('*, pnc_item(*)')
          .order('anio',              { ascending: false })
          .order('consecutivo_anual', { ascending: false }),
        supabase
          .from('pnc_produccion_mensual')
          .select('*')
          .order('anio', { ascending: false })
          .order('mes',  { ascending: false }),
      ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;

      setDefectos(defs    || []);
      setReferencias(refs || []);
      setRegistros(regs   || []);
      setProduccion(prod  || []);
    } catch (err) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Siguiente consecutivo por año (fallback local) ─────────────────────────
  const nextConsecutivo = useCallback(async (anio) => {
    // Intentar desde la función DB
    const { data } = await supabase.rpc('pnc_next_consecutivo', { p_anio: anio });
    if (data) return data;
    // Fallback: calcular desde estado local
    const max = registros
      .filter(r => r.anio === anio)
      .reduce((m, r) => Math.max(m, r.consecutivo_anual), 0);
    return max + 1;
  }, [registros]);

  // ── Crear registro + ítems ─────────────────────────────────────────────────
  const createRegistro = useCallback(async ({ anio, mes, proceso, items }) => {
    const consec = await nextConsecutivo(anio);

    const { data: reg, error: eReg } = await supabase
      .from('pnc_registro')
      .insert({ consecutivo_anual: consec, anio, mes, proceso })
      .select()
      .single();

    if (eReg) throw eReg;

    const itemsToInsert = items.map((it, idx) => buildItemPayload(it, reg.id, idx + 1));
    const { error: eItems } = await supabase.from('pnc_item').insert(itemsToInsert);
    if (eItems) throw eItems;

    return reg;
  }, [nextConsecutivo]);

  // ── Actualizar registro + ítems ────────────────────────────────────────────
  const updateRegistro = useCallback(async (id, { mes, proceso, items }) => {
    const { error: eReg } = await supabase
      .from('pnc_registro')
      .update({ mes, proceso })
      .eq('id', id);
    if (eReg) throw eReg;

    // Borrar ítems anteriores y reinsertar
    await supabase.from('pnc_item').delete().eq('registro_id', id);
    const itemsToInsert = items.map((it, idx) => buildItemPayload(it, id, idx + 1));
    const { error: eItems } = await supabase.from('pnc_item').insert(itemsToInsert);
    if (eItems) throw eItems;
  }, []);

  // ── Eliminar registro (en cascada elimina ítems) ───────────────────────────
  const deleteRegistro = useCallback(async (id) => {
    const { error: e } = await supabase.from('pnc_registro').delete().eq('id', id);
    if (e) throw e;
  }, []);

  // ── Guardar / actualizar producción mensual ────────────────────────────────
  const deleteProduccion = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('pnc_produccion_mensual').delete().eq('id', id);
      if (error) throw error;
      setProduccion(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  }, []);

  const saveProduccion = useCallback(async ({ anio, mes, total_produccion, observaciones }) => {
    const { error: e } = await supabase
      .from('pnc_produccion_mensual')
      .upsert({ anio, mes, total_produccion, observaciones: observaciones || null },
               { onConflict: 'anio,mes' });
    if (e) throw e;
  }, []);

  return {
    defectos, referencias, registros, produccion,
    loading, error,
    fetchAll, createRegistro, updateRegistro, deleteRegistro, saveProduccion, deleteProduccion,
  };
}

// ── Construye el payload de un ítem para insertar en BD ───────────────────────
function buildItemPayload(it, registroId, numeroFila) {
  return {
    registro_id:                   registroId,
    numero_fila:                   numeroFila,
    referencia_id:                 it.referencia_obj?.id    || null,
    referencia_texto:              !it.referencia_obj       ? (it.referencia_texto || null) : null,
    fecha_reporte:                 it.fecha_reporte         || null,
    defecto_id:                    it.defecto_obj?.id       || null,
    defecto_texto:                 !it.defecto_obj          ? (it.defecto_texto || null)    : null,
    total:                         it.total                 ? parseInt(it.total, 10)        : null,
    causa_modulo:                  !!it.causa_modulo,
    causa_operacion:               !!it.causa_operacion,
    causa_insumo:                  !!it.causa_insumo,
    causa_corte:                   !!it.causa_corte,
    causa_sublimacion:             !!it.causa_sublimacion,
    causa_revision:                !!it.causa_revision,
    tratamiento_fecha:             it.tratamiento_fecha        || null,
    tratamiento_descripcion:       it.tratamiento_descripcion  || null,
    tratamiento_responsable:       it.tratamiento_responsable  || null,
    clasificacion_correccion:      !!it.clasificacion_correccion,
    clasificacion_reclasificacion: !!it.clasificacion_reclasificacion,
    clasificacion_concesion:       !!it.clasificacion_concesion,
    verificacion_fecha:            it.verificacion_fecha        || null,
    verificacion_responsable:      it.verificacion_responsable  || null,
  };
}