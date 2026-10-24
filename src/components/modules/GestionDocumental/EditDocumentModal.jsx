import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { useDocumentTraceability } from '../../../hooks/useDocumentTraceability'; // 🆕

/**
 * Modal unificado para editar documentos
 * 
 * CASOS DE USO:
 * 1. Solo editar metadatos (nombre, objetivo, alcance) → UPDATE directo
 * 2. Solo cambiar archivo → Requiere motivo + aprobación
 * 3. Editar metadatos + archivo → Requiere motivo + aprobación
 *
 * 🆕 MODO CORRECCIÓN DIRECTA (trazabilidad DESACTIVADA + admin/gerencia):
 *    Se edita TODO (código, nombre, tipo, proceso, datos) y el archivo se
 *    reemplaza en el mismo documento: sin versión nueva, motivo ni aprobación.
 *    El código anterior queda libre para reutilizarse.
 *    La trazabilidad se activa desde el Listado Maestro (solo admin).
 *
 * 🆕 v oct-2026 — En corrección directa también se editan los datos de
 *    "Control de Cambios" igual que en la creación: VERSIÓN, FECHA DEL
 *    ÚLTIMO CAMBIO (fecha del documento que muestra el Listado Maestro) y
 *    MOTIVO. Se permite reemplazar el archivo por PDF (máx. 10 MB, igual
 *    que en la creación).
 */

// Mismo formato que el CHECK de la tabla document (document_code_format)
const CODE_REGEX = /^[A-Z]{2,5}-[A-Z]{1,10}-[0-9]{2,3}$/;

// 🆕 Fechas date-only: se toma la parte YYYY-MM-DD tal como se guardó
// (los documentos cargados guardan '2023-02-22 00:00+00'; convertirla con
// new Date() la correría un día atrás en Colombia).
const toDateInput = (v) => (v ? String(v).slice(0, 10) : '');
// Se guarda al mediodía de Colombia para que ninguna zona horaria la corra de día
const fromDateInput = (d) => (d ? `${d}T12:00:00-05:00` : null);

