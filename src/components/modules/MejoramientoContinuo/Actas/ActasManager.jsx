// src/components/modules/MejoramientoContinuo/Actas/ActasManager.jsx
// ✅ VERSIÓN FINAL con PERMISOS completos + PAGINACIÓN inline

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  ArrowLeft, Plus, Eye, Edit, Download, Search, FileText,
  Calendar, MapPin, Users, AlertCircle, Loader2, Archive, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';

import FormularioActa from './FormularioActa';
import VistaActa from './VistaActa';
import { useActas } from '@/hooks/useActas';
import { useActasPermissions } from '@/hooks/useActasPermissions';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ── Paginación (inline, mismo patrón que RiskMatrixManager) ──────────────────
function Pagination({ currentPage, totalPages, totalRows, pageSize, onPage, onPageSize }) {
  if (totalRows === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalRows);

  const pages = [];
  const delta = 2;
  const left  = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);
  for (let i = left; i <= right; i++) pages.push(i);

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 6, border: '1px solid #D1D5DB',
    cursor: 'pointer', fontSize: 12, fontWeight: 500,
    background: 'white', color: '#374151',
  };
  const btnActive   = { ...btnBase, background: '#2e5244', color: 'white', border: '1px solid #2e5244' };
  const btnDisabled = { ...btnBase, opacity: 0.4, cursor: 'not-allowed' };

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginTop:8, paddingTop:8, borderTop:'1px solid #F3F4F6' }}>
      <span style={{ fontSize:11, color:'#6B7280' }}>
        Mostrando <strong>{from}–{to}</strong> de <strong>{totalRows}</strong> acta(s)
      </span>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <button style={currentPage === 1 ? btnDisabled : btnBase} onClick={() => currentPage > 1 && onPage(1)} title="Primera">
          <ChevronsLeft style={{ width:14, height:14 }} />
        </button>
        <button style={currentPage === 1 ? btnDisabled : btnBase} onClick={() => currentPage > 1 && onPage(currentPage - 1)} title="Anterior">
          <ChevronLeft style={{ width:14, height:14 }} />
        </button>
        {left > 1 && (<><button style={btnBase} onClick={() => onPage(1)}>1</button>{left > 2 && <span style={{ fontSize:12, color:'#9CA3AF', padding:'0 2px' }}>…</span>}</>)}
        {pages.map(p => (<button key={p} style={p === currentPage ? btnActive : btnBase} onClick={() => onPage(p)}>{p}</button>))}
        {right < totalPages && (<>{right < totalPages - 1 && <span style={{ fontSize:12, color:'#9CA3AF', padding:'0 2px' }}>…</span>}<button style={btnBase} onClick={() => onPage(totalPages)}>{totalPages}</button></>)}
        <button style={currentPage === totalPages ? btnDisabled : btnBase} onClick={() => currentPage < totalPages && onPage(currentPage + 1)} title="Siguiente">
          <ChevronRight style={{ width:14, height:14 }} />
        </button>
        <button style={currentPage === totalPages ? btnDisabled : btnBase} onClick={() => currentPage < totalPages && onPage(totalPages)} title="Última">
          <ChevronsRight style={{ width:14, height:14 }} />
        </button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:11, color:'#6B7280' }}>Filas por página:</span>
        <select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
          style={{ padding:'2px 6px', border:'1px solid #D1D5DB', borderRadius:6, fontSize:12, height:28 }}>
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ActasManager({ onBack }) {
  const {
    actas, loading, error, fetchActas, fetchActaById, createActa, updateActa
  } = useActas();

  const {
    canEditActa, canArchiveActa, canDeleteActa, canDownloadActa, user, profile
  } = useActasPermissions();

  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [showForm,      setShowForm]      = useState(false);
  const [selectedActa,  setSelectedActa]  = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewActaId,    setViewActaId]    = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // ── Paginación ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filteredActas = useMemo(() => actas.filter(acta => {
    const matchesSearch =
      acta.consecutive.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acta.objective.toLowerCase().includes(searchTerm.toLowerCase())   ||
      acta.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || acta.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [actas, searchTerm, filterStatus]);

  // ── Cálculo de página ─────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredActas.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pageActas  = filteredActas.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearchChange = (v) => { setSearchTerm(v);   setCurrentPage(1); };
  const handleStatusChange = (v) => { setFilterStatus(v); setCurrentPage(1); };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const config = {
      draft:    { label: 'Borrador',  color: '#6f7b2c' },
      approved: { label: 'Aprobada',  color: '#6dbd96' },
      rejected: { label: 'Rechazada', color: '#dc2626' },
      archived: { label: 'Archivada', color: '#999'    }
    };
    const { label, color } = config[status] || config.draft;
    return (
      <Badge className="text-xs py-0 px-2"
        style={{ backgroundColor: `${color}20`, color }}>
        {label}
      </Badge>
    );
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveActa = async (actaData) => {
    try {
      if (selectedActa) await updateActa(selectedActa.id, actaData);
      else              await createActa(actaData);
      setShowForm(false);
      setSelectedActa(null);
    } catch (error) {
      alert('❌ Error al guardar: ' + error.message);
    }
  };

  const handleEditActa = async (acta) => {
    try {
      const fullActa = await fetchActaById(acta.id);
      setSelectedActa(fullActa);
      setShowForm(true);
    } catch (error) {
      alert('❌ Error al cargar acta: ' + error.message);
    }
  };

  const handleViewActa    = (acta) => { setViewActaId(acta.id); setShowViewModal(true); };
  const handleActaDeleted = ()     => { setShowViewModal(false); setViewActaId(null); fetchActas(); };

  const handleDownloadActa = async (acta) => {
    try {
      setDownloadingId(acta.id);
      const fullActa = await fetchActaById(acta.id);
      const usuarios = {};

      if (fullActa.commitments?.length > 0) {
        const userIds = [...new Set(fullActa.commitments.map(c => c.responsible_id))];
        for (const userId of userIds) {
          const { data } = await supabase.from('profile').select('full_name').eq('id', userId).single();
          if (data) usuarios[userId] = data.full_name;
        }
      }
      for (const field of ['created_by', 'approved_by']) {
        if (fullActa[field]) {
          const { data } = await supabase.from('profile').select('full_name').eq('id', fullActa[field]).single();
          if (data) usuarios[fullActa[field]] = data.full_name;
        }
      }

      const templateData = {
        consecutive: fullActa.consecutive, title: fullActa.title || '',
        meeting_date: fullActa.meeting_date, location: fullActa.location,
        objective: fullActa.objective, agenda: fullActa.agenda, development: fullActa.development,
        attendees: fullActa.attendees || [],
        commitments: (fullActa.commitments || []).map(c => ({
          activity: c.activity, responsible_name: usuarios[c.responsible_id] || 'Sin asignar', due_date: c.due_date
        })),
        created_by_name:  usuarios[fullActa.created_by]  || 'Sin asignar',
        approved_by_name: usuarios[fullActa.approved_by] || '',
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ template_code: 'RE-DP-03', data: templateData }) }
      );
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error al generar documento'); }

      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${fullActa.consecutive}.docx`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (error) {
      alert('❌ Error al generar documento: ' + error.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleArchiveActa = async (acta) => {
    if (!confirm(`¿Está seguro de archivar el acta ${acta.consecutive}?`)) return;
    try {
      await updateActa(acta.id, { status: 'archived' });
      alert('✅ Acta archivada correctamente');
      fetchActas();
    } catch (error) { alert('❌ Error al archivar: ' + error.message); }
  };

  const handleDeleteActa = async (acta) => {
    if (!confirm(`⚠️ ELIMINAR PERMANENTEMENTE\n\nEsta acción NO se puede deshacer.\n¿Está completamente seguro de eliminar el acta ${acta.consecutive}?`)) return;
    try {
      const { error } = await supabase.from('acta').delete().eq('id', acta.id);
      if (error) throw error;
      alert('✅ Acta eliminada permanentemente de la base de datos');
      fetchActas();
    } catch (error) { alert('❌ Error al eliminar: ' + error.message); }
  };

  // ── Vista formulario ──────────────────────────────────────────────────────
  if (showForm) {
    return (
      <FormularioActa
        actaToEdit={selectedActa}
        onCancel={() => { setShowForm(false); setSelectedActa(null); }}
        onSave={handleSaveActa}
      />
    );
  }

  // ── Vista principal ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />Volver
          </Button>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#2e5244' }}>Actas de Reunión</h2>
            <p className="text-sm mt-1" style={{ color: '#6f7b2c' }}>Gestión de actas y compromisos</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} style={{ backgroundColor: '#2e5244' }} className="text-white gap-2">
          <Plus className="h-4 w-4" />Nueva Acta
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-2" style={{ borderColor: '#dedecc' }}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar por consecutivo, objetivo o lugar..."
                  value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
                <SelectItem value="archived">Archivadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#2e5244' }}>Listado de Actas</CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando...'
                  : `${filteredActas.length} acta${filteredActas.length !== 1 ? 's' : ''} encontrada${filteredActas.length !== 1 ? 's' : ''}`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2e5244' }}></div>
              <p className="text-gray-500">Cargando actas...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
              <p className="text-red-600">Error al cargar actas</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
              <Button onClick={() => fetchActas()} className="mt-4" variant="outline">Reintentar</Button>
            </div>
          ) : filteredActas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No se encontraron actas</p>
              <p className="text-sm">Intenta cambiar los filtros o crea una nueva acta</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Consecutivo</TableHead>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Objetivo</TableHead>
                      <TableHead className="text-xs">Lugar</TableHead>
                      <TableHead className="text-center text-xs">Asistentes</TableHead>
                      <TableHead className="text-center text-xs">Compromisos</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-right text-xs">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageActas.map((acta) => (
                      <TableRow key={acta.id}>
                        <TableCell className="font-medium text-xs">{acta.consecutive}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>{new Date(acta.meeting_date).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'2-digit' })}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="max-w-[200px] truncate" title={acta.objective}>{acta.objective}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="max-w-[100px] truncate" title={acta.location}>{acta.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1 text-xs py-0 px-1">
                            <Users className="h-3 w-3" />{acta.attendees_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs py-0 px-1">{acta.commitments_count}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{getStatusBadge(acta.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver detalles" onClick={() => handleViewActa(acta)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canDownloadActa(profile?.role) && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Descargar Word"
                                onClick={() => handleDownloadActa(acta)} disabled={downloadingId === acta.id}>
                                {downloadingId === acta.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                            {canEditActa(acta, user?.id, profile?.role) && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => handleEditActa(acta)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canArchiveActa(profile?.role) && acta.status !== 'archived' && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700" title="Archivar" onClick={() => handleArchiveActa(acta)}>
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDeleteActa(profile?.role) && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" title="Eliminar permanentemente" onClick={() => handleDeleteActa(acta)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── Paginación ── */}
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalRows={filteredActas.length}
                pageSize={pageSize}
                onPage={setCurrentPage}
                onPageSize={(s) => { setPageSize(s); setCurrentPage(1); }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <VistaActa actaId={viewActaId} isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewActaId(null); }}
        onDeleted={handleActaDeleted} onEdit={handleEditActa} />
    </div>
  );
}