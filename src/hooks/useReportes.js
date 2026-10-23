// src/hooks/useReportes.js
// ═══════════════════════════════════════════════════════════════════
// "Ayúdanos a mejorar" — reportes iniciales del personal (oct 2026)
//   · useReporteTipos()        → tipos activos (para el modal)
//   · crearReporte({...})      → sube la foto (opcional) y llama la RPC
//                                crear_reporte (anonimato + consecutivo +
//                                correo a responsables, todo en la BD)
//   · useResponsablesReportes() → administración de responsables (admin)
// BD: RM_01_REPORTES_AYUDANOS_A_MEJORAR.sql · Bucket privado: reportes-mejora
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const BUCKET_REPORTES = 'reportes-mejora';

// ─── Compresión de foto en el navegador (máx 1280px, JPEG 0.8) ────
async function comprimirImagen(file, maxLado = 1280, calidad = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const uuid = () =>
  (crypto?.randomUUID?.() ||
   'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
     const r = (Math.random() * 16) | 0;
     return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
   }));

// ─── Tipos activos + áreas ──────────────────────────────────────────
export function useReporteTipos(enabled = true) {
  const [tipos, setTipos]     = useState([]);
  const [areas, setAreas]     = useState([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [t, a] = await Promise.all([
      supabase.from('reporte_tipo')
        .select('codigo, nombre, descripcion, icono, color, placeholder, orden')
        .eq('is_active', true).order('orden'),
      supabase.from('department').select('name').order('name'),
    ]);
    if (!t.error) setTipos(t.data || []);
    if (!a.error) setAreas((a.data || []).map((d) => d.name));
    setLoading(false);
  }, []);

  useEffect(() => { if (enabled) cargar(); }, [enabled, cargar]);
  return { tipos, areas, loading, recargar: cargar };
}

// ─── Crear reporte ──────────────────────────────────────────────────
// Devuelve { consecutivo, responsables } o lanza un Error con mensaje claro.
export async function crearReporte({ tipo, descripcion, area, foto, anonimo }) {
  let fotoPath = null;

  if (foto) {
    const blob = await comprimirImagen(foto);
    // La ruta NO lleva el id del usuario → no rompe el anonimato
    fotoPath = `${tipo}/${uuid()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET_REPORTES)
      .upload(fotoPath, blob, { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw new Error('No se pudo subir la foto: ' + upErr.message);
  }

  const { data, error } = await supabase.rpc('crear_reporte', {
    p_tipo: tipo,
    p_descripcion: descripcion,
    p_area: area || null,
    p_foto_path: fotoPath,
    p_anonimo: !!anonimo,
  });
  if (error) throw new Error(error.message || 'No se pudo enviar el reporte');
  return data; // { id, consecutivo, responsables }
}

// ─── Administración de responsables (solo admin) ───────────────────
export function useResponsablesReportes(enabled = true) {
  const [tipos, setTipos]       = useState([]);   // con responsables[]
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    const [t, r, u] = await Promise.all([
      supabase.from('reporte_tipo').select('codigo, nombre, icono, color, is_active, orden').order('orden'),
      supabase.from('reporte_tipo_responsable').select('id, tipo_codigo, user_id'),
      supabase.from('profile').select('id, full_name, email, is_active').eq('is_active', true).order('full_name'),
    ]);
    const err = t.error || r.error || u.error;
    if (err) { setError(err.message); setLoading(false); return; }
    const users = u.data || [];
    const byId = Object.fromEntries(users.map((x) => [x.id, x]));
    setUsuarios(users);
    setTipos((t.data || []).map((tp) => ({
      ...tp,
      responsables: (r.data || [])
        .filter((x) => x.tipo_codigo === tp.codigo)
        // OJO: el perfil va PRIMERO; si va después, su `id` (id del usuario)
        // pisa el id de la fila y el botón ✕ intenta borrar un id que no existe.
        .map((x) => {
          const u = byId[x.user_id] || { full_name: '(usuario inactivo)', email: '' };
          return { full_name: u.full_name, email: u.email, id: x.id, user_id: x.user_id };
        }),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { if (enabled) cargar(); }, [enabled, cargar]);

  const agregar = async (tipo_codigo, user_id) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: e } = await supabase.from('reporte_tipo_responsable')
      .insert({ tipo_codigo, user_id, created_by: user?.id });
    if (e) throw new Error(e.code === '23505' ? 'Ese usuario ya es responsable de este tipo' : e.message);
    await cargar();
  };

  const quitar = async (id) => {
    // .select() devuelve las filas borradas: si viene vacío, la RLS no dejó borrar.
    // (No usar count: con DELETE PostgREST lo reporta en 0 aunque sí borre.)
    const { data, error: e } = await supabase.from('reporte_tipo_responsable')
      .delete().eq('id', id).select('id');
    if (e) throw new Error(e.message);
    if (!data?.length) throw new Error('No se pudo quitar: ya no existe o no tienes permiso');
    await cargar();
  };

  const toggleActivo = async (codigo, is_active) => {
    const { error: e } = await supabase.from('reporte_tipo').update({ is_active }).eq('codigo', codigo);
    if (e) throw new Error(e.message);
    await cargar();
  };

  return { tipos, usuarios, loading, error, agregar, quitar, toggleActivo, recargar: cargar };
}