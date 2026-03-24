import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Hook para manejar acciones sobre documentos (aprobar/rechazar) + EMAILS
 * ✅ VERSIÓN FINAL - SIN HEADERS (como el test exitoso en consola)
 */
export const useDocumentActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==========================================
  // FUNCIONES DE EMAIL
  // ==========================================

  /**
   * ✅ Enviar email SIN headers de autenticación
   * (Igual que el test exitoso en consola)
   */
  const sendEmail = async (type, recipients, documentData, rejectionReason = null) => {
    try {
      console.log(`📧 Enviando email tipo "${type}" a:`, recipients);

      // ✅ SIN HEADERS - Exactamente como el test que funcionó
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type,
          to: recipients,
          document: documentData,
          rejection_reason: rejectionReason,
        },
      });

      if (error) {
        console.error('❌ Error al enviar email:', error);
        throw error;
      }

      console.log('✅ Email enviado correctamente:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error en sendEmail:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Obtener emails de todos los gerentes activos
   */
  const getManagerEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('email')
        .in('role', ['admin', 'gerencia'])
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error al obtener gerentes:', error);
        return [];
      }

      const emails = data.map(profile => profile.email).filter(Boolean);
      console.log('📧 Emails de gerentes encontrados:', emails);
      return emails;
    } catch (error) {
      console.error('❌ Error en getManagerEmails:', error);
      return [];
    }
  };

  /**
   * Notificar a gerentes cuando se crea o edita un documento
   */
  const notifyManagers = async (document, creatorName) => {
    try {
      const managerEmails = await getManagerEmails();

      if (managerEmails.length === 0) {
        console.warn('⚠️ No se encontraron gerentes para notificar');
        return { success: false, message: 'No hay gerentes para notificar' };
      }

      const documentData = {
        id: document.id,
        name: document.name,
        code: document.code,
        version: document.version,
        created_by_name: creatorName,
      };

      const result = await sendEmail('pending', managerEmails, documentData);

      if (result.success) {
        toast.success(
          `Notificación enviada a ${managerEmails.length} gerente(s)`,
          { duration: 3000 }
        );
      } else {
        toast.warning('Documento guardado, pero no se pudo enviar la notificación');
      }

      return result;
    } catch (error) {
      console.error('❌ Error en notifyManagers:', error);
      return { success: false, error: error.message };
    }
  };

  // ==========================================
  // FUNCIONES ORIGINALES
  // ==========================================

  /**
   * Aprobar un documento
   */
  const approveDocument = async (documentId) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🟢 Aprobando documento:', documentId);

      const { data: document, error: fetchError } = await supabase
        .from('document')
        .select('code, name, version, created_by, parent_document_id')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      console.log('📄 Documento encontrado:', document);

      if (document.parent_document_id) {
        console.log('📦 Archivando versión anterior:', document.parent_document_id);
        
        const { error: archiveError } = await supabase
          .from('document')
          .update({
            status: 'archived',
            updated_at: new Date().toISOString()
          })
          .eq('id', document.parent_document_id);

        if (archiveError) {
          console.error('⚠️ Error archivando versión anterior:', archiveError);
        } else {
          console.log('✅ Versión anterior archivada correctamente');
        }
      }

      const { error: updateError } = await supabase
        .from('document')
        .update({
          status: 'published',
          change_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      console.log('✅ Estado actualizado a published');

      const { data: notificationId, error: notificationError } = await supabase
        .rpc('create_approval_notification', {
          p_user_id: document.created_by,
          p_type: 'approved',
          p_title: '✅ Documento Aprobado',
          p_message: `Tu documento "${document.name}" (${document.code}) versión ${document.version} ha sido aprobado y está ahora publicado.`,
          p_document_id: documentId
        });

      if (notificationError) {
        console.warn('⚠️ Error creando notificación:', notificationError);
      } else {
        console.log('🔔 Notificación creada con ID:', notificationId);
      }

      // Enviar email al creador
      const { data: creatorProfile } = await supabase
        .from('profile')
        .select('full_name, email')
        .eq('id', document.created_by)
        .single();

      if (creatorProfile?.email) {
        const documentData = {
          id: documentId,
          name: document.name,
          code: document.code,
          version: document.version,
          created_by_name: creatorProfile.full_name || 'Usuario',
        };

        await sendEmail('approved', creatorProfile.email, documentData);
      }

      return { success: true, data: document };

    } catch (err) {
      console.error('❌ Error aprobando documento:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Rechazar un documento
   */
  const rejectDocument = async (documentId, reason = '') => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔴 Rechazando documento:', documentId);
      console.log('📝 Motivo:', reason);

      if (!reason || reason.trim() === '') {
        throw new Error('El motivo del rechazo es obligatorio');
      }

      const { data: document, error: fetchError } = await supabase
        .from('document')
        .select('code, name, version, created_by, file_path, parent_document_id')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      console.log('📄 Documento encontrado:', document);

      // ── Notificación al creador ─────────────────────────────────────────
      const { error: notificationError } = await supabase
        .rpc('create_approval_notification', {
          p_user_id: document.created_by,
          p_type: 'rejected',
          p_title: '❌ Documento Rechazado',
          p_message: `Tu documento "${document.name}" (${document.code}) versión ${document.version} ha sido rechazado y eliminado.\n\nMotivo: ${reason}`,
          p_document_id: documentId
        });

      if (notificationError) {
        console.warn('⚠️ Error creando notificación:', notificationError);
      }

      // ── 1. Eliminar archivo de Storage ──────────────────────────────────
      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path]);

        if (storageError) {
          console.warn('⚠️ Error eliminando archivo de Storage:', storageError.message);
        } else {
          console.log('🗑️ Archivo eliminado de Storage:', document.file_path);
        }
      }

      // ── 2. Hard delete de BD (siempre, nuevo o edición) ────────────────
      const { error: deleteError } = await supabase
        .from('document')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      console.log('🗑️ Documento eliminado de BD');

      // Enviar email al creador
      const { data: creatorProfile } = await supabase
        .from('profile')
        .select('full_name, email')
        .eq('id', document.created_by)
        .single();

      if (creatorProfile?.email) {
        const documentData = {
          id: documentId,
          name: document.name,
          code: document.code,
          version: document.version,
          created_by_name: creatorProfile.full_name || 'Usuario',
        };

        await sendEmail('rejected', creatorProfile.email, documentData, reason);
      }

      return { success: true, data: document };

    } catch (err) {
      console.error('❌ Error rechazando documento:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    approveDocument,
    rejectDocument,
    notifyManagers,
    sendEmail,
    getManagerEmails,
    loading,
    error
  };
};