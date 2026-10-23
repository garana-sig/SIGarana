// src/hooks/useFormatoVinculado.js
// ═══════════════════════════════════════════════════════════════════
// FORMATOS VINCULADOS (oct 2026)
// Cada "uso" de la app (clave fija, ej. 'registro_actos_inseguros') apunta a un
// documento del Listado Maestro (tabla formato_vinculado → document).
// De ahí salen el código, la versión, la fecha y el ARCHIVO (plantilla Excel).
// Si el formato cambia en Gestión Documental, la app lo toma sola.
//
//   const { formato } = useFormato('registro_actos_inseguros');
//   formato?.code · formato?.version · formato?.file_path
//   const buf = await descargarPlantilla(formato);   // ArrayBuffer (.xlsx)
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const SELECT_DOC = 'id, code, name, version, change_date, file_path, file_name, status';

export function useFormato(clave) {
  const [formato, setFormato] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('formato_vinculado')
        .select(`clave, nombre, document:document_id ( ${SELECT_DOC} )`)
        .eq('clave', clave)
        .maybeSingle();
      if (vivo) { setFormato(data?.document || null); setLoading(false); }
    })();
    return () => { vivo = false; };
  }, [clave]);

  return { formato, loading };
}

// "RE-GS-02 · v01"
export const etiquetaFormato = (f) =>
  f ? `${f.code} · v${String(f.version ?? 1).padStart(2, '0')}` : 'Sin formato vinculado';

// Descarga el archivo del formato desde Gestión Documental (bucket documents)
export async function descargarPlantilla(formato) {
  if (!formato?.file_path) {
    throw new Error('Este registro no tiene un formato vinculado en Gestión Documental (Formatos del sistema).');
  }
  if (!/\.xlsx$/i.test(formato.file_path)) {
    throw new Error(`El formato ${formato.code} está en ${formato.file_path.split('.').pop().toUpperCase()}. Súbelo a Gestión Documental en .xlsx para poder exportar.`);
  }
  const { data, error } = await supabase.storage.from('documents').download(formato.file_path);
  if (error) throw new Error('No se pudo descargar el formato: ' + error.message);
  return await data.arrayBuffer();
}

// ─── Administración (solo admin) ───────────────────────────────────
export function useFormatosAdmin() {
  const [usos, setUsos]       = useState([]);
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    const [u, d] = await Promise.all([
      supabase.from('formato_vinculado')
        .select(`clave, nombre, modulo, descripcion, orden, updated_at, document:document_id ( ${SELECT_DOC} )`)
        .order('orden'),
      supabase.from('document').select(SELECT_DOC).in('status', ['published', 'approved']).order('code'),
    ]);
    if (u.error || d.error) setError((u.error || d.error).message);
    setUsos(u.data || []);
    setDocs(d.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const vincular = async (clave, document_id) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: e } = await supabase.from('formato_vinculado')
      .update({ document_id, updated_by: user?.id }).eq('clave', clave).select('clave');
    if (e) throw new Error(e.message);
    if (!data?.length) throw new Error('Sin permiso para cambiar el formato (solo admin)');
    await cargar();
  };

  return { usos, docs, loading, error, vincular, recargar: cargar };
}