// src/hooks/usePNC.js
// Hook de datos para el módulo Producto No Conforme
// ── v2: formulario consolidado (fila por fila), cabecera mensual automática ──
// ── v3: CRUD de catálogo de Referencias (crear/editar/eliminar) ──────────────
// ── v3.2: CRUD de Tabla de Defectos (código + descripción) ──────────────────

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export { MESES };

// Orden natural de códigos de defecto: D1, D2 ... D10 (no D1, D10, D2)
function sortDefectos(arr) {
  return [...arr].sort((a, b) =>
    String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true })
  );
}

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

      setDefectos(sortDefectos(defs || []));
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

  // ══════════════════════════════════════════════════════════════════════════
  //  CRUD — Catálogo de Referencias (pnc_referencia)
  // ══════════════════════════════════════════════════════════════════════════

  // Convierte un error de Postgres/PostgREST en un mensaje entendible.
  // 23503 = violación de FK (la referencia está en uso en pnc_item o dev_registro).
  const friendlyReferenciaError = (e) => {
    if (e?.code === '23503') {
      return 'Esta referencia está en uso en registros de Producto No Conforme o Devoluciones, no se puede eliminar.';
    }
    return e?.message || 'Error inesperado.';
  };

  const createReferencia = useCallback(async ({ ref, categoria }) => {
    try {
      const refTrim = (ref || '').trim();
      if (!refTrim) return { success: false, error: 'La referencia no puede estar vacía.' };

      const { data, error: e } = await supabase
        .from('pnc_referencia')
        .insert({ ref: refTrim, categoria: (categoria || '').trim() || null })
        .select()
        .single();
      if (e) throw e;

      setReferencias(prev =>
        [...prev, data].sort((a, b) => a.ref.localeCompare(b.ref, 'es', { numeric: true }))
      );
      return { success: true, data };
    } catch (e) {
      return { success: false, error: friendlyReferenciaError(e) };
    }
  }, []);

  const updateReferencia = useCallback(async (id, { ref, categoria }) => {
    try {
      const refTrim = (ref || '').trim();
      if (!refTrim) return { success: false, error: 'La referencia no puede estar vacía.' };

      const { data, error: e } = await supabase
        .from('pnc_referencia')
        .update({ ref: refTrim, categoria: (categoria || '').trim() || null })
        .eq('id', id)
        .select()
        .single();
      if (e) throw e;

      setReferencias(prev =>
        prev.map(r => (r.id === id ? data : r))
            .sort((a, b) => a.ref.localeCompare(b.ref, 'es', { numeric: true }))
      );
      return { success: true, data };
    } catch (e) {
      return { success: false, error: friendlyReferenciaError(e) };
    }
  }, []);

  const deleteReferencia = useCallback(async (id) => {
    try {
      const { error: e } = await supabase.from('pnc_referencia').delete().eq('id', id);
      if (e) throw e;

      setReferencias(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (e) {
      return { success: false, error: friendlyReferenciaError(e) };
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  //  CRUD — Tabla de Defectos (pnc_defecto)
  //  codigo es UNIQUE en BD · pnc_item.defecto_id tiene FK sin cascada
  // ══════════════════════════════════════════════════════════════════════════

  const friendlyDefectoError = (e) => {
    if (e?.code === '23505') return 'Ya existe un defecto con ese código.';
    if (e?.code === '23503') return 'Este defecto está en uso en filas de Producto No Conforme, no se puede eliminar.';
    return e?.message || 'Error inesperado.';
  };

  // Sugiere el siguiente código (D39 si el mayor es D38). Solo sugerencia, editable.
  const nextCodigoDefecto = useCallback(() => {
    const max = defectos.reduce((m, d) => {
      const n = parseInt(String(d.codigo).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return `D${max + 1}`;
  }, [defectos]);

  const createDefecto = useCallback(async ({ codigo, nombre }) => {
    try {
      const cod = (codigo || '').trim().toUpperCase();
      const nom = (nombre || '').trim();
      if (!cod) return { success: false, error: 'El código no puede estar vacío.' };
      if (!nom) return { success: false, error: 'La descripción no puede estar vacía.' };

      const { data, error: e } = await supabase
        .from('pnc_defecto')
        .insert({ codigo: cod, nombre: nom })
        .select()
        .single();
      if (e) throw e;

      setDefectos(prev => sortDefectos([...prev, data]));
      return { success: true, data };
    } catch (e) {
      return { success: false, error: friendlyDefectoError(e) };
    }
  }, []);

  const updateDefecto = useCallback(async (id, { codigo, nombre }) => {
    try {
      const cod = (codigo || '').trim().toUpperCase();
      const nom = (nombre || '').trim();
      if (!cod) return { success: false, error: 'El código no puede estar vacío.' };
      if (!nom) return { success: false, error: 'La descripción no puede estar vacía.' };

      const { data, error: e } = await supabase
        .from('pnc_defecto')
        .update({ codigo: cod, nombre: nom })
        .eq('id', id)
        .select()
        .single();
      if (e) throw e;

      setDefectos(prev => sortDefectos(prev.map(d => (d.id === id ? data : d))));
      return { success: true, data };
    } catch (e) {
      return { success: false, error: friendlyDefectoError(e) };
    }
  }, []);

  const deleteDefecto = useCallback(async (id) => {
    try {
      const { error: e } = await supabase.from('pnc_defecto').delete().eq('id', id);
      if (e) throw e;

      setDefectos(prev => prev.filter(d => d.id !== id));
      return { success: true };
    } catch (e) {
      return { success: false, error: friendlyDefectoError(e) };
    }
  }, []);

  return {
    defectos, referencias, registros, produccion,
    loading, error,
    fetchAll, addItem, updateItem, deleteItem, deleteRegistro,
    saveProduccion, deleteProduccion,
    createReferencia, updateReferencia, deleteReferencia,
    createDefecto, updateDefecto, deleteDefecto, nextCodigoDefecto,
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

    // ── Formato RE-GP-13 v02 (oct 2026): causa, fecha de tratamiento y clasificación
    causa_modulo:      !!it.causa_modulo,      causa_operacion:   !!it.causa_operacion,
    causa_insumo:      !!it.causa_insumo,      causa_corte:       !!it.causa_corte,
    causa_sublimacion: !!it.causa_sublimacion, causa_revision:    !!it.causa_revision,
    tratamiento_fecha:              it.tratamiento_fecha      || null,
    clasificacion_correccion:       !!it.clasificacion_correccion,
    clasificacion_reclasificacion:  !!it.clasificacion_reclasificacion,
    clasificacion_concesion:        !!it.clasificacion_concesion,
  };
}