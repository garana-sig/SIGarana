// src/hooks/useMantenimiento.js
// ═══════════════════════════════════════════════════════════════════
// Hook de datos — Plan de Mantenimiento (Computadores / Maquinaria)
// Tablas: mant_equipo (hoja de vida RE-GR-11) · mant_registro (histórico)
// Bucket: mantenimiento (PRIVADO) → fotos con createSignedUrls
//
// Uso:  const m = useMantenimiento('computador')   // o 'maquinaria'
//
// Reglas aplicadas (technical-learnings):
//   - Hard DELETE, nunca soft-delete.
//   - UPDATE sin .select() encadenado.
//   - Fechas date-only → parseLocalDate (Colombia UTC-5).
//   - Foto se sube ANTES del insert (id generado en cliente), así quien
//     solo tiene permiso "create" no necesita "edit" para guardar la foto.
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'mantenimiento';

// ─── Configuración por tipo de equipo ──────────────────────────────
// Los campos de `especificaciones` (jsonb) se definen aquí. Para
// maquinaria basta con llenar su lista cuando se definan los campos.
export const MANT_CONFIG = {
  computador: {
    label: 'Computadores',
    singular: 'Computador',
    perm: 'mantenimiento:computadores',
    tiposEquipo: ['Escritorio', 'Portátil'],
    areas: ['Administración', 'Diseño', 'Corte', 'Compras', 'Insumos', 'Operaciones'],
    especificaciones: [
      { k: 'so',        l: 'Sistema operativo / Licencia' },
      { k: 'procesador', l: 'Procesador' },
      { k: 'ram',       l: 'Memoria RAM' },
      { k: 'disco',     l: 'Disco duro principal' },
      { k: 'almacenamiento', l: 'Almacenamiento secundario' },
      { k: 'ofimatica', l: 'Ofimática / Licencia' },
      { k: 'antivirus', l: 'Antivirus / Licencia' },
    ],
    perifericos: [
      { k: 'monitor', l: 'Monitor' },
      { k: 'teclado', l: 'Teclado' },
      { k: 'mouse',   l: 'Mouse' },
      { k: 'ups',     l: 'UPS / Regulador' },
    ],
    otrosPerifericos: true,
  },
  maquinaria: {
    label: 'Maquinaria',
    singular: 'Máquina',
    perm: 'mantenimiento:maquinaria',
    tiposEquipo: [],          // por definir
    areas: ['Corte', 'Confección', 'Separación', 'Sublimación', 'Operaciones'],
    especificaciones: [],     // por definir
    perifericos: [],
    otrosPerifericos: false,
  },
};

export const ESTADOS_EQUIPO   = ['Bueno', 'Regular', 'Malo'];
export const TIPOS_MANT       = ['Preventivo', 'Correctivo'];
export const ESTADOS_REGISTRO = ['Realizado', 'Pendiente'];

