// src/components/modules/MejoramientoContinuo/RiskMatrix/RiskMatrixManager.jsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { FileDown } from 'lucide-react';
import { exportRiskMatrix } from '@/utils/exportRiskMatrix';
import { supabase } from '@/lib/supabase';
import {
  Plus, Search, RefreshCw, Filter, Loader2,
  AlertTriangle, ChevronLeft, Edit, Trash2, Eye, Archive, CheckCircle2,
  ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import {
  useRiskMatrix, useProcesses,
  getImpactInfo, getProbabilityInfo, getRiskLevelInfo, getProcessColor,
} from '@/hooks/useRiskMatrix';
import { useAuth } from '@/context/AuthContext';
import RiskMatrixModal from './RiskMatrixModal';

// ── Paleta ────────────────────────────────────────────────────────────────────
const XL = {
  identificacion: '#FFD966',
  valoracion:     '#9DC3E6',
  accion:         '#70AD47',
  subValor:       '#BDD7EE',
  border:         '#A6B8C2',
  rowOdd:         '#FFFFFF',
  rowEven:        '#F2F9F5',
  rowHover:       '#EBF5FB',
  accBg:          '#EDF7ED',
  headText:       '#1F2937',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ── Encabezado horizontal ─────────────────────────────────────────────────────
const TH = ({ children, bg, colSpan = 1, rowSpan = 1, textColor = XL.headText, w }) => (
  <th colSpan={colSpan} rowSpan={rowSpan} style={{
    backgroundColor: bg, border: `1px solid ${XL.border}`,
    textAlign: 'center', verticalAlign: 'middle',
    padding: '4px 5px', fontSize: 9, fontWeight: 700,
    textTransform: 'uppercase', color: textColor, whiteSpace: 'nowrap',
    ...(w ? { width: w, minWidth: w } : {}),
  }}>{children}</th>
);

// ── Celda de datos ────────────────────────────────────────────────────────────
const Cell = ({ children, center, bold, color, maxW, bg }) => (
  <td style={{
    border: `1px solid ${XL.border}`, padding: '3px 4px', fontSize: 10,
    textAlign: center ? 'center' : 'left', fontWeight: bold ? 600 : 400,
    color: color || '#1F2937', maxWidth: maxW, verticalAlign: 'middle',
    backgroundColor: bg, wordBreak: 'break-word', overflowWrap: 'break-word',
  }}>{children}</td>
);

const Clamp = ({ v, muted }) => (
  <div style={{
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', color: muted ? '#6B7280' : '#1F2937',
    fontSize: 10, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal',
  }} title={v || ''}>{v || '-'}</div>
);

const RiskChip = ({ label, bg, color }) => {
  if (!label || label === '—') return <span style={{ color: '#C0C0C0', fontSize: 10 }}>-</span>;
  return (
    <span style={{
      backgroundColor: bg, color,
      padding: '1px 5px', borderRadius: 3,
      fontSize: 9, fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};

// ── Paginación ────────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, totalRows, pageSize, onPage, onPageSize }) {
  if (totalRows === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalRows);

  // Generar números de página visibles (máx 5)
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
  const btnActive = { ...btnBase, background: '#2e5244', color: 'white', border: '1px solid #2e5244' };
  const btnDisabled = { ...btnBase, opacity: 0.4, cursor: 'not-allowed' };

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginTop:8 }}>
      {/* Info */}
      <span style={{ fontSize:11, color:'#6B7280' }}>
        Mostrando <strong>{from}–{to}</strong> de <strong>{totalRows}</strong> riesgo(s)
      </span>

      {/* Navegación */}
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        {/* Primera página */}
        <button
          style={currentPage === 1 ? btnDisabled : btnBase}
          onClick={() => currentPage > 1 && onPage(1)}
          title="Primera página">
          <ChevronsLeft style={{ width:14, height:14 }} />
        </button>
        {/* Anterior */}
        <button
          style={currentPage === 1 ? btnDisabled : btnBase}
          onClick={() => currentPage > 1 && onPage(currentPage - 1)}
          title="Página anterior">
          <ChevronLeft style={{ width:14, height:14 }} />
        </button>

        {/* Puntos iniciales */}
        {left > 1 && (
          <>
            <button style={btnBase} onClick={() => onPage(1)}>1</button>
            {left > 2 && <span style={{ fontSize:12, color:'#9CA3AF', padding:'0 2px' }}>…</span>}
          </>
        )}

        {/* Páginas */}
        {pages.map(p => (
          <button key={p} style={p === currentPage ? btnActive : btnBase} onClick={() => onPage(p)}>
            {p}
          </button>
        ))}

        {/* Puntos finales */}
        {right < totalPages && (
          <>
            {right < totalPages - 1 && <span style={{ fontSize:12, color:'#9CA3AF', padding:'0 2px' }}>…</span>}
            <button style={btnBase} onClick={() => onPage(totalPages)}>{totalPages}</button>
          </>
        )}

        {/* Siguiente */}
        <button
          style={currentPage === totalPages ? btnDisabled : btnBase}
          onClick={() => currentPage < totalPages && onPage(currentPage + 1)}
          title="Página siguiente">
          <ChevronRight style={{ width:14, height:14 }} />
        </button>
        {/* Última */}
        <button
          style={currentPage === totalPages ? btnDisabled : btnBase}
          onClick={() => currentPage < totalPages && onPage(totalPages)}
          title="Última página">
          <ChevronsRight style={{ width:14, height:14 }} />
        </button>
      </div>

      {/* Selector filas por página */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:11, color:'#6B7280' }}>Filas por página:</span>
        <select
          value={pageSize}
          onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
          style={{ padding:'2px 6px', border:'1px solid #D1D5DB', borderRadius:6, fontSize:12, height:28 }}>
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RiskMatrixManager({ onBack }) {
  const { user, profile, hasPermission } = useAuth();
  const role      = profile?.role;
  const canManage = ['admin', 'gerencia'].includes(role) || hasPermission('auditorias:riesgos:edit_all');
  const canDelete = ['admin', 'gerencia'].includes(role) || hasPermission('auditorias:riesgos:delete');
  const canCreate = ['admin', 'gerencia'].includes(role) || hasPermission('auditorias:riesgos:create');

  const [exporting,   setExporting]   = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalMode,   setModalMode]   = useState('create');
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fProcess,    setFProcess]    = useState('');
  const [fLevel,      setFLevel]      = useState('');
  const [actionMsg,   setActionMsg]   = useState(null);

  // ── Paginación ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  const { risks, loading, error, fetchRisks, deleteRisk } = useRiskMatrix();
  const { processes = [] } = useProcesses();

  // ── Filtrado total ────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return risks.filter(r => {
      const ms = !search   || r.risk_name?.toLowerCase().includes(q) || r.process_name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
      const mp = !fProcess || r.process_id === fProcess;
      const ml = !fLevel   || r.risk_level_info?.label === fLevel;
      return ms && mp && ml;
    });
  }, [risks, search, fProcess, fLevel]);

  // ── Página actual ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pageRows   = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Resetear a pág 1 al cambiar filtros
  const handleSearch  = (v) => { setSearch(v);   setCurrentPage(1); };
  const handleProcess = (v) => { setFProcess(v); setCurrentPage(1); };
  const handleLevel   = (v) => { setFLevel(v);   setCurrentPage(1); };
  const handleClear   = ()  => { setSearch(''); setFProcess(''); setFLevel(''); setCurrentPage(1); };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:       risks.length,
    inaceptable: risks.filter(r => r.risk_level_info?.label === 'INACEPTABLE').length,
    importante:  risks.filter(r => r.risk_level_info?.label === 'IMPORTANTE').length,
    moderado:    risks.filter(r => r.risk_level_info?.label === 'MODERADO').length,
    aceptable:   risks.filter(r => ['ACEPTABLE','TOLERABLE'].includes(r.risk_level_info?.label)).length,
  };

  const showMsg = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const openModal = (mode, r = null) => {
    setModalMode(mode); setSelected(r); setModalOpen(true);
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar "${r.risk_name}"?\nEsta acción no se puede deshacer.`)) return;
    const res = await deleteRisk(r.id);
    if (res.success) showMsg('success', '🗑️ Riesgo eliminado correctamente.');
    else             showMsg('error',   `Error al eliminar: ${res.error}`);
  };

  // ── Export filas visibles (con filtros aplicados — TODAS, no solo la página) 
  const handleExportVisible = async () => {
    if (filteredRows.length === 0) return;
    setExporting(true);
    try {
      const res = await exportRiskMatrix(filteredRows, 'RiesgosMatriz_Filtrados');
      if (res.success) showMsg('success', `✅ Excel generado con ${filteredRows.length} riesgo(s).`);
      else             showMsg('error',   `❌ ${res.error}`);
    } catch { showMsg('error', '❌ Error al generar el Excel.'); }
    finally  { setExporting(false); }
  };

  // ── Export todos desde BD ─────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('risk_matrix')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (fetchErr) throw fetchErr;

      const processIds = [...new Set((data || []).map(r => r.process_id).filter(Boolean))];
      let pm = {};
      if (processIds.length > 0) {
        const { data: procs } = await supabase.from('process').select('id, name').in('id', processIds);
        (procs || []).forEach(p => { pm[p.id] = p; });
      }
      const enriched = (data || []).map(r => ({
        ...r,
        process_name:     pm[r.process_id]?.name || '—',
        impact_info:      getImpactInfo(r.impact_value),
        probability_info: getProbabilityInfo(r.probability_value),
        risk_level_info:  getRiskLevelInfo(r.impact_value, r.probability_value),
      }));

      const res = await exportRiskMatrix(enriched, 'RiesgosMatriz_Completo');
      if (res.success) showMsg('success', `✅ Excel con ${enriched.length} riesgo(s) generado.`);
      else             showMsg('error',   `❌ ${res.error}`);
    } catch (e) { showMsg('error', `❌ ${e.message}`); }
    finally      { setExporting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 px-2">

      {/* Botón volver + título */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />Volver
        </Button>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#2e5244' }}>Matriz de Riesgos</h2>
          <p className="text-sm" style={{ color: '#6f7b2c' }}>
            Identificación, valoración y control de riesgos · RE-DP-05
          </p>
        </div>
      </div>

      {/* Mensaje flash */}
      {actionMsg && (
        <Alert variant={actionMsg.type === 'error' ? 'destructive' : 'default'}
          className={actionMsg.type === 'success' ? 'border-green-400 bg-green-50' : ''}>
          {actionMsg.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className={actionMsg.type === 'success' ? 'text-green-700' : ''}>
            {actionMsg.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',       v: stats.total,       color: '#6dbd96' },
          { label: 'Inaceptable', v: stats.inaceptable, color: '#ef4444' },
          { label: 'Importante',  v: stats.importante,  color: '#f97316' },
          { label: 'Moderado',    v: stats.moderado,    color: '#f59e0b' },
          { label: 'Aceptable',   v: stats.aceptable,   color: '#22c55e' },
        ].map(s => (
          <Card key={s.label} className="border-2" style={{ borderColor: s.color }}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle style={{ color: '#2e5244' }}>Registro de Riesgos de Procesos</CardTitle>
              <CardDescription>Formato RE-DP-05 · Gestión SIG · Garana Art</CardDescription>
            </div>
            {canCreate && (
              <Button size="sm" onClick={() => openModal('create')}
                style={{ backgroundColor: '#2e5244' }} className="text-white">
                <Plus className="h-4 w-4 mr-1" />Nuevo Riesgo
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">

          {/* Barra de herramientas */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por riesgo, proceso o descripción..."
                value={search} onChange={e => handleSearch(e.target.value)}
                className="pl-10 text-sm" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchRisks}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={handleExportVisible}
              disabled={exporting || filteredRows.length === 0}
              title={`Exportar ${filteredRows.length} riesgo(s) filtrados`}
              className="border-green-300 text-green-700 hover:bg-green-50">
              {exporting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><FileDown className="h-4 w-4 mr-1" />{filteredRows.length}</>}
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={handleExportAll}
              disabled={exporting}
              title="Exportar todos los riesgos de la BD"
              className="border-blue-300 text-blue-700 hover:bg-blue-50">
              {exporting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><FileDown className="h-4 w-4 mr-1" />Todo</>}
            </Button>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Proceso</label>
                <select value={fProcess} onChange={e => handleProcess(e.target.value)}
                  className="w-full p-2 border rounded text-sm">
                  <option value="">Todos</option>
                  {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nivel de Riesgo</label>
                <select value={fLevel} onChange={e => handleLevel(e.target.value)}
                  className="w-full p-2 border rounded text-sm">
                  <option value="">Todos</option>
                  <option value="ACEPTABLE">Aceptable</option>
                  <option value="TOLERABLE">Tolerable</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="IMPORTANTE">Importante</option>
                  <option value="INACEPTABLE">Inaceptable</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={handleClear}>Limpiar</Button>
              </div>
            </div>
          )}

          {/* ── Tabla Excel ── */}
          <div className="border rounded-lg" style={{ overflowX: 'auto', paddingBottom: 2 }}>
            <div style={{ zoom: '0.80', minWidth: 'fit-content', paddingBottom: 8 }}>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#6dbd96' }} />
                  <span className="ml-3 text-gray-600">Cargando matriz de riesgos...</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <Alert variant="destructive" className="max-w-sm mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="text-center p-12 text-gray-400">
                  <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">
                    {search || fProcess || fLevel ? 'No hay riesgos con los filtros aplicados.' : 'No hay riesgos registrados.'}
                  </p>
                  {!search && !fProcess && !fLevel && (
                    <p className="text-sm mt-1">Crea el primero usando "Nuevo Riesgo"</p>
                  )}
                </div>
              ) : (
                <table style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <TH bg="#E2EFDA" rowSpan={2} w={52}>ACC.</TH>
                      <TH bg={XL.identificacion} colSpan={5}>IDENTIFICACIÓN DEL RIESGO</TH>
                      <TH bg={XL.valoracion}     colSpan={6}>VALORACIÓN</TH>
                      <TH bg={XL.accion}         colSpan={3} textColor="#FFFFFF">ACCIÓN PREVENTIVA</TH>
                    </tr>
                    <tr>
                      <TH bg={XL.identificacion} w={110}>Proceso</TH>
                      <TH bg={XL.identificacion} w={120}>Riesgo</TH>
                      <TH bg={XL.identificacion} w={140}>Descripción</TH>
                      <TH bg={XL.identificacion} w={120}>Causa</TH>
                      <TH bg={XL.identificacion} w={120}>Efecto</TH>
                      <TH bg={XL.subValor} w={80}>Impacto</TH>
                      <TH bg={XL.subValor} w={36}>Valor</TH>
                      <TH bg={XL.subValor} w={80}>Probabilidad</TH>
                      <TH bg={XL.subValor} w={36}>Valor</TH>
                      <TH bg={XL.subValor} w={48}>Eval. IxP</TH>
                      <TH bg={XL.subValor} w={95}>Antes de control</TH>
                      <TH bg={XL.accion}   w={140} textColor="#FFFFFF">Descripción controles</TH>
                      <TH bg={XL.accion}   w={140} textColor="#FFFFFF">Opciones de manejo</TH>
                      <TH bg={XL.accion}   w={140} textColor="#FFFFFF">Acciones Preventivas</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, idx) => {
                      const procColor = getProcessColor(r.process_id, processes);
                      const bg        = idx % 2 === 0 ? XL.rowOdd : XL.rowEven;
                      return (
                        <tr key={r.id}
                          style={{ backgroundColor: bg }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = XL.rowHover}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = bg}>

                          {/* Botones */}
                          <td style={{ border:`1px solid ${XL.border}`, padding:'2px', textAlign:'center', verticalAlign:'middle', backgroundColor: XL.accBg, width:52 }}>
                            <div style={{ display:'flex', gap:2, justifyContent:'center' }}>
                              <button onClick={() => openModal('view', r)} title="Ver"
                                style={{ background:'none', border:'none', cursor:'pointer', padding:1 }}>
                                <Eye style={{ width:13, height:13, color:'#3B82F6' }} />
                              </button>
                              {(canManage || r.created_by === user?.id) && (
                                <button onClick={() => openModal('edit', r)} title="Editar"
                                  style={{ background:'none', border:'none', cursor:'pointer', padding:1 }}>
                                  <Edit style={{ width:13, height:13, color:'#6B7280' }} />
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => handleDelete(r)} title="Eliminar"
                                  style={{ background:'none', border:'none', cursor:'pointer', padding:1 }}>
                                  <Trash2 style={{ width:13, height:13, color:'#EF4444' }} />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Proceso con color */}
                          <td style={{ border:`1px solid ${XL.border}`, padding:'3px 5px', verticalAlign:'middle', backgroundColor: procColor, width:110 }}>
                            <span style={{ fontSize:9, fontWeight:700, color:'#1F2937', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                              title={r.process_name}>{r.process_name}</span>
                          </td>

                          <Cell bold maxW={120}><Clamp v={r.risk_name} /></Cell>
                          <Cell maxW={140}><Clamp v={r.description} muted /></Cell>
                          <Cell maxW={120}><Clamp v={r.cause} muted /></Cell>
                          <Cell maxW={120}><Clamp v={r.effect} muted /></Cell>
                          <Cell center><RiskChip {...r.impact_info} /></Cell>
                          <Cell center bold>{r.impact_value ?? '-'}</Cell>
                          <Cell center><RiskChip {...r.probability_info} /></Cell>
                          <Cell center bold>{r.probability_value ?? '-'}</Cell>
                          <Cell center bold>{r.risk_level_info?.evaluation ?? '-'}</Cell>
                          <Cell center><RiskChip label={r.risk_level_info?.label} bg={r.risk_level_info?.bg} color={r.risk_level_info?.color} /></Cell>
                          <Cell maxW={140}><Clamp v={r.controls_description} muted /></Cell>
                          <Cell maxW={140}>
                            {r.management_option
                              ? <span style={{ fontSize:9, color:'#2e5244', fontWeight:600, background:'#e8f5f0', padding:'1px 5px', borderRadius:3, display:'inline-block' }}>{r.management_option}</span>
                              : <span style={{ color:'#C0C0C0' }}>-</span>}
                          </Cell>
                          <Cell maxW={140}><Clamp v={r.preventive_actions} muted /></Cell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Paginación ── */}
          {!loading && filteredRows.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalRows={filteredRows.length}
              pageSize={pageSize}
              onPage={setCurrentPage}
              onPageSize={setPageSize}
            />
          )}

        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <RiskMatrixModal
          isOpen={modalOpen}
          mode={modalMode}
          risk={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
          onSuccess={() => { setModalOpen(false); setSelected(null); fetchRisks(); }}
        />
      )}
    </div>
  );
}