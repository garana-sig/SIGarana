// src/hooks/useRiskMatrix.js
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// HELPERS DE CÁLCULO — toda la lógica del Excel RE-DP-05
// Calculados en JS, no guardados en BD → fácil de cambiar en el futuro
// ============================================================================

/**
 * Convierte impact_value numérico → etiqueta + color de fondo
 * Col G: 5=LEVE, 10=MODERADO, 20=CATASTROFICO
 */
export const getImpactInfo = (value) => {
  switch (Number(value)) {
    case 5:  return { label: 'LEVE',         bg: '#92D050', color: '#1a3a00' }; // verde
    case 10: return { label: 'MODERADO',     bg: '#FFC000', color: '#4a2800' }; // naranja
    case 20: return { label: 'CATASTROFICO', bg: '#FF0000', color: '#ffffff' }; // rojo
    default: return { label: '—',            bg: '#f3f4f6', color: '#6b7280' };
  }
};

/**
 * Convierte probability_value numérico → etiqueta + color de fondo
 * Col I: 1=BAJA, 2=MEDIO, 3=ALTA
 */
export const getProbabilityInfo = (value) => {
  switch (Number(value)) {
    case 1: return { label: 'BAJA',  bg: '#92D050', color: '#1a3a00' }; // verde
    case 2: return { label: 'MEDIO', bg: '#FFC000', color: '#4a2800' }; // naranja
    case 3: return { label: 'ALTA',  bg: '#FF0000', color: '#ffffff' }; // rojo
    default: return { label: '—',    bg: '#f3f4f6', color: '#6b7280' };
  }
};

/**
 * Calcula la evaluación (Imp × Prob) y el nivel de riesgo
 * Col J = G × I
 * Col K = fórmula Excel:
 *   SI(J=5,"ACEPTABLE", SI(J=10,"TOLERABLE",
 *     SI(J>14 Y J<29,"MODERADO", SI(J>29 Y J<59,"IMPORTANTE",
 *       SI(J=60,"INACEPTABLE")))))
 */
export const getRiskLevelInfo = (impactValue, probabilityValue) => {
  const iv = Number(impactValue);
  const pv = Number(probabilityValue);

  if (!iv || !pv) return { evaluation: null, label: '—', bg: '#f3f4f6', color: '#6b7280' };

  const evaluation = iv * pv;

  let label, bg, color;

  if (evaluation === 5) {
    label = 'ACEPTABLE';   bg = '#92D050'; color = '#1a3a00'; // verde
  } else if (evaluation === 10) {
    label = 'TOLERABLE';   bg = '#FFC000'; color = '#4a2800'; // naranja
  } else if (evaluation > 14 && evaluation < 29) {
    label = 'MODERADO';    bg = '#FFC000'; color = '#4a2800'; // naranja
  } else if (evaluation > 29 && evaluation < 59) {
    label = 'IMPORTANTE';  bg = '#FF0000'; color = '#ffffff'; // rojo
  } else if (evaluation === 60) {
    label = 'INACEPTABLE'; bg = '#FF0000'; color = '#ffffff'; // rojo
  } else {
    label = '—';           bg = '#f3f4f6'; color = '#6b7280';
  }

  return { evaluation, label, bg, color };
};

/**
 * Colores de fondo por proceso — se asignan automáticamente
 * según el índice de orden del proceso en la lista
 */
const PROCESS_COLORS = [
  '#DCE6F1', // azul claro
  '#E2EFDA', // verde claro
  '#FFF2CC', // amarillo claro
  '#FCE4D6', // naranja claro
  '#E8D5F5', // lila
  '#D9EAD3', // verde menta
  '#FDE9D9', // salmón
  '#D0E4F7', // azul cielo
  '#F4CCCC', // rosa claro
  '#CFE2F3', // celeste
];

export const getProcessColor = (processId, processesArray) => {
  if (!processId || !processesArray?.length) return '#F9FAFB';
  const idx = processesArray.findIndex(p => p.id === processId);
  return idx >= 0 ? PROCESS_COLORS[idx % PROCESS_COLORS.length] : '#F9FAFB';
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useRiskMatrix() {
  const { user } = useAuth();
  const [risks, setRisks]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // ── Cargar todos los riesgos (excluye eliminados) ─────────────────────────
  const fetchRisks = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Traer riesgos (sin JOINs — patrón del proyecto)
      const { data, error: fetchError } = await supabase
        .from('risk_matrix')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      if (!data || data.length === 0) { setRisks([]); return; }

      // 2. Traer procesos relacionados
      const processIds = [...new Set(data.map(r => r.process_id).filter(Boolean))];
      let processMap = {};

      if (processIds.length > 0) {
        const { data: processes } = await supabase
          .from('process')
          .select('id, name')
          .in('id', processIds)
          .order('name');

        (processes || []).forEach(p => { processMap[p.id] = p; });
      }

      // 3. Traer creadores
      const creatorIds = [...new Set(data.map(r => r.created_by).filter(Boolean))];
      let creatorMap = {};

      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('profile')
          .select('id, full_name')
          .in('id', creatorIds);

        (creators || []).forEach(p => { creatorMap[p.id] = p; });
      }

      // 4. Enriquecer cada riesgo con datos calculados
      const enriched = data.map(r => ({
        ...r,
        // Datos de proceso
        process_name:  processMap[r.process_id]?.name || '—',
        // Datos calculados del Excel (solo en memoria, no en BD)
        impact_info:      getImpactInfo(r.impact_value),
        probability_info: getProbabilityInfo(r.probability_value),
        risk_level_info:  getRiskLevelInfo(r.impact_value, r.probability_value),
        // Creador
        creator_name:  creatorMap[r.created_by]?.full_name || '—',
      }));

      setRisks(enriched);

    } catch (err) {
      console.error('❌ Error cargando matriz de riesgos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Crear riesgo ──────────────────────────────────────────────────────────
  const createRisk = async (formData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('risk_matrix')
        .insert([{ ...formData, created_by: user.id }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Emails: pendientes — a definir con cliente
      // await sendEmail(...)

      await fetchRisks();
      return { success: true, data };

    } catch (err) {
      console.error('❌ Error creando riesgo:', err);
      return { success: false, error: err.message };
    }
  };

  // ── Actualizar riesgo ─────────────────────────────────────────────────────
  const updateRisk = async (id, formData) => {
    try {
      const { error: updateError } = await supabase
        .from('risk_matrix')
        .update(formData)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchRisks();
      return { success: true };

    } catch (err) {
      console.error('❌ Error actualizando riesgo:', err);
      return { success: false, error: err.message };
    }
  };

  // ── Eliminar riesgo (soft delete — solo marca deleted_at) ─────────────────
const deleteRisk = async (id) => {
  try {
    const { error } = await supabase
      .rpc('soft_delete_risk_matrix', { p_id: id });

    if (error) throw error;
    await fetchRisks();
    return { success: true };
  } catch (err) {
    console.error('❌ Error eliminando riesgo:', err);
    return { success: false, error: err.message };
  }
};

  useEffect(() => { fetchRisks(); }, []);

  return {
    risks,
    loading,
    error,
    fetchRisks,
    createRisk,
    updateRisk,
    deleteRisk,
  };
}

// ============================================================================
// HOOK PROCESOS (selector en el modal)
// ============================================================================

export function useProcesses() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const fetchProcesses = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('process')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setProcesses(data || []);
      setLoading(false);
    };
    fetchProcesses();
  }, []);

  return { processes, loading };
}