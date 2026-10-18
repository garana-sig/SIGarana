// src/hooks/useMatrizLegal.js
// ═══════════════════════════════════════════════════════════════════════
// Matriz Legal (RE-DP-04) — Mejoramiento Continuo
//
// Tablas:  ml_requisito · ml_requisito_responsable · ml_verificacion
// Vista:   v_ml_requisito_estado (requisito + última verificación + estado)
//
// Permisos (auditorias:requisitos_legales:*):
//   view (todos) · create · edit · delete · verify
//   Además verifica sin permiso extra: el usuario responsable, los usuarios
//   del proceso responsable y, si "aplica a todos los procesos", cualquier
//   usuario con proceso. (Mismo criterio que ml_puede_verificar en la BD.)
//
// Convenciones SIG: hard DELETE, sin .select() después de UPDATE.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const PERM = 'auditorias:requisitos_legales';

// ── Catálogos ───────────────────────────────────────────────────────────
export const MATRICES = [
  { id: 'general', label: 'Matriz General', short: 'General' },
  { id: 'sst',     label: 'Matriz SST',     short: 'SST' },
];

export const TIPOS_NORMA = [
  'Constitución', 'Ley', 'Decreto', 'Resolución', 'Circular', 'Acuerdo',
  'Código Sustantivo del Trabajo', 'Código', 'NTC', 'ISO', 'INEN', 'Otro',
];

export const ESTADOS_VERIF = {
  cumple:    { label: 'Cumple',     short: 'C',   bg: '#dcfce7', color: '#15803d' },
  parcial:   { label: 'Parcial',    short: 'P',   bg: '#fef3c7', color: '#b45309' },
  no_cumple: { label: 'No cumple',  short: 'NC',  bg: '#fee2e2', color: '#b91c1c' },
  no_aplica: { label: 'No aplica',  short: 'N/A', bg: '#f1f5f9', color: '#475569' },
};

// Estado de la verificación (calculado en la vista)
export const ESTADO_CONTROL = {
  al_dia:        { label: 'Al día',        bg: '#e8f5ee', color: '#2e5244' },
  vencida:       { label: 'Vencida',       bg: '#ffedd5', color: '#c2410c' },
  sin_verificar: { label: 'Sin verificar', bg: '#f1f5f9', color: '#64748b' },
  derogada:      { label: 'Derogada',      bg: '#f3f4f6', color: '#6b7280' },
};

export const TIPOS_RESPONSABLE = {
  proceso: { label: 'Proceso', bg: '#e8f5ee', color: '#2e5244' },
  usuario: { label: 'Usuario', bg: '#eff6ff', color: '#1d4ed8' },
  cargo:   { label: 'Cargo',   bg: '#fdf4ff', color: '#7c3aed' },
  comite:  { label: 'Comité',  bg: '#fff7ed', color: '#c2410c' },
};

// Nombre visible de un responsable ya enriquecido
export const nombreResponsable = (r) =>
  r.tipo === 'proceso' ? (r.process?.name || 'Proceso')
  : r.tipo === 'usuario' ? (r.user?.full_name || 'Usuario')
  : (r.nombre || '—');

// Fecha date-only sin desfase UTC-5
export const fmtFecha = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : '';
};
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Campos editables de ml_requisito
const CAMPOS = [
  'matriz', 'anio_emision', 'fecha_emision', 'tipo_norma', 'numero', 'norma',
  'ente_emisor', 'asunto', 'articulo', 'requisito', 'evidencia', 'is_digital',
  'aplica_todos_procesos', 'vigencia', 'motivo_derogacion', 'fecha_derogacion',
  'frecuencia_meses', 'orden',
];
const limpiar = (form) => {
  const out = {};
  CAMPOS.forEach((k) => {
    if (form[k] === undefined) return;
    let v = form[k];
    if (typeof v === 'string') v = v.trim() === '' ? null : v.trim();
    out[k] = v;
  });
  if (out.anio_emision != null) out.anio_emision = Number(out.anio_emision) || null;
  if (out.frecuencia_meses != null) out.frecuencia_meses = Number(out.frecuencia_meses) || 12;
  if (out.vigencia === 'vigente') { out.motivo_derogacion = null; out.fecha_derogacion = null; }
  return out;
};

