// src/components/modules/SSTBienestar/MatrizPeligros/MatrizPeligrosTab.jsx
import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  AlertTriangle, Plus, RefreshCw, ChevronDown, ChevronRight,
  Edit, Trash2, Shield, Download, Filter, X,
} from 'lucide-react';
import {
  useMatrizPeligros,
  ACEPTABILIDAD_CONFIG,
  PELIGRO_CLASE_CONFIG,
  PELIGRO_CLASES,
} from '@/hooks/useMatrizPeligros';
import { exportMatrizPeligros } from '@/utils/exportMatrizPeligros';
import MatrizPeligrosModal from './MatrizPeligrosModal';

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────
const C = {
  primary: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c',
  amber: '#d97706', sand: '#dedecc',
};

// ─────────────────────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────────────────────
function AceptBadge({ value }) {
  const cfg = ACEPTABILIDAD_CONFIG[value] || ACEPTABILIDAD_CONFIG.III;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

function ClaseChip({ value }) {
  const cfg = PELIGRO_CLASE_CONFIG[value] || { bg: '#F1EFE8', color: '#5F5E5A' };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 500,
    }}>{value}</span>
  );
}

function NRCircle({ nr, aceptabilidad }) {
  const cfg = ACEPTABILIDAD_CONFIG[aceptabilidad] || ACEPTABILIDAD_CONFIG.III;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: cfg.bg, color: cfg.color,
      border: `2px solid ${cfg.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: nr >= 100 ? 10 : 12, fontWeight: 700,
      flexShrink: 0, margin: '0 auto',
    }}>{nr}</div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{
      background: bg || '#f9fafb', borderRadius: 12,
      padding: '12px 16px', border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILA EXPANDIDA — 7 secciones GTC-45 en mini-tabla
// ─────────────────────────────────────────────────────────────
const SECCIONES_DETALLE = [
  {
    num: 1, label: 'Identificación del peligro', color: C.primary,
    campos: (r) => [
      { l: 'Tarea',        v: r.tarea,           wide: true },
      { l: 'Rutinario',    v: r.rutinario ? 'Sí' : 'No' },
      { l: 'Clasificación',v: r.peligro_clase },
      { l: 'Descripción',  v: r.peligro_descripcion, wide: true },
      { l: 'Efectos posibles', v: r.efectos_posibles, wide: true },
    ],
  },
  {
    num: 2, label: 'Controles existentes', color: C.olive,
    campos: (r) => [
      { l: 'En la fuente',      v: r.control_fuente,     wide: true },
      { l: 'En el medio',       v: r.control_medio,      wide: true },
      { l: 'En el trabajador',  v: r.control_trabajador, wide: true },
    ],
  },
  {
    num: 3, label: 'Evaluación del riesgo', color: '#185FA5', special: 'eval',
  },
  {
    num: 4, label: 'Criterios para evaluar controles', color: C.amber,
    campos: (r) => [
      { l: 'N° expuestos',       v: r.num_expuestos != null ? String(r.num_expuestos) : null },
      { l: 'Por consecuencias',  v: r.por_consecuencias },
      { l: 'Requisito legal',    v: r.requisito_legal, wide: true },
    ],
  },
  {
    num: 5, label: 'Medidas de intervención', color: '#0F6E56',
    campos: (r) => [
      { l: 'Eliminación',          v: r.medida_eliminacion },
      { l: 'Sustitución',          v: r.medida_sustitucion },
      { l: 'Controles de ingeniería', v: r.medida_ingenieria,     wide: true },
      { l: 'Controles administrativos / señalización', v: r.medida_administrativa, wide: true },
      { l: 'EPP',                  v: r.medida_epp,               wide: true },
    ],
  },
  {
    num: 6, label: 'Plan de acción', color: '#534AB7',
    campos: (r) => [
      { l: 'Fecha de realización', v: r.fecha_realizacion },
      { l: 'Responsable',          v: r.responsable_plan },
    ],
  },
  {
    num: 7, label: 'Verificación', color: '#993556',
    campos: (r) => [
      { l: 'Fecha de cierre',     v: r.fecha_cierre },
      { l: 'Cierre efectivo',     v: r.cierre_efectivo ? 'Sí' : 'No' },
      { l: 'Hallazgo / Evidencia',v: r.hallazgo_evidencia,         wide: true },
      { l: 'Responsable verif.',  v: r.responsable_verificacion },
    ],
  },
];

function FilaDetalle({ row }) {
  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, background: '#fafafa', borderBottom: '2px solid #e5e7eb' }}>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECCIONES_DETALLE.map((sec) => (
            <div key={sec.num} style={{
              border: `1px solid ${sec.color}25`,
              borderLeft: `4px solid ${sec.color}`,
              borderRadius: 8, overflow: 'hidden', background: '#fff',
            }}>
              {/* Header sección */}
              <div style={{
                background: `${sec.color}10`, padding: '6px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: sec.color, color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{sec.num}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: sec.color }}>{sec.label}</span>
              </div>

              {/* Contenido sección */}
              <div style={{ padding: '10px 12px' }}>
                {sec.special === 'eval' ? (
                  // Sección 3: fórmula GTC-45
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { n: row.nivel_deficiencia, l: 'ND' },
                      { sep: '×' },
                      { n: row.nivel_exposicion, l: 'NE' },
                      { sep: '=' },
                      { n: row.nivel_probabilidad, l: 'NP', bold: true },
                      { extra: row.interpretacion_np },
                      { sep: '×' },
                      { n: row.nivel_consecuencias, l: 'NC' },
                      { sep: '=' },
                      { n: row.nivel_riesgo, l: 'NR', bold: true, highlight: true, row },
                      { acept: row.aceptabilidad },
                    ].map((item, i) => {
                      if (item.sep) return <span key={i} style={{ fontSize: 16, color: '#9ca3af' }}>{item.sep}</span>;
                      if (item.extra) return (
                        <span key={i} style={{
                          fontSize: 11, background: '#f3f4f6', padding: '3px 8px',
                          borderRadius: 6, color: '#374151',
                        }}>{item.extra}</span>
                      );
                      if (item.acept) return <AceptBadge key={i} value={item.acept} />;
                      const cfg = ACEPTABILIDAD_CONFIG[item.row?.aceptabilidad] || {};
                      return (
                        <div key={i} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          background: item.highlight ? cfg.bg : '#f9fafb',
                          border: `1px solid ${item.highlight ? cfg.border : '#e5e7eb'}`,
                          borderRadius: 8, padding: '6px 12px', minWidth: 48,
                        }}>
                          <span style={{
                            fontSize: item.bold ? 18 : 16, fontWeight: 700,
                            color: item.highlight ? cfg.color : '#1f2937',
                          }}>{item.n ?? '—'}</span>
                          <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600 }}>{item.l}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Secciones de campos
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 8,
                  }}>
                    {sec.campos(row).map((campo, ci) => (
                      <div key={ci} style={{
                        gridColumn: campo.wide ? '1 / -1' : undefined,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>
                          {campo.l}
                        </div>
                        <div style={{ fontSize: 12, color: campo.v ? '#1f2937' : '#d1d5db', lineHeight: 1.5 }}>
                          {campo.v || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function MatrizPeligrosTab() {
  const hook = useMatrizPeligros();
  const {
    peligros, stats, loading, error,
    procesos, seccionesFiltradas, actividadesFiltradas,
    filtros, aplicarFiltro, limpiarFiltros,
    deletePeligro, canCreate, canEdit, canDelete, canExport,
    fetchPeligros,
  } = hook;

  const [expandidos, setExpandidos]   = useState({});
  const [modalOpen, setModalOpen]     = useState(false);
  const [editando, setEditando]       = useState(null);   // null = crear, objeto = editar
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const toggleFila = (id) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  const hayFiltros = Object.values(filtros).some(Boolean);

  // ── Abrir modal crear
  const handleCrear = () => { setEditando(null); setModalOpen(true); };

  // ── Abrir modal editar
  const handleEditar = (peligro) => { setEditando(peligro); setModalOpen(true); };

  // ── Confirmar eliminación
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await deletePeligro(confirmDelete.id);
    setConfirmDelete(null);
    setDeleting(false);
  };

  // ── Cierre del modal → refrescar
  const [exporting, setExporting] = useState(false);

  const handleExportar = async () => {
    try {
      setExporting(true);
      // Construir label del filtro activo para el nombre del archivo
      const partes = [
        filtros.proceso_id  && procesos.find(p => p.id === filtros.proceso_id)?.nombre,
        filtros.seccion_id  && hook.secciones.find(s => s.id === filtros.seccion_id)?.nombre,
        filtros.actividad_id && hook.actividades.find(a => a.id === filtros.actividad_id)?.nombre,
        filtros.peligro_clase,
        filtros.aceptabilidad && `Nivel_${filtros.aceptabilidad}`,
      ].filter(Boolean);
      const filtroLabel = partes.join('_') || 'TODA_LA_EMPRESA';
      await exportMatrizPeligros(peligros, filtroLabel);
    } catch (err) {
      alert(`Error al exportar: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleModalClose = (recargar) => {
    setModalOpen(false);
    setEditando(null);
    if (recargar) fetchPeligros();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.amber} 0%, ${C.amber}cc 100%)`,
        borderRadius: 14, padding: '20px 24px', color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: 12,
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>
                Matriz de Identificación de Peligros
              </h2>
              <p style={{ fontSize: 12, opacity: 0.85 }}>
                GTC-45:2012 · INDECON S.A.S. · Formato RE-GS-10
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canExport && (
              <Button
                variant="outline"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 12 }}
                onClick={handleExportar} disabled={exporting || !peligros.length}
              >
                <Download size={14} style={{ marginRight: 5 }} />
                {exporting ? 'Exportando...' : 'Exportar RE-GS-10'}
              </Button>
            )}
            {canCreate && (
              <Button
                style={{ background: '#fff', color: C.amber, fontWeight: 700, fontSize: 12 }}
                onClick={handleCrear}
              >
                <Plus size={14} style={{ marginRight: 5 }} />
                Nuevo peligro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <StatCard label="Peligros identificados" value={stats.total}           color={C.primary}        bg="#f0f7f4" />
        <StatCard label="Nivel I — No Aceptable"  value={stats.porAceptabilidad.I}  color="#A32D2D"    bg="#fef2f2" />
        <StatCard label="Nivel II — Alto"          value={stats.porAceptabilidad.II} color="#854F0B"    bg="#fffbeb" />
        <StatCard label="Nivel III–IV"             value={stats.porAceptabilidad.III + stats.porAceptabilidad.IV} color="#3B6D11" bg="#f0fdf4" />
      </div>

      {/* ── Filtros en cascada ──────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} color={C.primary} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>Filtros en cascada</span>
          </div>
          {hayFiltros && (
            <button onClick={limpiarFiltros} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: '#6b7280',
            }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Fila 1: jerarquía */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <SelectFiltro
            label="Proceso"
            value={filtros.proceso_id || ''}
            onChange={v => aplicarFiltro('proceso_id', v)}
            options={procesos.map(p => ({ value: p.id, label: p.nombre }))}
            placeholder="— Todos los procesos —"
          />
          <SelectFiltro
            label="Sección"
            value={filtros.seccion_id || ''}
            onChange={v => aplicarFiltro('seccion_id', v)}
            options={seccionesFiltradas.map(s => ({ value: s.id, label: s.nombre }))}
            placeholder="— Todas las secciones —"
            disabled={!filtros.proceso_id}
          />
          <SelectFiltro
            label="Actividad"
            value={filtros.actividad_id || ''}
            onChange={v => aplicarFiltro('actividad_id', v)}
            options={actividadesFiltradas.map(a => ({ value: a.id, label: a.nombre }))}
            placeholder="— Todas las actividades —"
            disabled={!filtros.seccion_id}
          />
        </div>

        {/* Fila 2: tipo peligro + aceptabilidad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          <SelectFiltro
            label="Tipo de peligro"
            value={filtros.peligro_clase || ''}
            onChange={v => aplicarFiltro('peligro_clase', v)}
            options={PELIGRO_CLASES.map(c => ({ value: c, label: c }))}
            placeholder="— Todos los tipos —"
          />
          <SelectFiltro
            label="Aceptabilidad"
            value={filtros.aceptabilidad || ''}
            onChange={v => aplicarFiltro('aceptabilidad', v)}
            options={[
              { value: 'I',   label: 'I — No Aceptable' },
              { value: 'II',  label: 'II — No Aceptable con control' },
              { value: 'III', label: 'III — Aceptable (mejorable)' },
              { value: 'IV',  label: 'IV — Aceptable' },
            ]}
            placeholder="— Todos los niveles —"
          />
        </div>

        {/* Breadcrumb de selección activa */}
        {hayFiltros && (
          <BreadcrumbFiltros filtros={filtros} procesos={procesos} hook={hook} />
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: '#b91c1c',
        }}>
          {error}
        </div>
      )}

      {/* ── Tabla ──────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12,
        border: '0.5px solid #e5e7eb', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <p>Cargando peligros...</p>
          </div>
        ) : peligros.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            <Shield size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 600 }}>No hay peligros para esta selección</p>
            <p style={{ marginTop: 4 }}>Cambia los filtros o crea un nuevo peligro</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thS()}></th>
                <th style={thS()}>Clasificación</th>
                <th style={thS('left', 220)}>Descripción del peligro</th>
                <th style={thS('left', 200)}>Efectos posibles</th>
                <th style={thS('center', 60)}>NR</th>
                <th style={thS()}>Aceptabilidad</th>
                <th style={thS('center', 70)}>Rutinario</th>
                {(canEdit || canDelete) && <th style={thS('center', 80)}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {peligros.map((p) => (
                <React.Fragment key={p.id}>
                  <tr
                    onClick={() => toggleFila(p.id)}
                    style={{
                      borderBottom: expandidos[p.id] ? 'none' : '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: expandidos[p.id] ? '#fffbeb' : '#fff',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!expandidos[p.id]) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (!expandidos[p.id]) e.currentTarget.style.background = '#fff'; }}
                  >
                    {/* Expand toggle */}
                    <td style={{ ...tdS('center', 36), color: C.amber }}>
                      {expandidos[p.id]
                        ? <ChevronDown size={15} />
                        : <ChevronRight size={15} />}
                    </td>

                    {/* Clase */}
                    <td style={tdS()}>
                      <ClaseChip value={p.peligro_clase} />
                    </td>

                    {/* Descripción */}
                    <td style={{ ...tdS('left'), maxWidth: 220, lineHeight: 1.4 }}>
                      {p.peligro_descripcion}
                    </td>

                    {/* Efectos */}
                    <td style={{ ...tdS('left'), maxWidth: 200, color: '#6b7280', lineHeight: 1.4 }}>
                      {p.efectos_posibles || '—'}
                    </td>

                    {/* NR */}
                    <td style={tdS('center', 60)}>
                      <NRCircle nr={p.nivel_riesgo} aceptabilidad={p.aceptabilidad} />
                    </td>

                    {/* Aceptabilidad */}
                    <td style={tdS()}>
                      <AceptBadge value={p.aceptabilidad} />
                    </td>

                    {/* Rutinario */}
                    <td style={{ ...tdS('center'), color: p.rutinario ? C.primary : '#9ca3af' }}>
                      {p.rutinario ? 'Sí' : 'No'}
                    </td>

                    {/* Acciones */}
                    {(canEdit || canDelete) && (
                      <td style={tdS('center')} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {canEdit && (
                            <button
                              onClick={() => handleEditar(p)}
                              style={btnS(C.primary)}
                              title="Editar"
                            >
                              <Edit size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete(p)}
                              style={btnS('#dc2626')}
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Fila expandida con 7 secciones */}
                  {expandidos[p.id] && <FilaDetalle row={p} />}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pie de tabla ───────────────────────────────────── */}
      {!loading && peligros.length > 0 && (
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
          {peligros.length} peligro{peligros.length !== 1 ? 's' : ''} · Haz clic en una fila para ver el detalle completo
        </div>
      )}

      {/* ── Modal crear / editar ────────────────────────────── */}
      {modalOpen && (
        <MatrizPeligrosModal
          peligro={editando}
          hook={hook}
          onClose={handleModalClose}
        />
      )}

      {/* ── Modal confirmar eliminación ─────────────────────── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28,
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={18} color="#dc2626" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Eliminar peligro</p>
                <p style={{ fontSize: 12, color: '#6b7280' }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 20 }}>
              ¿Confirmas que deseas eliminar el peligro{' '}
              <strong>"{confirmDelete.peligro_descripcion}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Select de filtro
// ─────────────────────────────────────────────────────────────
function SelectFiltro({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%', padding: '7px 10px', fontSize: 12,
          border: '0.5px solid #d1d5db', borderRadius: 8,
          background: disabled ? '#f9fafb' : '#fff',
          color: disabled ? '#9ca3af' : '#1f2937',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Breadcrumb de filtros activos
// ─────────────────────────────────────────────────────────────
function BreadcrumbFiltros({ filtros, procesos, hook }) {
  const { secciones, actividades } = hook;

  const proceso  = procesos.find(p => p.id === filtros.proceso_id);
  const seccion  = secciones.find(s => s.id === filtros.seccion_id);
  const actividad= actividades.find(a => a.id === filtros.actividad_id);

  const partes = [
    proceso   && proceso.nombre,
    seccion   && seccion.nombre,
    actividad && actividad.nombre,
    filtros.peligro_clase,
    filtros.aceptabilidad && `Nivel ${filtros.aceptabilidad}`,
  ].filter(Boolean);

  if (!partes.length) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
      <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Vista:</span>
      {partes.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ fontSize: 11, color: '#d1d5db' }}>›</span>}
          <span style={{
            fontSize: 11, background: `${C.amber}15`, color: C.amber,
            padding: '2px 8px', borderRadius: 10, fontWeight: 500,
          }}>{p}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE ESTILOS
// ─────────────────────────────────────────────────────────────
function thS(align = 'left', w) {
  return {
    padding: '9px 12px', textAlign: align,
    fontSize: 11, fontWeight: 600, color: '#6b7280',
    whiteSpace: 'nowrap', width: w,
  };
}
function tdS(align = 'left', w) {
  return {
    padding: '10px 12px', textAlign: align,
    verticalAlign: 'middle', width: w,
  };
}
function btnS(color) {
  return {
    background: `${color}12`, border: `1px solid ${color}30`,
    borderRadius: 6, padding: '4px 7px', cursor: 'pointer',
    color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.1s',
  };
}