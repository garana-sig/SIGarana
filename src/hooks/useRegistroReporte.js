// src/hooks/useRegistroReporte.js
// ═══════════════════════════════════════════════════════════════════
// Hook GENÉRICO para los registros oficiales que vienen de "Ayúdanos a mejorar"
//   useRegistroReporte({ tipo: 'acto_inseguro', tabla: 'reg_acto_inseguro' })
//   → reportes (bandeja), registros (formatos), cambiarEstado, guardarRegistro
// La RLS limita todo a los responsables del tipo + admin + gerencia.
// Reemplaza a useActosInseguros.js (oct 2026).
// v2: eliminación definitiva (eliminarRegistro / eliminarReporte, RM_04).
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BUCKET_REPORTES } from '@/hooks/useReportes';

export const ESTADOS = {
  nuevo:      { label: 'Nuevo',      color: '#d97706', bg: '#fffbeb' },
  en_gestion: { label: 'En gestión', color: '#1d4ed8', bg: '#eff6ff' },
  registrado: { label: 'Registrado', color: '#15803d', bg: '#f0fdf4' },
  cerrado:    { label: 'Cerrado',    color: '#2e5244', bg: '#ecf5f0' },
  descartado: { label: 'Descartado', color: '#6b7280', bg: '#f3f4f6' },
};

export async function urlFoto(path) {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET_REPORTES).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export function useRegistroReporte({ tipo, tabla }) {
  const [reportes, setReportes]   = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [puedeEliminar, setPuedeEliminar] = useState(false);   // admin o responsable del tipo

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    const [r, g] = await Promise.all([
      supabase.from('reporte')
        .select(`id, consecutivo, descripcion, area, foto_path, is_anonimo, status, cierre_nota, registro_id, created_at,
                 autor:created_by ( full_name ),
                 eventos:reporte_evento ( id, status, nota, created_at, usuario:user_id ( full_name ) )`)
        .eq('tipo_codigo', tipo)
        .order('created_at', { ascending: false }),
      supabase.from(tabla)
        .select('*, receptor:recibido_por ( full_name ), reporte:reporte_id ( consecutivo, is_anonimo )')
        .order('created_at', { ascending: false }),
    ]);
    const err = r.error || g.error;
    if (err) setError(err.message);
    setReportes((r.data || []).map((x) => ({
      ...x,
      eventos: (x.eventos || []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    })));
    setRegistros(g.data || []);
    setLoading(false);
  }, [tipo, tabla]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    supabase.rpc('reporte_puede_eliminar', { p_tipo: tipo }).then(({ data }) => setPuedeEliminar(!!data));
  }, [tipo]);

  const cambiarEstado = async (id, status, nota = null) => {
    const { error: e } = await supabase.rpc('reporte_cambiar_estado', { p_id: id, p_status: status, p_nota: nota });
    if (e) throw new Error(e.message);
    await cargar();
  };

  // campos = columnas del registro (sin id/numero/reporte_id). Con reporte_id la
  // BD toma el número REP-… y deja el reporte inicial en "registrado" (trigger).
  const guardarRegistro = async (campos, id = null, reporte_id = null) => {
    if (id) {
      const { data, error: e } = await supabase.from(tabla).update(campos).eq('id', id).select('id');
      if (e) throw new Error(e.message);
      if (!data?.length) throw new Error('Sin permiso para editar este registro');
    } else {
      const { error: e } = await supabase.from(tabla).insert({ ...campos, reporte_id: reporte_id || null });
      if (e) throw new Error(e.code === '23505' ? 'Este reporte ya tiene un registro' : e.message);
    }
    await cargar();
  };

  // ── Eliminación definitiva (RM_04) ──────────────────────────────
  // Solo el formato: si venía de un reporte, el reporte vuelve a "En gestión".
  const eliminarRegistro = async (id) => {
    const { data, error: e } = await supabase.rpc('reporte_eliminar_registro', { p_tabla: tabla, p_id: id });
    if (e) throw new Error(e.message);
    await cargar();
    return data;   // { numero, reporte_id }
  };

  // Reporte completo + historial + su registro + foto del bucket.
  // Devuelve { consecutivo, aviso } (aviso si la foto no se pudo borrar).
  const eliminarReporte = async (id) => {
    const { data, error: e } = await supabase.rpc('reporte_eliminar', { p_id: id });
    if (e) throw new Error(e.message);
    let aviso = null;
    if (data?.foto_path) {
      const { error: ef } = await supabase.storage.from(BUCKET_REPORTES).remove([data.foto_path]);
      if (ef) aviso = `El reporte se eliminó, pero la foto no: ${ef.message}`;
    }
    await cargar();
    return { consecutivo: data?.consecutivo, aviso };
  };

  return { reportes, registros, loading, error, puedeEliminar, cambiarEstado, guardarRegistro, eliminarRegistro, eliminarReporte, recargar: cargar };
}