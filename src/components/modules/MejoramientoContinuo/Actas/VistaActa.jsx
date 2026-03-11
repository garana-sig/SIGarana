// src/components/modules/MejoramientoContinuo/Actas/VistaActa.jsx
// ✅ VERSIÓN MEJORADA - Preview tipo documento Word

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { 
  X,
  Download,
  Calendar,
  MapPin,
  FileText,
  Users,
  CheckSquare,
  Loader2,
  Archive,
  Clock,
  ImageIcon,
  ZoomIn
} from 'lucide-react';
import { useActas } from '@/hooks/useActas';
import { supabase } from '@/lib/supabase';

export default function VistaActa({ actaId, isOpen, onClose, onDeleted }) {
  const { fetchActaById } = useActas();
  const [acta, setActa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [archiving,  setArchiving]  = useState(false);
  const [lightbox,   setLightbox]   = useState(null); // { url, caption }

  useEffect(() => {
    if (isOpen && actaId) {
      loadActa();
    }
  }, [isOpen, actaId]);

  const loadActa = async () => {
    try {
      setLoading(true);
      const data = await fetchActaById(actaId);
      setActa(data);
      
      // Cargar nombres de usuarios (compromisos + creador + aprobador)
      const usersMap = {};
      
      // Usuarios de compromisos
      if (data?.commitments && data.commitments.length > 0) {
        const userIds = [...new Set(data.commitments.map(c => c.responsible_id))];
        
        for (const userId of userIds) {
          const { data: userData } = await supabase
            .from('profile')
            .select('full_name')
            .eq('id', userId)
            .single();
          
          if (userData) {
            usersMap[userId] = userData.full_name;
          }
        }
      }
      
      // Usuario creador
      if (data?.created_by) {
        const { data: creatorData } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', data.created_by)
          .single();
        
        if (creatorData) {
          usersMap[data.created_by] = creatorData.full_name;
        }
      }
      
      // Usuario aprobador
      if (data?.approved_by) {
        const { data: approverData } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', data.approved_by)
          .single();
        
        if (approverData) {
          usersMap[data.approved_by] = approverData.full_name;
        }
      }
      
      setUsuarios(usersMap);
      
    } catch (error) {
      console.error('Error cargando acta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!acta) return;
    
    try {
      setDownloading(true);
      
      // Preparar datos COMPLETOS para la plantilla
      const templateData = {
        consecutive:       acta.consecutive,
        title:             acta.title || '',
        meeting_date:      acta.meeting_date,
        location:          acta.location,
        objective:         acta.objective,
        agenda:            acta.agenda,
        development:       acta.development,
        attendees:         acta.attendees || [],
        commitments: (acta.commitments || []).map(c => ({
          activity:         c.activity,
          responsible_name: usuarios[c.responsible_id] || 'Sin asignar',
          due_date:         c.due_date
        })),
        created_by_name:   usuarios[acta.created_by]  || 'Sin asignar',
        approved_by_name:  usuarios[acta.approved_by] || '',
        // ── Fotos de evidencia ──────────────────────────────────────
        photos: (acta.photos || []).map((p, i) => ({
          url:     p.url,
          caption: p.caption || `Foto ${i + 1}`,
        })),
        has_photos:   (acta.photos || []).length > 0,
        photos_count: (acta.photos || []).length,
      };
      
      // Llamar a la Edge Function de Supabase
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_code: 'RE-DP-03',
            data: templateData
          })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar documento');
      }
      
      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${acta.consecutive}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Documento descargado');
      
    } catch (error) {
      console.error('Error descargando documento:', error);
      alert('❌ Error al generar documento: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('¿Está seguro de archivar esta acta?')) return;
    
    try {
      setArchiving(true);
      
      const { error } = await supabase
        .from('acta')
        .update({ status: 'archived' })
        .eq('id', actaId);
      
      if (error) throw error;
      
      alert('✅ Acta archivada correctamente');
      if (onDeleted) onDeleted();
      onClose();
    } catch (error) {
      console.error('Error archivando acta:', error);
      alert('❌ Error al archivar: ' + error.message);
    } finally {
      setArchiving(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: 'Borrador', color: '#6f7b2c', bg: '#6f7b2c20' },
      approved: { label: 'Aprobada', color: '#6dbd96', bg: '#6dbd9620' },
      archived: { label: 'Archivada', color: '#999', bg: '#99999920' }
    };
    
    const { label, color, bg } = config[status] || config.draft;
    
    return (
      <Badge style={{ backgroundColor: bg, color: color, fontSize: '11px', padding: '2px 8px' }}>
        {label}
      </Badge>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        
        {/* HEADER FIJO */}
        <div className="flex-shrink-0 border-b" style={{ backgroundColor: '#f8f9fa' }}>
          <DialogHeader className="p-6 pb-4">
            {/* Título y Botones */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold mb-2" style={{ color: '#2e5244' }}>
                  {loading ? 'Cargando...' : acta?.consecutive || 'Acta de Reunión'}
                </DialogTitle>
                {!loading && acta && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(acta.status)}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Creada: {new Date(acta.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Botones de Acción */}
              {acta && !loading && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownloadWord}
                    disabled={downloading}
                    style={{ backgroundColor: '#2e5244' }}
                    className="text-white"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Word
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleArchive}
                    disabled={archiving || acta.status === 'archived'}
                  >
                    {archiving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4 mr-2" />
                    )}
                    Archivar
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        {/* CONTENIDO CON SCROLL */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" style={{ color: '#2e5244' }} />
                <p className="text-gray-600">Cargando acta...</p>
              </div>
            </div>
          ) : acta ? (
            <div className="p-8" style={{ backgroundColor: '#ffffff' }}>
              
              {/* DOCUMENTO ESTILO WORD */}
              <div className="max-w-4xl mx-auto space-y-8">
                
                {/* ENCABEZADO DEL DOCUMENTO */}
                <div className="border-b-2 pb-6" style={{ borderColor: '#2e5244' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-1" style={{ color: '#2e5244' }}>
                        ACTA DE REUNIÓN
                      </h1>
                      <p className="text-sm text-gray-500">
                        Código: <span className="font-semibold text-gray-700">{acta.consecutive}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Versión 1.0</p>
                      <p className="text-xs text-gray-500">Sistema Integrado Garana</p>
                    </div>
                  </div>
                  
                  {acta.title && (
                    <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#f0f7f4' }}>
                      <p className="text-sm font-semibold text-gray-600 mb-1">ASUNTO:</p>
                      <p className="text-base font-medium" style={{ color: '#2e5244' }}>
                        {acta.title}
                      </p>
                    </div>
                  )}
                </div>

                {/* INFORMACIÓN GENERAL */}
                <div>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: '#2e5244' }}>
                    <FileText className="h-5 w-5" />
                    INFORMACIÓN GENERAL
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                        Fecha de Reunión
                      </label>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {new Date(acta.meeting_date).toLocaleDateString('es-CO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                        Lugar
                      </label>
                      <div className="flex items-center gap-2 text-gray-900">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{acta.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                      Objetivo
                    </label>
                    <p className="text-gray-900 leading-relaxed border-l-4 pl-4 py-2" style={{ borderColor: '#6dbd96' }}>
                      {acta.objective}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                      Orden del Día
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {acta.agenda}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ASISTENTES */}
                <div>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: '#2e5244' }}>
                    <Users className="h-5 w-5" />
                    ASISTENTES ({acta.attendees?.length || 0})
                  </h2>
                  
                  {acta.attendees && acta.attendees.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader style={{ backgroundColor: '#f0f7f4' }}>
                          <TableRow>
                            <TableHead className="w-10 text-center font-semibold text-xs" style={{ color: '#2e5244' }}>
                              #
                            </TableHead>
                            <TableHead className="font-semibold text-xs" style={{ color: '#2e5244' }}>
                              Nombre Completo
                            </TableHead>
                            <TableHead className="font-semibold text-xs" style={{ color: '#2e5244' }}>
                              Cargo
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {acta.attendees.map((attendee, index) => (
                            <TableRow key={attendee.id || index} className="hover:bg-gray-50">
                              <TableCell className="text-center text-gray-600 font-medium text-xs">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium text-gray-900 text-xs">
                                {attendee.name}
                              </TableCell>
                              <TableCell className="text-gray-700 text-xs">
                                {attendee.position}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay asistentes registrados</p>
                    </div>
                  )}
                </div>

                {/* DESARROLLO */}
                <div>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: '#2e5244' }}>
                    <FileText className="h-5 w-5" />
                    DESARROLLO DE LA REUNIÓN
                  </h2>
                  
                  <div className="bg-white border-2 rounded-lg p-6" style={{ borderColor: '#e5e7eb' }}>
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-justify">
                      {acta.development}
                    </p>
                  </div>
                </div>

                {/* COMPROMISOS */}
                <div>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: '#2e5244' }}>
                    <CheckSquare className="h-5 w-5" />
                    COMPROMISOS ({acta.commitments?.length || 0})
                  </h2>
                  
                  {acta.commitments && acta.commitments.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader style={{ backgroundColor: '#f0f7f4' }}>
                          <TableRow>
                            <TableHead className="w-10 text-center font-semibold text-xs" style={{ color: '#2e5244' }}>
                              #
                            </TableHead>
                            <TableHead className="font-semibold text-xs" style={{ color: '#2e5244' }}>
                              Actividad
                            </TableHead>
                            <TableHead className="font-semibold text-xs w-36" style={{ color: '#2e5244' }}>
                              Responsable
                            </TableHead>
                            <TableHead className="font-semibold text-xs w-24" style={{ color: '#2e5244' }}>
                              Fecha
                            </TableHead>
                            <TableHead className="font-semibold text-xs w-24 text-center" style={{ color: '#2e5244' }}>
                              Estado
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {acta.commitments.map((commitment, index) => {
                            const dueDate = new Date(commitment.due_date);
                            const today = new Date();
                            const isOverdue = dueDate < today && commitment.status !== 'completed';
                            
                            return (
                              <TableRow key={commitment.id || index} className="hover:bg-gray-50">
                                <TableCell className="text-center text-gray-600 font-medium text-xs">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="text-gray-900 text-xs">
                                  {commitment.activity}
                                </TableCell>
                                <TableCell className="font-medium text-gray-700 text-xs">
                                  {usuarios[commitment.responsible_id] || 'Cargando...'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                                    {dueDate.toLocaleDateString('es-CO', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: '2-digit'
                                    })}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={commitment.status === 'completed' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {commitment.status === 'completed' ? 'Completado' : 
                                     isOverdue ? 'Vencido' : 'Pendiente'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay compromisos registrados</p>
                    </div>
                  )}
                </div>

                {/* ── EVIDENCIAS FOTOGRÁFICAS ── */}
                {acta.photos && acta.photos.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2" style={{ borderColor: '#2e5244' }}>
                      <ImageIcon className="h-4 w-4" style={{ color: '#2e5244' }} />
                      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#2e5244' }}>
                        Evidencias Fotográficas ({acta.photos.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {acta.photos.map((photo, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg overflow-hidden border cursor-pointer"
                          style={{ borderColor: '#dedecc' }}
                          onClick={() => setLightbox({ url: photo.url, caption: photo.caption })}
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `Foto ${index + 1}`}
                            className="w-full h-36 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white" />
                          </div>
                          {photo.caption && (
                            <div className="bg-gray-50 px-2 py-1.5 border-t" style={{ borderColor: '#dedecc' }}>
                              <p className="text-xs text-gray-600 text-center">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FOOTER DEL DOCUMENTO */}
                <div className="border-t-2 pt-6 mt-12" style={{ borderColor: '#e5e7eb' }}>
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Elaborado por
                      </p>
                      <p className="font-medium text-gray-900">
                        {usuarios[acta.created_by] || 'Sin asignar'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(acta.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    {acta.approved_by && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                          Aprobado por
                        </p>
                        <p className="font-medium text-gray-900">
                          {usuarios[acta.approved_by] || 'Sin asignar'}
                        </p>
                        {acta.change_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(acta.change_date).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Este documento es propiedad de <span className="font-semibold">Garana SIG</span> y no puede ser reproducido sin autorización.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 text-lg">No se pudo cargar el acta</p>
            </div>
          )}
        </div>

        {/* FOOTER FIJO (opcional - muestra última actualización) */}
        {acta && !loading && (
          <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Última actualización: {new Date(acta.updated_at).toLocaleString('es-CO')}
              </span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* ── LIGHTBOX ── */}
    {lightbox && (
      <div
        className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
        onClick={() => setLightbox(null)}
      >
        <button
          onClick={() => setLightbox(null)}
          className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/40"
        >
          <X className="h-6 w-6" />
        </button>
        <div
          className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={lightbox.url}
            alt={lightbox.caption || 'Evidencia fotográfica'}
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
          />
          {lightbox.caption && (
            <p className="text-white/80 text-sm text-center bg-black/50 px-4 py-2 rounded-full">
              {lightbox.caption}
            </p>
          )}
        </div>
      </div>
    )}
    </>
  );
}