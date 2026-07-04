// src/hooks/useActas.js
// ✅ v2.1 — CORREGIDO: No envía deletedPhotoPaths ni photos en INSERT

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const PHOTOS_BUCKET = 'documents';
const PHOTOS_FOLDER = 'actas';

export function useActas() {
  const { user } = useAuth();
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // FETCH ACTAS
  // ============================================================================
  const fetchActas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('acta')
        .select(`
          *,
          attendees_count:acta_attendee(count),
          commitments_count:acta_commitment(count)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const actasTransformed = data.map(acta => ({
        ...acta,
        attendees_count: acta.attendees_count?.[0]?.count || 0,
        commitments_count: acta.commitments_count?.[0]?.count || 0
      }));

      setActas(actasTransformed);
      return actasTransformed;
    } catch (err) {
      console.error('Error fetching actas:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FETCH ACTA BY ID
  // ============================================================================
  const fetchActaById = async (id) => {
    try {
      console.log('📋 Cargando acta completa:', id);

      const { data: acta, error: actaError } = await supabase
        .from('acta')
        .select('*')
        .eq('id', id)
        .single();

      if (actaError) throw actaError;

      const { data: attendees, error: attendeesError } = await supabase
        .from('acta_attendee')
        .select('*')
        .eq('acta_id', id)
        .order('order_index');

      if (attendeesError) throw attendeesError;

      const { data: commitments, error: commitmentsError } = await supabase
        .from('acta_commitment')
        .select('*')
        .eq('acta_id', id)
        .order('order_index');

      if (commitmentsError) throw commitmentsError;

      const photosWithUrls = await loadPhotoUrls(acta.photos || []);

      const actaCompleta = {
        ...acta,
        attendees: attendees || [],
        commitments: commitments || [],
        photos: photosWithUrls
      };

      console.log('✅ Acta completa cargada:', actaCompleta.consecutive);
      return actaCompleta;
    } catch (err) {
      console.error('Error fetching acta by id:', err);
      throw err;
    }
  };

  // ============================================================================
  // CARGAR URLs FIRMADAS PARA FOTOS
  // ============================================================================
  const loadPhotoUrls = async (photos) => {
    if (!photos || photos.length === 0) return [];

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        try {
          const { data, error } = await supabase.storage
            .from(PHOTOS_BUCKET)
            .createSignedUrl(photo.path, 3600);

          if (error) {
            console.warn('⚠️ No se pudo obtener URL para:', photo.path);
            return { ...photo, url: null };
          }

          return { ...photo, url: data.signedUrl };
        } catch {
          return { ...photo, url: null };
        }
      })
    );

    return photosWithUrls;
  };

  // ============================================================================
  // SUBIR FOTOS A STORAGE
  // ============================================================================
  const uploadPhotos = async (actaId, photoFiles) => {
    if (!photoFiles || photoFiles.length === 0) return [];

    const uploadedPhotos = [];

    for (const file of photoFiles) {
      try {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop().toLowerCase();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${PHOTOS_FOLDER}/${actaId}/${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('❌ Error subiendo foto:', file.name, uploadError);
          continue;
        }

        uploadedPhotos.push({
          path,
          name: file.name,
          size: file.size,
          type: file.type
        });

        console.log('✅ Foto subida:', path);
      } catch (err) {
        console.error('❌ Error procesando foto:', file.name, err);
      }
    }

    return uploadedPhotos;
  };

  // ============================================================================
  // ELIMINAR FOTO DE STORAGE
  // ============================================================================
  const deletePhoto = async (photoPath) => {
    try {
      const { error } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .remove([photoPath]);

      if (error) throw error;
      console.log('✅ Foto eliminada:', photoPath);
      return true;
    } catch (err) {
      console.error('❌ Error eliminando foto:', photoPath, err);
      return false;
    }
  };

  // ============================================================================
  // 📧 NOTIFICACIONES EMAIL — COMPROMISOS DE ACTA
  // ============================================================================

  // Envía el correo a UN responsable de UN compromiso.
  // Silencioso: un fallo aquí nunca debe romper el guardado del acta.
  const notifyCommitmentEmail = async ({ consecutive, meeting_date, objective, created_by_name, commitment }) => {
    try {
      const { data: responsibleProfile, error: profileError } = await supabase
        .from('profile')
        .select('email, full_name')
        .eq('id', commitment.responsible_id)
        .single();

      if (profileError || !responsibleProfile?.email) {
        console.warn('⚠️ No se pudo obtener email del responsable:', commitment.responsible_id);
        return;
      }

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'acta_compromiso_asignacion',
          to: responsibleProfile.email,
          data: {
            consecutive,
            meeting_date: meeting_date
              ? new Date(meeting_date + 'T00:00:00').toLocaleDateString('es-CO')
              : '',
            objective: objective || '',
            created_by_name: created_by_name || '',
            responsible_name: responsibleProfile.full_name || responsibleProfile.email,
            activity: commitment.activity,
            due_date: commitment.due_date
              ? new Date(commitment.due_date + 'T00:00:00').toLocaleDateString('es-CO')
              : commitment.due_date,
          }
        }
      });

      console.log('📧 Email de compromiso enviado a:', responsibleProfile.email);
    } catch (err) {
      console.error('❌ Error enviando email de compromiso (no bloquea el guardado):', err);
    }
  };

  // Notifica una lista de compromisos NUEVOS de una misma acta (un correo por compromiso)
  const notifyNewCommitments = async (acta, commitmentsToNotify) => {
    if (!commitmentsToNotify || commitmentsToNotify.length === 0) return;

    let createdByName = '';
    try {
      const { data: creatorProfile } = await supabase
        .from('profile')
        .select('full_name')
        .eq('id', acta.created_by)
        .single();
      createdByName = creatorProfile?.full_name || '';
    } catch {
      // No bloquea el envío si falla obtener el nombre del creador
    }

    for (const commitment of commitmentsToNotify) {
      await notifyCommitmentEmail({
        consecutive: acta.consecutive,
        meeting_date: acta.meeting_date,
        objective: acta.objective,
        created_by_name: createdByName,
        commitment,
      });
    }
  };

  // ============================================================================
  // 📧 BACKFILL — Notificar compromisos PENDIENTES de actas ya existentes
  // Uso: una sola vez, desde un botón de administración.
  // ============================================================================
  const notifyPendingCommitmentsBackfill = async () => {
    console.log('📧 Iniciando backfill de notificaciones de compromisos pendientes...');

    const { data: pendingCommitments, error: fetchError } = await supabase
      .from('acta_commitment')
      .select('activity, responsible_id, due_date, acta(consecutive, meeting_date, objective, created_by, status)')
      .eq('status', 'pending');

    if (fetchError) {
      console.error('❌ Error obteniendo compromisos pendientes:', fetchError);
      throw fetchError;
    }

    const total = pendingCommitments?.length || 0;
    if (total === 0) {
      return { sent: 0, failed: 0, total: 0 };
    }

    const creatorNameCache = {};
    let sent = 0;
    let failed = 0;

    for (const c of pendingCommitments) {
      if (!c.acta) continue; // acta borrada o inaccesible

      try {
        if (!creatorNameCache[c.acta.created_by]) {
          const { data: creatorProfile } = await supabase
            .from('profile')
            .select('full_name')
            .eq('id', c.acta.created_by)
            .single();
          creatorNameCache[c.acta.created_by] = creatorProfile?.full_name || '';
        }

        await notifyCommitmentEmail({
          consecutive: c.acta.consecutive,
          meeting_date: c.acta.meeting_date,
          objective: c.acta.objective,
          created_by_name: creatorNameCache[c.acta.created_by],
          commitment: c,
        });
        sent++;
      } catch (err) {
        console.error('❌ Falló notificación backfill para compromiso:', c, err);
        failed++;
      }
    }

    console.log(`✅ Backfill terminado: ${sent} enviados, ${failed} fallidos, ${total} total`);
    return { sent, failed, total };
  };

  // ============================================================================
  // CREATE ACTA ✅ CORREGIDO
  // ============================================================================
  const createActa = async (actaData) => {
    try {
      console.log('📝 Creando nueva acta...');

      // ✅ EXTRAER TODO lo que NO va en el INSERT inicial
      const { 
        attendees, 
        commitments, 
        consecutive,      // ← Se genera automático
        newPhotoFiles,    // ← No es columna BD
        deletedPhotoPaths, // ← No es columna BD
        photos,           // ← Se maneja después
        ...actaFields     // ← SOLO campos de la tabla
      } = {
        ...actaData,
        created_by: user.id,
        approved_by: actaData.approved_by || null,
      };

      // 1️⃣ Crear acta sin fotos primero
      const { data: newActa, error: actaError } = await supabase
        .from('acta')
        .insert([{ ...actaFields, photos: [] }])
        .select()
        .single();

      if (actaError) throw actaError;
      console.log('✅ Acta creada:', newActa.consecutive);

      // 2️⃣ Subir fotos si hay
      let photosData = [];
      if (newPhotoFiles && newPhotoFiles.length > 0) {
        photosData = await uploadPhotos(newActa.id, newPhotoFiles);
        if (photosData.length > 0) {
          await supabase
            .from('acta')
            .update({ photos: photosData })
            .eq('id', newActa.id);
        }
      }

      // 3️⃣ Insertar asistentes
      if (attendees && attendees.length > 0) {
        const { error: attendeesError } = await supabase
          .from('acta_attendee')
          .insert(attendees.map(a => ({ ...a, acta_id: newActa.id })));

        if (attendeesError) throw attendeesError;
        console.log(`✅ ${attendees.length} asistentes agregados`);
      }

      // 4️⃣ Insertar compromisos
      if (commitments && commitments.length > 0) {
        const { error: commitmentsError } = await supabase
          .from('acta_commitment')
          .insert(commitments.map(c => ({ ...c, acta_id: newActa.id })));

        if (commitmentsError) throw commitmentsError;
        console.log(`✅ ${commitments.length} compromisos agregados`);

        // 📧 Notificar a los responsables (todos son nuevos en una acta recién creada)
        await notifyNewCommitments(newActa, commitments);
      }

      await fetchActas();
      return { ...newActa, photos: photosData };
    } catch (err) {
      console.error('❌ Error creando acta:', err);
      throw err;
    }
  };

  // ============================================================================
  // UPDATE ACTA
  // ============================================================================
  const updateActa = async (id, actaData) => {
    try {
      console.log('📝 Actualizando acta:', id);

      const {
        attendees,
        commitments,
        newPhotoFiles,
        deletedPhotoPaths,
        photos,
        ...actaFields
      } = actaData;

      if (actaFields.approved_by !== undefined) {
        actaFields.approved_by = actaFields.approved_by || null;
      }

      // 1️⃣ Subir fotos nuevas
      let updatedPhotos = photos || [];
      if (newPhotoFiles && newPhotoFiles.length > 0) {
        const uploaded = await uploadPhotos(id, newPhotoFiles);
        updatedPhotos = [...updatedPhotos, ...uploaded];
      }

      // 2️⃣ Eliminar fotos removidas
      if (deletedPhotoPaths && deletedPhotoPaths.length > 0) {
        for (const path of deletedPhotoPaths) {
          await deletePhoto(path);
        }
      }

      // 3️⃣ Actualizar acta principal
      const { error: actaError } = await supabase
        .from('acta')
        .update({ ...actaFields, photos: updatedPhotos })
        .eq('id', id);

      if (actaError) throw actaError;

      // 4️⃣ Actualizar asistentes
      if (attendees !== undefined) {
        await supabase.from('acta_attendee').delete().eq('acta_id', id);
        if (attendees.length > 0) {
          const { error } = await supabase
            .from('acta_attendee')
            .insert(attendees.map(a => ({ ...a, acta_id: id })));
          if (error) throw error;
        }
      }

      // 5️⃣ Actualizar compromisos
      if (commitments !== undefined) {
        // Obtener compromisos actuales ANTES de borrarlos, para saber cuáles son nuevos
        const { data: oldCommitments } = await supabase
          .from('acta_commitment')
          .select('activity, responsible_id, due_date')
          .eq('acta_id', id);

        const isSameCommitment = (a, b) =>
          a.activity === b.activity &&
          a.responsible_id === b.responsible_id &&
          a.due_date === b.due_date;

        const newlyAddedCommitments = commitments.filter(
          c => !(oldCommitments || []).some(old => isSameCommitment(old, c))
        );

        await supabase.from('acta_commitment').delete().eq('acta_id', id);
        if (commitments.length > 0) {
          const { error } = await supabase
            .from('acta_commitment')
            .insert(commitments.map(c => ({ ...c, acta_id: id })));
          if (error) throw error;
        }

        // 📧 Notificar solo a los responsables de compromisos REALMENTE nuevos
        if (newlyAddedCommitments.length > 0) {
          const { data: actaInfo } = await supabase
            .from('acta')
            .select('consecutive, meeting_date, objective, created_by')
            .eq('id', id)
            .single();

          if (actaInfo) {
            await notifyNewCommitments(actaInfo, newlyAddedCommitments);
          }
        }
      }

      console.log('✅ Acta actualizada');
      await fetchActas();
    } catch (err) {
      console.error('❌ Error actualizando acta:', err);
      throw err;
    }
  };

  // ============================================================================
  // DELETE ACTA
  // ============================================================================
  const deleteActa = async (id) => {
    try {
      console.log('🗑️ Archivando acta:', id);

      const { error } = await supabase
        .from('acta')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Acta archivada');
      await fetchActas();
    } catch (err) {
      console.error('❌ Error archivando acta:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchActas();
  }, []);

  return {
    actas,
    loading,
    error,
    fetchActas,
    fetchActaById,
    createActa,
    updateActa,
    deleteActa,
    uploadPhotos,
    deletePhoto,
    loadPhotoUrls,
    notifyPendingCommitmentsBackfill,
  };
}