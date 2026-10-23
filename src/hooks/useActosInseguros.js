// src/hooks/useActosInseguros.js
// ═══════════════════════════════════════════════════════════════════
// Registro de Actos / Condiciones Inseguras (RE-GS-02) — oct 2026
//   · reportes: bandeja de reportes iniciales tipo 'acto_inseguro'
//   · registros: formatos diligenciados (reg_acto_inseguro)
// La RLS limita todo a los responsables del tipo + admin + gerencia.
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BUCKET_REPORTES } from '@/hooks/useReportes';

export const TIPO_REPORTE = 'acto_inseguro';

export const EPP_OPCIONES = [
  { key: 'tapabocas',           label: 'Tapabocas' },
  { key: 'guante_metalico',     label: 'Guante metálico' },
  { key: 'cabello_sin_recoger', label: 'Cabello sin recoger' },
  { key: 'medias_ortopedicas',  label: 'Medias ortopédicas' },
  { key: 'dotacion',            label: 'Dotación' },
  { key: 'uso_accesorios',      label: 'Uso de accesorios' },
  { key: 'tapaoidos',           label: 'Tapaoídos' },
  { key: 'guante_tela',         label: 'Guante de tela' },
  { key: 'otro',                label: 'Otro, ¿cuál?' },
];

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

export function useActosInseguros() {
  const [reportes, setReportes]   = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    const [r, g] = await Promise.all([
      supabase.from('reporte')
        .select(`id, consecutivo, descripcion, area, foto_path, is_anonimo, status, cierre_nota, registro_id, created_at,
                 autor:created_by ( full_name ),
                 eventos:reporte_evento ( id, status, nota, created_at, usuario:user_id ( full_name ) )`)
        .eq('tipo_codigo', TIPO_REPORTE)
        .order('created_at', { ascending: false }),
      supabase.from('reg_acto_inseguro')
        .select(`*, receptor:recibido_por ( full_name ), reporte:reporte_id ( consecutivo, is_anonimo )`)
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
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (id, status, nota = null) => {
    const { error: e } = await supabase.rpc('reporte_cambiar_estado', { p_id: id, p_status: status, p_nota: nota });
    if (e) throw new Error(e.message);
    await cargar();
  };

  // Crea o actualiza el registro oficial. Con reporte_id, la BD toma el número
  // REP-… y deja el reporte inicial en "registrado" (trigger).
  const guardarRegistro = async (payload, id = null) => {
    const campos = {
      fecha: payload.fecha,
      reportado_por: payload.reportado_por?.trim() || 'Anónimo',
      area: payload.area || null,
      es_acto_inseguro: !!payload.es_acto_inseguro,
      es_condicion_insegura: !!payload.es_condicion_insegura,
      es_condicion_salud: !!payload.es_condicion_salud,
      descripcion: payload.descripcion.trim(),
      epp_omitidos: payload.epp_omitidos || [],
      epp_otro: payload.epp_omitidos?.includes('otro') ? (payload.epp_otro?.trim() || null) : null,
      correctivos: payload.correctivos?.trim() || null,
    };
    if (id) {
      const { data, error: e } = await supabase.from('reg_acto_inseguro').update(campos).eq('id', id).select('id');
      if (e) throw new Error(e.message);
      if (!data?.length) throw new Error('Sin permiso para editar este registro');
    } else {
      const { error: e } = await supabase.from('reg_acto_inseguro')
        .insert({ ...campos, reporte_id: payload.reporte_id || null });
      if (e) throw new Error(e.code === '23505' ? 'Este reporte ya tiene un registro' : e.message);
    }
    await cargar();
  };

  return { reportes, registros, loading, error, cambiarEstado, guardarRegistro, recargar: cargar };
}