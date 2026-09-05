import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useDocumentActions } from '../../../hooks/useDocumentActions';

/**
 * Modal unificado para editar documentos
 * 
 * CASOS DE USO:
 * 1. Solo editar metadatos (nombre, objetivo, alcance) → UPDATE directo
 * 2. Solo cambiar archivo → Requiere motivo + aprobación
 * 3. Editar metadatos + archivo → Requiere motivo + aprobación
 */
const EditDocumentModal = ({ document, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { notifyManagers } = useDocumentActions(); // 🆕 AGREGAR ESTA LÍNEA
  
  
  // Estados del formulario (valores por defecto para evitar warnings)
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    scope: '',
    responsible: '', // ⬅️ NUEVO: Campo responsable (texto libre)
    storage_location: '',
    retention_central: '',
    file_type_magnetic: false,
    file_type_physical: false,
    retention_management: false,
    disposition_total_conservation: false,
    disposition_selection: false,
    disposition_elimination: false
  });

  // Estados para archivo
  const [newFile, setNewFile] = useState(null);
  const [changeReason, setChangeReason] = useState('');
  const [showReasonField, setShowReasonField] = useState(false);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && document) {
      console.log('📝 Inicializando formulario con documento:', document.code);
      setFormData({
        name: document.name || '',
        objective: document.objective || '',
        scope: document.scope || '',
        responsible: document.responsible || '', // ⬅️ NUEVO
        storage_location: document.storage_location || '',
        retention_central: document.retention_central || '',
        file_type_magnetic: document.file_type_magnetic || false,
        file_type_physical: document.file_type_physical || false,
        retention_management: document.retention_management || false,
        disposition_total_conservation: document.disposition_total_conservation || false,
        disposition_selection: document.disposition_selection || false,
        disposition_elimination: document.disposition_elimination || false
      });
      setNewFile(null);
      setChangeReason('');
      setShowReasonField(false);
      setError(null);
      setUploadProgress(0);
    }
  }, [isOpen, document]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setNewFile(null);
      setChangeReason('');
      setShowReasonField(false);
      setError(null);
      setUploadProgress(0);
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  // 🆕 Control de Archivo (ubicación, tipo de archivo, retención, disposición)
  // Solo aplica cuando el documento es un Registro (RE) o Formato (FO).
  // El tipo de documento no se edita aquí, así que basta con leerlo del documento.
  const controlArchivoAplica = ['RE', 'FO'].includes(document?.document_type?.code);

  // Detectar si hubo cambios en metadatos (EXCLUYENDO nombre)
  const hasMetadataChanges = () => {
    return (
      // formData.name !== document.name ||  // ❌ Nombre NO se compara
      formData.objective !== (document.objective || '') ||
      formData.scope !== (document.scope || '') ||
      formData.responsible !== (document.responsible || '') || // ⬅️ NUEVO
      formData.storage_location !== (document.storage_location || '') ||
      formData.retention_central !== (document.retention_central || '') ||
      formData.file_type_magnetic !== (document.file_type_magnetic || false) ||
      formData.file_type_physical !== (document.file_type_physical || false) ||
      formData.retention_management !== (document.retention_management || false) ||
      formData.disposition_total_conservation !== (document.disposition_total_conservation || false) ||
      formData.disposition_selection !== (document.disposition_selection || false) ||
      formData.disposition_elimination !== (document.disposition_elimination || false)
    );
  };

  // Manejar selección de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/msword', // .doc
        'application/vnd.ms-excel' // .xls
      ];

      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos Word (.docx, .doc) o Excel (.xlsx, .xls)');
        e.target.value = '';
        return;
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no debe superar 5 MB');
        e.target.value = '';
        return;
      }

      console.log('📎 Archivo seleccionado:', file.name, file.type);
      setNewFile(file);
      setShowReasonField(true); // Mostrar campo de motivo
      setError(null);
    }
  };

  // Subir archivo a Storage
  const uploadFileToStorage = async (file) => {
    try {
      // Generar path único
      const timestamp = Date.now();
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${document.code}_v${document.version + 1}_${timestamp}_${fileName}`;

      console.log('📤 Subiendo archivo:', filePath);

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      console.log('✅ Archivo subido:', data.path);
      return data.path;
    } catch (err) {
      console.error('❌ Error subiendo archivo:', err);
      throw new Error(`Error al subir archivo: ${err.message}`);
    }
  };

  // Actualizar solo metadatos (sin aprobación)
  const updateMetadataOnly = async () => {
    try {
      console.log('📝 Actualizando solo metadatos...');

      const { error } = await supabase
        .from('document')
        .update({
          // name: formData.name, // ❌ Nombre NO se edita
          objective: formData.objective || null,
          scope: formData.scope || null,
          responsible: formData.responsible || null,
          storage_location: formData.storage_location || null,
          retention_central: formData.retention_central ? parseInt(formData.retention_central) : null, // ✅ Convertir a número
          file_type_magnetic: formData.file_type_magnetic,
          file_type_physical: formData.file_type_physical,
          retention_management: formData.retention_management,
          disposition_total_conservation: formData.disposition_total_conservation,
          disposition_selection: formData.disposition_selection,
          disposition_elimination: formData.disposition_elimination,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;

      console.log('✅ Metadatos actualizados correctamente');
      return true;
    } catch (err) {
      console.error('❌ Error actualizando metadatos:', err);
      throw new Error(`Error al actualizar metadatos: ${err.message}`);
    }
  };

  // Crear nueva versión del documento (requiere aprobación)
  const createNewVersion = async (newFilePath) => {
    try {
      console.log('🔄 Creando nueva versión del documento...');

      // Crear nueva versión copiando TODOS los campos del original
      const { data: newVersion, error: insertError } = await supabase
        .from('document')
        .insert({
          // Información básica (SIEMPRE del original, NO editable)
          code: document.code,
          name: document.name, // ❌ Nombre NO cambia
          document_type_id: document.document_type_id,
          process_id: document.process_id,
          
          // Metadatos (pueden ser editados o usar los originales)
          objective: formData.objective || document.objective || null,
          scope: formData.scope || document.scope || null,
          responsible: formData.responsible || document.responsible || null, // ⬅️ NUEVO
          
          // Archivo nuevo
          file_path: newFilePath,
          
          // Versionamiento
          version: document.version + 1,
          parent_document_id: document.id,
          
          // Estados
          status: 'pending_approval',
          is_new_document: false,
          
          // TODOS los metadatos adicionales (con null si están vacíos)
          storage_location: formData.storage_location || document.storage_location || null,
          retention_central: formData.retention_central ? parseInt(formData.retention_central) : (document.retention_central || null), // ✅ Convertir a número
          file_type_magnetic: formData.file_type_magnetic ?? document.file_type_magnetic ?? false,
          file_type_physical: formData.file_type_physical ?? document.file_type_physical ?? false,
          retention_management: formData.retention_management ?? document.retention_management ?? false,
          disposition_total_conservation: formData.disposition_total_conservation ?? document.disposition_total_conservation ?? false,
          disposition_selection: formData.disposition_selection ?? document.disposition_selection ?? false,
          disposition_elimination: formData.disposition_elimination ?? document.disposition_elimination ?? false,
          
          // Motivo del cambio
          change_reason: changeReason,
          change_date: new Date().toISOString(),
          
          // Auditoría
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Nueva versión creada:', newVersion.id);

      // Crear notificación para gerencia
  // 🆕 Notificar a gerentes por email
      const { data: creatorProfile } = await supabase
        .from('profile')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const creatorName = creatorProfile?.full_name || user.email || 'Usuario';

      await notifyManagers(newVersion, creatorName);

      console.log('📧 Gerentes notificados por email');

      return newVersion;
    } catch (err) {
      console.error('❌ Error creando nueva versión:', err);
      throw new Error(`Error al crear nueva versión: ${err.message}`);
    }
  };

  // Manejar guardado
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const hasFileChange = newFile !== null;
      const hasMetaChange = hasMetadataChanges();

      // Validaciones
      if (!hasFileChange && !hasMetaChange) {
        setError('No hay cambios para guardar');
        setLoading(false);
        return;
      }

      // Si hay cambio de archivo, requiere motivo
      if (hasFileChange && (!changeReason || changeReason.trim() === '')) {
        setError('El motivo del cambio es obligatorio cuando subes un nuevo archivo');
        setLoading(false);
        return;
      }

      // CASO 1: Solo metadatos (sin archivo)
      if (!hasFileChange && hasMetaChange) {
        console.log('📝 Solo cambios de metadatos (actualización directa)');
        await updateMetadataOnly();
        alert('✅ Metadatos actualizados correctamente');
        onSuccess();
        onClose();
        return;
      }

      // CASO 2: Cambio de archivo (con o sin metadatos)
      if (hasFileChange) {
        console.log('🔄 Cambio de archivo detectado (requiere aprobación)');

        // Confirmar con el usuario
        const confirm = window.confirm(
          `¿Confirmar cambio de archivo?\n\n` +
          `• Se creará una nueva versión (v${document.version + 1})\n` +
          `• Estado: Pendiente de aprobación\n` +
          `• Motivo: ${changeReason}\n\n` +
          `La gerencia debe aprobar este cambio antes de que sea visible.`
        );

        if (!confirm) {
          setLoading(false);
          return;
        }

        // Subir archivo
        setUploadProgress(50);
        const newFilePath = await uploadFileToStorage(newFile);
        
        setUploadProgress(75);
        // Crear nueva versión
        await createNewVersion(newFilePath);
        
        setUploadProgress(100);

        alert(
          '✅ Cambio enviado para aprobación\n\n' +
          `Nueva versión creada: v${document.version + 1}\n` +
          'La gerencia ha sido notificada y debe aprobar el cambio.'
        );

        onSuccess();
        onClose();
        return;
      }

    } catch (err) {
      console.error('❌ Error en handleSave:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: '#dedecc' }}
        >
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#2e5244' }}>
              Editar Documento
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Código: <span className="font-mono font-bold">{document.code}</span> • 
              Versión actual: <span className="font-bold">v{String(document.version).padStart(2, '0')}</span>
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
          {/* Alerta informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tipos de edición:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Solo metadatos:</strong> Se guardan inmediatamente sin aprobación</li>
                <li><strong>Cambio de archivo:</strong> Crea nueva versión que requiere aprobación de gerencia</li>
              </ul>
            </div>
          </div>

          {/* Sección 1: Cambio de Archivo */}
          <div className="border-2 rounded-lg p-4" style={{ borderColor: '#6dbd96' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#2e5244' }}>
              🔄 Cambiar Archivo
            </h3>

            <div className="space-y-4">
              {/* Archivo actual */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Archivo actual:</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: '#6dbd96' }} />
                  {document.file_path ? document.file_path.split('/').pop() : 'No disponible'}
                </p>
              </div>

              {/* Upload nuevo archivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subir nuevo archivo <span className="text-gray-500">(opcional)</span>
                </label>
                <input
                  type="file"
                  accept=".docx,.xlsx,.doc,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-green-50 file:text-green-700
                    hover:file:bg-green-100
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos: Word (.docx, .doc) o Excel (.xlsx, .xls) • Máximo 5 MB
                </p>
              </div>

              {/* Motivo del cambio (solo si hay archivo nuevo) */}
              {showReasonField && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo del cambio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Explica por qué estás cambiando el archivo. Ejemplo: Corrección de errores, actualización de datos, nuevo formato..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    rows="3"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    ⚠️ Este cambio creará una nueva versión que requiere aprobación de gerencia
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sección 2: Metadatos */}
          <div className="border-2 rounded-lg p-4" style={{ borderColor: '#6dbd96' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#2e5244' }}>
              📝 Metadatos del Documento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre - READ ONLY */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del documento <span className="text-gray-400">(no editable)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  disabled={true}
                  className="w-full p-2 border rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Nombre del documento"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ El nombre del documento no puede modificarse
                </p>
              </div>

              {/* Objetivo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivo
                </label>
                <textarea
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="2"
                  disabled={loading}
                  placeholder="Objetivo del documento"
                />
              </div>

              {/* Alcance */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alcance
                </label>
                <textarea
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="2"
                  disabled={loading}
                  placeholder="Alcance del documento"
                />
              </div>

              {/* Responsable - NUEVO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsable
                </label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={loading}
                  placeholder="Ej: Gerente, Jefe de SST, Coordinador..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cargo o rol responsable del documento
                </p>
              </div>

            </div>
          </div>

          {/* Sección 3: Control de Archivo */}
          {/* 🆕 Solo aplica para Registros (RE) y Formatos (FO). Para los demás */}
          {/* tipos de documento (PR, GU, MN, IN) queda deshabilitado. */}
          <div
            className="border-2 rounded-lg p-4"
            style={{
              borderColor: controlArchivoAplica ? '#6f7b2c' : '#e5e7eb',
              opacity: controlArchivoAplica ? 1 : 0.55,
              backgroundColor: controlArchivoAplica ? 'transparent' : '#f9fafb',
            }}
          >
            <h3
              className="text-lg font-bold mb-1 flex items-center gap-2"
              style={{ color: controlArchivoAplica ? '#2e5244' : '#6b7280' }}
            >
              🗂️ Control de Archivo
              {!controlArchivoAplica && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  No aplica
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {controlArchivoAplica
                ? 'Ubicación, retención y disposición final del documento (Listado Maestro).'
                : `Este control solo aplica a Registros (RE) y Formatos (FO). Este documento es de tipo "${document?.document_type?.name || document?.document_type?.code || 'desconocido'}", así que queda deshabilitado.`}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ pointerEvents: controlArchivoAplica ? 'auto' : 'none' }}>
              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación de almacenamiento
                </label>
                <input
                  type="text"
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={loading || !controlArchivoAplica}
                  placeholder="Ej: Archivo central, Oficina SST..."
                />
              </div>

              {/* Retención central */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retención central (años)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.retention_central}
                  onChange={(e) => setFormData({ ...formData, retention_central: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={loading || !controlArchivoAplica}
                  placeholder="Ej: 5, 10..."
                />
              </div>

              {/* Checkboxes */}
              <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.file_type_magnetic}
                    onChange={(e) => setFormData({ ...formData, file_type_magnetic: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Magnético</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.file_type_physical}
                    onChange={(e) => setFormData({ ...formData, file_type_physical: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Físico</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.retention_management}
                    onChange={(e) => setFormData({ ...formData, retention_management: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Retención gestión</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.disposition_total_conservation}
                    onChange={(e) => setFormData({ ...formData, disposition_total_conservation: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Conservación total</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.disposition_selection}
                    onChange={(e) => setFormData({ ...formData, disposition_selection: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Selección</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.disposition_elimination}
                    onChange={(e) => setFormData({ ...formData, disposition_elimination: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Eliminación</span>
                </label>
              </div>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">❌ {error}</p>
            </div>
          )}

          {/* Progress bar */}
          {uploadProgress > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Subiendo archivo...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${uploadProgress}%`,
                    backgroundColor: '#6dbd96'
                  }}
                />
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#dedecc' }}>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: '#dedecc', color: '#2e5244' }}
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#6dbd96' }}
            >
              <Save className="h-5 w-5" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDocumentModal;