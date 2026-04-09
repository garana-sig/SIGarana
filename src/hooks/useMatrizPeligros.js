// src/hooks/useMatrizPeligros.js
// Hook principal para la Matriz de Identificación de Peligros (GTC-45)
// Submódulo: SST y Bienestar → Matriz de Peligros (RE-GS-10)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────────────────────────
// HELPERS DE COLOR Y ETIQUETA (exportados para uso en UI)
// ─────────────────────────────────────────────────────────────

export const ACEPTABILIDAD_CONFIG = {
  I:   { label: 'I — No Aceptable',                  bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
  II:  { label: 'II — No Aceptable con control',     bg: '#FAEEDA', color: '#854F0B', border: '#FAC775' },
  III: { label: 'III — Aceptable (mejorable)',        bg: '#EAF3DE', color: '#3B6D11', border: '#C0DD97' },
  IV:  { label: 'IV — Aceptable',                    bg: '#E1F5EE', color: '#0F6E56', border: '#9FE1CB' },
};

export const PELIGRO_CLASE_CONFIG = {
  'Químico':       { bg: '#EAF3DE', color: '#3B6D11' },
  'Biológico':     { bg: '#FBEAF0', color: '#993556' },
  'Biomecánico':   { bg: '#E6F1FB', color: '#185FA5' },
  'Físico':        { bg: '#EEEDFE', color: '#534AB7' },
  'De Seguridad':  { bg: '#FAEEDA', color: '#854F0B' },
  'Psicosocial':   { bg: '#F1EFE8', color: '#5F5E5A' },
  'Público':       { bg: '#FAECE7', color: '#993C1D' },
};

export const PELIGRO_CLASES = Object.keys(PELIGRO_CLASE_CONFIG);

export const NIVELES_DEFICIENCIA = [
  { value: 0,  label: '0 — No aplica' },
  { value: 2,  label: '2 — Bajo' },
  { value: 6,  label: '6 — Medio' },
  { value: 10, label: '10 — Alto' },
];

export const NIVELES_EXPOSICION = [
  { value: 1, label: '1 — Esporádica' },
  { value: 2, label: '2 — Ocasional' },
  { value: 3, label: '3 — Frecuente' },
  { value: 4, label: '4 — Continua' },
];

export const NIVELES_CONSECUENCIAS = [
  { value: 10,  label: '10 — Leve' },
  { value: 25,  label: '25 — Grave' },
  { value: 60,  label: '60 — Muy grave' },
  { value: 100, label: '100 — Mortal o catastrófico' },
];

// Calcula la aceptabilidad según GTC-45 a partir del NR
export function calcularAceptabilidad(nd, ne, nc) {
  const nr = nd * ne * nc;
  if (nr >= 600) return 'I';
  if (nr >= 150) return 'II';
  if (nr >= 40)  return 'III';
  return 'IV';
}

// ─────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function useMatrizPeligros() {
  const { user, hasPermission, isAdmin, isGerencia } = useAuth();

  // ── Estado principal ──────────────────────────────────────
  const [peligros, setPeligros]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // ── Catálogos (jerarquía) ─────────────────────────────────
  const [procesos, setProcesos]         = useState([]);
  const [secciones, setSecciones]       = useState([]);
  const [actividades, setActividades]   = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // ── Filtros activos ───────────────────────────────────────
  const [filtros, setFiltros] = useState({
    proceso_id:    null,
    seccion_id:    null,
    actividad_id:  null,
    peligro_clase: null,
    aceptabilidad: null,
  });

  // ── Permisos ──────────────────────────────────────────────
  const canView   = isAdmin || isGerencia || hasPermission('sst:matriz_peligros:view');
  const canCreate = isAdmin || isGerencia || hasPermission('sst:matriz_peligros:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('sst:matriz_peligros:edit');
  const canDelete = isAdmin || isGerencia || hasPermission('sst:matriz_peligros:delete');
  const canExport = isAdmin || isGerencia || hasPermission('sst:matriz_peligros:export');
  const canManage = isAdmin || isGerencia || hasPermission('sst:matriz_peligros:manage');

  // ─────────────────────────────────────────────────────────
  // FETCH CATÁLOGOS (proceso → sección → actividad)
  // Se cargan una sola vez al montar el componente
  // ─────────────────────────────────────────────────────────
  const fetchCatalogos = useCallback(async () => {
    try {
      setLoadingCatalogos(true);

      const [{ data: procs, error: eP }, { data: secs, error: eS }, { data: acts, error: eA }] =
        await Promise.all([
          supabase.from('sst_proceso').select('id, nombre').eq('is_active', true).order('nombre'),
          supabase.from('sst_seccion').select('id, nombre, proceso_id').eq('is_active', true).order('nombre'),
          supabase.from('sst_actividad').select('id, nombre, seccion_id').eq('is_active', true).order('nombre'),
        ]);

      if (eP) throw eP;
      if (eS) throw eS;
      if (eA) throw eA;

      setProcesos(procs || []);
      setSecciones(secs || []);
      setActividades(acts || []);
    } catch (err) {
      console.error('❌ Error cargando catálogos:', err);
      setError(err.message);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // FETCH PELIGROS (con filtros opcionales)
  // Usa la vista vw_sst_matriz_peligros que ya une la jerarquía
  // ─────────────────────────────────────────────────────────
  const fetchPeligros = useCallback(async (filtrosActivos = filtros) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('vw_sst_matriz_peligros')
        .select('*')
        .order('proceso')
        .order('seccion')
        .order('actividad')
        .order('peligro_clase');

      // Aplicar filtros en cascada
      if (filtrosActivos.proceso_id)
        query = query.eq('proceso_id', filtrosActivos.proceso_id);
      if (filtrosActivos.seccion_id)
        query = query.eq('seccion_id', filtrosActivos.seccion_id);
      if (filtrosActivos.actividad_id)
        query = query.eq('actividad_id', filtrosActivos.actividad_id);
      if (filtrosActivos.peligro_clase)
        query = query.eq('peligro_clase', filtrosActivos.peligro_clase);
      if (filtrosActivos.aceptabilidad)
        query = query.eq('aceptabilidad', filtrosActivos.aceptabilidad);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setPeligros(data || []);
      return data || [];
    } catch (err) {
      console.error('❌ Error cargando peligros:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // ─────────────────────────────────────────────────────────
  // CREAR PELIGRO
  // ─────────────────────────────────────────────────────────
  const createPeligro = async (formData) => {
    try {
      setError(null);

      const { error: insertError } = await supabase
        .from('sst_matriz_peligros')
        .insert({
          actividad_id:           formData.actividad_id,
          tarea:                  formData.tarea             || null,
          rutinario:              formData.rutinario         ?? true,
          peligro_clase:          formData.peligro_clase,
          peligro_descripcion:    formData.peligro_descripcion,
          efectos_posibles:       formData.efectos_posibles  || null,
          control_fuente:         formData.control_fuente    || null,
          control_medio:          formData.control_medio     || null,
          control_trabajador:     formData.control_trabajador|| null,
          nivel_deficiencia:      Number(formData.nivel_deficiencia),
          nivel_exposicion:       Number(formData.nivel_exposicion),
          interpretacion_np:      formData.interpretacion_np || null,
          nivel_consecuencias:    Number(formData.nivel_consecuencias),
          aceptabilidad:          formData.aceptabilidad     ||
                                  calcularAceptabilidad(
                                    Number(formData.nivel_deficiencia),
                                    Number(formData.nivel_exposicion),
                                    Number(formData.nivel_consecuencias)
                                  ),
          num_expuestos:          formData.num_expuestos     ? Number(formData.num_expuestos) : null,
          por_consecuencias:      formData.por_consecuencias || null,
          requisito_legal:        formData.requisito_legal   || null,
          medida_eliminacion:     formData.medida_eliminacion    || null,
          medida_sustitucion:     formData.medida_sustitucion    || null,
          medida_ingenieria:      formData.medida_ingenieria     || null,
          medida_administrativa:  formData.medida_administrativa || null,
          medida_epp:             formData.medida_epp            || null,
          fecha_realizacion:      formData.fecha_realizacion     || null,
          responsable_plan:       formData.responsable_plan      || null,
          fecha_cierre:           formData.fecha_cierre          || null,
          cierre_efectivo:        formData.cierre_efectivo       ?? false,
          hallazgo_evidencia:     formData.hallazgo_evidencia    || null,
          responsable_verificacion: formData.responsable_verificacion || null,
          created_by:             user?.id,
        });

      if (insertError) throw insertError;

      await fetchPeligros();
      return { success: true };
    } catch (err) {
      console.error('❌ Error creando peligro:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ─────────────────────────────────────────────────────────
  // ACTUALIZAR PELIGRO (completo o solo plan de acción)
  // ─────────────────────────────────────────────────────────
  const updatePeligro = async (id, formData) => {
    try {
      setError(null);

      // Recalcular aceptabilidad si cambiaron los niveles
      const aceptabilidad = formData.aceptabilidad ||
        calcularAceptabilidad(
          Number(formData.nivel_deficiencia),
          Number(formData.nivel_exposicion),
          Number(formData.nivel_consecuencias)
        );

      const { error: updateError } = await supabase
        .from('sst_matriz_peligros')
        .update({
          actividad_id:             formData.actividad_id,
          tarea:                    formData.tarea                || null,
          rutinario:                formData.rutinario            ?? true,
          peligro_clase:            formData.peligro_clase,
          peligro_descripcion:      formData.peligro_descripcion,
          efectos_posibles:         formData.efectos_posibles     || null,
          control_fuente:           formData.control_fuente       || null,
          control_medio:            formData.control_medio        || null,
          control_trabajador:       formData.control_trabajador   || null,
          nivel_deficiencia:        Number(formData.nivel_deficiencia),
          nivel_exposicion:         Number(formData.nivel_exposicion),
          interpretacion_np:        formData.interpretacion_np    || null,
          nivel_consecuencias:      Number(formData.nivel_consecuencias),
          aceptabilidad,
          num_expuestos:            formData.num_expuestos        ? Number(formData.num_expuestos) : null,
          por_consecuencias:        formData.por_consecuencias    || null,
          requisito_legal:          formData.requisito_legal      || null,
          medida_eliminacion:       formData.medida_eliminacion       || null,
          medida_sustitucion:       formData.medida_sustitucion       || null,
          medida_ingenieria:        formData.medida_ingenieria        || null,
          medida_administrativa:    formData.medida_administrativa    || null,
          medida_epp:               formData.medida_epp               || null,
          fecha_realizacion:        formData.fecha_realizacion        || null,
          responsable_plan:         formData.responsable_plan         || null,
          fecha_cierre:             formData.fecha_cierre             || null,
          cierre_efectivo:          formData.cierre_efectivo          ?? false,
          hallazgo_evidencia:       formData.hallazgo_evidencia       || null,
          responsable_verificacion: formData.responsable_verificacion || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPeligros();
      return { success: true };
    } catch (err) {
      console.error('❌ Error actualizando peligro:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ─────────────────────────────────────────────────────────
  // ACTUALIZAR SOLO PLAN DE ACCIÓN (para el líder SST)
  // Campos editables sin permiso :edit completo, solo :edit
  // ─────────────────────────────────────────────────────────
  const updatePlanAccion = async (id, planData) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('sst_matriz_peligros')
        .update({
          medida_eliminacion:       planData.medida_eliminacion       || null,
          medida_sustitucion:       planData.medida_sustitucion       || null,
          medida_ingenieria:        planData.medida_ingenieria        || null,
          medida_administrativa:    planData.medida_administrativa    || null,
          medida_epp:               planData.medida_epp               || null,
          fecha_realizacion:        planData.fecha_realizacion        || null,
          responsable_plan:         planData.responsable_plan         || null,
          fecha_cierre:             planData.fecha_cierre             || null,
          cierre_efectivo:          planData.cierre_efectivo          ?? false,
          hallazgo_evidencia:       planData.hallazgo_evidencia       || null,
          responsable_verificacion: planData.responsable_verificacion || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPeligros();
      return { success: true };
    } catch (err) {
      console.error('❌ Error actualizando plan de acción:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ─────────────────────────────────────────────────────────
  // ELIMINAR (soft delete via RPC — mismo patrón que risk_matrix)
  // ─────────────────────────────────────────────────────────
  const deletePeligro = async (id) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .rpc('soft_delete_sst_matriz_peligros', { p_id: id });

      if (deleteError) throw deleteError;

      await fetchPeligros();
      return { success: true };
    } catch (err) {
      console.error('❌ Error eliminando peligro:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ─────────────────────────────────────────────────────────
  // GESTIÓN DE CATÁLOGOS (solo para canManage)
  // ─────────────────────────────────────────────────────────

  const createProceso = async (nombre) => {
    const { error } = await supabase.from('sst_proceso').insert({ nombre: nombre.toUpperCase().trim() });
    if (error) return { success: false, error: error.message };
    await fetchCatalogos();
    return { success: true };
  };

  const createSeccion = async (nombre, proceso_id) => {
    const { error } = await supabase.from('sst_seccion').insert({ nombre: nombre.toUpperCase().trim(), proceso_id });
    if (error) return { success: false, error: error.message };
    await fetchCatalogos();
    return { success: true };
  };

  const createActividad = async (nombre, seccion_id) => {
    const { error } = await supabase.from('sst_actividad').insert({ nombre: nombre.toUpperCase().trim(), seccion_id });
    if (error) return { success: false, error: error.message };
    await fetchCatalogos();
    return { success: true };
  };

  // ─────────────────────────────────────────────────────────
  // FILTROS EN CASCADA
  // Al cambiar un nivel superior, se limpian los inferiores
  // ─────────────────────────────────────────────────────────
  const aplicarFiltro = useCallback(async (campo, valor) => {
    const nuevosFiltros = { ...filtros };

    nuevosFiltros[campo] = valor || null;

    // Limpiar niveles inferiores al cambiar uno superior
    if (campo === 'proceso_id') {
      nuevosFiltros.seccion_id   = null;
      nuevosFiltros.actividad_id = null;
    }
    if (campo === 'seccion_id') {
      nuevosFiltros.actividad_id = null;
    }

    setFiltros(nuevosFiltros);
    await fetchPeligros(nuevosFiltros);
  }, [filtros, fetchPeligros]);

  const limpiarFiltros = useCallback(async () => {
    const vacios = { proceso_id: null, seccion_id: null, actividad_id: null, peligro_clase: null, aceptabilidad: null };
    setFiltros(vacios);
    await fetchPeligros(vacios);
  }, [fetchPeligros]);

  // ─────────────────────────────────────────────────────────
  // HELPERS: secciones y actividades filtradas según selección
  // Para alimentar los dropdowns en cascada de la UI
  // ─────────────────────────────────────────────────────────
  const seccionesFiltradas = filtros.proceso_id
    ? secciones.filter(s => s.proceso_id === filtros.proceso_id)
    : secciones;

  const actividadesFiltradas = filtros.seccion_id
    ? actividades.filter(a => a.seccion_id === filtros.seccion_id)
    : filtros.proceso_id
      ? actividades.filter(a =>
          seccionesFiltradas.some(s => s.id === a.seccion_id)
        )
      : actividades;

  // ─────────────────────────────────────────────────────────
  // ESTADÍSTICAS RÁPIDAS del conjunto actual
  // ─────────────────────────────────────────────────────────
  const stats = {
    total: peligros.length,
    porAceptabilidad: {
      I:   peligros.filter(p => p.aceptabilidad === 'I').length,
      II:  peligros.filter(p => p.aceptabilidad === 'II').length,
      III: peligros.filter(p => p.aceptabilidad === 'III').length,
      IV:  peligros.filter(p => p.aceptabilidad === 'IV').length,
    },
    porClase: PELIGRO_CLASES.reduce((acc, clase) => {
      acc[clase] = peligros.filter(p => p.peligro_clase === clase).length;
      return acc;
    }, {}),
    pendienteCierre: peligros.filter(p => !p.cierre_efectivo && p.fecha_realizacion).length,
  };

  // ─────────────────────────────────────────────────────────
  // EFECTO INICIAL
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (canView) {
      fetchCatalogos();
      fetchPeligros();
    }
  }, [canView]);

  // ─────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────
  return {
    // Datos
    peligros,
    stats,
    loading,
    error,

    // Catálogos
    procesos,
    secciones,
    actividades,
    seccionesFiltradas,
    actividadesFiltradas,
    loadingCatalogos,

    // Filtros
    filtros,
    aplicarFiltro,
    limpiarFiltros,

    // CRUD
    fetchPeligros,
    fetchCatalogos,
    createPeligro,
    updatePeligro,
    updatePlanAccion,
    deletePeligro,

    // Gestión catálogos
    createProceso,
    createSeccion,
    createActividad,

    // Permisos
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canManage,
  };
}