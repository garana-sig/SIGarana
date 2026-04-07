// src/hooks/useEvaluacionCompetencias.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─── Utilidades exportadas ────────────────────────────────────────────────────

export function calcularNivel(puntaje) {
  if (puntaje >= 69) return 'Sobresaliente';
  if (puntaje >= 52) return 'Mejora Expectativas';
  if (puntaje >= 35) return 'Alcanza Expectativas';
  if (puntaje >= 18) return 'Debajo de las Expectativas';
  return 'Muy debajo de las Expectativas';
}

export const COLOR_NIVEL = {
  'Sobresaliente':                  '#2e5244',
  'Mejora Expectativas':            '#6dbd96',
  'Alcanza Expectativas':           '#6f7b2c',
  'Debajo de las Expectativas':     '#d97706',
  'Muy debajo de las Expectativas': '#dc2626',
};

export const BG_NIVEL = {
  'Sobresaliente':                  '#2e524420',
  'Mejora Expectativas':            '#6dbd9620',
  'Alcanza Expectativas':           '#6f7b2c20',
  'Debajo de las Expectativas':     '#d9770620',
  'Muy debajo de las Expectativas': '#dc262620',
};

export const OPCIONES_RESPUESTA = [
  { value: 1, short: 'Muy bajo',      full: 'Muy debajo de las Expectativas', color: '#dc2626' },
  { value: 2, short: 'Debajo',        full: 'Debajo de las Expectativas',     color: '#d97706' },
  { value: 3, short: 'Alcanza',       full: 'Alcanza Expectativas',           color: '#6f7b2c' },
  { value: 4, short: 'Mejora',        full: 'Mejora Expectativas',            color: '#6dbd96' },
  { value: 5, short: 'Sobresaliente', full: 'Sobresaliente',                  color: '#2e5244' },
];

export const DEPARTAMENTOS = ['Operativo', 'Administrativo'];
export const PUNTAJE_MAX   = 85;