// ─── Helpers de fecha (date-only, sin desfase UTC) ─────────────────
export function parseLocalDate(s) {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function fmtFecha(s) {
  const d = parseLocalDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Compresión de foto en el navegador (máx 1280px, JPEG 0.8) ────
async function comprimirImagen(fileOrBlob, maxLado = 1280, calidad = 0.8) {
  const url = URL.createObjectURL(fileOrBlob);
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

function friendlyError(e) {
  if (e?.code === '23505') return 'Ya existe un equipo con ese código.';
  if (e?.code === '42501' || /row-level security/i.test(e?.message || '')) {
    return 'No tienes permiso para realizar esta acción.';
  }
  return e?.message || 'Error inesperado.';
}

// Limpia el payload del formulario → columnas de mant_equipo
function buildEquipoPayload(d) {
  const t = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
  return {
    codigo:              (d.codigo || '').trim().toUpperCase(),
    tipo_equipo:         t(d.tipo_equipo),
    marca:               t(d.marca),
    modelo:              t(d.modelo),
    serial:              t(d.serial),
    area:                t(d.area),
    usuario_responsable: t(d.usuario_responsable),
    estado:              d.estado || 'Bueno',
    fecha_compra:        d.fecha_compra || null,
    garantia_hasta:      d.garantia_hasta || null,
    funcion:             t(d.funcion),
    especificaciones:    d.especificaciones || {},
    mant_rutinario:      t(d.mant_rutinario),
    mant_preventivo:     t(d.mant_preventivo),
    herramientas:        t(d.herramientas),
    observaciones:       t(d.observaciones),
    is_active:           d.is_active !== false,
  };
}

function buildRegistroPayload(d) {
  return {
    fecha:       d.fecha || hoyISO(),
    tipo:        d.tipo,
    descripcion: (d.descripcion || '').trim(),
    tecnico:     (d.tecnico || '').trim() || null,
    estado:      d.estado || 'Realizado',
  };
}

// ═══════════════════════════════════════════════════════════════════
export function useMantenimiento(tipo) {
  const [equipos,   setEquipos]   = useState([]);
  const [registros, setRegistros] = useState([]);
  const [fotoUrls,  setFotoUrls]  = useState({});   // foto_path → signed url
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  // ── URLs firmadas de las fotos (bucket privado, 1 hora) ─────────
  const firmarFotos = useCallback(async (lista) => {
    const paths = lista.map((e) => e.foto_path).filter(Boolean);
    if (!paths.length) { setFotoUrls({}); return; }
    const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (e) return; // sin foto no es error bloqueante
    const map = {};
    (data || []).forEach((x) => { if (x.signedUrl) map[x.path] = x.signedUrl; });
    setFotoUrls(map);
  }, []);

  // ── Carga equipos + registros del tipo ───────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: eqs, error: e1 } = await supabase
        .from('mant_equipo')
        .select('*')
        .eq('tipo', tipo)
        .order('codigo', { ascending: true });
      if (e1) throw e1;

      const ids = (eqs || []).map((e) => e.id);
      let regs = [];
      if (ids.length) {
        const { data, error: e2 } = await supabase
          .from('mant_registro')
          .select('*, registrado:profile!mant_registro_registrado_por_fkey(full_name)')
          .in('equipo_id', ids)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        regs = data || [];
      }

      const ordenados = (eqs || []).sort((a, b) =>
        a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
      setEquipos(ordenados);
      setRegistros(regs);
      await firmarFotos(ordenados);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [tipo, firmarFotos]);

  // ── Foto: subir (comprimida) / borrar ────────────────────────────
  const subirFoto = async (equipoId, fileOrBlob) => {
    const blob = await comprimirImagen(fileOrBlob);
    const path = `${tipo}/${equipoId}/foto_${Date.now()}.jpg`;
    const { error: e } = await supabase.storage.from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (e) throw e;
    return path;
  };

  const borrarFoto = async (path) => {
    if (!path) return;
    await supabase.storage.from(BUCKET).remove([path]); // si falla, solo queda huérfana
  };

  // ══════════════════════════════════════════════════════════════════
  //  EQUIPOS
  // ══════════════════════════════════════════════════════════════════
  const createEquipo = useCallback(async (data, fotoFile = null) => {
    let fotoPath = null;
    try {
      if (!(data.codigo || '').trim()) return { success: false, error: 'El código es obligatorio.' };
      const id = crypto.randomUUID();
      if (fotoFile) fotoPath = await subirFoto(id, fotoFile);

      const { error: e } = await supabase
        .from('mant_equipo')
        .insert({ id, tipo, ...buildEquipoPayload(data), foto_path: fotoPath });
      if (e) throw e;

      await fetchAll();
      return { success: true, id };
    } catch (e) {
      if (fotoPath) await borrarFoto(fotoPath);
      return { success: false, error: friendlyError(e) };
    }
  }, [tipo, fetchAll]);

  // opts: { fotoFile, quitarFoto }
  const updateEquipo = useCallback(async (equipo, data, opts = {}) => {
    let nuevaFoto = null;
    try {
      if (!(data.codigo || '').trim()) return { success: false, error: 'El código es obligatorio.' };

      let fotoPath = equipo.foto_path || null;
      if (opts.fotoFile) {
        nuevaFoto = await subirFoto(equipo.id, opts.fotoFile);
        fotoPath = nuevaFoto;
      } else if (opts.quitarFoto) {
        fotoPath = null;
      }

      const { error: e } = await supabase
        .from('mant_equipo')
        .update({ ...buildEquipoPayload(data), foto_path: fotoPath })
        .eq('id', equipo.id);
      if (e) throw e;

      // La foto anterior se borra solo después de guardar bien
      if (equipo.foto_path && equipo.foto_path !== fotoPath) await borrarFoto(equipo.foto_path);

      await fetchAll();
      return { success: true };
    } catch (e) {
      if (nuevaFoto) await borrarFoto(nuevaFoto);
      return { success: false, error: friendlyError(e) };
    }
  }, [fetchAll]);

  // Elimina equipo + historial (CASCADE) + foto
  const deleteEquipo = useCallback(async (equipo) => {
    try {
      const { error: e } = await supabase.from('mant_equipo').delete().eq('id', equipo.id);
      if (e) throw e;
      await borrarFoto(equipo.foto_path);
      setEquipos((prev) => prev.filter((x) => x.id !== equipo.id));
      setRegistros((prev) => prev.filter((r) => r.equipo_id !== equipo.id));
      return { success: true };
    } catch (e) {
      return { success: false, error: friendlyError(e) };
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════
  //  REGISTROS DE MANTENIMIENTO
  // ══════════════════════════════════════════════════════════════════
  const createRegistro = useCallback(async (equipoId, data) => {
    try {
      if (!data.tipo) return { success: false, error: 'Selecciona el tipo de mantenimiento.' };
      if (!(data.descripcion || '').trim()) return { success: false, error: 'Describe el trabajo realizado.' };
      const { error: e } = await supabase
        .from('mant_registro')
        .insert({ equipo_id: equipoId, ...buildRegistroPayload(data) });
      if (e) throw e;
      await fetchAll();
      return { success: true };
    } catch (e) {
      return { success: false, error: friendlyError(e) };
    }
  }, [fetchAll]);

  const updateRegistro = useCallback(async (id, data) => {
    try {
      if (!data.tipo) return { success: false, error: 'Selecciona el tipo de mantenimiento.' };
      if (!(data.descripcion || '').trim()) return { success: false, error: 'Describe el trabajo realizado.' };
      const { error: e } = await supabase
        .from('mant_registro')
        .update(buildRegistroPayload(data))
        .eq('id', id);
      if (e) throw e;
      await fetchAll();
      return { success: true };
    } catch (e) {
      return { success: false, error: friendlyError(e) };
    }
  }, [fetchAll]);

  const deleteRegistro = useCallback(async (id) => {
    try {
      const { error: e } = await supabase.from('mant_registro').delete().eq('id', id);
      if (e) throw e;
      setRegistros((prev) => prev.filter((r) => r.id !== id));
      return { success: true };
    } catch (e) {
      return { success: false, error: friendlyError(e) };
    }
  }, []);

  // ── URLs frescas justo antes de imprimir (las firmadas duran 1 hora) ──
  const getFotoUrlsFrescas = useCallback(async (lista) => {
    const paths = (lista || []).map((e) => e.foto_path).filter(Boolean);
    if (!paths.length) return {};
    const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 600);
    if (e) return fotoUrls;
    const map = {};
    (data || []).forEach((x) => { if (x.signedUrl) map[x.path] = x.signedUrl; });
    return map;
  }, [fotoUrls]);

  return {
    equipos, registros, fotoUrls, loading, error,
    fetchAll,
    createEquipo, updateEquipo, deleteEquipo,
    createRegistro, updateRegistro, deleteRegistro,
    getFotoUrlsFrescas,
  };
}