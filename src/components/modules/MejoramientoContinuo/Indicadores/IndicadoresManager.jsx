// src/components/modules/MejoramientoContinuo/Indicadores/IndicadoresManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Plus, Search, RefreshCw, Loader2, AlertTriangle,
  Edit, Trash2, Eye, BarChart2, ChevronLeft, FileDown, TrendingUp
} from 'lucide-react';
import {
  useIndicadores, useProfiles,
  PERSPECTIVES, FREQUENCIES, INDICATOR_TYPES, getMeasurementStatus
} from '@/hooks/useIndicadores';
import { useAuth } from '@/context/AuthContext';
import IndicadorModal   from './IndicadorModal';
import MedicionModal    from './MedicionModal';

// ─── Colores del formato CMI (fiel al Excel RE-DP-02) ────────────────────────
const CMI = {
  bscHeader:     '#FFD966',   // Amarillo — sección BSC
  processHeader: '#9DC3E6',   // Azul claro — sección Proceso
  colBg:         '#DEEAF1',
  border:        '#A6B8C2',
  rowOdd:        '#FFFFFF',
  rowEven:       '#F2F9F5',
  rowHover:      '#EBF5FB',
  good:          '#E8F5E9',
  warning:       '#FFF8E1',
  critical:      '#FFEBEE',
};

// ─── Componentes de celda (patrón del proyecto) ──────────────────────────────
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
    financiera:             { label: 'Financiera',            bg: '#FFF9C4', color: '#F57F17' },
    cliente:                { label: 'Cliente',               bg: '#E3F2FD', color: '#1565C0' },
    procesos_internos:      { label: 'Procesos Internos',     bg: '#E8F5E9', color: '#2E7D32' },
    crecimiento_desarrollo: { label: 'Crecimiento y Des.',    bg: '#F3E5F5', color: '#6A1B9A' },
  };
  const p = map[value];
  if (!p) return <span style={{ color: '#9CA3AF', fontSize: 9 }}>—</span>;
  return (
    <span style={{
      backgroundColor: p.bg, color: p.color,
      borderRadius: 4, padding: '1px 5px', fontSize: 8, fontWeight: 700,
      whiteSpace: 'nowrap',
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

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function IndicadoresManager({ onBack }) {
  const { profile } = useAuth();
  const {
    indicators, loading, error,
    fetchIndicators, createIndicator, updateIndicator,
    deleteIndicator, fetchMeasurements, addMeasurement, deleteMeasurement,
  } = useIndicadores();
  const { profiles, fetchProfiles } = useProfiles();

  // Estados UI
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('all');   // all | bsc | process
  const [filterStatus, setFilterStatus] = useState('all');   // all | good | warning | critical | no_data
  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalMode,    setModalMode]    = useState('create'); // create | edit | view
  const [selected,     setSelected]     = useState(null);
  const [medicionOpen, setMedicionOpen] = useState(false);
  const [medicionInd,  setMedicionInd]  = useState(null);
  const [actionMsg,    setActionMsg]    = useState(null);

  const isAdmin    = profile?.role === 'admin';
  const isGerencia = profile?.role === 'gerencia';
  const canCreate  = isAdmin || isGerencia;
  const canDelete  = isAdmin;

  useEffect(() => {
    fetchIndicators();
    fetchProfiles();
  }, []);

  // ── Filtros ────────────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    let list = [...indicators];

    if (filterType !== 'all') list = list.filter(i => i.indicator_type === filterType);

    if (filterStatus !== 'all') {
      list = list.filter(i => (i.last_measurement_status || 'no_data') === filterStatus);
    }

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

  const bscRows     = rows.filter(i => i.indicator_type === 'bsc');
  const processRows = rows.filter(i => i.indicator_type === 'process');

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

  const openModal = (mode, ind = null) => {
    setModalMode(mode);
    setSelected(ind);
    setModalOpen(true);
  };

  const openMedicion = (ind) => {
    setMedicionInd(ind);
    setMedicionOpen(true);
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
        ? `✅ Indicador actualizado correctamente.`
        : `✅ Indicador ${r.data?.consecutive} creado correctamente.`);
    } else {
      showMsg('error', `Error: ${r.error}`);
    }
  };

  const handleMedicionSave = async (indId, medData) => {
    const r = await addMeasurement(indId, medData);
    if (r.success) {
      setMedicionOpen(false);
      showMsg('success', '✅ Medición registrada correctamente.');
    } else {
      showMsg('error', `Error: ${r.error}`);
    }
  };

  const COL_COUNT = 12; // Total columnas de la tabla

  // ── Render fila de indicador ────────────────────────────────────────────────
  const renderRow = (ind, idx) => {
    const rowBg = idx % 2 === 0 ? CMI.rowOdd : CMI.rowEven;
    const canEdit = isAdmin || isGerencia
      || ind.responsible_id === profile?.id
      || ind.created_by     === profile?.id;

    return (
      <tr key={ind.id} style={{ backgroundColor: rowBg }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = CMI.rowHover}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
      >
        {/* Iniciativa estratégica */}
        <Cell maxW={120}><span style={{ fontSize: 9 }}>{ind.strategic_initiative || '—'}</span></Cell>

        {/* Objetivo */}
        <Cell maxW={140}><span style={{ fontSize: 9 }}>{ind.objective}</span></Cell>

        {/* Perspectiva (solo BSC) */}
        <Cell center>
          {ind.indicator_type === 'bsc'
            ? <PerspBadge value={ind.perspective} />
            : <span style={{ color: '#9CA3AF', fontSize: 9 }}>—</span>
          }
        </Cell>

        {/* Tipo */}
        <Cell center>
          <span style={{ fontSize: 9, fontWeight: 600 }}>{ind.indicator_subtype || '—'}</span>
        </Cell>

        {/* Nombre indicador */}
        <Cell maxW={160} bold><span style={{ fontSize: 10 }}>{ind.indicator_name}</span></Cell>

        {/* Fórmula */}
        <Cell maxW={180}>
          {ind.formula_expression ? (
            <code style={{ fontSize: 8, backgroundColor: '#F3F4F6', padding: '1px 4px', borderRadius: 3, color: '#374151' }}>
              {ind.formula_expression}
            </code>
          ) : (
            <span style={{ fontSize: 9, color: '#9CA3AF' }}>{ind.formula || '—'}</span>
          )}
        </Cell>

        {/* Proceso fuente */}
        <Cell maxW={100}><span style={{ fontSize: 9 }}>{ind.process_source || '—'}</span></Cell>

        {/* Responsable */}
        <Cell maxW={100}><span style={{ fontSize: 9 }}>{ind.responsible_name}</span></Cell>

        {/* Frecuencia */}
        <Cell center>
          <span style={{ fontSize: 9 }}>
            {FREQUENCIES.find(f => f.value === ind.frequency)?.label || ind.frequency}
          </span>
        </Cell>

        {/* Meta */}
        <Cell center bold color="#2e5244">{ind.goal}</Cell>

        {/* Último estado */}
        <Cell center>
          <StatusBadge status={ind.last_measurement_status || 'no_data'} />
        </Cell>

        {/* Acciones */}
        <Cell center>
          <div style={{ display:'flex', gap: 2, justifyContent:'center' }}>
            <button title="Ver detalle" onClick={() => openModal('view', ind)}
              style={{ background:'none', border:'none', cursor:'pointer', padding: 2, color:'#6B7280' }}>
              <Eye size={12} />
            </button>
            {canEdit && (
              <button title="Editar" onClick={() => openModal('edit', ind)}
                style={{ background:'none', border:'none', cursor:'pointer', padding: 2, color:'#2E75B6' }}>
                <Edit size={12} />
              </button>
            )}
            {/* Registrar medición — responsable, admin o gerencia */}
            {(isAdmin || isGerencia || ind.responsible_id === profile?.id) && (
              <button title="Registrar medición" onClick={() => openMedicion(ind)}
                style={{ background:'none', border:'none', cursor:'pointer', padding: 2, color:'#16A34A' }}>
                <BarChart2 size={12} />
              </button>
            )}
            {canDelete && (
              <button title="Archivar" onClick={() => handleDelete(ind)}
                style={{ background:'none', border:'none', cursor:'pointer', padding: 2, color:'#DC2626' }}>
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
        {canCreate && (
          <Button onClick={() => openModal('create')}
            style={{ backgroundColor:'#2e5244', color:'white', fontSize:12 }}>
            <Plus size={14} className="mr-1" /> Nuevo Indicador
          </Button>
        )}
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
          { label:'Total',     value: stats.total,    color:'#2e5244' },
          { label:'BSC',       value: stats.bsc,      color:'#D97706' },
          { label:'Proceso',   value: stats.process,  color:'#2E75B6' },
          { label:'Críticos',  value: stats.critical, color:'#DC2626' },
        ].map(s => (
          <div key={s.label} style={{
            background:'white', borderRadius:8, border:`1px solid #E5E7EB`,
            padding:'8px 12px', textAlign:'center',
          }}>
            <div style={{ fontSize:20, fontWeight:700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#6B7280', textTransform:'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <Input placeholder="Buscar por nombre, objetivo o responsable..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:28, fontSize:12, height:32 }} />
        </div>

        {/* Tipo */}
        <div style={{ display:'flex', gap:4 }}>
          {[
            { value:'all',     label:'Todos' },
            { value:'bsc',     label:'BSC' },
            { value:'process', label:'Proceso' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilterType(f.value)}
              style={{
                padding:'4px 10px', fontSize:11, borderRadius:4, border:'1px solid',
                borderColor: filterType === f.value ? '#2e5244' : '#E5E7EB',
                backgroundColor: filterType === f.value ? '#2e5244' : 'white',
                color: filterType === f.value ? 'white' : '#374151',
                cursor:'pointer',
              }}>{f.label}</button>
          ))}
        </div>

        {/* Estado última medición */}
        <div style={{ display:'flex', gap:4 }}>
          {[
            { value:'all',      label:'Todos estados' },
            { value:'good',     label:'🟢 Cumple' },
            { value:'warning',  label:'🟡 Advertencia' },
            { value:'critical', label:'🔴 Crítico' },
            { value:'no_data',  label:'⚫ Sin datos' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilterStatus(f.value)}
              style={{
                padding:'4px 8px', fontSize:10, borderRadius:4, border:'1px solid',
                borderColor: filterStatus === f.value ? '#2e5244' : '#E5E7EB',
                backgroundColor: filterStatus === f.value ? '#2e5244' : 'white',
                color: filterStatus === f.value ? 'white' : '#374151',
                cursor:'pointer',
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
        <div style={{ overflowX:'auto', zoom: 0.85 }}>
          <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>

            {/* ── ENCABEZADO ── */}
            <thead>
              <tr>
                <HHead bg={CMI.bscHeader} colSpan={4}>Planeación Estratégica</HHead>
                <HHead bg={CMI.colBg}  colSpan={2}>Indicador</HHead>
                <HHead bg={CMI.colBg}  colSpan={2}>Proceso / Responsable</HHead>
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
              {/* ── Sección BSC ── */}
              {(filterType === 'all' || filterType === 'bsc') && (
                <>
                  <SectionRow
                    label="📊 Indicadores Balanced Score Card (BSC)"
                    color={CMI.bscHeader}
                    colCount={COL_COUNT}
                  />
                  {bscRows.length === 0 ? (
                    <tr>
                      <td colSpan={COL_COUNT} style={{
                        textAlign:'center', padding:16, color:'#9CA3AF',
                        fontSize:11, border:`1px solid ${CMI.border}`,
                        backgroundColor: CMI.rowOdd,
                      }}>
                        No hay indicadores BSC registrados
                      </td>
                    </tr>
                  ) : (
                    bscRows.map((ind, idx) => renderRow(ind, idx))
                  )}
                </>
              )}

              {/* ── Sección Proceso ── */}
              {(filterType === 'all' || filterType === 'process') && (
                <>
                  <SectionRow
                    label="⚙️ Indicadores de Proceso"
                    color={CMI.processHeader}
                    colCount={COL_COUNT}
                  />
                  {processRows.length === 0 ? (
                    <tr>
                      <td colSpan={COL_COUNT} style={{
                        textAlign:'center', padding:16, color:'#9CA3AF',
                        fontSize:11, border:`1px solid ${CMI.border}`,
                        backgroundColor: CMI.rowOdd,
                      }}>
                        No hay indicadores de proceso registrados
                      </td>
                    </tr>
                  ) : (
                    processRows.map((ind, idx) => renderRow(ind, idx))
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {!loading && indicators.length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'#9CA3AF' }}>
          <TrendingUp size={40} style={{ margin:'0 auto 12px', opacity:0.3 }} />
          <p style={{ fontSize:14, fontWeight:600 }}>No hay indicadores creados</p>
          {canCreate && (
            <p style={{ fontSize:12 }}>Haz clic en "Nuevo Indicador" para comenzar</p>
          )}
        </div>
      )}

      {/* ── Modales ── */}
      {modalOpen && (
        <IndicadorModal
          mode={modalMode}
          indicator={selected}
          profiles={profiles}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          fetchMeasurements={fetchMeasurements}
          deleteMeasurement={deleteMeasurement}
        />
      )}

      {medicionOpen && medicionInd && (
        <MedicionModal
          indicator={medicionInd}
          onSave={handleMedicionSave}
          onClose={() => setMedicionOpen(false)}
        />
      )}
    </div>
  );
}