// =====================================================
// FormularioCreacion.jsx - VERSIÓN FINAL
// Solo se agrega selector Excel/Word al código existente
// =====================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useDocumentActions } from '@/hooks/useDocumentActions'; // 🆕 AGREGAR ESTA LÍNEA
import { useDocumentCode } from '@/hooks/useDocumentCode';
import { generateWordTemplate } from '../../../utils/generateWordTemplate';
import { generateExcelTemplate } from '../../../utils/generateExcelTemplate';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Label } from '../../../app/components/ui/label';
import { Textarea } from '../../../app/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../app/components/ui/card';
import { Alert, AlertDescription } from '../../../app/components/ui/alert';
import { Checkbox } from '../../../app/components/ui/checkbox';
import { Upload, X, FileText, AlertCircle, CheckCircle2, Info, Sparkles, Download, FileSpreadsheet } from 'lucide-react';
import InstruccionesWordModal from './InstruccionesWordModal';

export default function FormularioCreacion({ 
  documentTypes = [], 
  processes = [], 
  onSuccess,
  onCancel
}) {
  const { user } = useAuth();
  const { getNextCode, checkCodeExists, validateCodeFormat } = useDocumentCode();
  const { notifyManagers } = useDocumentActions(); // 🆕 AGREGAR ESTA LÍNEA
  
  // Estado para controlar si es formato nuevo
  const [isNewFormat, setIsNewFormat] = useState(false);
  const [autoCode, setAutoCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  
  // 🆕 NUEVO: Estado para tipo de plantilla
  const [templateType, setTemplateType] = useState('excel'); // 'excel' o 'word'
  
  // Estado para descarga de plantilla
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    objective: '',
    scope: '',
    responsible: '', // ⬅️ NUEVO: Campo responsable
    document_type_id: '',
    process_id: '',
    storage_location: '',
    file_type_magnetic: true,
    file_type_physical: false,
    retention_central: '',
    retention_management: false,
    disposition_total_conservation: false,
    disposition_selection: false,
    disposition_elimination: false,
    version: '1',
    change_date: new Date().toISOString().split('T')[0],
    change_reason: '',
  });
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Efecto para generar código automático
  useEffect(() => {
    if (isNewFormat && formData.document_type_id && formData.process_id) {
      generateNextCode();
    }
  }, [isNewFormat, formData.document_type_id, formData.process_id]);

  // Generar siguiente código
  const generateNextCode = async () => {
    try {
      setGeneratingCode(true);
      setCodeError('');

      const selectedType = documentTypes.find(t => t.id === formData.document_type_id);
      if (!selectedType) return;

      const selectedProcess = processes.find(p => p.id === formData.process_id);
      if (!selectedProcess || !selectedProcess.code) return;

      const typeCode = selectedType.code;
      const deptCode = selectedProcess.code;

      const nextCode = await getNextCode(typeCode, deptCode);
      
      if (nextCode) {
        setAutoCode(nextCode);
        setFormData(prev => ({ ...prev, code: nextCode }));
        setCodeError('');
      }

    } catch (err) {
      console.error('Error generando código:', err);
      setCodeError('No se pudo generar el código automático');
    } finally {
      setGeneratingCode(false);
    }
  };

  // 🆕 MODIFICADO: Descargar plantilla según tipo seleccionado
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      setTemplateError(null);

      if (!autoCode || !formData.name) {
        throw new Error('Código y nombre son requeridos para generar la plantilla');
      }

      const selectedProcess = processes.find(p => p.id === formData.process_id);

      // 🎯 GENERAR SEGÚN TIPO SELECCIONADO (Excel o Word)
      if (templateType === 'excel') {
        // ✅ EXCEL: Plantilla con todos los campos rellenados
        await generateExcelTemplate({
          code: autoCode,
          name: formData.name,
          version: formData.version || '1',
          processName: selectedProcess?.name || ''
        });
        console.log('✅ Plantilla Excel generada');
        
      } else if (templateType === 'word') {
        // 📝 WORD: Plantilla con logo (usuario completa manual)
        await generateWordTemplate({
          code: autoCode,
          version: formData.version || '1',
          name: formData.name
        });
        console.log('✅ Plantilla Word generada');
      }

    } catch (err) {
      console.error('Error descargando plantilla:', err);
      setTemplateError(err.message);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Toggle formato nuevo
  const handleNewFormatToggle = (checked) => {
    setIsNewFormat(checked);
    
    if (checked) {
      setFormData(prev => ({ ...prev, code: '' }));
      if (formData.document_type_id && formData.process_id) {
        generateNextCode();
      }
    } else {
      setAutoCode('');
      setFormData(prev => ({ ...prev, code: '' }));
    }
  };

  // Validación de código
  const validateCode = (code) => {
    if (!code) {
      setCodeError('');
      return false;
    }

    const validation = validateCodeFormat(code);
    if (!validation.valid) {
      setCodeError(validation.message);
      return false;
    }

    setCodeError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'code' && !isNewFormat) {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, [name]: upperValue }));
      validateCode(upperValue);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('El archivo no puede superar 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!validateCode(formData.code)) {
        throw new Error('Código de documento inválido');
      }

      if (!formData.name || !formData.document_type_id || !formData.process_id) {
        throw new Error('Complete los campos obligatorios');
      }

      if (!file) {
        throw new Error('Debe seleccionar un archivo');
      }

      const codeExists = await checkCodeExists(formData.code);
      if (codeExists) {
        throw new Error(`El código ${formData.code} ya existe`);
      }

      const version = parseInt(formData.version);
      if (isNaN(version) || version < 1) {
        throw new Error('La versión debe ser mayor o igual a 1');
      }

      // Subir archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.code}_v${version}.${fileExt}`;
      const selectedType = documentTypes.find(t => t.id === formData.document_type_id);
      const folderName = selectedType?.code || 'general';
      const filePath = `${folderName}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          throw new Error('Ya existe un archivo con este código y versión');
        }
        throw uploadError;
      }

      // Determinar status
      const documentStatus = isNewFormat ? 'pending_approval' : 'published';

      // Crear documento
      const { data: document, error: dbError } = await supabase
        .from('document')
        .insert({
          code: formData.code,
          name: formData.name,
          objective: formData.objective || null,
          scope: formData.scope || null,
          responsible: formData.responsible || null, // ⬅️ NUEVO: Campo responsable
          document_type_id: formData.document_type_id,
          process_id: formData.process_id,
          file_path: uploadData.path,
          version: version,
          status: documentStatus,
          storage_location: formData.storage_location || null,
          file_type_magnetic: formData.file_type_magnetic,
          file_type_physical: formData.file_type_physical,
          retention_central: formData.retention_central ? parseInt(formData.retention_central) : null,
          retention_management: formData.retention_management,
          disposition_total_conservation: formData.disposition_total_conservation,
          disposition_selection: formData.disposition_selection,
          disposition_elimination: formData.disposition_elimination,
          change_date: formData.change_date || new Date().toISOString(),
          change_reason: formData.change_reason || (isNewFormat ? 'Documento nuevo creado' : 'Documento existente registrado'),
          created_by: user?.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 🆕 Enviar notificaciones por email si es formato nuevo
      if (isNewFormat && documentStatus === 'pending_approval') {
        console.log('📧 Enviando notificaciones a gerentes...');
        
        // Obtener nombre completo del usuario
        const { data: profile } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const creatorName = profile?.full_name || user.email || 'Usuario';

        // Enviar emails a gerentes
        await notifyManagers(document, creatorName);
      }

      setSuccess(true);
      
      if (onSuccess) {
        onSuccess({
          ...document,
          isNewFormat,
          needsApproval: isNewFormat
        });
      }

      // Resetear formulario
      setTimeout(() => {
        setFormData({
          code: '',
          name: '',
          objective: '',
          scope: '',
          document_type_id: '',
          process_id: '',
          storage_location: '',
          file_type_magnetic: true,
          file_type_physical: false,
          retention_central: '',
          retention_management: false,
          disposition_total_conservation: false,
          disposition_selection: false,
          disposition_elimination: false,
          version: '1',
          change_date: new Date().toISOString().split('T')[0],
          change_reason: '',
        });
        setFile(null);
        setIsNewFormat(false);
        setAutoCode('');
        setSuccess(false);
      }, 3000);

    } catch (err) {
      console.error('❌ Error al crear documento:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {isNewFormat 
              ? `¡Formato nuevo creado! Código ${formData.code} enviado a gerencia para aprobación.`
              : `¡Documento creado exitosamente! Código ${formData.code} publicado.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Card de Tipo de Formato */}
      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Tipo de Formato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="isNewFormat"
              checked={isNewFormat}
              onCheckedChange={handleNewFormatToggle}
            />
            <div className="flex-1">
              <Label htmlFor="isNewFormat" className="text-base font-medium cursor-pointer">
                Es un formato nuevo
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                {isNewFormat 
                  ? '✅ El código se generará automáticamente y requerirá aprobación'
                  : 'El documento ya existe y será publicado inmediatamente'
                }
              </p>
            </div>
          </div>

          {/* 🆕 SECCIÓN MODIFICADA: Preview del código + SELECTOR + BOTÓN */}
          {isNewFormat && autoCode && (
            <div className="space-y-3">
              {/* Código generado */}
              <Alert className="border-blue-500 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <span className="font-semibold">Código que se asignará:</span>
                  <br />
                  <code className="text-lg font-mono bg-white px-2 py-1 rounded mt-1 inline-block">
                    {autoCode}
                  </code>
                </AlertDescription>
              </Alert>

              {/* 🆕 SELECTOR DE TIPO DE PLANTILLA */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selecciona el tipo de plantilla</Label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Opción Excel */}
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      templateType === 'excel'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                    onClick={() => setTemplateType('excel')}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        id="template-excel"
                        name="templateType"
                        value="excel"
                        checked={templateType === 'excel'}
                        onChange={() => setTemplateType('excel')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="template-excel" className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          Excel
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          ✅ Campos automáticos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Opción Word */}
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      templateType === 'word'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                    onClick={() => setTemplateType('word')}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        id="template-word"
                        name="templateType"
                        value="word"
                        checked={templateType === 'word'}
                        onChange={() => setTemplateType('word')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="template-word" className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Word
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          ⚠️ Manual (~2 min)
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* BOTÓN DESCARGAR PLANTILLA */}
              <Button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate || !formData.name}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {downloadingTemplate ? (
                  <>
                    <Download className="mr-2 h-4 w-4 animate-bounce" />
                    Generando plantilla...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    📥 Descargar Plantilla {templateType === 'excel' ? 'Excel' : 'Word'} con Logo Indecon
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-600 text-center">
                📄 Descarga la plantilla {templateType === 'excel' ? 'Excel con todos los campos rellenados' : 'Word con logo (completar encabezado manualmente)'}.
                <br />
                Complétala offline y súbela aquí.
              </p>

              {templateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{templateError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Básica */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader>
          <CardTitle style={{ color: '#2e5244' }}>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo y Proceso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_type_id">
                Tipo de Documento <span className="text-red-500">*</span>
              </Label>
              <select
                id="document_type_id"
                name="document_type_id"
                value={formData.document_type_id}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Seleccione...</option>
                {documentTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="process_id">
                Proceso <span className="text-red-500">*</span>
              </Label>
              <select
                id="process_id"
                name="process_id"
                value={formData.process_id}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Seleccione...</option>
                {processes.map(process => (
                  <option key={process.id} value={process.id}>
                    {process.code} - {process.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Código */}
          <div>
            <Label htmlFor="code">
              Código del Documento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Ej: PR-GC-01"
              required
              disabled={isNewFormat}
              className={codeError ? 'border-red-500' : ''}
            />
            {codeError ? (
              <p className="text-sm text-red-500 mt-1">{codeError}</p>
            ) : isNewFormat ? (
              <p className="text-xs text-blue-600 mt-1">
                ✨ Código generado automáticamente
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Formato: XX-YY-## (ej: PR-GC-01)
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <Label htmlFor="name">
              Nombre del Documento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Procedimiento de Satisfacción del Cliente"
              required
            />
          </div>

          {/* Objetivo */}
          <div>
            <Label htmlFor="objective">Objetivo</Label>
            <Textarea
              id="objective"
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              placeholder="Objetivo del documento..."
              rows={2}
            />
          </div>

          {/* Alcance */}
          <div>
            <Label htmlFor="scope">Alcance</Label>
            <Textarea
              id="scope"
              name="scope"
              value={formData.scope}
              onChange={handleChange}
              placeholder="Alcance del documento..."
              rows={2}
            />
          </div>

          {/* Responsable */}
          <div>
            <Label htmlFor="responsible">Responsable</Label>
            <Input
              id="responsible"
              name="responsible"
              value={formData.responsible}
              onChange={handleChange}
              placeholder="Ej: Gerente General, Jefe de SST..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Cargo o rol responsable del documento
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Archivo */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader>
          <CardTitle style={{ color: '#2e5244' }}>
            Archivo del Documento <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            {isNewFormat 
              ? 'Sube el archivo de la plantilla que completaste'
              : 'Sube el documento existente'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Click para seleccionar archivo
              </span>
              <span className="text-xs text-gray-500 mt-1">
                PDF, Word o Excel - Máximo 10MB
              </span>
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-600">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Adicional del Excel */}
      <Card className="border-2" style={{ borderColor: '#6f7b2c' }}>
        <CardHeader>
          <CardTitle style={{ color: '#2e5244' }}>Información Adicional</CardTitle>
          <CardDescription>Campos del listado maestro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ubicación */}
          <div>
            <Label htmlFor="storage_location">Ubicación de Almacenamiento</Label>
            <Input
              id="storage_location"
              name="storage_location"
              value={formData.storage_location}
              onChange={handleChange}
              placeholder="Ej: Servidor, Archivador A, etc."
            />
          </div>

          {/* Tipo de Archivo */}
          <div className="space-y-2">
            <Label>Tipo de Archivo</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="file_type_magnetic"
                  name="file_type_magnetic"
                  checked={formData.file_type_magnetic}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, file_type_magnetic: checked }))
                  }
                />
                <Label htmlFor="file_type_magnetic" className="cursor-pointer">
                  Magnético (Digital)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="file_type_physical"
                  name="file_type_physical"
                  checked={formData.file_type_physical}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, file_type_physical: checked }))
                  }
                />
                <Label htmlFor="file_type_physical" className="cursor-pointer">
                  Físico (Papel)
                </Label>
              </div>
            </div>
          </div>

          {/* Retención */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retention_central">Tiempo Retención Central (años)</Label>
              <Input
                id="retention_central"
                name="retention_central"
                type="number"
                min="0"
                value={formData.retention_central}
                onChange={handleChange}
                placeholder="Ej: 5"
              />
            </div>
            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="retention_management"
                name="retention_management"
                checked={formData.retention_management}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, retention_management: checked }))
                }
              />
              <Label htmlFor="retention_management" className="cursor-pointer">
                Retención en Gestión
              </Label>
            </div>
          </div>

          {/* Disposición */}
          <div className="space-y-2">
            <Label>Disposición Final</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disposition_total_conservation"
                  name="disposition_total_conservation"
                  checked={formData.disposition_total_conservation}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, disposition_total_conservation: checked }))
                  }
                />
                <Label htmlFor="disposition_total_conservation" className="cursor-pointer">
                  Conservación Total
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disposition_selection"
                  name="disposition_selection"
                  checked={formData.disposition_selection}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, disposition_selection: checked }))
                  }
                />
                <Label htmlFor="disposition_selection" className="cursor-pointer">
                  Selección
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disposition_elimination"
                  name="disposition_elimination"
                  checked={formData.disposition_elimination}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, disposition_elimination: checked }))
                  }
                />
                <Label htmlFor="disposition_elimination" className="cursor-pointer">
                  Eliminación
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control de Cambios */}
      <Card className="border-2" style={{ borderColor: '#6f7b2c' }}>
        <CardHeader>
          <CardTitle style={{ color: '#2e5244' }}>Control de Cambios</CardTitle>
          <CardDescription>
            Si el documento ya existe, ingrese aquí los datos históricos. Si es un documento completamente nuevo, deje versión 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="version">
              Versión Actual del Documento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="version"
              name="version"
              type="number"
              min="1"
              value={formData.version}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Si el documento ya existe, ingrese la versión actual (ej: 3). Si es nuevo, deje 1.
            </p>
          </div>
          
          <div>
            <Label htmlFor="change_date">
              Fecha del Último Cambio
            </Label>
            <Input
              id="change_date"
              name="change_date"
              type="date"
              value={formData.change_date}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Fecha del último cambio registrado (puede ser histórica)
            </p>
          </div>
          
          <div>
            <Label htmlFor="change_reason">
              Motivo del Último Cambio
            </Label>
            <Textarea
              id="change_reason"
              name="change_reason"
              value={formData.change_reason}
              onChange={handleChange}
              rows={3}
              placeholder="Ej: Actualización según ISO 9001:2015, Corrección de formato, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || generatingCode || (isNewFormat && !autoCode)}
          style={{ backgroundColor: '#6dbd96' }}
          className="hover:opacity-90"
        >
          {loading ? (
            'Creando...'
          ) : isNewFormat ? (
            '📤 Enviar para Aprobación'
          ) : (
            '✅ Crear Documento'
          )}
        </Button>
      </div>
    </form>
  );
}