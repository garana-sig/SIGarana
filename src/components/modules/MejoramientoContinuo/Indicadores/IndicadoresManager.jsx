// src/components/modules/MejoramientoContinuo/Indicadores/IndicadoresManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Plus, Search, RefreshCw, Loader2, AlertTriangle,
  Edit, Trash2, Eye, BarChart2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileDown, TrendingUp,
} from 'lucide-react';
import {
  useIndicadores, useProfiles,
  PERSPECTIVES, FREQUENCIES, INDICATOR_TYPES, getMeasurementStatus
} from '@/hooks/useIndicadores';
import { useAuth } from '@/context/AuthContext';
import IndicadorModal from './IndicadorModal';
import { exportIndicadores } from '@/utils/exportIndicadores';
import MedicionModal  from './MedicionModal';

// ─── Colores del formato CMI (fiel al Excel RE-DP-02) ────────────────────────
const CMI = {
  bscHeader:     '#FFD966',
  processHeader: '#9DC3E6',
  colBg:         '#DEEAF1',
  border:        '#A6B8C2',
  rowOdd:        '#FFFFFF',
  rowEven:       '#F2F9F5',
  rowHover:      '#EBF5FB',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ─── Componentes de celda ─────────────────────────────────────────────────────
const HHead = ({ children, bg, colSpan = 1, rowSpan = 1, textColor = '#1F2937' }) => (
  <th colSpan={colSpan} rowSpan={rowSpan} style={{
    backgroundColor: bg, border: `1px solid ${CMI.border}`,
    textAlign: 'center', verticalAlign: 'middle',
    padding: '3px 4px', fontSize: 9, fontWeight: 700,
    textTransform: 'uppercase', color: textColor, whiteSpace: 'nowrap',
  }}>{children}</th>
);

const VHead = ({ children, rowSpan = 1, w = 26 }) => {
  const lines = typeof children === 'string' ? children.split('|') : [children];
  return (
    <th rowSpan={rowSpan} style={{
      backgroundColor: CMI.colBg, border: `1px solid ${CMI.border}`,
      padding: 0, width: w, minWidth: w, maxWidth: w,
    }}>
      <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', height: 90, paddingBottom: 4 }}>
        <div style={{
          writingMode:'vertical-rl', transform:'rotate(180deg)',
          fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
          color: '#1F2937', textAlign: 'center', lineHeight: 1.3,
          display:'flex', flexDirection:'column', alignItems:'center', gap: 0,
        }}>
          {lines.map((line, i) => <span key={i} style={{ whiteSpace:'nowrap', display:'block' }}>{line}</span>)}
        </div>
      </div>
    </th>
  );
};

const Cell = ({ children, center, bold, color, maxW, bg }) => (
  <td style={{
    border: `1px solid ${CMI.border}`, padding: '3px 5px', fontSize: 10,
    textAlign: center ? 'center' : 'left', fontWeight: bold ? 600 : 400,
    color: color || '#1F2937', maxWidth: maxW, verticalAlign: 'middle',
    backgroundColor: bg, wordBreak: 'break-word', overflowWrap: 'break-word',
  }}>{children}</td>
);

// ─── Badge de perspectiva ─────────────────────────────────────────────────────
const PerspBadge = ({ value }) => {
  const map = {
    financiera:             { label: 'Financiera',         bg: '#FFF9C4', color: '#F57F17' },
    cliente:                { label: 'Cliente',            bg: '#E3F2FD', color: '#1565C0' },
    procesos_internos:      { label: 'Procesos Internos',  bg: '#E8F5E9', color: '#2E7D32' },
    crecimiento_desarrollo: { label: 'Crecimiento y Des.', bg: '#F3E5F5', color: '#6A1B9A' },
  };
  const p = map[value];
  if (!p) return <span style={{ color: '#9CA3AF', fontSize: 9 }}>—</span>;
  return (
    <span style={{
      backgroundColor: p.bg, color: p.color,
      borderRadius: 4, padding: '1px 5px', fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{p.label}</span>
  );
};

// ─── Badge de estado de última medición ──────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    good:     { label: '🟢 Cumple',      bg: '#E8F5E9', color: '#2E7D32' },
    warning:  { label: '🟡 Advertencia', bg: '#FFF8E1', color: '#F57F17' },
    critical: { label: '🔴 Crítico',     bg: '#FFEBEE', color: '#C62828' },
    no_data:  { label: '⚫ Sin datos',   bg: '#F5F5F5', color: '#757575' },
  };
  const s = map[status] || map.no_data;
  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      borderRadius: 4, padding: '1px 5px', fontSize: 8, fontWeight: 700,
    }}>{s.label}</span>
  );
};