// ═══════════════════════════════════════════════════════════════════════
export function useMatrizLegal() {
  const { user, isAdmin, isGerencia, hasPermission } = useAuth();

  const [requisitos, setRequisitos] = useState([]);
  const [procesos, setProcesos]     = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [miProceso, setMiProceso]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // ── Permisos de UI ────────────────────────────────────────────────────
  const full = isAdmin || isGerencia;
  const can = useMemo(() => ({
    create: full || hasPermission(`${PERM}:create`),
    edit:   full || hasPermission(`${PERM}:edit`),
    delete: full || hasPermission(`${PERM}:delete`),
    verifyAll: full || hasPermission(`${PERM}:verify`),
    accion: full || hasPermission('auditorias:acciones_mejora:create'),
  }), [full, hasPermission]);

  const puedeVerificar = useCallback((req) => {
    if (!req || req.vigencia === 'derogada') return false;
    if (can.verifyAll) return true;
    const resp = req.responsables || [];
    if (resp.some((r) => r.tipo === 'usuario' && r.user_id === user?.id)) return true;
    if (!miProceso) return false;
    if (req.aplica_todos_procesos) return true;
    return resp.some((r) => r.tipo === 'proceso' && r.process_id === miProceso);
  }, [can.verifyAll, user?.id, miProceso]);

  // ¿El requisito es "mío"? (para el filtro "Mis requisitos")
  const esMio = useCallback((req) => {
    const resp = req.responsables || [];
    if (resp.some((r) => r.tipo === 'usuario' && r.user_id === user?.id)) return true;
    if (!miProceso) return false;
    return req.aplica_todos_procesos || resp.some((r) => r.tipo === 'proceso' && r.process_id === miProceso);
  }, [user?.id, miProceso]);

  // ── Carga ─────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rq, rs, pr, us, yo] = await Promise.all([
        supabase.from('v_ml_requisito_estado').select('*')
          .order('matriz').order('orden', { ascending: true, nullsFirst: false }),
        supabase.from('ml_requisito_responsable').select('id, requisito_id, tipo, process_id, user_id, nombre'),
        supabase.from('process').select('id, name, code, display_order').eq('is_active', true).order('display_order'),
        supabase.from('profile').select('id, full_name, email').eq('is_active', true).order('full_name'),
        user?.id
          ? supabase.from('profile').select('process_id').eq('id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (rq.error) throw rq.error;
      if (rs.error) throw rs.error;

      const pm = Object.fromEntries((pr.data || []).map((p) => [p.id, p]));
      const um = Object.fromEntries((us.data || []).map((u) => [u.id, u]));

      const porReq = {};
      (rs.data || []).forEach((r) => {
        const e = { ...r, process: pm[r.process_id] || null, user: um[r.user_id] || null };
        (porReq[r.requisito_id] = porReq[r.requisito_id] || []).push(e);
      });
      const ordenTipo = { proceso: 0, usuario: 1, cargo: 2, comite: 3 };
      Object.values(porReq).forEach((l) => l.sort((a, b) => ordenTipo[a.tipo] - ordenTipo[b.tipo]));

      setRequisitos((rq.data || []).map((q) => ({ ...q, responsables: porReq[q.id] || [] })));
      setProcesos(pr.data || []);
      setUsuarios(us.data || []);
      setMiProceso(yo?.data?.process_id || null);
    } catch (e) {
      console.error('❌ useMatrizLegal.cargar:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Responsables: reemplaza el conjunto (borra y vuelve a insertar) ───
  const guardarResponsables = async (requisitoId, lista) => {
    const { error: eDel } = await supabase.from('ml_requisito_responsable').delete().eq('requisito_id', requisitoId);
    if (eDel) throw eDel;
    const filas = (lista || []).map((r) => ({
      requisito_id: requisitoId,
      tipo: r.tipo,
      process_id: r.tipo === 'proceso' ? r.process_id : null,
      user_id:    r.tipo === 'usuario' ? r.user_id    : null,
      nombre:     ['cargo', 'comite'].includes(r.tipo) ? r.nombre?.trim() : null,
    }));
    if (filas.length) {
      const { error: eIns } = await supabase.from('ml_requisito_responsable').insert(filas);
      if (eIns) throw eIns;
    }
  };

  // ── CRUD requisito ────────────────────────────────────────────────────
  const crearRequisito = async (form, responsables) => {
    try {
      const datos = limpiar(form);
      if (!datos.norma) throw new Error('La norma es obligatoria.');
      if (datos.orden == null) {
        const max = Math.max(0, ...requisitos
          .filter((r) => r.matriz === datos.matriz && r.vigencia === datos.vigencia && (r.orden || 0) < 1000)
          .map((r) => r.orden || 0));
        datos.orden = datos.vigencia === 'derogada'
          ? Math.max(1000, ...requisitos.filter((r) => r.matriz === datos.matriz).map((r) => r.orden || 0)) + 1
          : max + 1;
      }
      const { data, error: e } = await supabase.from('ml_requisito').insert(datos).select('id').single();
      if (e) throw e;
      await guardarResponsables(data.id, responsables);
      await cargar();
      return { success: true, id: data.id };
    } catch (e) {
      console.error('❌ crearRequisito:', e);
      return { success: false, error: e.message };
    }
  };

  const actualizarRequisito = async (id, form, responsables) => {
    try {
      const datos = limpiar(form);
      const { error: e } = await supabase.from('ml_requisito').update(datos).eq('id', id);
      if (e) throw e;
      if (responsables) await guardarResponsables(id, responsables);
      await cargar();
      return { success: true };
    } catch (e) {
      console.error('❌ actualizarRequisito:', e);
      return { success: false, error: e.message };
    }
  };

  // Edición en línea de un solo campo (sin recargar toda la matriz)
  const actualizarCampo = async (id, campo, valor) => {
    try {
      if (!CAMPOS.includes(campo)) throw new Error(`Campo no editable: ${campo}`);
      let v = typeof valor === 'string' ? (valor.trim() === '' ? null : valor.trim()) : valor;
      if (campo === 'anio_emision' && v != null) {
        v = Number(v);
        if (!Number.isInteger(v) || v < 1800 || v > 2100) throw new Error('Año inválido (1800–2100).');
      }
      if (campo === 'norma' && !v) throw new Error('La norma no puede quedar vacía.');
      const { error: e } = await supabase.from('ml_requisito').update({ [campo]: v }).eq('id', id);
      if (e) throw e;
      setRequisitos((p) => p.map((r) => (r.id === id ? { ...r, [campo]: v } : r)));
      return { success: true };
    } catch (e) {
      console.error('❌ actualizarCampo:', e);
      return { success: false, error: e.message };
    }
  };

  const eliminarRequisito = async (id) => {
    try {
      const { error: e } = await supabase.from('ml_requisito').delete().eq('id', id);
      if (e) throw e;
      setRequisitos((p) => p.filter((r) => r.id !== id));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ── Verificaciones ────────────────────────────────────────────────────
  const listarVerificaciones = async (requisitoId) => {
    const { data, error: e } = await supabase
      .from('ml_verificacion')
      .select('id, fecha, estado, evidencia, observaciones, improvement_action_id, verificado_por, created_at')
      .eq('requisito_id', requisitoId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    if (e) throw e;
    const ids = [...new Set((data || []).map((v) => v.improvement_action_id).filter(Boolean))];
    let acc = {};
    if (ids.length) {
      const { data: a } = await supabase.from('improvement_action').select('id, consecutive, status').in('id', ids);
      acc = Object.fromEntries((a || []).map((x) => [x.id, x]));
    }
    const um = Object.fromEntries(usuarios.map((u) => [u.id, u]));
    return (data || []).map((v) => ({
      ...v,
      verificador: um[v.verificado_por]?.full_name || (v.verificado_por ? 'Usuario' : 'Matriz 2022'),
      accion: acc[v.improvement_action_id] || null,
    }));
  };

  const registrarVerificacion = async (requisitoId, form) => {
    try {
      const fila = {
        requisito_id: requisitoId,
        fecha: form.fecha || hoyISO(),
        estado: form.estado,
        evidencia: form.evidencia?.trim() || null,
        observaciones: form.observaciones?.trim() || null,
        verificado_por: user?.id,
      };
      const { data, error: e } = await supabase.from('ml_verificacion').insert(fila).select('id').single();
      if (e) throw e;
      await cargar();
      return { success: true, id: data.id };
    } catch (e) {
      console.error('❌ registrarVerificacion:', e);
      return { success: false, error: e.message };
    }
  };

  const eliminarVerificacion = async (id) => {
    try {
      const { error: e } = await supabase.from('ml_verificacion').delete().eq('id', id);
      if (e) throw e;
      await cargar();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Enlaza la acción de mejora recién creada con la verificación.
  // AccionMejoraModal no devuelve el id → se busca la última acción del
  // usuario con ese hallazgo.
  const enlazarUltimaAccion = async (verificacionId, hallazgo) => {
    try {
      const base = () => supabase
        .from('improvement_action')
        .select('id')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);
      // 1) mismo hallazgo  2) si lo editaron: la última creada en los últimos 10 min
      let { data: a, error: e } = await base().eq('finding_description', hallazgo).maybeSingle();
      if (e) throw e;
      if (!a) {
        const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        ({ data: a, error: e } = await base().gte('created_at', desde).maybeSingle());
        if (e) throw e;
      }
      if (!a) return { success: false, error: 'No se encontró la acción creada.' };
      const { error: e2 } = await supabase
        .from('ml_verificacion').update({ improvement_action_id: a.id }).eq('id', verificacionId);
      if (e2) throw e2;
      await cargar();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  return {
    requisitos, procesos, usuarios, miProceso, loading, error,
    can, puedeVerificar, esMio,
    cargar, crearRequisito, actualizarRequisito, actualizarCampo, eliminarRequisito,
    listarVerificaciones, registrarVerificacion, eliminarVerificacion, enlazarUltimaAccion,
  };
}