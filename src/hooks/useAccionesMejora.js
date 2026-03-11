// src/hooks/useAccionesMejora.js — v2.0 con 3 momentos
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ── Semáforo ──────────────────────────────────────────────────────────────────
export const getTrafficLight = (proposedDate, isClosed = false) => {
  if (isClosed) return { color: 'gray', label: 'Cerrada' };
  if (!proposedDate) return { color: 'gray', label: 'Sin fecha' };
  const today = new Date(); today.setHours(0,0,0,0);
  const proposed = new Date(proposedDate + 'T00:00:00');
  const diff = Math.ceil((proposed - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { color: 'red',    label: `Vencida (${Math.abs(diff)}d)` };
  if (diff <= 7) return { color: 'yellow', label: `Vence en ${diff}d` };
  return               { color: 'green',  label: 'Vigente' };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sendEmail = async (to, type, data) => {
  try {
    const { error } = await supabase.functions.invoke('send-email', { body: { type, to, data } });
    if (error) console.warn(`⚠️ Email [${type}] → ${to}:`, error.message);
    else       console.log (`📧 Email [${type}] → ${to}`);
  } catch (err) { console.warn(`⚠️ Email no enviado a ${to}:`, err.message); }
};

const getGerenciaEmails = async () => {
  const { data } = await supabase.from('profile').select('email, full_name')
    .in('role', ['admin', 'gerencia']).eq('is_active', true);
  return data || [];
};

const getProcessUsers = async (processId) => {
  if (!processId) return [];
  const { data } = await supabase.from('profile').select('email, full_name')
    .eq('process_id', processId).eq('is_active', true);
  return data || [];
};

// ── Hook principal ────────────────────────────────────────────────────────────
export function useAccionesMejora() {
  const { user, profile } = useAuth();
  const [acciones, setAcciones] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);

  const fetchAcciones = async () => {
    try {
      setLoading(true); setError(null);
      const { data, error: e } = await supabase
        .from('improvement_action').select('*')
        .neq('status', 'archived').is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (e) throw e;
      if (!data?.length) { setAcciones([]); return; }

      const ids = [...new Set([
        ...data.map(a => a.responsible_id),
        ...data.map(a => a.auditor_id),
        ...data.map(a => a.created_by),
        ...data.map(a => a.closed_by),
      ].filter(Boolean))];

      const { data: profiles } = await supabase
        .from('profile').select('id, full_name, email').in('id', ids);
      const pm = {};
      (profiles || []).forEach(p => { pm[p.id] = p; });

      setAcciones(data.map(a => ({
        ...a,
        responsible:       pm[a.responsible_id] || null,
        responsible_name:  pm[a.responsible_id]?.full_name || '—',
        responsible_email: pm[a.responsible_id]?.email     || null,
        auditor:           pm[a.auditor_id]     || null,
        creator:           pm[a.created_by]     || null,
      })));
    } catch (err) {
      console.error('❌ fetchAcciones:', err);
      setError(err.message);
    } finally { setLoading(false); }
  };

  // ── MOMENTO 1: Crear — CUALQUIER usuario autenticado ─────────────────────
  // Email → todos los usuarios del proceso + gerencia
  const createAccion = async (formData) => {
    try {
      const { data, error: e } = await supabase
        .from('improvement_action')
        .insert([{ ...formData, created_by: user.id, status: 'open' }])
        .select().single();
      if (e) throw e;

      const emailData = {
        consecutive:     data.consecutive || '—',
        finding:         formData.finding_description || '—',
        created_by_name: profile?.full_name || '—',
      };

      // Email a todos los del proceso
      const processUsers = await getProcessUsers(formData.process_id);
      for (const u of processUsers) {
        await sendEmail(u.email, 'accion_mejora_identificacion', emailData);
      }
      // Email a gerencia si no está ya en el proceso
      const gerencia = await getGerenciaEmails();
      const processEmails = new Set(processUsers.map(u => u.email));
      for (const g of gerencia) {
        if (!processEmails.has(g.email)) {
          await sendEmail(g.email, 'accion_mejora_identificacion', emailData);
        }
      }

      await fetchAcciones();
      return { success: true, data };
    } catch (err) {
      console.error('❌ createAccion:', err);
      return { success: false, error: err.message };
    }
  };

  // ── MOMENTO 2: Análisis + Plan — usuarios del proceso / admin / gerencia ──
  // Status: open → in_progress
  // Email → responsable asignado
  const completarMomento2 = async (id, formData) => {
    try {
      const { error: e } = await supabase
        .from('improvement_action')
        .update({ ...formData, status: 'in_progress' })
        .eq('id', id);
      if (e) throw e;

      // Email al responsable
      if (formData.responsible_id) {
        const { data: resp } = await supabase.from('profile')
          .select('email, full_name').eq('id', formData.responsible_id).single();
        if (resp?.email) {
          const accion = acciones.find(a => a.id === id);
          await sendEmail(resp.email, 'accion_mejora_plan', {
            consecutive:        accion?.consecutive || '—',
            finding:            accion?.finding_description || '—',
            responsible_name:   resp.full_name,
            action_description: formData.action_description || '—',
            proposed_date:      formData.proposed_date
              ? new Date(formData.proposed_date + 'T00:00:00')
                  .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
              : 'Sin fecha',
          });
        }
      }

      await fetchAcciones();
      return { success: true };
    } catch (err) {
      console.error('❌ completarMomento2:', err);
      return { success: false, error: err.message };
    }
  };

  // ── MOMENTO 3: Verificación — solo auditor / admin / gerencia ────────────
  // Guarda campos de verificación. El cierre (SI/NO) sigue siendo closeAccion.
  const completarMomento3 = async (id, formData) => {
    try {
      const { error: e } = await supabase
        .from('improvement_action')
        .update({ ...formData, auditor_id: user.id })
        .eq('id', id);
      if (e) throw e;
      await fetchAcciones();
      return { success: true };
    } catch (err) {
      console.error('❌ completarMomento3:', err);
      return { success: false, error: err.message };
    }
  };

  // ── Actualizar (admin: edita todo) ────────────────────────────────────────
  const updateAccion = async (id, formData) => {
    try {
      const { error: e } = await supabase
        .from('improvement_action').update(formData).eq('id', id);
      if (e) throw e;
      await fetchAcciones();
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  // ── Eliminar (soft: deleted_at / hard por RLS) ────────────────────────────
  const deleteAccion = async (id) => {
    try {
      const { error: e } = await supabase
        .from('improvement_action').delete().eq('id', id);
      if (e) throw e;
      await fetchAcciones();
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  // ── Cierre final (SI/NO) ─────────────────────────────────────────────────
  const closeAccion = async (accionId, { closure_type, closure_reason }) => {
    try {
      const accion = acciones.find(a => a.id === accionId);
      const update = closure_type === 'completed'
        ? { status:'archived', is_closed:true, closure_type, closure_reason,
            closure_approved:'SI', closed_at: new Date().toISOString(),
            closed_by: user?.id, auditor_id: user?.id }
        : { closure_type, closure_reason, closure_approved:'NO' };

      const { error: e } = await supabase
        .from('improvement_action').update(update).eq('id', accionId);
      if (e) throw e;

      const emailType = closure_type === 'completed'
        ? 'accion_mejora_cierre_definitivo'
        : 'accion_mejora_seguimiento_pendiente';
      const emailData = {
        consecutive:      accion?.consecutive         || '—',
        finding:          accion?.finding_description || '—',
        responsible_name: accion?.responsible_name    || '—',
        closure_reason,
        reviewed_by:      profile?.full_name          || '—',
        closure_type:     closure_type === 'completed' ? 'Cierre ✅' : 'En espera 🕐',
        proposed_date:    accion?.proposed_date
          ? new Date(accion.proposed_date + 'T00:00:00')
              .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
          : 'Sin fecha',
      };

      if (accion?.responsible_email)
        await sendEmail(accion.responsible_email, emailType, emailData);
      const gerencia = await getGerenciaEmails();
      for (const g of gerencia)
        if (g.email !== accion?.responsible_email)
          await sendEmail(g.email, emailType, emailData);

      await fetchAcciones();
      return { success: true };
    } catch (err) { console.error('❌ closeAccion:', err); throw err; }
  };

  useEffect(() => { fetchAcciones(); }, []);

  return {
    acciones, loading, error,
    fetchAcciones, createAccion,
    completarMomento2, completarMomento3,
    updateAccion, deleteAccion, closeAccion,
  };
}

// ── Hook perfiles ─────────────────────────────────────────────────────────────
export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading,  setLoading]  = useState(false);
  useEffect(() => {
    setLoading(true);
    supabase.from('profile').select('id, full_name, email')
      .eq('is_active', true).order('full_name')
      .then(({ data }) => { setProfiles(data || []); setLoading(false); });
  }, []);
  return { profiles, loading };
}