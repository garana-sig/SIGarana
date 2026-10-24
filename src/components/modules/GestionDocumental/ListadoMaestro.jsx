// src/components/modules/GestionDocumental/ListadoMaestro.jsx
// 🆕 18-oct-2026: botón Eliminar definitivamente (hard delete, solo admin)
import React, { useState, useMemo } from 'react';
import { useDocuments, useDocumentTypes, useProcesses } from '@/hooks/useDocuments';
import { useFileDownload } from '@/hooks/useFileDownload';
import ApprovalModal from './ApprovalModal';
import { exportListadoMaestro } from '@/utils/exportListadoMaestro'; // 🆕 RE-DP-11

// 🆕 Fechas del documento (change_date) sin desfase de zona horaria.
// Se guardan como fecha "pura" ('2023-02-22 00:00+00'); con new Date() se
// mostraban un día antes en Colombia (UTC-5). Se toma la parte YYYY-MM-DD.
// created_at (fecha real de carga al sistema) sí se convierte a hora local.
const fmtFechaDoc = (changeDate, createdAt) => {
  try {
    if (changeDate) {
      const [y, m, d] = String(changeDate).slice(0, 10).split('-');
      return `${d}/${m}/${y.slice(2)}`;
    }
    if (createdAt) {
      return new Date(createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  } catch { /* fecha inválida */ }
  return '-';
};
import EditDocumentModal from './EditDocumentModal';
import DocumentViewerModal from './DocumentViewerModal';
import { useAuth } from '@/context/AuthContext';                              // 🆕
import { supabase } from '@/lib/supabase';                                    // 🆕 eliminar documento
import { useDocumentTraceability } from '@/hooks/useDocumentTraceability';   // 🆕
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  FileText, Search, Plus, Eye, Edit, Download,
  Filter, RefreshCw, ChevronDown, ChevronRight, Loader2,
  ChevronsLeft, ChevronsRight, ShieldCheck, ShieldOff, FileSpreadsheet,
  Trash2, AlertTriangle, X,
} from 'lucide-react';

// ── Opciones de página ────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ── Paginación (inline, mismo patrón que RiskMatrixManager) ──────────────────
function Pagination({ currentPage, totalPages, totalRows, pageSize, onPage, onPageSize, label = 'documento(s)' }) {
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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 8,
      borderTop: '1px solid #F3F4F6',
      zoom: '1.333', // compensa el zoom: 0.75 del wrapper de tabla
    }}>
      <span style={{ fontSize: 11, color: '#6B7280' }}>
        Mostrando <strong>{from}–{to}</strong> de <strong>{totalRows}</strong> {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={currentPage === 1 ? btnDisabled : btnBase}
          onClick={() => currentPage > 1 && onPage(1)} title="Primera">
          <ChevronsLeft style={{ width: 14, height: 14 }} />
        </button>
        <button style={currentPage === 1 ? btnDisabled : btnBase}
          onClick={() => currentPage > 1 && onPage(currentPage - 1)} title="Anterior">
          <ChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} />
        </button>
        {left > 1 && (
          <><button style={btnBase} onClick={() => onPage(1)}>1</button>
          {left > 2 && <span style={{ fontSize: 12, color: '#9CA3AF', padding: '0 2px' }}>…</span>}</>
        )}
        {pages.map(pg => (
          <button key={pg} style={pg === currentPage ? btnActive : btnBase} onClick={() => onPage(pg)}>
            {pg}
          </button>
        ))}
        {right < totalPages && (
          <>{right < totalPages - 1 && <span style={{ fontSize: 12, color: '#9CA3AF', padding: '0 2px' }}>…</span>}
          <button style={btnBase} onClick={() => onPage(totalPages)}>{totalPages}</button></>
        )}
        <button style={currentPage === totalPages ? btnDisabled : btnBase}
          onClick={() => currentPage < totalPages && onPage(currentPage + 1)} title="Siguiente">
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
        <button style={currentPage === totalPages ? btnDisabled : btnBase}
          onClick={() => currentPage < totalPages && onPage(totalPages)} title="Última">
          <ChevronsRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>Filas por página:</span>
        <select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
          style={{ padding: '2px 6px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 12, height: 28 }}>
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// 🆕 ELIMINAR DOCUMENTO (hard delete) — solo admin (RLS: "Only admin can
// delete documents" en la tabla y en Storage).
// Borra: la fila de `document` (en cascada: document_version,
// document_approval y notification) y los archivos del bucket `documents`
// (versión vigente + versiones anteriores). No se puede deshacer.
// Para confirmar hay que escribir el código del documento.
// ═══════════════════════════════════════════════════════════════════════
async function eliminarDocumentoDefinitivo(doc) {
  // 1. Rutas de archivos ANTES de borrar (la cascada borra document_version)
  const { data: versiones, error: eVer } = await supabase
    .from('document_version').select('file_path').eq('document_id', doc.id);
  if (eVer) throw eVer;
  const rutas = [...new Set([doc.file_path, ...(versiones || []).map((v) => v.file_path)].filter(Boolean))];

  // 2. Borrar en BD (si RLS no lo permite no hay error, solo 0 filas → se valida con .select)
  //    (count de PostgREST puede venir en 0 aunque sí borre: por eso se usa .select('id'))
  const { data: borrados, error: eDel } = await supabase
    .from('document').delete().eq('id', doc.id).select('id');
  if (eDel) throw eDel;
  if (!borrados?.length) throw new Error('No tienes permiso para eliminar este documento.');

  // 3. Borrar archivos de Storage (si falla, el documento ya no existe: solo se avisa)
  let avisoStorage = null;
  if (rutas.length) {
    const { error: eSto } = await supabase.storage.from('documents').remove(rutas);
    if (eSto) avisoStorage = `El documento se eliminó, pero no se pudieron borrar ${rutas.length} archivo(s) del almacenamiento: ${eSto.message}`;
  }
  return { archivos: rutas.length, avisoStorage };
}

function DeleteDocumentModal({ doc, onClose, onDeleted }) {
  const [texto, setTexto]   = useState('');
  const [borrando, setBorr] = useState(false);
  const [error, setError]   = useState('');
  if (!doc) return null;
  const ok = texto.trim().toUpperCase() === String(doc.code || '').toUpperCase();

  const confirmar = async () => {
    if (!ok) return;
    setBorr(true); setError('');
    try {
      const res = await eliminarDocumentoDefinitivo(doc);
      onDeleted(doc, res);
    } catch (e) {
      setError(e.message);
      setBorr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 rounded-t-xl bg-red-600 text-white">
          <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5" />Eliminar documento</div>
          <button onClick={onClose} disabled={borrando} className="opacity-80 hover:opacity-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-lg p-3" style={{ background: '#f5f5ef' }}>
            <p className="font-bold" style={{ color: '#2e5244' }}>{doc.code} · v{String(doc.version || 1).padStart(2, '0')}</p>
            <p className="text-gray-700">{(doc.name || '').toUpperCase()}</p>
          </div>
          <p className="text-gray-700">
            Se eliminará <b>definitivamente</b>: el documento, su historial de versiones, aprobaciones,
            notificaciones y los archivos guardados. <b className="text-red-600">No se puede deshacer.</b>
          </p>
          <p className="text-xs text-gray-500">
            Si el documento solo dejó de usarse y debe quedar trazabilidad, es mejor <b>archivarlo</b> en lugar de eliminarlo.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Para confirmar escribe el código <b>{doc.code}</b></span>
            <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} disabled={borrando}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </label>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={borrando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!ok || borrando} className="bg-red-600 hover:bg-red-700 text-white">
            {borrando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Eliminar definitivamente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ListadoMaestro({ onCreateNew, onEdit, onView }) {
  const [searchTerm,      setSearchTerm]      = useState('');
  const [selectedType,    setSelectedType]    = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [selectedStatus,  setSelectedStatus]  = useState(null);
  const [showFilters,     setShowFilters]     = useState(false);
  const [expandedProcesses, setExpandedProcesses] = useState({});

  // Modales
  const [selectedDocument,    setSelectedDocument]    = useState(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isEditModalOpen,     setIsEditModalOpen]     = useState(false);
  const [documentToDelete,    setDocumentToDelete]    = useState(null);   // 🆕
  const [deleteMsg,           setDeleteMsg]           = useState(null);   // 🆕
  const [documentToEdit,      setDocumentToEdit]      = useState(null);
  const [isViewerModalOpen,   setIsViewerModalOpen]   = useState(false);
  const [documentToView,      setDocumentToView]      = useState(null);

  // 🆕 Trazabilidad de cambios (interruptor solo admin)
  const { isAdmin, isGerencia, hasPermission, user } = useAuth();
  // v3 permisos: aprobar = admin/gerencia o permiso · editar = permiso o sus propios borradores
  const canApprove = hasPermission('gestion_documental:documentos:approve');
  const canEditDoc = (doc) => hasPermission('gestion_documental:documentos:edit')
    || (doc.created_by === user?.id && ['draft', 'pending_approval'].includes(doc.status));
  const {
    traceabilityEnabled, loading: traceabilityLoading, saving: traceabilitySaving, setTraceability,
  } = useDocumentTraceability();

  const handleToggleTraceability = async () => {
    const next = !traceabilityEnabled;
    const msg = next
      ? '¿ACTIVAR la trazabilidad de cambios?\n\n' +
        '• Cambiar un archivo creará una nueva versión con motivo y aprobación de gerencia.\n' +
        '• Código, tipo y proceso quedarán bloqueados en la edición.\n' +
        '• Se termina el modo de corrección directa (carga inicial).'
      : '¿DESACTIVAR la trazabilidad de cambios?\n\n' +
        '• Admin y gerencia podrán corregir directamente código, nombre, tipo, proceso y archivo.\n' +
        '• Los cambios NO generarán versiones ni requerirán aprobación.';
    if (!window.confirm(msg)) return;
    const res = await setTraceability(next);
    if (!res.success) alert(`❌ ${res.error}`);
  };

  // ── Paginación ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  const {
    documents = [], loading = false, error = null,
    stats = { total: 0, byStatus: { draft: 0, pending_approval: 0, published: 0, archived: 0 } },
    refresh = () => {}
  } = useDocuments({ searchTerm, documentTypeId: selectedType, processId: selectedProcess, status: selectedStatus }) || {};

  const { documentTypes = [] } = useDocumentTypes() || {};
  const { processes = [] }     = useProcesses()     || {};
  const { downloadDocument, downloading } = useFileDownload();

  // ── Documentos activos (excluye archivados) ───────────────────────────────
  // 🆕 Orden: por proceso (orden de la tabla process) y dentro de cada proceso
  // por CÓDIGO en orden natural (GU-DP-01, GU-DP-02 … PR-DP-10), no por fecha.
  const activeDocuments = useMemo(() => {
    const ordenProc = new Map(processes.map((p, i) => [p.id, i]));
    return documents
      .filter(doc => doc.status !== 'archived')
      .sort((a, b) =>
        (ordenProc.get(a.process_id) ?? 999) - (ordenProc.get(b.process_id) ?? 999) ||
        String(a.code || '').localeCompare(String(b.code || ''), 'es', { numeric: true })
      );
  }, [documents, processes]);

  // ── Paginación: slice de la lista plana ───────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(activeDocuments.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pageDocuments = activeDocuments.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Agrupar por proceso SOLO los docs de la página actual ─────────────────
  const groupedByProcess = useMemo(() =>
    pageDocuments.reduce((acc, doc) => {
      const processName = doc?.process?.name || 'Sin Proceso';
      if (!acc[processName]) acc[processName] = [];
      acc[processName].push(doc);
      return acc;
    }, {}),
    [pageDocuments]
  );

  // Resetear página al cambiar filtros
  const handleSearchChange  = (v) => { setSearchTerm(v);      setCurrentPage(1); };
  const handleTypeChange    = (v) => { setSelectedType(v);    setCurrentPage(1); };
  const handleProcessChange = (v) => { setSelectedProcess(v); setCurrentPage(1); };
  const handleStatusChange  = (v) => { setSelectedStatus(v);  setCurrentPage(1); };

  const toggleProcess = (name) =>
    setExpandedProcesses(prev => ({ ...prev, [name]: !prev[name] }));

  const expandAll = () => {
    const all = {};
    Object.keys(groupedByProcess).forEach(k => { all[k] = true; });
    setExpandedProcesses(all);
  };
  const collapseAll = () => setExpandedProcesses({});

  const clearFilters = () => {
    setSearchTerm(''); setSelectedType(null);
    setSelectedProcess(null); setSelectedStatus(null);
    setCurrentPage(1);
  };

  // ── Handlers modales ──────────────────────────────────────────────────────
  const handleOpenApprovalModal = (doc) => { setSelectedDocument(doc); setIsApprovalModalOpen(true); };
  const handleCloseApprovalModal = ()   => { setIsApprovalModalOpen(false); setSelectedDocument(null); };
  const handleApprovalSuccess    = ()   => refresh();

  const handleOpenEditModal   = (doc) => { setDocumentToEdit(doc); setIsEditModalOpen(true); };
  const handleCloseEditModal  = ()    => { setIsEditModalOpen(false); setDocumentToEdit(null); };
  const handleEditSuccess     = ()    => refresh();
  const handleDeleted         = (doc, res) => {                                  // 🆕
    setDocumentToDelete(null);
    setDeleteMsg(res.avisoStorage
      ? { type: 'warn', text: res.avisoStorage }
      : { type: 'ok', text: `${doc.code} eliminado definitivamente${res.archivos ? ` (${res.archivos} archivo${res.archivos === 1 ? '' : 's'})` : ''}.` });
    setTimeout(() => setDeleteMsg(null), 5000);
    refresh();
  };

  const handleOpenViewerModal = (doc) => { setDocumentToView(doc); setIsViewerModalOpen(true); };

  // 🆕 Descarga en el formato oficial RE-DP-11 (plantilla del bucket templates).
  // Respeta los filtros de pantalla y exporta TODAS las páginas.
  // Sin filtro de estado → solo documentos vigentes (publicados).
  const [exportingLM, setExportingLM] = useState(false);
  const handleExportRE_DP_11 = async () => {
    const docs = selectedStatus ? activeDocuments : activeDocuments.filter(d => d.status === 'published');
    if (!docs.length) { alert('No hay documentos para exportar con los filtros actuales.'); return; }
    setExportingLM(true);
    try {
      await exportListadoMaestro({ documentos: docs, procesos: processes });
    } catch (err) {
      console.error('❌ Error exportando RE-DP-11:', err);
      alert(err.message || 'No se pudo generar el Listado Maestro.');
    } finally {
      setExportingLM(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft:            { label: 'BORRADOR',  color: '#6f7b2c', bg: '#f0f4e8' },
      pending_approval: { label: 'PENDIENTE', color: '#d97706', bg: '#fef3c7' },
      published:        { label: 'PUBLICADO', color: '#059669', bg: '#d1fae5' },
      archived:         { label: 'ARCHIVADO', color: '#6b7280', bg: '#f3f4f6' },
    };
    const config = configs[status] || configs.draft;
    return (
      <Badge style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.color}` }}>
        {config.label}
      </Badge>
    );
  };

  if (error) {
    return (
      <Card className="border-2 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={refresh} className="mt-4"><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Documentos',      value: stats.total,                       color: '#2e5244', border: '#6dbd96' },
          { label: 'Pendientes Aprobación', value: stats.byStatus.pending_approval,   color: '#d97706', border: '#d97706' },
          { label: 'Publicados',            value: stats.byStatus.published,           color: '#059669', border: '#059669' },
          { label: 'Borradores',            value: stats.byStatus.draft,              color: '#6f7b2c', border: '#6f7b2c' },
        ].map(s => (
          <Card key={s.label} className="border-2" style={{ borderColor: s.border }}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#2e5244' }}>Listado Maestro de Documentos</CardTitle>
              <p className="text-sm text-gray-600">Vista centralizada del sistema documental SIG</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* 🆕 Trazabilidad: admin la cambia; gerencia solo ve el estado */}
              {!traceabilityLoading && isAdmin && (
                <Button
                  variant="outline"
                  onClick={handleToggleTraceability}
                  disabled={traceabilitySaving}
                  title="Solo el administrador puede cambiar esta opción"
                  style={{
                    borderColor: traceabilityEnabled ? '#6dbd96' : '#f59e0b',
                    color: traceabilityEnabled ? '#2e5244' : '#92400e',
                    backgroundColor: traceabilityEnabled ? '#f0fdf4' : '#fffbeb',
                  }}
                >
                  {traceabilitySaving
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : traceabilityEnabled
                      ? <ShieldCheck className="h-4 w-4 mr-2" />
                      : <ShieldOff className="h-4 w-4 mr-2" />}
                  Trazabilidad: {traceabilityEnabled ? 'Activada' : 'Desactivada'}
                </Button>
              )}
              {!traceabilityLoading && !isAdmin && isGerencia && !traceabilityEnabled && (
                <Badge style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #f59e0b' }}>
                  Corrección directa activa
                </Badge>
              )}
              {/* 🆕 Descargar RE-DP-11 */}
              <Button
                variant="outline"
                onClick={handleExportRE_DP_11}
                disabled={exportingLM || loading}
                title="Descargar el Listado Maestro en el formato RE-DP-11 (respeta los filtros)"
                style={{ borderColor: '#2e5244', color: '#2e5244' }}
              >
                {exportingLM
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                Descargar RE-DP-11
              </Button>
              {onCreateNew && (
                <Button onClick={onCreateNew} style={{ backgroundColor: '#2e5244' }} className="text-white">
                  <Plus className="h-4 w-4 mr-2" />Nuevo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Búsqueda */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por código, nombre o descripción..."
                value={searchTerm} onChange={e => handleSearchChange(e.target.value)}
                className="pl-10" />
            </div>
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="shrink-0">
              <Filter className="h-4 w-4 mr-2" />Filtros {showFilters ? '▼' : '▶'}
            </Button>
            <Button onClick={refresh} variant="outline" className="shrink-0">
              <RefreshCw className="h-4 w-4 mr-2" />Actualizar
            </Button>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg border">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                <select value={selectedType || ''} onChange={e => handleTypeChange(e.target.value || null)}
                  className="w-full p-2 border rounded text-sm">
                  <option value="">Todos</option>
                  {documentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Proceso</label>
                <select value={selectedProcess || ''} onChange={e => handleProcessChange(e.target.value || null)}
                  className="w-full p-2 border rounded text-sm">
                  <option value="">Todos</option>
                  {processes.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
                <select value={selectedStatus || ''} onChange={e => handleStatusChange(e.target.value || null)}
                  className="w-full p-2 border rounded text-sm">
                  <option value="">Todos</option>
                  <option value="draft">Borrador</option>
                  <option value="pending_approval">Pendiente</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">Limpiar Filtros</Button>
              </div>
            </div>
          )}

          {/* Botones acordeón */}
          <div className="flex gap-2">
            <Button onClick={expandAll}  variant="ghost" size="sm">Expandir Todo</Button>
            <Button onClick={collapseAll} variant="ghost" size="sm">Contraer Todo</Button>
          </div>

          {/* Tabla */}
          <div className="border rounded-lg overflow-hidden" style={{ fontSize: '85%', zoom: '0.75' }}>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#6dbd96' }} />
                <span className="ml-3 text-gray-600">Cargando documentos...</span>
              </div>
            ) : activeDocuments.length === 0 ? (
              <div className="text-center p-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No se encontraron documentos</p>
              </div>
            ) : (
              <table className="w-full text-xs table-auto">
                <thead>
                  {/* Fila 1: Grupos principales */}
                  <tr className="bg-gray-100 text-xs uppercase" style={{ color: '#2e5244' }}>
                    <th rowSpan="2" className="p-1 text-left border font-bold w-4" style={{ borderColor: '#dedecc' }}></th>
                    <th colSpan="3" className="p-1 text-center border font-bold" style={{ borderColor: '#dedecc' }}>IDENTIFICACIÓN</th>
                    <th colSpan="3" className="p-1 text-center border font-bold" style={{ borderColor: '#dedecc' }}>ARCHIVO</th>
                    <th colSpan="3" className="p-1 text-center border font-bold" style={{ borderColor: '#dedecc' }}>RETENCIÓN (años)</th>
                    <th colSpan="3" className="p-1 text-center border font-bold" style={{ borderColor: '#dedecc' }}>DISPOSICIÓN</th>
                    <th colSpan="3" className="p-1 text-center border font-bold" style={{ borderColor: '#dedecc' }}>CAMBIOS</th>
                    <th rowSpan="2" className="p-1 text-center border font-bold w-16" style={{ borderColor: '#dedecc' }}>ESTADO</th>
                    <th rowSpan="2" className="p-1 text-center border font-bold w-20" style={{ borderColor: '#dedecc' }}>ACCIONES</th>
                  </tr>
                  <tr className="bg-gray-50 text-[10px] uppercase" style={{ color: '#2e5244' }}>
                    <th className="p-1 text-left border font-medium w-20"   style={{ borderColor: '#dedecc' }}>Código</th>
                    <th className="p-1 text-left border font-medium"        style={{ borderColor: '#dedecc' }}>Nombre</th>
                    <th className="p-1 text-center border font-medium w-20" style={{ borderColor: '#dedecc' }}>Resp.</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Tipo</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Ver.</th>
                    <th className="p-1 text-center border font-medium w-16" style={{ borderColor: '#dedecc' }}>Fecha</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Cent.</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Gest.</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Tot.</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Sel.</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Con.</th>
                    <th className="p-1 text-center border font-medium w-12" style={{ borderColor: '#dedecc' }}>Eli.</th>
                    <th className="p-1 text-center border font-medium w-16" style={{ borderColor: '#dedecc' }}>F. Camb.</th>
                    <th className="p-1 text-left border font-medium w-24"   style={{ borderColor: '#dedecc' }}>Motivo</th>
                    <th className="p-1 text-center border font-medium w-20" style={{ borderColor: '#dedecc' }}>Ubic.</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedByProcess).map(([processName, processDocs]) => (
                    <React.Fragment key={processName}>

                      {/* Fila de encabezado de proceso */}
                      <tr className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleProcess(processName)}
                        style={{ backgroundColor: '#f0f4e8' }}>
                        <td colSpan="19" className="p-1.5 border" style={{ borderColor: '#dedecc' }}>
                          <div className="flex items-center gap-2">
                            {expandedProcesses[processName]
                              ? <ChevronDown  className="h-3.5 w-3.5" style={{ color: '#2e5244' }} />
                              : <ChevronRight className="h-3.5 w-3.5" style={{ color: '#2e5244' }} />}
                            <FileText className="h-3.5 w-3.5" style={{ color: '#6dbd96' }} />
                            <span className="font-bold text-xs" style={{ color: '#2e5244' }}>{processName}</span>
                            <span className="text-[10px] text-gray-600 ml-1">
                              ({processDocs.length} documento{processDocs.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Filas de documentos */}
                      {expandedProcesses[processName] && processDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-1 border" style={{ borderColor: '#dedecc' }}></td>

                          {/* CÓDIGO */}
                          <td className="p-1 border" style={{ borderColor: '#dedecc' }}>
                            <span className="font-mono text-[10px] font-bold" style={{ color: '#2e5244' }}>{doc.code}</span>
                          </td>

                          {/* NOMBRE */}
                          <td className="p-1 border max-w-[150px]" style={{ borderColor: '#dedecc' }}>
                            <p className="font-medium text-[10px] truncate" style={{ color: '#2e5244' }}>{(doc.name || '').toUpperCase()}</p>
                          </td>

                          {/* RESPONSABLE */}
                          <td className="p-1 text-[10px] text-gray-600 border" style={{ borderColor: '#dedecc' }}>
                            <span className="truncate block max-w-[80px]">
                              {doc.responsible || (typeof doc.created_by_profile === 'object' ? doc.created_by_profile?.full_name : doc.created_by_profile) || '-'}
                            </span>
                          </td>

                          {/* TIPO */}
                          <td className="p-1 text-center border" style={{ borderColor: '#dedecc' }}>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: '#f0f4e8', color: '#6f7b2c' }}>
                              {doc.document_type?.code || doc.document_type_code || '-'}
                            </span>
                          </td>

                          {/* VERSIÓN */}
                          <td className="p-1 text-center border" style={{ borderColor: '#dedecc' }}>
                            <span className="text-[10px] font-medium" style={{ color: '#6f7b2c' }}>
                              v{String(doc.version || doc.current_version || 1).padStart(2, '0')}
                            </span>
                          </td>

                          {/* FECHA */}
                          <td className="p-1 text-center text-[10px] text-gray-600 border" style={{ borderColor: '#dedecc' }}>
                            {fmtFechaDoc(doc.change_date, doc.created_at)}
                          </td>

                          {/* RETENCIÓN */}
                          <td className="p-1 text-center text-[10px] border" style={{ borderColor: '#dedecc' }}>{doc.retention_central || '-'}</td>
                          <td className="p-1 text-center text-[10px] border" style={{ borderColor: '#dedecc' }}>{doc.retention_management || '-'}</td>
                          <td className="p-1 text-center text-[10px] font-medium border" style={{ borderColor: '#dedecc', color: '#2e5244' }}>
                            {(parseInt(doc.retention_central || 0) + parseInt(doc.retention_management || 0)) || '-'}
                          </td>

                          {/* DISPOSICIÓN */}
                          <td className="p-1 text-center border" style={{ borderColor: '#dedecc' }}>
                            {doc.disposition_selection ? <span className="text-green-600 font-bold text-xs">✓</span> : <span className="text-gray-300 text-xs">-</span>}
                          </td>
                          <td className="p-1 text-center border" style={{ borderColor: '#dedecc' }}>
                            {doc.disposition_total_conservation ? <span className="text-green-600 font-bold text-xs">✓</span> : <span className="text-gray-300 text-xs">-</span>}
                          </td>
                          <td className="p-1 text-center border" style={{ borderColor: '#dedecc' }}>
                            {doc.disposition_elimination ? <span className="text-red-600 font-bold text-xs">✗</span> : <span className="text-gray-300 text-xs">-</span>}
                          </td>

                          {/* CAMBIOS */}
                          <td className="p-1 text-center text-[10px] text-gray-600 border" style={{ borderColor: '#dedecc' }}>
                            {doc.change_date ? fmtFechaDoc(doc.change_date) : '-'}
                          </td>
                          <td className="p-1 text-[10px] text-gray-600 border max-w-[100px]" style={{ borderColor: '#dedecc' }}>
                            <span className="truncate block">{doc.change_reason || '-'}</span>
                          </td>
                          <td className="p-1 text-[10px] text-gray-600 border" style={{ borderColor: '#dedecc' }}>
                            <span className="truncate block max-w-[80px]">{doc.storage_location || '-'}</span>
                          </td>

                          {/* ESTADO */}
                          <td className="p-1 text-center border" style={{ borderColor: '#dedecc' }}>
                            {(() => {
                              const cfg = {
                                draft:            { bg: '#fef3c7', color: '#92400e', text: 'Borrador'  },
                                pending_approval: { bg: '#dbeafe', color: '#1e40af', text: 'Pendiente' },
                                published:        { bg: '#d1fae5', color: '#065f46', text: 'Publicado' },
                                archived:         { bg: '#f3f4f6', color: '#4b5563', text: 'Archivado' },
                              };
                              const c = cfg[doc.status] || cfg.draft;
                              if (doc.status === 'pending_approval' && canApprove) {
                                return (
                                  <Badge className="text-[9px] px-1.5 py-0.5 font-medium cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: c.bg, color: c.color }}
                                    onClick={() => handleOpenApprovalModal(doc)}
                                    title="Click para aprobar/rechazar">
                                    ✓ {c.text}
                                  </Badge>
                                );
                              }
                              return (
                                <Badge className="text-[9px] px-1.5 py-0.5 font-medium"
                                  style={{ backgroundColor: c.bg, color: c.color }}>{c.text}</Badge>
                              );
                            })()}
                          </td>

                          {/* ACCIONES */}
                          <td className="p-1 border" style={{ borderColor: '#dedecc' }}>
                            <div className="flex items-center justify-center gap-0.5">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenViewerModal(doc)} className="h-6 w-6 p-0" title="Ver documento">
                                <Eye className="h-3 w-3" style={{ color: '#6dbd96' }} />
                              </Button>
                              {canEditDoc(doc) && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(doc)} className="h-6 w-6 p-0" title="Editar">
                                <Edit className="h-3 w-3" style={{ color: '#6f7b2c' }} />
                              </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}
                                disabled={downloading === doc.id} className="h-6 w-6 p-0" title="Descargar">
                                {downloading === doc.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Download className="h-3 w-3" style={{ color: '#2e5244' }} />}
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="sm" onClick={() => setDocumentToDelete(doc)} className="h-6 w-6 p-0" title="Eliminar definitivamente">
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Paginación ── */}
          {!loading && activeDocuments.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalRows={activeDocuments.length}
              pageSize={pageSize}
              onPage={setCurrentPage}
              onPageSize={(s) => { setPageSize(s); setCurrentPage(1); }}
              label="documento(s)"
            />
          )}

        </CardContent>
      </Card>

      {/* Modales */}
      <ApprovalModal document={selectedDocument} isOpen={isApprovalModalOpen}
        onClose={handleCloseApprovalModal} onSuccess={handleApprovalSuccess} />

      <EditDocumentModal document={documentToEdit} isOpen={isEditModalOpen}
        onClose={handleCloseEditModal} onSuccess={handleEditSuccess} />

      <DeleteDocumentModal doc={documentToDelete} onClose={() => setDocumentToDelete(null)} onDeleted={handleDeleted} />

      {deleteMsg && (
        <div className={`fixed bottom-4 right-4 z-[60] rounded-lg px-4 py-2 text-sm shadow-lg border ${deleteMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
          {deleteMsg.text}
        </div>
      )}

      <DocumentViewerModal document={documentToView} isOpen={isViewerModalOpen}
        onClose={() => { setIsViewerModalOpen(false); setDocumentToView(null); }} />
    </div>
  );
}