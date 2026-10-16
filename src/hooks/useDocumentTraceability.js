// src/hooks/useDocumentTraceability.js
// Lee (y para admin, cambia) el interruptor global de trazabilidad de
// Gestión Documental guardado en public.system_setting:
//   key = 'document_traceability'  →  value = true | false
//
// false (carga inicial): admin/gerencia hacen CORRECCIÓN DIRECTA al editar
// true  (en firme):      cambios de archivo = nueva versión + motivo + aprobación
//
// La tabla tiene RLS: todos leen, solo admin puede actualizar.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const SETTING_KEY = 'document_traceability';

export const useDocumentTraceability = () => {
  const { user, isAdmin } = useAuth();
  const [traceabilityEnabled, setTraceabilityEnabled] = useState(true); // seguro por defecto
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchSetting = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('system_setting')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (fetchError) throw fetchError;
      // Si no existe la fila, se asume trazabilidad ACTIVADA (lo más seguro)
      setTraceabilityEnabled(data ? data.value === true : true);
    } catch (err) {
      console.error('❌ Error leyendo trazabilidad:', err);
      setError(err.message);
      setTraceabilityEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetting();
  }, [fetchSetting]);

  // Solo admin (la BD también lo valida con RLS)
  const setTraceability = async (enabled) => {
    if (!isAdmin) {
      return { success: false, error: 'Solo el administrador puede cambiar la trazabilidad' };
    }
    try {
      setSaving(true);
      setError(null);
      const { data, error: updError } = await supabase
        .from('system_setting')
        .update({ value: enabled, updated_by: user?.id || null })
        .eq('key', SETTING_KEY)
        .select('value');

      if (updError) throw updError;
      if (!data || data.length === 0) throw new Error('No se pudo actualizar la configuración');

      setTraceabilityEnabled(data[0].value === true);
      return { success: true };
    } catch (err) {
      console.error('❌ Error cambiando trazabilidad:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return {
    traceabilityEnabled,
    loading,
    saving,
    error,
    setTraceability,
    refresh: fetchSetting,
  };
};

export default useDocumentTraceability;