const MAX_MB = 10;
const EditDocumentModal = ({ document, isOpen, onClose, onSuccess }) => {
  const { user, isAdmin, isGerencia, hasPermission } = useAuth();
  const { notifyManagers } = useDocumentActions(); // 🆕 AGREGAR ESTA LÍNEA
  const { traceabilityEnabled, loading: traceabilityLoading } = useDocumentTraceability(); // 🆕

  // 🆕 Corrección directa: solo admin/gerencia y con trazabilidad apagada
  const directMode = !traceabilityLoading && !traceabilityEnabled && (isAdmin || hasPermission('gestion_documental:documentos:edit'));

  // 🆕 Catálogos para editar tipo y proceso (solo se usan en corrección directa)
  const [docTypes, setDocTypes] = useState([]);
  const [processList, setProcessList] = useState([]);
  
  
  // Estados del formulario (valores por defecto para evitar warnings)
  const [formData, setFormData] = useState({
    code: '',              // 🆕 editable solo en corrección directa
    document_type_id: '',  // 🆕
    process_id: '',        // 🆕
    name: '',
    objective: '',
    scope: '',
    responsible: '', // ⬅️ NUEVO: Campo responsable (texto libre)
    version: '',           // 🆕 Control de cambios (corrección directa)
    change_date: '',       // 🆕
    change_reason: '',     // 🆕
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
        code: document.code || '',
        document_type_id: document.document_type_id || '',
        process_id: document.process_id || '',
        name: document.name || '',
        objective: document.objective || '',
        scope: document.scope || '',
        responsible: document.responsible || '', // ⬅️ NUEVO
        version: String(document.version || document.current_version || 1), // 🆕
        change_date: toDateInput(document.change_date || document.created_at), // 🆕
        change_reason: document.change_reason || '', // 🆕
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

  // 🆕 Cargar tipos y procesos cuando aplica la corrección directa
  useEffect(() => {
    if (!isOpen || !directMode) return;
    (async () => {
      const [{ data: types }, { data: procs }] = await Promise.all([
        supabase.from('document_type').select('id, code, name').eq('is_active', true).order('display_order'),
        supabase.from('process').select('id, code, name').eq('is_active', true).order('display_order'),
      ]);
      setDocTypes(types || []);
      setProcessList(procs || []);
    })();
  }, [isOpen, directMode]);

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
  // 🆕 En corrección directa el tipo se puede cambiar: se usa el seleccionado
  const selectedTypeCode = directMode
    ? (docTypes.find(t => t.id === formData.document_type_id)?.code || document?.document_type?.code)
    : document?.document_type?.code;
  const controlArchivoAplica = ['RE', 'FO'].includes(selectedTypeCode);

  // 🆕 Cambios de identificación (solo corrección directa)
  const hasIdentityChanges = () => directMode && (
    (formData.code || '').trim().toUpperCase() !== (document.code || '') ||
    formData.name !== (document.name || '') ||
    formData.document_type_id !== (document.document_type_id || '') ||
    formData.process_id !== (document.process_id || '') ||
    String(formData.version) !== String(document.version || document.current_version || 1) ||
    formData.change_date !== toDateInput(document.change_date || document.created_at) ||
    (formData.change_reason || '') !== (document.change_reason || '')
  );

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
        'application/vnd.ms-excel', // .xls
        'application/pdf', // 🆕 .pdf (igual que en la creación)
      ];
      const ext = file.name.split('.').pop().toLowerCase();
      const validExt = ['docx', 'doc', 'xlsx', 'xls', 'pdf'].includes(ext);

      if (!validTypes.includes(file.type) && !validExt) {
        setError('Solo se permiten archivos PDF, Word (.docx, .doc) o Excel (.xlsx, .xls)');
        e.target.value = '';
        return;
      }

      // Validar tamaño (igual que en la creación)
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`El archivo no debe superar ${MAX_MB} MB`);
        e.target.value = '';
        return;
      }

      console.log('📎 Archivo seleccionado:', file.name, file.type);
      setNewFile(file);
      setShowReasonField(!directMode); // 🆕 En corrección directa no se pide motivo
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

  // ─────────────────────────────────────────────────────────────────────────
  // 🆕 CORRECCIÓN DIRECTA: actualiza el MISMO documento (sin versión nueva)
  // ─────────────────────────────────────────────────────────────────────────
  const saveDirectCorrection = async () => {
    const newCode = (formData.code || '').trim().toUpperCase();
    const codeChanged = newCode !== document.code;

    if (!formData.name || !formData.name.trim()) throw new Error('El nombre es obligatorio');
    if (!CODE_REGEX.test(newCode)) {
      throw new Error('Código inválido. Formato esperado: XX-XX-00 (ej: RE-GS-05)');
    }

    // 🆕 Versión
    const newVersion = parseInt(formData.version, 10);
    if (isNaN(newVersion) || newVersion < 1) throw new Error('La versión debe ser un número mayor o igual a 1');
    const versionChanged = newVersion !== (document.version || document.current_version || 1);

    const typeObj = docTypes.find(t => t.id === formData.document_type_id);
    const procObj = processList.find(p => p.id === formData.process_id);

    // 🆕 La combinación código + versión debe ser única (document_code_version_unique)
    if (versionChanged && !codeChanged) {
      const { data: dupVer, error: dvErr } = await supabase
        .from('document')
        .select('id')
        .eq('code', newCode)
        .eq('version', newVersion)
        .neq('id', document.id)
        .limit(1);
      if (dvErr) throw dvErr;
      if (dupVer && dupVer.length > 0) {
        throw new Error(`Ya existe ${newCode} en versión v${String(newVersion).padStart(2, '0')} (puede estar archivada)`);
      }
    }

    // Código ya usado por OTRO documento
    if (codeChanged) {
      const { data: existing, error: exErr } = await supabase
        .from('document')
        .select('id')
        .eq('code', newCode)
        .neq('id', document.id)
        .limit(1);
      if (exErr) throw exErr;
      if (existing && existing.length > 0) throw new Error(`El código ${newCode} ya existe en otro documento`);
    }

    // Aviso si el código no coincide con el tipo/proceso elegidos
    const [codeType, codeProc] = newCode.split('-');
    if ((typeObj && codeType !== typeObj.code) || (procObj && codeProc !== procObj.code)) {
      const ok = window.confirm(
        `⚠️ El código ${newCode} no coincide con el tipo (${typeObj?.code || '?'}) ` +
        `y/o el proceso (${procObj?.code || '?'}) seleccionados.\n\n¿Guardar de todas formas?`
      );
      if (!ok) return false;
    }

    const ok = window.confirm(
      `¿Aplicar corrección directa?\n\n` +
      (codeChanged ? `• Código: ${document.code} → ${newCode} (el anterior queda libre)\n` : '') +
      (versionChanged ? `• Versión: v${String(document.version || 1).padStart(2, '0')} → v${String(newVersion).padStart(2, '0')}\n` : '') +
      (newFile ? `• Se reemplaza el archivo\n` : '') +
      `• Sin versión nueva ni aprobación (carga inicial)`
    );
    if (!ok) return false;

    // Archivo nuevo → se sube con el código/tipo nuevos
    let filePatch = {};
    if (newFile) {
      setUploadProgress(40);
      const ext = newFile.name.split('.').pop().toLowerCase();
      const folder = typeObj?.code || selectedTypeCode || 'general';
      const version = newVersion; // 🆕 usa la versión editada
      let path = `${folder}/${newCode}_v${version}.${ext}`;

      let { error: upErr } = await supabase.storage.from('documents')
        .upload(path, newFile, { cacheControl: '3600', upsert: false });

      // Si ya existe un archivo con ese nombre, se usa uno único (no se sobrescribe)
      if (upErr && /exist|duplicate/i.test(upErr.message || '')) {
        path = `${folder}/${newCode}_v${version}_${Date.now()}.${ext}`;
        ({ error: upErr } = await supabase.storage.from('documents')
          .upload(path, newFile, { cacheControl: '3600', upsert: false }));
      }
      if (upErr) throw new Error(`Error al subir archivo: ${upErr.message}`);

      filePatch = {
        file_path: path,
        file_name: newFile.name,
        file_size: newFile.size,
        mime_type: newFile.type || null,
      };
    }

    setUploadProgress(75);
    const { data: updated, error: updErr } = await supabase
      .from('document')
      .update({
        code: newCode,
        name: formData.name.trim(),
        document_type_id: formData.document_type_id || document.document_type_id,
        process_id: formData.process_id || document.process_id,
        objective: formData.objective || null,
        scope: formData.scope || null,
        responsible: formData.responsible || null,
        storage_location: formData.storage_location || null,
        retention_central: formData.retention_central ? parseInt(formData.retention_central) : null,
        file_type_magnetic: formData.file_type_magnetic,
        file_type_physical: formData.file_type_physical,
        retention_management: formData.retention_management,
        disposition_total_conservation: formData.disposition_total_conservation,
        disposition_selection: formData.disposition_selection,
        disposition_elimination: formData.disposition_elimination,
        // 🆕 Control de cambios
        version: newVersion,
        current_version: newVersion,
        change_date: fromDateInput(formData.change_date) || document.change_date || null,
        change_reason: (formData.change_reason || '').trim() || null,
        ...filePatch,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id)
      .select('id');

    if (updErr) {
      if (/document_code_version_unique|duplicate key/i.test(updErr.message)) {
        throw new Error(`Ya existe ${newCode} en versión v${String(newVersion).padStart(2, '0')}`);
      }
      if (/document_code_format/i.test(updErr.message)) {
        throw new Error('El código no cumple el formato XX-XX-00');
      }
      throw updErr;
    }
    if (!updated || updated.length === 0) throw new Error('No tienes permiso para editar este documento');

    // Borrar el archivo anterior (solo admin puede borrar en Storage; si falla no pasa nada)
    if (newFile && document.file_path && document.file_path !== filePatch.file_path && isAdmin) {
      const { error: rmErr } = await supabase.storage.from('documents').remove([document.file_path]);
      if (rmErr) console.warn('⚠️ No se pudo borrar el archivo anterior:', rmErr.message);
    }

    setUploadProgress(100);
    return true;
  };

  // Manejar guardado
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const hasFileChange = newFile !== null;
      const hasMetaChange = hasMetadataChanges();

      // 🆕 CORRECCIÓN DIRECTA
      if (directMode) {
        if (!hasFileChange && !hasMetaChange && !hasIdentityChanges()) {
          setError('No hay cambios para guardar');
          return;
        }
        const done = await saveDirectCorrection();
        if (done) {
          alert('✅ Documento corregido correctamente');
          onSuccess();
          onClose();
        }
        return;
      }

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
          {/* 🆕 Aviso de corrección directa */}
          {directMode && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-bold mb-1">Modo corrección directa (carga inicial del sistema)</p>
                <p>
                  La trazabilidad de cambios está <strong>desactivada</strong>. Puedes editar código, nombre,
                  tipo, proceso, versión, fecha y motivo del cambio, y reemplazar el archivo. Los cambios se aplican de inmediato,
                  sin versión nueva ni aprobación. El código anterior queda libre.
                </p>
              </div>
            </div>
          )}

          {/* Alerta informativa */}
          {!directMode && (
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
          )}

          {/* Sección 1: Cambio de Archivo */}
          <div className="border-2 rounded-lg p-4" style={{ borderColor: '#6dbd96' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#2e5244' }}>
              🔄 {directMode ? 'Reemplazar Archivo' : 'Cambiar Archivo'}
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
                  accept=".pdf,.docx,.xlsx,.doc,.xls"
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
                  Formatos: PDF, Word (.docx, .doc) o Excel (.xlsx, .xls) • Máximo {MAX_MB} MB
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
              {/* 🆕 Identificación (solo corrección directa) */}
              {directMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 border rounded-lg font-mono focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      disabled={loading}
                      placeholder="Ej: RE-GS-05"
                    />
                    <p className="text-xs text-gray-500 mt-1">Formato: TIPO-PROCESO-NÚMERO</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de documento</label>
                    <select
                      value={formData.document_type_id}
                      onChange={(e) => setFormData({ ...formData, document_type_id: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-400"
                      disabled={loading}
                    >
                      {docTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proceso</label>
                    <select
                      value={formData.process_id}
                      onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-400"
                      disabled={loading}
                    >
                      {processList.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Nombre: editable solo en corrección directa */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del documento{' '}
                  {directMode
                    ? <span className="text-red-500">*</span>
                    : <span className="text-gray-400">(no editable)</span>}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!directMode || loading}
                  className={`w-full p-2 border rounded-lg ${directMode
                    ? 'focus:ring-2 focus:ring-amber-400 focus:border-amber-400'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'}`}
                  placeholder="Nombre del documento"
                />
                {!directMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    ℹ️ El nombre del documento no puede modificarse
                  </p>
                )}
              </div>

              {/* 🆕 Objetivo y Alcance: NO aplican para Formatos (FO) ni Registros (RE) */}
              {!controlArchivoAplica && (
                <>
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
                </>
              )}

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

          {/* 🆕 Sección: Control de Cambios (solo corrección directa, igual que en la creación) */}
          {directMode && (
            <div className="border-2 rounded-lg p-4" style={{ borderColor: '#d97706' }}>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#2e5244' }}>
                🕒 Control de Cambios
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Versión, fecha y motivo del último cambio del documento (se muestran en el Listado Maestro).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Versión actual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha del último cambio
                  </label>
                  <input
                    type="date"
                    value={formData.change_date}
                    onChange={(e) => setFormData({ ...formData, change_date: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Puede ser histórica (fecha de creación o del último cambio)</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo del último cambio
                  </label>
                  <textarea
                    value={formData.change_reason}
                    onChange={(e) => setFormData({ ...formData, change_reason: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    rows="2"
                    disabled={loading}
                    placeholder="Ej: Creación, Actualización según ISO 9001:2015…"
                  />
                </div>
              </div>
            </div>
          )}

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
                ? 'Tipo de archivo, ubicación, retención y disposición final del documento (Listado Maestro).'
                : `Este control solo aplica a Registros (RE) y Formatos (FO). Este documento es de tipo "${document?.document_type?.name || document?.document_type?.code || 'desconocido'}", así que queda deshabilitado.`}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ pointerEvents: controlArchivoAplica ? 'auto' : 'none' }}>
              {/* 1. Tipo de Archivo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de archivo
                </label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.file_type_magnetic}
                      onChange={(e) => setFormData({ ...formData, file_type_magnetic: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={loading || !controlArchivoAplica}
                    />
                    <span>Magnético (Digital)</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.file_type_physical}
                      onChange={(e) => setFormData({ ...formData, file_type_physical: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={loading || !controlArchivoAplica}
                    />
                    <span>Físico (Papel)</span>
                  </label>
                </div>
              </div>

              {/* 2. Ubicación */}
              <div className="md:col-span-2">
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

              {/* 3. Retención */}
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

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.retention_management}
                    onChange={(e) => setFormData({ ...formData, retention_management: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={loading || !controlArchivoAplica}
                  />
                  <span>Retención en gestión</span>
                </label>
              </div>

              {/* 4. Disposición Final */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disposición final
                </label>
                <div className="flex flex-wrap gap-6">
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
              {loading ? 'Guardando...' : directMode ? 'Aplicar corrección' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDocumentModal;