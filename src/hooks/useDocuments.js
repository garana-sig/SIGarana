// src/hooks/useDocuments.js
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook principal para cargar documentos con filtros
 */
export const useDocuments = ({ searchTerm, documentTypeId, processId, status } = {}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { draft: 0, pending_approval: 0, published: 0, archived: 0 }
  });

  // 2-nov-2026: si llegan dos respuestas, solo cuenta la última pedida
  const reqRef = useRef(0);

  const fetchDocuments = async () => {
    const reqId = ++reqRef.current;
    try {
      setLoading(true);
      console.log('📄 Cargando documentos...');

      // ✅ Query con JOINs correctos para traer relaciones
      let query = supabase
        .from('document')
        .select(`
          *,
          document_type:document_type_id (
            id,
            code,
            name,
            prefix
          ),
          process:process_id (
            id,
            name
          ),
          created_by_profile:created_by (
            id,
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,objective.ilike.%${searchTerm}%`);
      }
      if (documentTypeId) {
        query = query.eq('document_type_id', documentTypeId);
      }
      if (processId) {
        query = query.eq('process_id', processId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (reqId !== reqRef.current) return;   // respuesta vieja: se ignora
      if (fetchError) throw fetchError;

      console.log('✅ Documentos cargados:', data?.length || 0);
      
      // Calcular estadísticas
      const statsCalc = {
        total: data?.length || 0,
        byStatus: {
          draft: data?.filter(d => d.status === 'draft').length || 0,
          pending_approval: data?.filter(d => d.status === 'pending_approval').length || 0,
          published: data?.filter(d => d.status === 'published').length || 0,
          archived: data?.filter(d => d.status === 'archived').length || 0
        }
      };

      setDocuments(data || []);
      setStats(statsCalc);
      setError(null);

    } catch (err) {
      console.error('❌ Error cargando documentos:', err);
      setError(err.message);
      setDocuments([]);
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, documentTypeId, processId, status]);

  return {
    documents,
    loading,
    error,
    stats,
    refresh: fetchDocuments
  };
};

/**
 * Hook para cargar tipos de documento
 */
export const useDocumentTypes = () => {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        setLoading(true);
        console.log('📋 Cargando tipos de documento...');

        const { data, error: fetchError } = await supabase
          .from('document_type')
          .select('*')
          .order('name');

        if (fetchError) throw fetchError;

        console.log('✅ Tipos de documento cargados:', data?.length || 0);
        setDocumentTypes(data || []);
        setError(null);

      } catch (err) {
        console.error('❌ Error cargando tipos de documento:', err);
        setError(err.message);
        setDocumentTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentTypes();
  }, []);

  return { documentTypes, loading, error };
};

/**
 * Hook para cargar procesos
 * ✅ CORREGIDO: Ahora filtra solo procesos activos
 */
export const useProcesses = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        setLoading(true);
        console.log('🔄 Cargando procesos...');

        const { data, error: fetchError } = await supabase
          .from('process')
          .select('*')
          .eq('is_active', true)  // ✅ AGREGADO: Solo procesos activos
          .order('name');

        if (fetchError) throw fetchError;

        console.log('✅ Procesos cargados:', data?.length || 0);
        setProcesses(data || []);
        setError(null);

      } catch (err) {
        console.error('❌ Error cargando procesos:', err);
        setError(err.message);
        setProcesses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProcesses();
  }, []);

  return { processes, loading, error };
};

/**
 * Hook para cargar un documento individual por ID
 */
export const useDocument = (documentId) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        console.log('📄 Cargando documento:', documentId);

        const { data, error: fetchError } = await supabase
          .from('document')
          .select(`
            *,
            document_type:document_type_id (
              id,
              code,
              name,
              prefix
            ),
            process:process_id (
              id,
              name
            ),
            created_by_profile:created_by (
              id,
              email,
              full_name
            )
          `)
          .eq('id', documentId)
          .single();

        if (fetchError) throw fetchError;

        console.log('✅ Documento cargado:', data?.code);
        setDocument(data);
        setError(null);

      } catch (err) {
        console.error('❌ Error cargando documento:', err);
        setError(err.message);
        setDocument(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  return { document, loading, error };
};