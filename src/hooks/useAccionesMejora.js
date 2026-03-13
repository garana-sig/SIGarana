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

// Usuarios con permiso auditorias:acciones_mejora:audit
const getAuditoresAcciones = async () => {
  const { data: perms } = await supabase
    .from('user_permission')
    .select('user_id, permission:permission_id(code)')
    .eq('is_active', true);
  if (!perms?.length) return [];
  const auditorIds = perms
    .filter(p => p.permission?.code === 'auditorias:acciones_mejora:audit')
    .map(p => p.user_id);
  if (!auditorIds.length) return [];
  const { data } = await supabase.from('profile').select('email, full_name')
    .in('id', auditorIds).eq('is_active', true);
  return data || [];
};

// Une varios arrays de { email } eliminando duplicados
const mergeRecipients = (...arrays) => {
  const seen = new Set();
  return arrays.flat().filter(u => {
    if (!u?.email || seen.has(u.email)) return false;
    seen.add(u.email);
    return true;
  });
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
        consecutive:          data.consecutive || '—',
        finding:              formData.finding_description || '—',
        created_by_name:      profile?.full_name || '—',
        // Orígenes del hallazgo
        origin_audit:         !!formData.origin_audit,
        origin_satisfaction:  !!formData.origin_satisfaction,
        origin_qrs:           !!formData.origin_qrs,
        origin_autocontrol:   !!formData.origin_autocontrol,
        origin_risk_analysis: !!formData.origin_risk_analysis,
        origin_nonconforming: !!formData.origin_nonconforming,
      };

      // Email → proceso + admin/gerencia (sin duplicados)
      const [processUsers, gerencia] = await Promise.all([
        getProcessUsers(formData.process_id),
        getGerenciaEmails(),
      ]);
      for (const u of mergeRecipients(processUsers, gerencia))
        await sendEmail(u.email, 'accion_mejora_m1', emailData);

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

      // Email → proceso + admin/gerencia + auditores (sin duplicados)
      const accion2 = acciones.find(a => a.id === id);
      // Resolver nombre del responsable si se asignó en este momento
      let responsableName2 = accion2?.responsible_name || '—';
      if (formData.responsible_id && formData.responsible_id !== accion2?.responsible_id) {
        const { data: rp } = await supabase.from('profile')
          .select('full_name').eq('id', formData.responsible_id).single();
        if (rp?.full_name) responsableName2 = rp.full_name;
      }
      const emailData2 = {
        consecutive:        accion2?.consecutive || '—',
        responsible_name:   responsableName2,
        created_by_name:    profile?.full_name || '—',
        // Tipo de acción
        action_correction:  !!formData.action_correction,
        action_corrective:  !!formData.action_corrective,
        action_preventive:  !!formData.action_preventive,
        // Análisis
        causes:             formData.causes || '',
        action_description: formData.action_description || '',
        expected_results:   formData.expected_results || '',
        resources_budget:   formData.resources_budget || '',
        proposed_date:      formData.proposed_date
          ? new Date(formData.proposed_date + 'T00:00:00')
              .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
          : 'Sin fecha',
      };
      const [proc2, ger2, aud2] = await Promise.all([
        getProcessUsers(accion2?.process_id),
        getGerenciaEmails(),
        getAuditoresAcciones(),
      ]);
      for (const u of mergeRecipients(proc2, ger2, aud2))
        await sendEmail(u.email, 'accion_mejora_m2', emailData2);

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

      // Email → proceso + admin/gerencia + auditores (sin duplicados)
      const accion3 = acciones.find(a => a.id === id);
      const emailData3 = {
        consecutive:            accion3?.consecutive || '—',
        responsible_name:       accion3?.responsible_name || '—',
        auditor_name:           profile?.full_name || '—',
        verification_criteria:  formData.verification_criteria || '',
        verification_finding:   formData.verification_finding || '',
        verification_date:      formData.verification_date
          ? new Date(formData.verification_date + 'T00:00:00')
              .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
          : '—',
        efficacy_date:          formData.efficacy_date
          ? new Date(formData.efficacy_date + 'T00:00:00')
              .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
          : '',
      };
      const [proc3, ger3, aud3] = await Promise.all([
        getProcessUsers(accion3?.process_id),
        getGerenciaEmails(),
        getAuditoresAcciones(),
      ]);
      for (const u of mergeRecipients(proc3, ger3, aud3))
        await sendEmail(u.email, 'accion_mejora_m3_verificacion', emailData3);

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

      // Email → proceso + admin/gerencia (sin duplicados)
      const [procC, gerC] = await Promise.all([
        getProcessUsers(accion?.process_id),
        getGerenciaEmails(),
      ]);
      for (const u of mergeRecipients(procC, gerC))
        await sendEmail(u.email, emailType, emailData);

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