// ─── Fila separadora de sección ───────────────────────────────────────────────
const SectionRow = ({ label, color, colCount }) => (
  <tr>
    <td colSpan={colCount} style={{
      backgroundColor: color, border: `1px solid ${CMI.border}`,
      padding: '4px 8px', fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', color: '#1F2937', letterSpacing: 1,
    }}>{label}</td>
  </tr>
);

// ─── Paginación (inline, mismo patrón que RiskMatrixManager) ─────────────────
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginTop:8 }}>
      <span style={{ fontSize:11, color:'#6B7280' }}>
        Mostrando <strong>{from}–{to}</strong> de <strong>{totalRows}</strong> indicador(es)
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function IndicadoresManager({ onBack }) {
  const { profile } = useAuth();
  const {
    indicators, loading, error,
    fetchIndicators, createIndicator, updateIndicator,
    deleteIndicator, fetchMeasurements, addMeasurement, deleteMeasurement, updateMeasurement,
  } = useIndicadores();
  const { profiles, fetchProfiles } = useProfiles();

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalMode,    setModalMode]    = useState('create');
  const [selected,     setSelected]     = useState(null);
  const [medicionOpen, setMedicionOpen] = useState(false);
  const [medicionInd,  setMedicionInd]  = useState(null);
  const [actionMsg,    setActionMsg]    = useState(null);
  const [exporting,    setExporting]    = useState(false);

  // ── Paginación ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  const { hasPermission } = useAuth();
  const isAdmin    = profile?.role === 'admin';
  const isGerencia = profile?.role === 'gerencia';

  const canCreate  = isAdmin || isGerencia || hasPermission('cmi:indicadores:create');
  const canEdit    = isAdmin || isGerencia || hasPermission('cmi:indicadores:edit');
  const canDelete  = isAdmin               || hasPermission('cmi:indicadores:delete');
  const canMeasure = isAdmin || isGerencia || hasPermission('cmi:indicadores:measure');
  const canExport  = isAdmin || isGerencia || hasPermission('cmi:indicadores:export');

  useEffect(() => {
    fetchIndicators();
    fetchProfiles();
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    let list = [...indicators];
    if (filterType !== 'all')   list = list.filter(i => i.indicator_type === filterType);
    if (filterStatus !== 'all') list = list.filter(i => (i.last_measurement_status || 'no_data') === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.indicator_name?.toLowerCase().includes(q) ||
        i.objective?.toLowerCase().includes(q)      ||
        i.responsible_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [indicators, filterType, filterStatus, search]);

  // ── Cálculo de página ─────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pageRows   = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // bscRows y processRows se derivan de pageRows (la página actual)
  const bscRows     = pageRows.filter(i => i.indicator_type === 'bsc');
  const processRows = pageRows.filter(i => i.indicator_type === 'process');

  // Resetear a pág 1 al cambiar filtros
  const handleSearch       = (v) => { setSearch(v);       setCurrentPage(1); };
  const handleFilterType   = (v) => { setFilterType(v);   setCurrentPage(1); };
  const handleFilterStatus = (v) => { setFilterStatus(v); setCurrentPage(1); };

  // ── Stats (siempre sobre el total, no sobre la página) ───────────────────
  const stats = {
    total:    indicators.length,
    bsc:      indicators.filter(i => i.indicator_type === 'bsc').length,
    process:  indicators.filter(i => i.indicator_type === 'process').length,
    critical: indicators.filter(i => i.last_measurement_status === 'critical').length,
  };

  const showMsg = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const openModal   = (mode, ind = null) => { setModalMode(mode); setSelected(ind); setModalOpen(true); };
  const openMedicion = (ind) => { setMedicionInd(ind); setMedicionOpen(true); };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportIndicadores(indicators);
      showMsg('success', `✅ Excel generado con ${indicators.length} indicador(es).`);
    } catch (err) {
      showMsg('error', `❌ ${err.message}`);
    } finally { setExporting(false); }
  };

  const handleDelete = async (ind) => {
    if (!window.confirm(`¿Archivar el indicador "${ind.indicator_name}"? No se eliminará de la BD.`)) return;
    const r = await deleteIndicator(ind.id);
    if (r.success) showMsg('success', `✅ Indicador ${ind.consecutive} archivado.`);
    else           showMsg('error',   `Error: ${r.error}`);
  };

  const handleSave = async (formData) => {
    const r = selected
      ? await updateIndicator(selected.id, formData)
      : await createIndicator(formData);
    if (r.success) {
      setModalOpen(false);
      showMsg('success', selected
        ? '✅ Indicador actualizado correctamente.'
        : `✅ Indicador ${r.data?.consecutive} creado correctamente.`);
    } else {
      showMsg('error', `Error: ${r.error}`);
    }
  };

  const handleMedicionSave = async (indId, medData) => {
    const r = await addMeasurement(indId, medData);
    if (r.success) { setMedicionOpen(false); showMsg('success', '✅ Medición registrada correctamente.'); }
    else           { showMsg('error', `Error: ${r.error}`); }
  };

  const COL_COUNT = 12;

  // ─── Render fila ───────────────────────────────────────────────────────────
  const renderRow = (ind, idx) => {
    const rowBg = idx % 2 === 0 ? CMI.rowOdd : CMI.rowEven;
    return (
      <tr key={ind.id} style={{ backgroundColor: rowBg }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = CMI.rowHover}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}>
        <Cell maxW={120}><span style={{ fontSize:9 }}>{ind.strategic_initiative || '—'}</span></Cell>
        <Cell maxW={140}><span style={{ fontSize:9 }}>{ind.objective}</span></Cell>
        <Cell center>
          {ind.indicator_type === 'bsc'
            ? <PerspBadge value={ind.perspective} />
            : <span style={{ color:'#9CA3AF', fontSize:9 }}>—</span>}
        </Cell>
        <Cell center><span style={{ fontSize:9, fontWeight:600 }}>{ind.indicator_subtype || '—'}</span></Cell>
        <Cell maxW={160} bold><span style={{ fontSize:10 }}>{ind.indicator_name}</span></Cell>
        <Cell maxW={180}><span style={{ fontSize:9 }}>{ind.formula || '—'}</span></Cell>
        <Cell maxW={100}><span style={{ fontSize:9 }}>{ind.process_name || '—'}</span></Cell>
        <Cell maxW={100}><span style={{ fontSize:9 }}>{ind.responsible_name}</span></Cell>
        <Cell center>
          <span style={{ fontSize:9 }}>{FREQUENCIES.find(f => f.value === ind.frequency)?.label || ind.frequency}</span>
        </Cell>
        <Cell center bold color="#2e5244">{ind.goal}</Cell>
        <Cell center><StatusBadge status={ind.last_measurement_status || 'no_data'} /></Cell>
        <Cell center>
          <div style={{ display:'flex', gap:2, justifyContent:'center' }}>
            <button title="Ver detalle" onClick={() => openModal('view', ind)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#6B7280' }}>
              <Eye size={12} />
            </button>
            {canEdit && (
              <button title="Editar" onClick={() => openModal('edit', ind)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#2E75B6' }}>
                <Edit size={12} />
              </button>
            )}
            {(canMeasure || ind.responsible_id === profile?.id) && (
              <button title="Registrar medición" onClick={() => openMedicion(ind)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#16A34A' }}>
                <BarChart2 size={12} />
              </button>
            )}
            {canDelete && (
              <button title="Archivar" onClick={() => handleDelete(ind)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#DC2626' }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </Cell>
      </tr>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', display:'flex', alignItems:'center', gap:4 }}>
              <ChevronLeft size={16} /> Volver
            </button>
          )}
          <div>
            <h2 style={{ color:'#2e5244', fontWeight:700, fontSize:18, display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={20} /> Indicadores CMI
            </h2>
            <p style={{ color:'#6B7280', fontSize:12 }}>RE-DP-02 — Cuadro de Mando Integral</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {canExport && (
            <Button variant="outline" onClick={handleExport}
              disabled={exporting || indicators.length === 0}
              style={{ fontSize:12, borderColor:'#2e5244', color:'#2e5244', opacity: exporting ? 0.6 : 1 }}>
              {exporting
                ? <><Loader2 size={14} className="mr-1 animate-spin" /> Generando...</>
                : <><FileDown size={14} className="mr-1" /> Exportar Excel</>}
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => openModal('create')}
              style={{ backgroundColor:'#2e5244', color:'white', fontSize:12 }}>
              <Plus size={14} className="mr-1" /> Nuevo Indicador
            </Button>
          )}
        </div>
      </div>

      {/* ── Mensaje de acción ── */}
      {actionMsg && (
        <Alert style={{ borderColor: actionMsg.type === 'success' ? '#16A34A' : '#DC2626' }}>
          <AlertDescription style={{ fontSize:12 }}>{actionMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
        {[
          { label:'Total',    value: stats.total,    color:'#2e5244' },
          { label:'BSC',      value: stats.bsc,      color:'#D97706' },
          { label:'Proceso',  value: stats.process,  color:'#2E75B6' },
          { label:'Críticos', value: stats.critical, color:'#DC2626' },
        ].map(s => (
          <div key={s.label} style={{
            background:'white', borderRadius:8, border:'1px solid #E5E7EB',
            padding:'8px 12px', textAlign:'center',
          }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#6B7280', textTransform:'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <Input placeholder="Buscar por nombre, objetivo o responsable..."
            value={search} onChange={e => handleSearch(e.target.value)}
            style={{ paddingLeft:28, fontSize:12, height:32 }} />
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[{ value:'all', label:'Todos' }, { value:'bsc', label:'BSC' }, { value:'process', label:'Proceso' }].map(f => (
            <button key={f.value} onClick={() => handleFilterType(f.value)} style={{
              padding:'4px 10px', fontSize:11, borderRadius:4, border:'1px solid',
              borderColor: filterType === f.value ? '#2e5244' : '#E5E7EB',
              backgroundColor: filterType === f.value ? '#2e5244' : 'white',
              color: filterType === f.value ? 'white' : '#374151', cursor:'pointer',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[
            { value:'all',      label:'Todos estados' },
            { value:'good',     label:'🟢 Cumple' },
            { value:'warning',  label:'🟡 Advertencia' },
            { value:'critical', label:'🔴 Crítico' },
            { value:'no_data',  label:'⚫ Sin datos' },
          ].map(f => (
            <button key={f.value} onClick={() => handleFilterStatus(f.value)} style={{
              padding:'4px 8px', fontSize:10, borderRadius:4, border:'1px solid',
              borderColor: filterStatus === f.value ? '#2e5244' : '#E5E7EB',
              backgroundColor: filterStatus === f.value ? '#2e5244' : 'white',
              color: filterStatus === f.value ? 'white' : '#374151', cursor:'pointer',
            }}>{f.label}</button>
          ))}
        </div>
        <button onClick={fetchIndicators}
          style={{ background:'none', border:'1px solid #E5E7EB', borderRadius:4, padding:'4px 8px', cursor:'pointer', color:'#6B7280' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <Alert style={{ borderColor:'#DC2626' }}>
          <AlertTriangle size={14} />
          <AlertDescription style={{ fontSize:12 }}>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Tabla ── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#6B7280' }}>
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p style={{ fontSize:12 }}>Cargando indicadores...</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX:'auto', zoom: 0.85 }}>
            <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>
              <thead>
                <tr>
                  <HHead bg={CMI.bscHeader} colSpan={4}>Planeación Estratégica</HHead>
                  <HHead bg={CMI.colBg} colSpan={2}>Indicador</HHead>
                  <HHead bg={CMI.colBg} colSpan={2}>Proceso / Responsable</HHead>
                  <HHead bg={CMI.colBg}>Frecuencia</HHead>
                  <HHead bg={CMI.colBg}>Meta</HHead>
                  <HHead bg={CMI.colBg}>Último Estado</HHead>
                  <HHead bg={CMI.colBg} rowSpan={2}>Acciones</HHead>
                </tr>
                <tr>
                  <HHead bg={CMI.bscHeader}>Iniciativa Estratégica</HHead>
                  <HHead bg={CMI.bscHeader}>Objetivo</HHead>
                  <HHead bg={CMI.bscHeader}>Perspectiva</HHead>
                  <HHead bg={CMI.bscHeader}>Tipo</HHead>
                  <HHead bg={CMI.colBg}>Nombre Indicador</HHead>
                  <HHead bg={CMI.colBg}>Fórmula</HHead>
                  <HHead bg={CMI.colBg}>Proceso Fuente</HHead>
                  <HHead bg={CMI.colBg}>Responsable</HHead>
                  <HHead bg={CMI.colBg}>Frecuencia</HHead>
                  <HHead bg={CMI.colBg}>Meta</HHead>
                  <HHead bg={CMI.colBg}>Estado</HHead>
                </tr>
              </thead>
              <tbody>
                {(filterType === 'all' || filterType === 'bsc') && (
                  <>
                    <SectionRow label="📊 Indicadores Balanced Score Card (BSC)" color={CMI.bscHeader} colCount={COL_COUNT} />
                    {bscRows.length === 0 ? (
                      <tr><td colSpan={COL_COUNT} style={{ textAlign:'center', padding:16, color:'#9CA3AF', fontSize:11, border:`1px solid ${CMI.border}` }}>
                        No hay indicadores BSC {search || filterStatus !== 'all' ? 'con los filtros aplicados' : 'registrados'}
                      </td></tr>
                    ) : (
                      bscRows.map((ind, idx) => renderRow(ind, idx))
                    )}
                  </>
                )}
                {(filterType === 'all' || filterType === 'process') && (
                  <>
                    <SectionRow label="⚙️ Indicadores de Proceso" color={CMI.processHeader} colCount={COL_COUNT} />
                    {processRows.length === 0 ? (
                      <tr><td colSpan={COL_COUNT} style={{ textAlign:'center', padding:16, color:'#9CA3AF', fontSize:11, border:`1px solid ${CMI.border}` }}>
                        No hay indicadores de proceso {search || filterStatus !== 'all' ? 'con los filtros aplicados' : 'registrados'}
                      </td></tr>
                    ) : (
                      processRows.map((ind, idx) => renderRow(ind, idx))
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginación — zoom 1/0.85 ≈ 1.176 para compensar el wrapper ── */}
          {rows.length > 0 && (
            <div style={{ zoom: '1.176' }}>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalRows={rows.length}
                pageSize={pageSize}
                onPage={setCurrentPage}
                onPageSize={(s) => { setPageSize(s); setCurrentPage(1); }}
              />
            </div>
          )}
        </>
      )}

      {/* ── Estado vacío ── */}
      {!loading && indicators.length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'#9CA3AF' }}>
          <TrendingUp size={40} style={{ margin:'0 auto 12px', opacity:0.3 }} />
          <p style={{ fontSize:14, fontWeight:600 }}>No hay indicadores creados</p>
          {canCreate && <p style={{ fontSize:12 }}>Haz clic en "Nuevo Indicador" para comenzar</p>}
        </div>
      )}

      {/* ── Modales ── */}
      {modalOpen && (
        <IndicadorModal mode={modalMode} indicator={selected} profiles={profiles}
          onSave={handleSave} onClose={() => setModalOpen(false)}
          fetchMeasurements={fetchMeasurements} deleteMeasurement={deleteMeasurement} updateMeasurement={updateMeasurement} />
      )}
      {medicionOpen && medicionInd && (
        <MedicionModal indicator={medicionInd} onSave={handleMedicionSave} onClose={() => setMedicionOpen(false)} />
      )}
    </div>
  );
}