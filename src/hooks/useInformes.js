// src/hooks/useInformes.js
import { useState, useCallback } from 'react';
import { supabase }              from '@/lib/supabase';

export function useInformes() {
  const [informes, setInformes] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // ── fetch ─────────────────────────────────────────────────────────
  const fetchInformes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase
        .from('management_report')
        .select(`
          *,
          process:process(id, name),
          creator:profile!management_report_created_by_fkey(id, full_name),
          reviewer:profile!management_report_reviewed_by_fkey(id, full_name),
          responsible:profile!management_report_responsible_id_fkey(id, full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setInformes(data ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  // ── crear borrador ────────────────────────────────────────────────
  const createDraft = async ({ title, process_id, period, responsible_id }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase
        .from('management_report')
        .insert({
          title,
          process_id,
          period,
          responsible_id: responsible_id || null,
          status:     'draft',
          created_by: user.id,
        })
        .select()
        .single();
      if (err) throw err;
      return { success: true, data };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── actualizar borrador ───────────────────────────────────────────
  const updateDraft = async (id, { title, process_id, period, responsible_id }) => {
    try {
      // UPDATE sin .select() para evitar el chequeo post-UPDATE de RLS
      const { error: err } = await supabase
        .from('management_report')
        .update({ title, process_id, period, responsible_id: responsible_id || null })
        .eq('id', id);
      if (err) throw err;
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── indicadores vinculados ────────────────────────────────────────
  const saveIndicators = async (reportId, indicatorIds) => {
    try {
      await supabase.from('management_report_indicator').delete().eq('report_id', reportId);
      if (indicatorIds.length > 0) {
        const { error: err } = await supabase
          .from('management_report_indicator')
          .insert(indicatorIds.map(iid => ({ report_id: reportId, indicator_id: iid })));
        if (err) throw err;
      }
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const loadReportIndicators = async (reportId) => {
    try {
      const { data, error: err } = await supabase
        .from('management_report_indicator')
        .select('indicator_id, indicator:indicator(id, indicator_name, objective, consecutive)')
        .eq('report_id', reportId);
      if (err) throw err;
      return { success: true, data: data ?? [] };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── secciones de contenido ────────────────────────────────────────
  const saveSection = async (reportId, section) => {
    try {
      const { error: err } = await supabase
        .from('management_report_section')
        .upsert(
          {
            report_id:    reportId,
            item_key:     section.item_key,
            item_name:    section.item_name,
            item_order:   section.item_order,
            logros:       section.logros       || null,
            por_mejorar:  section.por_mejorar  || null,
            hallazgos:    section.hallazgos    || null,
            por_resaltar: section.por_resaltar || null,
          },
          { onConflict: 'report_id,item_key' }
        );
      if (err) throw err;
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const loadSections = async (reportId) => {
    try {
      const { data, error: err } = await supabase
        .from('management_report_section')
        .select('*')
        .eq('report_id', reportId)
        .order('item_order');
      if (err) throw err;
      return { success: true, data: data ?? [] };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── datos completos para preview en InformesManager ───────────────
  const loadFullReportData = useCallback(async (report) => {
    try {
      const [sectionsRes, indLinksRes, allIndsRes, procsRes, usersRes] = await Promise.all([
        supabase.from('management_report_section').select('*').eq('report_id', report.id).order('item_order'),
        supabase.from('management_report_indicator').select('indicator_id').eq('report_id', report.id),
        supabase.from('indicator').select('id, indicator_name, objective, consecutive').eq('process_id', report.process_id),
        supabase.from('process').select('id, name').eq('is_active', true),
        supabase.from('profile').select('id, full_name').eq('is_active', true),
      ]);
      const sectionsMap = {};
      (sectionsRes.data ?? []).forEach(s => { sectionsMap[s.item_key] = s; });
      return {
        sections:           sectionsMap,
        selectedIndicators: (indLinksRes.data ?? []).map(d => d.indicator_id),
        indicators:         allIndsRes.data ?? [],
        processes:          procsRes.data   ?? [],
        users:              usersRes.data   ?? [],
      };
    } catch (e) {
      console.warn('[useInformes] loadFullReportData:', e.message);
      return { sections: {}, selectedIndicators: [], indicators: [], processes: [], users: [] };
    }
  }, []);

  // ── enviar informe (Paso 5) ───────────────────────────────────────
  // FIX: UPDATE separado del SELECT — PostgREST verifica el resultado
  // con la SELECT policy, que exige deleted_at IS NULL. Si encadenamos
  // .select() al UPDATE de status, puede fallar en ciertos estados.
  const submitInforme = async (id, pdfBlob) => {
    try {
      let pdfUrl = null;
      if (pdfBlob) {
        const path = `informes/${id}/informe_${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from('reports')
          .upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
        if (upErr) throw upErr;
        pdfUrl = path;
      }

      // 1. UPDATE sin .select() encadenado
      const { error: updErr } = await supabase
        .from('management_report')
        .update({ status: 'submitted', pdf_url: pdfUrl })
        .eq('id', id);
      if (updErr) throw updErr;

      // 2. SELECT por separado para obtener datos del email
      const { data, error: selErr } = await supabase
        .from('management_report')
        .select(`
          id, consecutive, title, period,
          process:process(name),
          creator:profile!management_report_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();
      if (selErr) throw selErr;

      // 3. Email silencioso
      _notifyManagers(data).catch(e => console.warn('[informes] email managers:', e.message));

      await fetchInformes();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── revisión por gerencia ─────────────────────────────────────────
  // FIX: mismo patrón — UPDATE + SELECT separados
  const reviewInforme = async (id, { approved, notes }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. UPDATE sin .select() encadenado
      const { error: updErr } = await supabase
        .from('management_report')
        .update({
          status:       approved ? 'reviewed' : 'revision_requested',
          review_notes: notes    || null,
          reviewed_by:  user.id,
          reviewed_at:  new Date().toISOString(),
        })
        .eq('id', id);
      if (updErr) throw updErr;

      // 2. SELECT por separado
      const { data, error: selErr } = await supabase
        .from('management_report')
        .select(`
          id, consecutive, title, period, reviewed_by,
          process:process(name),
          creator:profile!management_report_created_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();
      if (selErr) throw selErr;

      // 3. Email silencioso
      _notifyCreator(data, approved, notes).catch(e => console.warn('[informes] email creator:', e.message));

      await fetchInformes();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── ELIMINAR — hard DELETE (CASCADE borra secciones e indicadores) ─
  // FIX DEFINITIVO: el soft-delete con UPDATE fallaba porque PostgREST
  // verifica la fila post-UPDATE con la SELECT policy (deleted_at IS NULL).
  // La fila recién actualizada ya no pasa ese filtro → 403.
  // Con hard DELETE + CASCADE no hay verificación posterior → funciona.
  const deleteInforme = async (id) => {
    try {
      const target = informes.find(r => r.id === id);

      // Eliminar PDF del Storage (silencioso si falla)
      if (target?.pdf_url) {
        supabase.storage.from('reports').remove([target.pdf_url]).catch(() => {});
      }

      // Hard DELETE — CASCADE elimina management_report_indicator
      // y management_report_section automáticamente
      const { error: err } = await supabase
        .from('management_report')
        .delete()
        .eq('id', id);

      if (err) throw err;

      // Actualizar estado local sin refetch para evitar parpadeo
      setInformes(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ── URL firmada para el PDF ───────────────────────────────────────
  const getSignedUrl = async (filePath) => {
    const { data, error: err } = await supabase.storage
      .from('reports')
      .createSignedUrl(filePath, 3600);
    if (err) throw err;
    return data.signedUrl;
  };

  // ── Emails silenciosos ────────────────────────────────────────────
  // Usa RPC con SECURITY DEFINER para saltear RLS del profile
  const _getManagerEmails = async () => {
    const { data, error } = await supabase.rpc('get_manager_emails');
    if (error) throw error;
    return (data ?? []).map(m => m.user_email).filter(Boolean);
  };

  const _notifyManagers = async (report) => {
    const recipients = await _getManagerEmails();
    if (!recipients.length) return;
    await supabase.functions.invoke('send-email', {
      body: {
        type: 'informe_enviado',
        to:   recipients,
        data: {
          consecutive:  report.consecutive,
          title:        report.title,
          process_name: report.process?.name ?? '',
          period:       report.period,
          created_by:   report.creator?.full_name ?? 'Usuario',
        },
      },
    });
  };

  const _notifyCreator = async (report, approved, notes) => {
    const creatorEmail = report.creator?.email;
    if (!creatorEmail) return;
    const { data: reviewer } = await supabase
      .from('profile')
      .select('full_name')
      .eq('id', report.reviewed_by)
      .single();
    await supabase.functions.invoke('send-email', {
      body: {
        type: approved ? 'informe_revisado_ok' : 'informe_revision_solicitada',
        to:   [creatorEmail],
        data: {
          consecutive:   report.consecutive,
          title:         report.title,
          process_name:  report.process?.name ?? '',
          period:        report.period,
          reviewer_name: reviewer?.full_name ?? 'Gerencia',
          review_notes:  notes ?? '',
        },
      },
    });
  };

  return {
    informes, loading, error,
    fetchInformes,
    createDraft,
    updateDraft,
    saveIndicators,
    loadReportIndicators,
    saveSection,
    loadSections,
    loadFullReportData,
    submitInforme,
    reviewInforme,
    deleteInforme,
    getSignedUrl,
  };
}