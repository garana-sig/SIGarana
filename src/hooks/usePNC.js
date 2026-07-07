// src/hooks/usePNC.js
// Hook de datos para el módulo Producto No Conforme
// ── v2: formulario consolidado (fila por fila), cabecera mensual automática ──

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

  // ── Siguiente consecutivo de REGISTRO (cabecera) por año ───────────────────
  const nextConsecutivoRegistro = useCallback(async (anio) => {
    const { data } = await supabase.rpc('pnc_next_consecutivo', { p_anio: anio });
    if (data) return data;
    const max = registros
      .filter(r => r.anio === anio)
      .reduce((m, r) => Math.max(m, r.consecutivo_anual), 0);
    return max + 1;
  }, [registros]);

  // ── Busca la cabecera (año, mes) en memoria o la crea si no existe ─────────
  const getOrCreateRegistro = useCallback(async (anio, mes) => {
    const existente = registros.find(r => r.anio === anio && r.mes === mes);
    if (existente) return existente;

    const consec = await nextConsecutivoRegistro(anio);
    const { data: reg, error: eReg } = await supabase
      .from('pnc_registro')
      .insert({ consecutivo_anual: consec, anio, mes, proceso: null })
      .select()
      .single();
    if (eReg) throw eReg;

    const nuevo = { ...reg, pnc_item: [] };
    setRegistros(prev => [nuevo, ...prev]);
    return nuevo;
  }, [registros, nextConsecutivoRegistro]);

  // ── Agrega UNA fila (ítem) al consolidado del mes correspondiente ──────────
  // Si el mes/año todavía no tiene cabecera, la crea automáticamente (invisible
  // para el usuario). El "N°" (numero_fila) se calcula como el siguiente
  // dentro de esa cabecera mensual.
  const addItem = useCallback(async ({ anio, mes, item }) => {
    const registro   = await getOrCreateRegistro(anio, mes);
    const numeroFila = (registro.pnc_item || [])
      .reduce((m, it) => Math.max(m, it.numero_fila), 0) + 1;

    const payload = buildItemPayload(item, registro.id, numeroFila);
    const { data: nuevoItem, error: eItem } = await supabase
      .from('pnc_item')
      .insert(payload)
      .select()
      .single();
    if (eItem) throw eItem;

    return { registroId: registro.id, item: nuevoItem };
  }, [getOrCreateRegistro]);

  // ── Actualiza UNA fila existente (sin tocar la cabecera) ────────────────────
  const updateItem = useCallback(async (itemId, item, registroId, numeroFila) => {
    const payload = buildItemPayload(item, registroId, numeroFila);
    const { error } = await supabase.from('pnc_item').update(payload).eq('id', itemId);
    if (error) throw error;
  }, []);

  // ── Elimina UNA fila existente (sin afectar el resto del mes) ──────────────
  const deleteItem = useCallback(async (itemId) => {
    const { error } = await supabase.from('pnc_item').delete().eq('id', itemId);
    if (error) throw error;
  }, []);

  // ── Eliminar una cabecera mensual completa (y en cascada sus ítems) ────────
  // Se conserva para limpieza administrativa, ya no es el flujo principal.
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
    fetchAll, addItem, updateItem, deleteItem, deleteRegistro,
    saveProduccion, deleteProduccion,
  };
}

// ── Construye el payload de un ítem para insertar/actualizar en BD ────────────
function buildItemPayload(it, registroId, numeroFila) {
  return {
    registro_id:                    registroId,
    numero_fila:                    numeroFila,
    referencia_id:                  it.referencia_obj?.id    || null,
    referencia_texto:               !it.referencia_obj       ? (it.referencia_texto || null) : null,
    fecha_reporte:                  it.fecha_reporte         || null,
    defecto_id:                     it.defecto_obj?.id       || null,
    defecto_texto:                  !it.defecto_obj          ? (it.defecto_texto || null)    : null,
    total:                          it.total                 ? parseInt(it.total, 10)        : null,

    // ── Campos nuevos del formulario consolidado ─────────────────────────────
    seccion:                        it.seccion               || null,
    operacion_origen:               it.operacion_origen      || null,
    tratamiento_descripcion:        it.tratamiento_descripcion || null, // "¿Cómo se solucionó?"
    tratamiento_responsable:        it.tratamiento_responsable || null,
    verificacion_fecha:             it.verificacion_fecha      || null,
    verificacion_responsable:       it.verificacion_responsable|| null,

    // ── Campos del formato anterior — ya no se usan desde el formulario nuevo.
    //    Se envían con valor "vacío" solo para no romper el insert si la
    //    columna es NOT NULL en la tabla. No se leen ni se muestran más.
    causa_modulo: false, causa_operacion: false, causa_insumo: false,
    causa_corte:  false, causa_sublimacion: false, causa_revision: false,
    tratamiento_fecha: null,
    clasificacion_correccion: false, clasificacion_reclasificacion: false, clasificacion_concesion: false,
  };
}