export const FRECUENCIAS = [
  { value: 'mensual',     label: 'Mensual'     },
  { value: 'trimestral',  label: 'Trimestral'  },
  { value: 'semestral',   label: 'Semestral'   },
  { value: 'anual',       label: 'Anual'       },
];

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useEvaluacionCompetencias() {
  const { user, profile } = useAuth();
  const role              = profile?.role;
  const isAdminOrGerencia = role === 'admin' || role === 'gerencia';

  const [empleados,        setEmpleados]        = useState([]);
  const [categorias,       setCategorias]       = useState([]);
  const [evaluaciones,     setEvaluaciones]     = useState([]);
  const [periodos,         setPeriodos]         = useState([]);
  const [configuracion,    setConfiguracion]    = useState([]);
  const [usuarios,         setUsuarios]         = useState([]);
  const [misDepartamentos, setMisDepartamentos] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadEmpleados = useCallback(async () => {
    const { data } = await supabase
      .from('ec_empleado').select('*').order('nombre_completo');
    setEmpleados(data || []);
    return data;
  }, []);

  const loadCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('ec_categoria')
      .select('*, preguntas:ec_pregunta(*)')
      .order('orden');
    if (data) {
      setCategorias(data.map(c => ({
        ...c,
        preguntas: (c.preguntas || []).sort((a, b) => a.orden - b.orden),
      })));
    }
    return data;
  }, []);

  const loadEvaluaciones = useCallback(async (empleadoId = null) => {
    let q = supabase
      .from('ec_evaluacion')
      .select(`
        *,
        empleado:ec_empleado(id, cedula, nombre_completo, cargo, departamento),
        evaluador:profile(id, full_name),
        periodo:ec_periodo(id, nombre, frecuencia)
      `)
      .order('fecha_evaluacion', { ascending: false });
    if (empleadoId) q = q.eq('empleado_id', empleadoId);
    const { data } = await q;
    setEvaluaciones(data || []);
    return data;
  }, []);

  const loadPeriodos = useCallback(async () => {
    const { data } = await supabase
      .from('ec_periodo')
      .select('*')
      .order('created_at', { ascending: false });
    setPeriodos(data || []);
    return data;
  }, []);

  const loadConfiguracion = useCallback(async () => {
    // FK explícito: evaluador_user_id → profile
    // (la tabla tiene dos FK a profile, hay que especificar cuál)
    const { data, error } = await supabase
      .from('ec_configuracion_evaluador')
      .select('*, evaluador:profile!evaluador_user_id(id, full_name, email)')
      .eq('is_active', true)
      .order('departamento');
    if (error) console.error('loadConfiguracion:', error);
    setConfiguracion(data || []);
    return data;
  }, []);

  const loadUsuarios = useCallback(async () => {
    const { data } = await supabase
      .from('profile').select('id, full_name, email, role')
      .eq('is_active', true).order('full_name');
    setUsuarios(data || []);
  }, []);

  const loadMisDepartamentos = useCallback(async () => {
    if (!user?.id) return;
    if (isAdminOrGerencia) { setMisDepartamentos(DEPARTAMENTOS); return; }
    const { data } = await supabase
      .from('ec_configuracion_evaluador')
      .select('departamento')
      .eq('evaluador_user_id', user.id)
      .eq('is_active', true);
    setMisDepartamentos((data || []).map(d => d.departamento));
  }, [user?.id, isAdminOrGerencia]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadEmpleados(), loadCategorias(), loadEvaluaciones(),
          loadPeriodos(), loadConfiguracion(), loadUsuarios(),
          loadMisDepartamentos(),
        ]);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [loadEmpleados, loadCategorias, loadEvaluaciones, loadPeriodos,
      loadConfiguracion, loadUsuarios, loadMisDepartamentos]);

  // ── Computados ────────────────────────────────────────────────────────────

  // Todos los períodos activos (puede haber varios)
  const periodosActivos = useMemo(
    () => periodos.filter(p => p.is_active),
    [periodos]
  );

  // El más reciente activo (referencia por defecto)
  const periodoActivo = useMemo(
    () => periodosActivos.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )[0] || null,
    [periodosActivos]
  );

  const empleadosPermitidos = useMemo(() => {
    // Admin/Gerencia → ven todos
    if (isAdminOrGerencia) return empleados.filter(e => e.is_active);
    // Evaluador sin departamento asignado → no ve nadie
    if (misDepartamentos.length === 0) return [];
    // Evaluador con departamento → solo los suyos
    return empleados.filter(
      e => misDepartamentos.includes(e.departamento) && e.is_active
    );
  }, [empleados, misDepartamentos, isAdminOrGerencia]);

  const canEvaluar = useCallback(
    (departamento) => isAdminOrGerencia || misDepartamentos.includes(departamento),
    [isAdminOrGerencia, misDepartamentos]
  );

  // Evaluaciones por empleado (count + última)
  const evalPorEmpleado = useMemo(() =>
    evaluaciones.reduce((acc, ev) => {
      const id = ev.empleado_id;
      if (!acc[id]) acc[id] = { count: 0, ultima: null };
      acc[id].count++;
      if (!acc[id].ultima ||
          new Date(ev.fecha_evaluacion) > new Date(acc[id].ultima.fecha_evaluacion))
        acc[id].ultima = ev;
      return acc;
    }, {}),
    [evaluaciones]
  );

  // IDs evaluados para UN período específico
  const getEvaluadosEnPeriodo = useCallback((periodoId) => {
    if (!periodoId) return new Set();
    return new Set(
      evaluaciones
        .filter(e => e.periodo_id === periodoId)
        .map(e => e.empleado_id)
    );
  }, [evaluaciones]);

  // Por defecto: período activo más reciente
  const evaluadosEnPeriodoActivo = useMemo(
    () => getEvaluadosEnPeriodo(periodoActivo?.id),
    [getEvaluadosEnPeriodo, periodoActivo]
  );

  // Pendientes en el período activo por defecto
  const empleadosPendientes = useMemo(() =>
    empleadosPermitidos.filter(e => !evaluadosEnPeriodoActivo.has(e.id)),
    [empleadosPermitidos, evaluadosEnPeriodoActivo]
  );

  // ── Empleados ─────────────────────────────────────────────────────────────

  const createEmpleado = useCallback(async (data) => {
    const { data: r, error } = await supabase
      .from('ec_empleado').insert(data).select().single();
    if (error) throw error;
    await loadEmpleados();
    return r;
  }, [loadEmpleados]);

  const updateEmpleado = useCallback(async (id, data) => {
    const { data: r, error } = await supabase
      .from('ec_empleado').update(data).eq('id', id).select().single();
    if (error) throw error;
    await loadEmpleados();
    return r;
  }, [loadEmpleados]);

  // ── Evaluaciones ──────────────────────────────────────────────────────────

  // respuestas: { [preguntaId]: 1-5 }
  const createEvaluacion = useCallback(async ({
    empleadoId, periodoId, notas, respuestas,
  }) => {
    const valores        = Object.values(respuestas);
    const puntajeTotal   = valores.reduce((s, v) => s + v, 0);
    const nivelDesempeno = calcularNivel(puntajeTotal);
    const periodoNombre  = periodos.find(p => p.id === periodoId)?.nombre || null;

    const { data: ev, error: e1 } = await supabase
      .from('ec_evaluacion')
      .insert({
        empleado_id:     empleadoId,
        evaluador_id:    user.id,
        periodo_id:      periodoId || null,
        periodo:         periodoNombre,
        puntaje_total:   puntajeTotal,
        nivel_desempeno: nivelDesempeno,
        notas:           notas || null,
      })
      .select().single();
    if (e1) throw e1;

    const detalles = Object.entries(respuestas).map(([preguntaId, respuesta]) => ({
      evaluacion_id: ev.id,
      pregunta_id:   preguntaId,
      respuesta,
    }));
    const { error: e2 } = await supabase
      .from('ec_evaluacion_detalle').insert(detalles);
    if (e2) throw e2;

    await loadEvaluaciones();
    return ev;
  }, [user?.id, periodos, loadEvaluaciones]);

  const deleteEvaluacion = useCallback(async (id) => {
    const { error } = await supabase.from('ec_evaluacion').delete().eq('id', id);
    if (error) throw error;
    await loadEvaluaciones();
  }, [loadEvaluaciones]);

  const loadDetalles = useCallback(async (evaluacionId) => {
    const { data, error } = await supabase
      .from('ec_evaluacion_detalle')
      .select('*, pregunta:ec_pregunta(*, categoria:ec_categoria(*))')
      .eq('evaluacion_id', evaluacionId);
    if (error) throw error;
    return data || [];
  }, []);

  // ── Períodos ──────────────────────────────────────────────────────────────

  const createPeriodo = useCallback(async (data) => {
    const { error } = await supabase
      .from('ec_periodo')
      .insert({ ...data, created_by: user.id });
    if (error) throw error;
    await loadPeriodos();
  }, [user?.id, loadPeriodos]);

  const updatePeriodo = useCallback(async (id, data) => {
    const { error } = await supabase
      .from('ec_periodo').update(data).eq('id', id);
    if (error) throw error;
    await loadPeriodos();
  }, [loadPeriodos]);

  const activarPeriodo = useCallback(async (id) => {
    const { error } = await supabase
      .from('ec_periodo').update({ is_active: true }).eq('id', id);
    if (error) throw error;
    await loadPeriodos();
    await loadEvaluaciones(); // refrescar badges
  }, [loadPeriodos, loadEvaluaciones]);

  const deletePeriodo = useCallback(async (id) => {
    const { error } = await supabase
      .from('ec_periodo').delete().eq('id', id);
    if (error) throw error;
    await loadPeriodos();
  }, [loadPeriodos]);

  // Activar O desactivar un período (toggle)
  const togglePeriodo = useCallback(async (id, is_active) => {
    const { error } = await supabase
      .from('ec_periodo').update({ is_active }).eq('id', id);
    if (error) throw error;
    await loadPeriodos();
    await loadEvaluaciones(); // refrescar badges
  }, [loadPeriodos, loadEvaluaciones]);

  // ── Evaluadores ───────────────────────────────────────────────────────────

  const addEvaluador = useCallback(async (departamento, evaluadorUserId) => {
    // 1. Eliminar cualquier evaluador previo del departamento (solo uno a la vez)
    await supabase
      .from('ec_configuracion_evaluador')
      .delete()
      .eq('departamento', departamento);
    // 2. Insertar el nuevo evaluador
    const { error } = await supabase
      .from('ec_configuracion_evaluador')
      .insert({
        departamento,
        evaluador_user_id: evaluadorUserId,
        created_by: user.id,
        is_active: true,
      });
    if (error) throw error;
    await loadConfiguracion();
  }, [user?.id, loadConfiguracion]);

  const removeEvaluador = useCallback(async (id) => {
    // Hard delete — permite volver a asignar la misma persona después
    const { error } = await supabase
      .from('ec_configuracion_evaluador')
      .delete().eq('id', id);
    if (error) throw error;
    await loadConfiguracion();
  }, [loadConfiguracion]);

  // ── Cuestionario ──────────────────────────────────────────────────────────

  const createCategoria = useCallback(async (nombre) => {
    const maxOrden = categorias.length > 0
      ? Math.max(...categorias.map(c => c.orden)) : 0;
    const { error } = await supabase
      .from('ec_categoria').insert({ nombre, orden: maxOrden + 1 });
    if (error) throw error;
    await loadCategorias();
  }, [categorias, loadCategorias]);

  const toggleCategoria = useCallback(async (id, is_active) => {
    const { error } = await supabase
      .from('ec_categoria').update({ is_active }).eq('id', id);
    if (error) throw error;
    await loadCategorias();
  }, [loadCategorias]);

  const createPregunta = useCallback(async (categoriaId, texto) => {
    const cat    = categorias.find(c => c.id === categoriaId);
    const maxOrd = (cat?.preguntas || []).length > 0
      ? Math.max(...cat.preguntas.map(p => p.orden)) : 0;
    const { error } = await supabase
      .from('ec_pregunta')
      .insert({ categoria_id: categoriaId, texto, orden: maxOrd + 1 });
    if (error) throw error;
    await loadCategorias();
  }, [categorias, loadCategorias]);

  const togglePregunta = useCallback(async (id, is_active) => {
    const { error } = await supabase
      .from('ec_pregunta').update({ is_active }).eq('id', id);
    if (error) throw error;
    await loadCategorias();
  }, [loadCategorias]);

  const updatePregunta = useCallback(async (id, data) => {
    const { error } = await supabase
      .from('ec_pregunta').update(data).eq('id', id);
    if (error) throw error;
    await loadCategorias();
  }, [loadCategorias]);

  return {
    // datos
    empleados, empleadosPermitidos, empleadosPendientes,
    categorias, evaluaciones, evalPorEmpleado,
    periodos, periodoActivo, periodosActivos,
    evaluadosEnPeriodoActivo, getEvaluadosEnPeriodo,
    configuracion, usuarios, misDepartamentos,
    // estado
    loading, error, isAdminOrGerencia, role,
    // helpers
    canEvaluar,
    // empleados
    loadEmpleados, createEmpleado, updateEmpleado,
    // evaluaciones
    loadEvaluaciones, loadDetalles,
    createEvaluacion, deleteEvaluacion,
    // períodos
    loadPeriodos, createPeriodo, updatePeriodo,
    activarPeriodo, togglePeriodo, deletePeriodo,
    // evaluadores
    addEvaluador, removeEvaluador,
    // cuestionario
    createCategoria, toggleCategoria,
    createPregunta, togglePregunta, updatePregunta,
  };
}