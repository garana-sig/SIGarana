// src/components/modules/MejoramientoContinuo/Actas/FormularioActa.jsx
// ✅ v3.0 — Con selector DUAL de asistentes (usuarios sistema + manual)

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Plus,
  Trash2,
  Save,
  X,
  Calendar,
  MapPin,
  FileText,
  Users,
  CheckSquare,
  AlertCircle,
  Camera,
  ImagePlus,
  ZoomIn,
  UserCheck,
  Edit3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc' };

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 20;

export default function FormularioActa({ actaToEdit = null, onCancel, onSave }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    location: '',
    objective: '',
    agenda: '',
    development: '',
    approved_by: '',
  });

  // ✨ NUEVO: attendees con user_id opcional
  const [attendees, setAttendees] = useState([
    { 
      id: Date.now(), 
      name: '', 
      position: '', 
      user_id: null,        // ← FK a profile (null si manual)
      input_mode: 'manual'  // ← 'manual' o 'system'
    }
  ]);
  
  const [commitments, setCommitments] = useState([
    { id: Date.now(), activity: '', responsible_id: '', due_date: '' }
  ]);

  // Fotos
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [deletedPaths, setDeletedPaths] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const photoInputRef = useRef();

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Cargar usuarios
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoadingUsuarios(true);
        const { data, error } = await supabase
          .from('profile')
          .select('id, full_name, role')
          .eq('is_active', true)
          .order('full_name');
        if (error) throw error;
        setUsuarios(data || []);
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      } finally {
        setLoadingUsuarios(false);
      }
    };
    fetchUsuarios();
  }, []);

  // Cargar datos al editar
  useEffect(() => {
    if (actaToEdit) {
      setFormData({
        title: actaToEdit.title || '',
        meeting_date: actaToEdit.meeting_date || '',
        location: actaToEdit.location || '',
        objective: actaToEdit.objective || '',
        agenda: actaToEdit.agenda || '',
        development: actaToEdit.development || '',
        approved_by: actaToEdit.approved_by || '',
      });

      // ✨ NUEVO: Cargar asistentes con user_id
      if (actaToEdit.attendees && actaToEdit.attendees.length > 0) {
        setAttendees(actaToEdit.attendees.map(a => ({
          id: a.id || Date.now() + Math.random(),
          name: a.name,
          position: a.position,
          user_id: a.user_id || null,
          input_mode: a.user_id ? 'system' : 'manual'
        })));
      }

      if (actaToEdit.commitments && actaToEdit.commitments.length > 0) {
        setCommitments(actaToEdit.commitments.map(c => ({
          id: c.id || Date.now() + Math.random(),
          activity: c.activity,
          responsible_id: c.responsible_id,
          due_date: c.due_date
        })));
      }

      if (actaToEdit.photos && actaToEdit.photos.length > 0) {
        setExistingPhotos(actaToEdit.photos);
      }
    }
  }, [actaToEdit]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  // ═══════════════════════════════════════════════════════
  // ✨ NUEVO: FUNCIONES PARA ASISTENTES CON SELECTOR DUAL
  // ═══════════════════════════════════════════════════════
  
  const addAttendee = () => {
    setAttendees(prev => [
      ...prev,
      { 
        id: Date.now(), 
        name: '', 
        position: '', 
        user_id: null,
        input_mode: 'manual'
      }
    ]);
  };

  const removeAttendee = (id) => {
    setAttendees(prev => prev.filter(a => a.id !== id));
  };

  // Cambiar modo de entrada
  const toggleAttendeeMode = (id) => {
    setAttendees(prev => prev.map(a => {
      if (a.id !== id) return a;
      
      const newMode = a.input_mode === 'manual' ? 'system' : 'manual';
      
      // Al cambiar a manual, limpiar user_id pero mantener name/position
      // Al cambiar a sistema, limpiar name/position
      return {
        ...a,
        input_mode: newMode,
        user_id: newMode === 'system' ? null : null,
        name: newMode === 'system' ? '' : a.name,
        position: newMode === 'system' ? '' : a.position
      };
    }));
  };

  // Seleccionar usuario del sistema
  const selectSystemUser = (attendeeId, userId) => {
    const selectedUser = usuarios.find(u => u.id === userId);
    if (!selectedUser) return;

    setAttendees(prev => prev.map(a => {
      if (a.id !== attendeeId) return a;
      
      return {
        ...a,
        user_id: userId,
        name: selectedUser.full_name,
        position: selectedUser.role === 'admin' ? 'Administrador' 
                : selectedUser.role === 'gerencia' ? 'Gerencia'
                : 'Usuario'
      };
    }));
  };

  // Actualizar campos manuales
  const updateAttendeeManual = (id, field, value) => {
    setAttendees(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  // ═══════════════════════════════════════════════════════
  // COMPROMISOS (sin cambios)
  // ═══════════════════════════════════════════════════════
  
  const addCommitment = () => {
    setCommitments(prev => [
      ...prev,
      { id: Date.now(), activity: '', responsible_id: '', due_date: '' }
    ]);
  };

  const removeCommitment = (id) => {
    setCommitments(prev => prev.filter(c => c.id !== id));
  };

  const updateCommitment = (id, field, value) => {
    setCommitments(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // ═══════════════════════════════════════════════════════
  // FOTOS (sin cambios)
  // ═══════════════════════════════════════════════════════
  
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotoError('');
    const currentTotal = existingPhotos.length + newPhotos.length;

    if (currentTotal + files.length > MAX_PHOTOS) {
      setPhotoError(`Máximo ${MAX_PHOTOS} fotos permitidas`);
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setPhotoError(`${file.name} no es un tipo de imagen válido`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoError(`${file.name} excede el tamaño máximo (5MB)`);
        continue;
      }
      validFiles.push(file);
    }

    const newPhotoObjects = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    setNewPhotos(prev => [...prev, ...newPhotoObjects]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removeNewPhoto = (index) => {
    setNewPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const removeExistingPhoto = (index) => {
    const photo = existingPhotos[index];
    setDeletedPaths(prev => [...prev, photo.path]);
    setExistingPhotos(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  // ═══════════════════════════════════════════════════════
  // VALIDACIÓN
  // ═══════════════════════════════════════════════════════
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.meeting_date) newErrors.meeting_date = 'La fecha es obligatoria';
    if (!formData.location) newErrors.location = 'El lugar es obligatorio';
    if (!formData.objective) newErrors.objective = 'El objetivo es obligatorio';
    if (!formData.agenda) newErrors.agenda = 'El orden del día es obligatorio';
    if (!formData.development) newErrors.development = 'El desarrollo es obligatorio';

    const validAttendees = attendees.filter(a => a.name.trim() && a.position.trim());
    if (validAttendees.length === 0) newErrors.attendees = 'Debe haber al menos un asistente';

    const incompleteCommitments = commitments.filter(c =>
      (c.activity.trim() || c.responsible_id || c.due_date) &&
      (!c.activity.trim() || !c.responsible_id || !c.due_date)
    );
    if (incompleteCommitments.length > 0) newErrors.commitments = 'Complete todos los campos de los compromisos';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ═══════════════════════════════════════════════════════
  // GUARDAR
  // ═══════════════════════════════════════════════════════
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // ✨ NUEVO: Incluir user_id en asistentes
      const validAttendees = attendees
        .filter(a => a.name.trim() && a.position.trim())
        .map((a, i) => ({
          name: a.name.trim(),
          position: a.position.trim(),
          user_id: a.user_id || null, // ← NUEVO
          order_index: i + 1
        }));

      const validCommitments = commitments
        .filter(c => c.activity.trim() && c.responsible_id && c.due_date)
        .map((c, i) => ({
          activity: c.activity.trim(),
          responsible_id: c.responsible_id,
          due_date: c.due_date,
          order_index: i + 1
        }));

      const actaData = {
        ...formData,
        approved_by: formData.approved_by || null,
        attendees: validAttendees,
        commitments: validCommitments,
        photos: existingPhotos,
        newPhotoFiles: newPhotos.map(p => p.file),
        deletedPhotoPaths: deletedPaths,
      };

      await onSave(actaData);
    } catch (error) {
      console.error('Error al guardar acta:', error);
      alert('❌ Error: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold" style={{ color: C.green }}>
            {actaToEdit ? 'Editar Acta' : 'Nueva Acta de Reunión'}
          </h3>
          <p className="text-sm mt-1" style={{ color: C.olive }}>
            {actaToEdit ? `Consecutivo: ${actaToEdit.consecutive}` : 'El consecutivo se generará automáticamente'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button type="submit" style={{ backgroundColor: C.green }} className="text-white" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Guardando...' : 'Guardar Acta'}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 1: INFORMACIÓN GENERAL
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.mint }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: C.green }}>
            <FileText className="h-5 w-5" /> Información General
          </CardTitle>
          <CardDescription>Datos básicos de la reunión</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 1. Fecha de reunión *
              </Label>
              <Input
                id="meeting_date"
                type="date"
                value={formData.meeting_date}
                onChange={e => handleInputChange('meeting_date', e.target.value)}
                className={errors.meeting_date ? 'border-red-500' : ''}
              />
              {errors.meeting_date && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.meeting_date}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> 2. Lugar *
              </Label>
              <Input
                id="location"
                type="text"
                placeholder="Ej: Sala de Juntas Principal"
                value={formData.location}
                onChange={e => handleInputChange('location', e.target.value)}
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.location}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Título del acta (opcional)
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Ej: Revisión trimestral de indicadores"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-500">Título descriptivo para identificar el acta fácilmente</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">3. Objetivo *</Label>
            <Textarea
              id="objective"
              rows={2}
              placeholder="Objetivo de la reunión..."
              value={formData.objective}
              onChange={e => handleInputChange('objective', e.target.value)}
              className={errors.objective ? 'border-red-500' : ''}
            />
            {errors.objective && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.objective}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">4. Orden del día *</Label>
            <Textarea
              id="agenda"
              rows={4}
              placeholder={"1. Tema 1\n2. Tema 2\n3. Tema 3..."}
              value={formData.agenda}
              onChange={e => handleInputChange('agenda', e.target.value)}
              className={errors.agenda ? 'border-red-500' : ''}
            />
            {errors.agenda && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.agenda}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="approved_by">Aprobado por (opcional)</Label>
            <div className="flex gap-2">
              <Select
                value={formData.approved_by}
                onValueChange={v => handleInputChange('approved_by', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin aprobar" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios
                    .filter(u => u.role === 'admin' || u.role === 'gerencia')
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.approved_by && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleInputChange('approved_by', '')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          ✨ SECCIÓN 2: ASISTENTES CON SELECTOR DUAL
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.mint }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: C.green }}>
                <Users className="h-5 w-5" /> 5. Asistentes *
              </CardTitle>
              <CardDescription>
                Seleccione usuarios del sistema o ingrese asistentes manualmente
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addAttendee}
              style={{ backgroundColor: C.mint }}
              className="text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendees.map((attendee, index) => (
              <div
                key={attendee.id}
                className="border rounded-lg p-4"
                style={{ borderColor: C.sand }}
              >
                <div className="flex items-start gap-4">
                  {/* Número */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                    style={{ backgroundColor: C.sand, color: C.green }}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Toggle: Sistema vs Manual */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={attendee.input_mode === 'system' ? 'default' : 'outline'}
                        onClick={() => toggleAttendeeMode(attendee.id)}
                        style={
                          attendee.input_mode === 'system'
                            ? { backgroundColor: C.green, color: 'white' }
                            : {}
                        }
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Usuario Sistema
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={attendee.input_mode === 'manual' ? 'default' : 'outline'}
                        onClick={() => toggleAttendeeMode(attendee.id)}
                        style={
                          attendee.input_mode === 'manual'
                            ? { backgroundColor: C.green, color: 'white' }
                            : {}
                        }
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Escribir Manual
                      </Button>
                    </div>

                    {/* Modo: SISTEMA */}
                    {attendee.input_mode === 'system' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Seleccionar usuario</Label>
                          <Select
                            value={attendee.user_id || ''}
                            onValueChange={v => selectSystemUser(attendee.id, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingUsuarios ? 'Cargando...' : 'Seleccionar usuario...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {usuarios.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name} ({u.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Vista previa */}
                        {attendee.user_id && (
                          <div className="p-3 rounded" style={{ backgroundColor: C.sand }}>
                            <p className="text-sm font-medium">{attendee.name}</p>
                            <p className="text-xs text-gray-600">{attendee.position}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modo: MANUAL */}
                    {attendee.input_mode === 'manual' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Nombre *</Label>
                          <Input
                            placeholder="Nombre completo"
                            value={attendee.name}
                            onChange={e => updateAttendeeManual(attendee.id, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Cargo *</Label>
                          <Input
                            placeholder="Cargo o posición"
                            value={attendee.position}
                            onChange={e => updateAttendeeManual(attendee.id, 'position', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón eliminar */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAttendee(attendee.id)}
                    disabled={attendees.length === 1}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {errors.attendees && (
            <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3" />{errors.attendees}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 3: DESARROLLO
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.mint }}>
        <CardHeader>
          <CardTitle style={{ color: C.green }}>6. Desarrollo *</CardTitle>
          <CardDescription>Descripción detallada de lo tratado en la reunión</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={10}
            placeholder="Describa detalladamente lo que se discutió en la reunión, acuerdos alcanzados, puntos de vista, etc."
            value={formData.development}
            onChange={e => handleInputChange('development', e.target.value)}
            className={errors.development ? 'border-red-500' : ''}
          />
          {errors.development && (
            <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3" />{errors.development}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">{formData.development.length} caracteres</p>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 4: COMPROMISOS
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.mint }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: C.green }}>
                <CheckSquare className="h-5 w-5" /> 7. Compromisos
              </CardTitle>
              <CardDescription>Actividades y responsables derivados de la reunión</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addCommitment}
              style={{ backgroundColor: C.mint }}
              className="text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-1/2">Actividad</TableHead>
                  <TableHead className="w-1/4">Responsable</TableHead>
                  <TableHead className="w-32">Fecha</TableHead>
                  <TableHead className="w-20 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitments.map((commitment, index) => (
                  <TableRow key={commitment.id}>
                    <TableCell className="text-center text-sm text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        placeholder="Descripción de la actividad..."
                        value={commitment.activity}
                        onChange={e => updateCommitment(commitment.id, 'activity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={commitment.responsible_id}
                        onValueChange={v => updateCommitment(commitment.id, 'responsible_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingUsuarios ? 'Cargando...' : 'Seleccionar...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {usuarios.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={commitment.due_date}
                        onChange={e => updateCommitment(commitment.id, 'due_date', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCommitment(commitment.id)}
                        disabled={commitments.length === 1}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {errors.commitments && (
            <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3" />{errors.commitments}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 5: EVIDENCIAS FOTOGRÁFICAS
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.mint }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: C.green }}>
                <Camera className="h-5 w-5" /> 8. Evidencias Fotográficas (Opcional)
              </CardTitle>
              <CardDescription>
                Sube fotos de la reunión (máx. {MAX_PHOTOS} fotos, 5MB c/u)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {totalPhotos}/{MAX_PHOTOS}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={totalPhotos >= MAX_PHOTOS}
                style={{ backgroundColor: C.mint }}
                className="text-white"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Subir Fotos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={photoInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photoError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {photoError}
            </div>
          )}

          {/* Galería de fotos */}
          {(existingPhotos.length > 0 || newPhotos.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Fotos existentes */}
              {existingPhotos.map((photo, index) => (
                <div key={`existing-${index}`} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2"
                    style={{ borderColor: C.sand }}
                  >
                    <img
                      src={photo.url || photo.preview}
                      alt={photo.name || `Foto ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => setLightboxSrc(photo.url || photo.preview)}
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                      onClick={() => setLightboxSrc(photo.url || photo.preview)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 w-7 p-0 bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => removeExistingPhoto(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {photo.name || `Foto ${index + 1}`}
                  </p>
                </div>
              ))}

              {/* Fotos nuevas */}
              {newPhotos.map((photo, index) => (
                <div key={`new-${index}`} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-blue-300">
                    <img
                      src={photo.preview}
                      alt={photo.name}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => setLightboxSrc(photo.preview)}
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                      onClick={() => setLightboxSrc(photo.preview)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 w-7 p-0 bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => removeNewPhoto(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    {photo.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {existingPhotos.length === 0 && newPhotos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay fotos adjuntas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Vista ampliada"
            className="max-w-full max-h-full object-contain"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-4 right-4"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </form>
  );
}