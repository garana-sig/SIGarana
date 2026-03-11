// src/components/modules/MejoramientoContinuo/Actas/FormularioActa.jsx
// ✅ v2.0 — Con sección de Evidencias Fotográficas

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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc' };

// Tipos aceptados para fotos
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

  const [attendees,    setAttendees]    = useState([{ id: Date.now(), name: '', position: '' }]);
  const [commitments,  setCommitments]  = useState([{ id: Date.now(), activity: '', responsible_id: '', due_date: '' }]);

  // ── FOTOS ──────────────────────────────────────────────────────
  // existingPhotos: fotos ya guardadas en BD (tienen .path y .url o .name)
  // newPhotos: fotos recién seleccionadas (File[] con preview local)
  // deletedPaths: rutas de fotos a eliminar del Storage al guardar
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos,       setNewPhotos]      = useState([]); // {file, preview, name}
  const [deletedPaths,    setDeletedPaths]   = useState([]);
  const [photoError,      setPhotoError]     = useState('');
  const [lightboxSrc,     setLightboxSrc]    = useState(null);
  const photoInputRef = useRef();
  // ────────────────────────────────────────────────────────────────

  const [errors,       setErrors]       = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usuarios,     setUsuarios]     = useState([]);
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
        title:       actaToEdit.title        || '',
        meeting_date: actaToEdit.meeting_date || '',
        location:    actaToEdit.location     || '',
        objective:   actaToEdit.objective    || '',
        agenda:      actaToEdit.agenda       || '',
        development: actaToEdit.development  || '',
        approved_by: actaToEdit.approved_by  || '',
      });
      if (actaToEdit.attendees?.length > 0) {
        setAttendees(actaToEdit.attendees.map(a => ({
          id: a.id || Date.now() + Math.random(),
          name: a.name,
          position: a.position
        })));
      }
      if (actaToEdit.commitments?.length > 0) {
        setCommitments(actaToEdit.commitments.map(c => ({
          id: c.id || Date.now() + Math.random(),
          activity: c.activity,
          responsible_id: c.responsible_id,
          due_date: c.due_date
        })));
      }
      // Cargar fotos existentes (pueden tener URL firmada o no)
      if (actaToEdit.photos?.length > 0) {
        setExistingPhotos(actaToEdit.photos);
      }
    }
  }, [actaToEdit]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  // ── ASISTENTES ─────────────────────────────────────────────────
  const addAttendee    = () => setAttendees(p => [...p, { id: Date.now(), name: '', position: '' }]);
  const removeAttendee = (id) => { if (attendees.length > 1) setAttendees(p => p.filter(a => a.id !== id)); };
  const updateAttendee = (id, f, v) => setAttendees(p => p.map(a => a.id === id ? { ...a, [f]: v } : a));

  // ── COMPROMISOS ────────────────────────────────────────────────
  const addCommitment    = () => setCommitments(p => [...p, { id: Date.now(), activity: '', responsible_id: '', due_date: '' }]);
  const removeCommitment = (id) => { if (commitments.length > 1) setCommitments(p => p.filter(c => c.id !== id)); };
  const updateCommitment = (id, f, v) => setCommitments(p => p.map(c => c.id === id ? { ...c, [f]: v } : c));

  // ── FOTOS — agregar ────────────────────────────────────────────
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotoError('');

    const totalAfter = existingPhotos.length + newPhotos.length + files.length;
    if (totalAfter > MAX_PHOTOS) {
      setPhotoError(`Máximo ${MAX_PHOTOS} fotos por acta`);
      e.target.value = '';
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setPhotoError(`"${file.name}" no es una imagen válida (JPG, PNG, WEBP, GIF)`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoError(`"${file.name}" supera 5MB`);
        continue;
      }
      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        id: Date.now() + Math.random()
      });
    }

    setNewPhotos(p => [...p, ...validFiles]);
    e.target.value = '';
  };

  // ── FOTOS — eliminar foto NUEVA (aún no guardada) ──────────────
  const removeNewPhoto = (photoId) => {
    setNewPhotos(p => {
      const removed = p.find(x => x.id === photoId);
      if (removed) URL.revokeObjectURL(removed.preview);
      return p.filter(x => x.id !== photoId);
    });
  };

  // ── FOTOS — eliminar foto EXISTENTE (ya guardada) ─────────────
  const removeExistingPhoto = (photo) => {
    setDeletedPaths(p => [...p, photo.path]);
    setExistingPhotos(p => p.filter(x => x.path !== photo.path));
  };

  // ── VALIDACIÓN ─────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!formData.meeting_date) newErrors.meeting_date = 'La fecha es obligatoria';
    if (!formData.location)     newErrors.location     = 'El lugar es obligatorio';
    if (!formData.objective)    newErrors.objective    = 'El objetivo es obligatorio';
    if (!formData.agenda)       newErrors.agenda       = 'El orden del día es obligatorio';
    if (!formData.development)  newErrors.development  = 'El desarrollo es obligatorio';

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

  // ── GUARDAR ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const validAttendees = attendees
        .filter(a => a.name.trim() && a.position.trim())
        .map((a, i) => ({ name: a.name.trim(), position: a.position.trim(), order_index: i + 1 }));

      const validCommitments = commitments
        .filter(c => c.activity.trim() && c.responsible_id && c.due_date)
        .map((c, i) => ({ activity: c.activity.trim(), responsible_id: c.responsible_id, due_date: c.due_date, order_index: i + 1 }));

      const actaData = {
        ...formData,
        approved_by:      formData.approved_by || null,
        attendees:        validAttendees,
        commitments:      validCommitments,
        // Fotos
        photos:           existingPhotos,       // fotos existentes (sin las eliminadas)
        newPhotoFiles:    newPhotos.map(p => p.file), // File[] nuevas
        deletedPhotoPaths: deletedPaths,        // paths a borrar del Storage
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
                id="meeting_date" type="date"
                value={formData.meeting_date}
                onChange={e => handleInputChange('meeting_date', e.target.value)}
                className={errors.meeting_date ? 'border-red-500' : ''}
              />
              {errors.meeting_date && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.meeting_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> 2. Lugar *
              </Label>
              <Input
                id="location" type="text" placeholder="Ej: Sala de Juntas Principal"
                value={formData.location}
                onChange={e => handleInputChange('location', e.target.value)}
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.location}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Título del acta (opcional)
            </Label>
            <Input
              id="title" type="text" placeholder="Ej: Revisión trimestral de indicadores"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-500">Título descriptivo para identificar el acta fácilmente</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">3. Objetivo *</Label>
            <Textarea
              id="objective" rows={2} placeholder="Objetivo de la reunión..."
              value={formData.objective}
              onChange={e => handleInputChange('objective', e.target.value)}
              className={errors.objective ? 'border-red-500' : ''}
            />
            {errors.objective && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.objective}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">4. Orden del día *</Label>
            <Textarea
              id="agenda" rows={4} placeholder={"1. Tema 1\n2. Tema 2\n3. Tema 3..."}
              value={formData.agenda}
              onChange={e => handleInputChange('agenda', e.target.value)}
              className={errors.agenda ? 'border-red-500' : ''}
            />
            {errors.agenda && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.agenda}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 2: ASISTENTES
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.mint }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: C.green }}>
                <Users className="h-5 w-5" /> 5. Asistentes
              </CardTitle>
              <CardDescription>Personas que participaron en la reunión</CardDescription>
            </div>
            <Button type="button" size="sm" onClick={addAttendee} style={{ backgroundColor: C.mint }} className="text-white">
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
                  <TableHead>Nombre *</TableHead>
                  <TableHead>Cargo *</TableHead>
                  <TableHead className="w-20 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee, index) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="text-center text-sm text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <Input placeholder="Nombre completo" value={attendee.name} onChange={e => updateAttendee(attendee.id, 'name', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Cargo o posición" value={attendee.position} onChange={e => updateAttendee(attendee.id, 'position', e.target.value)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeAttendee(attendee.id)} disabled={attendees.length === 1} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {errors.attendees && <p className="text-sm text-red-500 flex items-center gap-1 mt-2"><AlertCircle className="h-3 w-3" />{errors.attendees}</p>}
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
          {errors.development && <p className="text-sm text-red-500 flex items-center gap-1 mt-2"><AlertCircle className="h-3 w-3" />{errors.development}</p>}
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
            <Button type="button" size="sm" onClick={addCommitment} style={{ backgroundColor: C.mint }} className="text-white">
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
                      <Textarea rows={2} placeholder="Descripción de la actividad..." value={commitment.activity} onChange={e => updateCommitment(commitment.id, 'activity', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Select value={commitment.responsible_id} onValueChange={v => updateCommitment(commitment.id, 'responsible_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingUsuarios ? 'Cargando...' : 'Seleccionar...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="date" value={commitment.due_date} onChange={e => updateCommitment(commitment.id, 'due_date', e.target.value)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCommitment(commitment.id)} disabled={commitments.length === 1} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {errors.commitments && <p className="text-sm text-red-500 flex items-center gap-1 mt-2"><AlertCircle className="h-3 w-3" />{errors.commitments}</p>}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 5 🆕: EVIDENCIAS FOTOGRÁFICAS
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.olive }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: C.green }}>
                <Camera className="h-5 w-5" />
                8. Evidencias Fotográficas
                {totalPhotos > 0 && (
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: C.mint }}>
                    {totalPhotos} foto{totalPhotos !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Fotos de la reunión — opcional, máx {MAX_PHOTOS} fotos de 5MB c/u (JPG, PNG, WEBP)
              </CardDescription>
            </div>
            <Button
              type="button" size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={totalPhotos >= MAX_PHOTOS}
              style={{ backgroundColor: C.olive }}
              className="text-white"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Agregar fotos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {photoError && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{photoError}</span>
            </div>
          )}

          {totalPhotos === 0 ? (
            /* Zona de drop vacía */
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 hover:bg-gray-50 transition-colors"
              style={{ borderColor: C.sand }}
            >
              <Camera className="h-10 w-10 text-gray-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Click para agregar fotos</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · máx 5MB por foto · hasta {MAX_PHOTOS} fotos</p>
              </div>
            </button>
          ) : (
            /* Grid de miniaturas */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">

              {/* Fotos EXISTENTES (ya guardadas en BD) */}
              {existingPhotos.map((photo, idx) => (
                <div key={`existing-${idx}`} className="relative group aspect-square">
                  <img
                    src={photo.url || ''}
                    alt={photo.name || `Foto ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg border-2 border-gray-200 cursor-pointer"
                    style={{ borderColor: C.sand }}
                    onClick={() => photo.url && setLightboxSrc(photo.url)}
                    onError={e => { e.target.src = ''; e.target.className = 'w-full h-full rounded-lg bg-gray-100'; }}
                  />
                  {/* Overlay hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {photo.url && (
                      <button type="button" onClick={() => setLightboxSrc(photo.url)} className="p-1.5 rounded-full bg-white/80 hover:bg-white">
                        <ZoomIn className="h-3.5 w-3.5 text-gray-700" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeExistingPhoto(photo)} className="p-1.5 rounded-full bg-red-500/90 hover:bg-red-600">
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 bg-black/50 rounded text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.name}
                  </div>
                </div>
              ))}

              {/* Fotos NUEVAS (pendientes de guardar) */}
              {newPhotos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square">
                  <img
                    src={photo.preview}
                    alt={photo.name}
                    className="w-full h-full object-cover rounded-lg border-2"
                    style={{ borderColor: C.mint }}
                    onClick={() => setLightboxSrc(photo.preview)}
                  />
                  {/* Badge "Nueva" */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: C.mint }}>
                    Nueva
                  </div>
                  {/* Overlay hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button type="button" onClick={() => setLightboxSrc(photo.preview)} className="p-1.5 rounded-full bg-white/80 hover:bg-white">
                      <ZoomIn className="h-3.5 w-3.5 text-gray-700" />
                    </button>
                    <button type="button" onClick={() => removeNewPhoto(photo.id)} className="p-1.5 rounded-full bg-red-500/90 hover:bg-red-600">
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 bg-black/50 rounded text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.name}
                  </div>
                </div>
              ))}

              {/* Botón agregar más */}
              {totalPhotos < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: C.sand }}
                >
                  <ImagePlus className="h-6 w-6 text-gray-300" />
                  <span className="text-[11px] text-gray-400">Agregar</span>
                </button>
              )}
            </div>
          )}

          {totalPhotos > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              {totalPhotos} de {MAX_PHOTOS} fotos · pasa el cursor sobre una foto para ampliarla o eliminarla
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          SECCIÓN 6: APROBACIÓN
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2" style={{ borderColor: C.sand }}>
        <CardHeader>
          <CardTitle style={{ color: C.green }}>Aprobación</CardTitle>
          <CardDescription>Opcional: Seleccionar quién aprueba el acta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="approved_by">Aprobado por</Label>
            <Select
              value={formData.approved_by}
              onValueChange={v => handleInputChange('approved_by', v)}
            >
              <SelectTrigger id="approved_by">
                <SelectValue placeholder={loadingUsuarios ? 'Cargando usuarios...' : 'Seleccionar usuario...'} />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Si no se selecciona, el acta quedará en estado "Borrador"</p>
          </div>
        </CardContent>
      </Card>

      {/* Botones finales */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" style={{ backgroundColor: C.green }} className="text-white" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Guardando...' : (actaToEdit ? 'Actualizar Acta' : 'Guardar Acta')}
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LIGHTBOX — ampliar foto
      ═══════════════════════════════════════════════════════ */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxSrc}
              alt="Vista ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}