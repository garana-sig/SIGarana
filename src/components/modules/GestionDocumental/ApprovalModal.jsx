import React, { useState, useEffect } from 'react'; // ⬅️ Agregado useEffect
import { X, CheckCircle, XCircle, Download, FileText, Calendar, User } from 'lucide-react';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { supabase } from '../../../lib/supabase';

/**
 * Modal para que gerencia apruebe o rechace documentos pendientes
 * Se abre desde ListadoMaestro al hacer click en badge "PENDIENTE"
 */
const ApprovalModal = ({ document, isOpen, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [showReasonField, setShowReasonField] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { approveDocument, rejectDocument, loading, error } = useDocumentActions();

  // ⬅️ NUEVO: Resetear campos cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      // Limpiar todos los estados cuando el modal se cierra
      setReason('');
      setShowReasonField(false);
      setDownloading(false);
    }
  }, [isOpen]);

  // No renderizar si no está abierto
  if (!isOpen || !document) return null;

  // Función para descargar el archivo
  const handleDownload = async () => {
    try {
      setDownloading(true);
      console.log('📥 Descargando archivo:', document.file_path);

      // Obtener URL firmada del archivo
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      // Crear URL temporal para descargar
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_path.split('/').pop(); // Nombre del archivo
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Archivo descargado');
    } catch (error) {
      console.error('❌ Error descargando archivo:', error);
      alert('Error al descargar el archivo: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  // Manejar aprobación
  const handleApprove = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de APROBAR el documento "${document.name}"?\n\n` +
      `El documento pasará a estado PUBLICADO y será visible para todos.`
    );

    if (!confirmed) return;

    const result = await approveDocument(document.id);

    if (result.success) {
      alert('✅ Documento aprobado exitosamente');
      onSuccess(); // Refrescar listado
      onClose();   // Cerrar modal
    } else {
      alert('❌ Error al aprobar documento: ' + result.error);
    }
  };

  // Manejar rechazo
  const handleReject = async () => {
    if (!showReasonField) {
      setShowReasonField(true);
      return;
    }

    // Validar que haya motivo
    if (!reason || reason.trim() === '') {
      alert('⚠️ Debes escribir un motivo para rechazar el documento');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de RECHAZAR el documento "${document.name}"?\n\n` +
      `⚠️ IMPORTANTE: El documento será ELIMINADO de la base de datos.\n\n` +
      `Motivo: ${reason}`
    );

    if (!confirmed) return;

    const result = await rejectDocument(document.id, reason);

    if (result.success) {
      alert('✅ Documento rechazado y eliminado. El creador ha sido notificado.');
      onSuccess(); // Refrescar listado
      onClose();   // Cerrar modal
    } else {
      alert('❌ Error al rechazar documento: ' + result.error);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: '#dedecc' }}
        >
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#2e5244' }}>
              Revisar Documento Pendiente
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Aprueba o rechaza este documento
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información del Documento */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-0.5" style={{ color: '#6dbd96' }} />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Código</p>
                <p className="font-mono font-bold text-lg" style={{ color: '#2e5244' }}>
                  {document.code}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Nombre del Documento</p>
              <p className="font-medium text-base" style={{ color: '#2e5244' }}>
                {document.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Creado por</p>
                  <p className="text-sm font-medium">
                    {document.created_by_profile?.full_name || 'Desconocido'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Fecha de creación</p>
                  <p className="text-sm font-medium">
                    {formatDate(document.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Tipo de Documento</p>
              <p className="text-sm font-medium">
                {document.document_type?.name || '-'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Proceso</p>
              <p className="text-sm font-medium">
                {document.process?.name || '-'}
              </p>
            </div>

            {/* Objetivo y Alcance: retirados (oct 2026) */}
          </div>

          {/* Botón Descargar */}
          <button
            onClick={handleDownload}
            disabled={downloading || !document.file_path}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              borderColor: '#6f7b2c',
              color: '#6f7b2c'
            }}
          >
            <Download className="h-5 w-5" />
            {downloading ? 'Descargando...' : 'Descargar Archivo para Revisar'}
          </button>

          {/* Mensaje de Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">❌ {error}</p>
            </div>
          )}

          {/* Campo de Motivo (solo si está rechazando) */}
          {showReasonField && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Motivo del Rechazo <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica por qué rechazas este documento. El creador recibirá este mensaje."
                  className="mt-2 w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  rows="4"
                  disabled={loading}
                  autoFocus
                />
              </label>
              <p className="text-xs text-gray-600">
                ⚠️ Este mensaje será enviado al creador del documento.
              </p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex gap-3">
            {/* Botón APROBAR */}
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#6dbd96' }}
            >
              <CheckCircle className="h-5 w-5" />
              {loading ? 'Procesando...' : 'Aprobar Documento'}
            </button>

            {/* Botón RECHAZAR */}
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#d32f2f' }}
            >
              <XCircle className="h-5 w-5" />
              {showReasonField ? 'Confirmar Rechazo' : 'Rechazar Documento'}
            </button>
          </div>

          {/* Advertencia si está rechazando */}
          {showReasonField && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">
                ⚠️ El documento será eliminado permanentemente de la base de datos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;