// src/components/modules/PlaneacionEstrategica/PlaneacionEstrategica_v2.jsx
// ═══════════════════════════════════════════════════════════════════
// VERSIÓN 2 — "El Tablero Ejecutivo"
// Dashboard de números primero. Estilo BI. 100% datos desde BD.
// ✅ Usa fetchIndicators (no refresh)
// ✅ Usa indicator_measurement (no indicator_value)
// ✅ Usa createIndicator (no addIndicator)
// ✅ Perspectiva: "Crecimiento y Desarrollo"
// ✅ Paleta 100% Garana
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useAuth }      from '@/context/AuthContext';
import { Button }       from '@/app/components/ui/button';
import { Input }        from '@/app/components/ui/input';
import ModuleHero       from '@/components/ModuleHero';
import {
  useIndicadores, useProfiles,
} from '@/hooks/useIndicadores';
import IndicadorModal from '@/components/modules/MejoramientoContinuo/Indicadores/IndicadorModal';
import MedicionModal  from '@/components/modules/MejoramientoContinuo/Indicadores/MedicionModal';
import {
  Target, RefreshCw, Loader2, AlertCircle, Plus, BarChart3,
  BookOpen, LayoutDashboard, TrendingUp, Minus, Edit, Trash2,
  DollarSign, Users, Settings, CheckCircle2, AlertTriangle,
  XCircle, Award, Activity,
  FileText, Download, ShieldCheck, Scale, Heart, Ban, Handshake,
  Swords, Gem, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

// ─── Paleta Garana 100% ──────────────────────────────────────────────────────
const G = {
  primary: '#2e5244',   // verde oscuro — solidez
  mint:    '#6dbd96',   // verde menta — crecimiento
  olive:   '#6f7b2c',   // oliva       — valor/dinero
  amber:   '#d97706',   // ámbar       — alerta / energía
  sand:    '#dedecc',   // arena       — fondo neutro
};

// ─── Perspectivas BSC — paleta Garana pura ──────────────────────────────────
//  Financiera        → olive  (#6f7b2c)  sensación de "dinero / tierra"
//  Clientes          → mint   (#6dbd96)  fresco, relacional
//  Procesos Internos → primary (#2e5244) sólido, operacional
//  Crecimiento       → amber  (#d97706)  energía, impulso
const PERSP = [
  {
    key:   'financiera',
    label: 'Financiera',
    long:  'Perspectiva Financiera',
    icon:  DollarSign,
    color: G.olive,        // #6f7b2c
    bg:    '#f7f8f0',
    ring:  '#c8cc9d',
  },
  {
    key:   'cliente',
    label: 'Clientes',
    long:  'Perspectiva de Clientes',
    icon:  Users,
    color: G.mint,         // #6dbd96
    bg:    '#f0faf5',
    ring:  '#9ddcbd',
  },
  {
    key:   'procesos_internos',
    label: 'Procesos',
    long:  'Perspectiva de Procesos Internos',
    icon:  Settings,
    color: G.primary,      // #2e5244
    bg:    '#edf3f0',
    ring:  '#8bb5a5',
  },
  {
    key:   'crecimiento_desarrollo',
    label: 'Crecimiento y Desarrollo',
    long:  'Perspectiva de Crecimiento y Desarrollo',
    icon:  TrendingUp,
    color: G.amber,        // #d97706
    bg:    '#fdf8ee',
    ring:  '#f0c070',
  },
];

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'perspectivas', label: 'Perspectivas',         icon: BarChart3       },
  { id: 'indicadores',  label: 'Indicadores',          icon: Target          },
  { id: 'plataforma',   label: 'Plataforma',           icon: BookOpen        },
  { id: 'plan2026',     label: 'Planeación 2026',      icon: FileText        },
];

// ─── PDF de Planeación Estratégica 2026 ─────────────────────────────────────
// Sube el archivo a Supabase Storage → bucket "templates" (raíz), con este
// nombre exacto, y el botón de descarga funcionará automáticamente.
const PLAN_2026_PDF_URL =
  'https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/PLANEACION_ESTRATEGICA_2026.pdf';

// ─── Semáforo ────────────────────────────────────────────────────────────────
function calcPct(ind) {
  const val  = ind.last_measurement_value;
  const goal = ind.goal_value_parsed ?? ind.goal_value ?? null;
  if (val == null || !goal || goal === 0) return null;
  const dir = ind.goal_direction ?? 'asc';
  if (dir === 'desc') {
    return val <= goal ? 100 : Math.round((goal / val) * 100 * 10) / 10;
  }
  return Math.round((val / goal) * 100 * 10) / 10;
}

const STATUS = {
  cumplido: { label: 'Cumplido',  color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  alerta:   { label: 'En alerta', color: G.amber,   bg: '#fef3c7', icon: AlertTriangle },
  critico:  { label: 'Crítico',   color: '#dc2626', bg: '#fee2e2', icon: XCircle       },
  sin_dato: { label: 'Sin datos', color: '#9ca3af', bg: '#f3f4f6', icon: Minus         },
};

function getStatus(pct) {
  if (pct == null) return 'sin_dato';
  if (pct >= 100)  return 'cumplido';
  if (pct >= 80)   return 'alerta';
  return 'critico';
}

function SemBadge({ pct, small }) {
  const key = getStatus(pct);
  const s   = STATUS[key];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '1px 8px' : '3px 12px',
      borderRadius: 20, fontWeight: 700,
      fontSize: small ? 11 : 12,
      background: s.bg, color: s.color,
    }}>
      {pct != null ? `${pct}%` : s.label}
    </span>
  );
}

// ─── Mini gauge circular ─────────────────────────────────────────────────────
function MiniGauge({ pct, size = 80, label }) {
  const key    = getStatus(pct);
  const color  = STATUS[key].color;
  const safe   = Math.min(pct ?? 0, 100);
  const data   = [
    { value: safe,        fill: color       },
    { value: 100 - safe,  fill: '#f3f4f6'   },
  ];
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%"
            startAngle={210} endAngle={-30}
            innerRadius={size * 0.32} outerRadius={size * 0.46}
            dataKey="value" strokeWidth={0}>
            {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.2, fontWeight: 900, color, lineHeight: 1 }}>
          {pct != null ? `${pct}%` : '—'}
        </span>
        {label && <span style={{ fontSize: size * 0.13, color: '#9ca3af', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — DASHBOARD EJECUTIVO
// ═══════════════════════════════════════════════════════════════════
function DashboardTab({ indicators }) {
  const stats = useMemo(() => {
    const bsc = indicators.filter(i => i.indicator_type === 'bsc' || i.perspective);
    return PERSP.map(p => {
      const inds     = bsc.filter(i => i.perspective === p.key);
      const medidos  = inds.filter(i => calcPct(i) != null);
      const avgPct   = medidos.length
        ? Math.round(medidos.reduce((s, i) => s + Math.min(calcPct(i), 150), 0) / medidos.length)
        : null;
      return {
        ...p,
        total:    inds.length,
        medidos:  medidos.length,
        avgPct,
        cumplidos: medidos.filter(i => calcPct(i) >= 100).length,
        alertas:   medidos.filter(i => { const pc = calcPct(i); return pc >= 80 && pc < 100; }).length,
        criticos:  medidos.filter(i => calcPct(i) < 80).length,
      };
    });
  }, [indicators]);

  const globalPct = useMemo(() => {
    const medidos = stats.filter(s => s.avgPct != null);
    return medidos.length
      ? Math.round(medidos.reduce((s, p) => s + p.avgPct, 0) / medidos.length)
      : null;
  }, [stats]);

  const totCumplidos = stats.reduce((s, p) => s + p.cumplidos, 0);
  const totAlertas   = stats.reduce((s, p) => s + p.alertas, 0);
  const totCriticos  = stats.reduce((s, p) => s + p.criticos, 0);
  const totTotal     = indicators.length;

  const chartData = stats.map(p => ({
    name:  p.label,
    valor: p.avgPct ?? 0,
    fill:  p.color,
  }));

  // Los últimos 5 indicadores con medición
  const recientes = [...indicators]
    .filter(i => i.last_measurement_value != null)
    .sort((a, b) => (b.last_period_label || '').localeCompare(a.last_period_label || ''))
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Fila superior: gauge global + KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>

        {/* Gauge global */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderTop: `4px solid ${G.primary}`,
        }}>
          <MiniGauge pct={globalPct} size={120} />
          <p style={{ fontSize: 13, fontWeight: 700, color: G.primary, marginTop: 10, textAlign: 'center' }}>
            Cumplimiento Global
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
            {totTotal} indicadores en total
          </p>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { label: '🟢 Cumplidos',   value: totCumplidos, color: '#16a34a', sub: 'indicadores ≥ 100%' },
            { label: '🟡 En alerta',   value: totAlertas,   color: G.amber,   sub: 'indicadores 80–99%' },
            { label: '🔴 Críticos',    value: totCriticos,  color: '#dc2626', sub: 'indicadores < 80%'  },
            { label: '⚫ Sin datos',   value: totTotal - totCumplidos - totAlertas - totCriticos,
              color: '#9ca3af', sub: 'sin mediciones aún' },
          ].map(k => (
            <div key={k.label} style={{
              background: '#fff', borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${k.color}`,
            }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scorecards por perspectiva */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {stats.map(p => {
          const PIcon = p.icon;
          const key   = getStatus(p.avgPct);
          const s     = STATUS[key];
          return (
            <div key={p.key} style={{
              background: '#fff', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
              border: `1px solid ${p.ring}`,
            }}>
              <div style={{ background: p.color, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <PIcon size={15} color="white" />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{p.long}</p>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                    {p.avgPct != null ? `${p.avgPct}%` : '—'}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {p.total} ind · {p.medidos} medidos
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {p.cumplidos > 0 && <span style={{ fontSize: 11, color: '#16a34a', background: '#dcfce7', borderRadius: 8, padding: '2px 8px' }}>🟢 {p.cumplidos}</span>}
                  {p.alertas   > 0 && <span style={{ fontSize: 11, color: G.amber,   background: '#fef3c7', borderRadius: 8, padding: '2px 8px' }}>🟡 {p.alertas}</span>}
                  {p.criticos  > 0 && <span style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', borderRadius: 8, padding: '2px 8px' }}>🔴 {p.criticos}</span>}
                </div>
              </div>
              {/* Barra de progreso */}
              <div style={{ height: 5, background: '#f3f4f6', margin: '0 16px 14px' }}>
                <div style={{ height: 5, width: `${Math.min(p.avgPct ?? 0, 100)}%`, background: p.color, borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfica + recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Barras */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: G.primary, marginBottom: 16 }}>Cumplimiento por perspectiva</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[0, 120]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => [`${v}%`, 'Cumplimiento']} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Últimas mediciones */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: G.primary, marginBottom: 14 }}>Últimas mediciones</p>
          {recientes.length === 0
            ? <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>Sin mediciones aún</p>
            : recientes.map(ind => {
              const pct  = calcPct(ind);
              const persp = PERSP.find(p => p.key === ind.perspective);
              const s    = STATUS[getStatus(pct)];
              return (
                <div key={ind.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid #f9fafb',
                }}>
                  {persp && (
                    <div style={{ width: 6, height: 32, borderRadius: 3, background: persp.color, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ind.indicator_name}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>
                      {ind.last_period_label || '—'} · Valor: {ind.last_measurement_value}
                    </p>
                  </div>
                  <SemBadge pct={pct} small />
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — PERSPECTIVAS (detalle por perspectiva)
// ═══════════════════════════════════════════════════════════════════
function PerspTab({ indicators, hook, profiles, canManage, canMeasure }) {
  const [selPersp, setSelPersp] = useState(PERSP[0].key);
  const [modal,    setModal]    = useState(null);
  const [medModal, setMedModal] = useState(null);
  const { createIndicator, updateIndicator, deleteIndicator, addMeasurement,
          fetchMeasurements, deleteMeasurement, fetchIndicators } = hook;

  const persp    = PERSP.find(p => p.key === selPersp);
  const PIcon    = persp.icon;
  const inds     = indicators.filter(i => i.perspective === selPersp);
  const medidos  = inds.filter(i => calcPct(i) != null);
  const avgPct   = medidos.length
    ? Math.round(medidos.reduce((s, i) => s + Math.min(calcPct(i), 150), 0) / medidos.length)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selector perspectiva */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {PERSP.map(p => {
          const PI = p.icon;
          const isActive = selPersp === p.key;
          const pInds = indicators.filter(i => i.perspective === p.key);
          const avgP  = pInds.filter(i => calcPct(i) != null);
          const avg   = avgP.length ? Math.round(avgP.reduce((s, i) => s + Math.min(calcPct(i), 150), 0) / avgP.length) : null;
          return (
            <button key={p.key} onClick={() => setSelPersp(p.key)} style={{
              background: isActive ? p.color : '#fff',
              border: `2px solid ${isActive ? p.color : p.ring}`,
              borderRadius: 14, padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
              boxShadow: isActive ? `0 4px 16px ${p.color}30` : '0 1px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.15s',
            }}>
              <PI size={18} color={isActive ? 'white' : p.color} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'white' : '#374151', marginBottom: 4 }}>
                {p.long}
              </p>
              <p style={{ fontSize: 20, fontWeight: 900, color: isActive ? 'rgba(255,255,255,0.9)' : STATUS[getStatus(avg)].color }}>
                {avg != null ? `${avg}%` : '—'}
              </p>
              <p style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.65)' : '#9ca3af' }}>
                {pInds.length} indicadores
              </p>
            </button>
          );
        })}
      </div>

      {/* Detalle perspectiva */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
        {/* Header */}
        <div style={{ background: persp.color, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PIcon size={18} color="white" />
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Perspectiva activa</p>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{persp.long}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 30, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                {avgPct != null ? `${avgPct}%` : '—'}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{inds.length} indicadores</p>
            </div>
            {canManage && (
              <Button onClick={() => setModal({ mode: 'create' })}
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: 13, height: 36 }}>
                <Plus size={14} style={{ marginRight: 6 }} /> Nuevo
              </Button>
            )}
          </div>
        </div>

        {/* Lista indicadores */}
        {inds.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>
            <Target size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>No hay indicadores en esta perspectiva aún.</p>
            {canManage && (
              <Button onClick={() => setModal({ mode: 'create' })}
                style={{ marginTop: 12, background: persp.color, color: '#fff', fontSize: 13 }}>
                <Plus size={13} style={{ marginRight: 6 }} /> Agregar indicador
              </Button>
            )}
          </div>
        ) : (
          inds.map((ind, ii) => {
            const pct = calcPct(ind);
            const s   = STATUS[getStatus(pct)];
            const SI  = s.icon;
            return (
              <div key={ind.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px',
                borderTop: ii > 0 ? '1px solid #f3f4f6' : `1px solid ${persp.ring}`,
              }}>
                {/* Barra lateral de color */}
                <div style={{ width: 4, height: 40, borderRadius: 2, background: persp.color, flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ind.indicator_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {ind.objective || '—'} · Meta: <strong>{ind.goal}</strong> · {ind.frequency}
                    {ind.last_period_label && ` · Último período: ${ind.last_period_label}`}
                  </p>
                </div>

                {/* Gauge mini */}
                <MiniGauge pct={pct} size={58} />

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {canMeasure && (
                    <button onClick={() => setMedModal(ind)} style={{
                      background: persp.color, color: '#fff', border: 'none',
                      borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}>+ Medir</button>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => setModal({ mode: 'edit', item: ind })}
                        style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: G.primary }}>
                        <Edit size={13} />
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${ind.indicator_name}"?`)) deleteIndicator(ind.id).then(fetchIndicators); }}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#dc2626' }}>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modal && (
        <IndicadorModal
          mode={modal.mode} indicator={modal.item} profiles={profiles}
          onSave={modal.mode === 'create' ? createIndicator : (data) => updateIndicator(modal.item.id, data)}
          onClose={() => { setModal(null); fetchIndicators(); }}
          fetchMeasurements={fetchMeasurements} deleteMeasurement={deleteMeasurement}
        />
      )}
      {medModal && (
        <MedicionModal
          indicator={medModal}
          onSave={(id, data) => addMeasurement(id, data).then(() => { fetchIndicators(); setMedModal(null); })}
          onClose={() => setMedModal(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — TODOS LOS INDICADORES (tabla filtrable)
// ═══════════════════════════════════════════════════════════════════
function IndicadoresTab({ indicators, hook, profiles, canManage, canMeasure }) {
  const [modal,    setModal]    = useState(null);
  const [medModal, setMedModal] = useState(null);
  const [search,   setSearch]   = useState('');
  const [filterP,  setFilterP]  = useState('');
  const [filterS,  setFilterS]  = useState('');
  const { createIndicator, updateIndicator, deleteIndicator, addMeasurement,
          fetchMeasurements, deleteMeasurement, fetchIndicators } = hook;

  const filtered = useMemo(() => indicators.filter(i => {
    const pct = calcPct(i);
    const key = getStatus(pct);
    const ms = !search  || (i.indicator_name || '').toLowerCase().includes(search.toLowerCase());
    const mp = !filterP || i.perspective === filterP;
    const mk = !filterS || key === filterS;
    return ms && mp && mk;
  }), [indicators, search, filterP, filterS]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Barra de filtros */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '14px 18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar indicador..."
          style={{ width: 200, height: 34, fontSize: 13 }} />

        <select value={filterP} onChange={e => setFilterP(e.target.value)}
          style={{ height: 34, fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', padding: '0 10px', color: '#374151' }}>
          <option value="">Todas las perspectivas</option>
          {PERSP.map(p => <option key={p.key} value={p.key}>{p.long}</option>)}
        </select>

        <select value={filterS} onChange={e => setFilterS(e.target.value)}
          style={{ height: 34, fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', padding: '0 10px', color: '#374151' }}>
          <option value="">Todos los estados</option>
          <option value="cumplido">🟢 Cumplidos</option>
          <option value="alerta">🟡 En alerta</option>
          <option value="critico">🔴 Críticos</option>
          <option value="sin_dato">⚫ Sin datos</option>
        </select>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{filtered.length} indicadores</span>
        {canManage && (
          <Button onClick={() => setModal({ mode: 'create' })}
            style={{ background: G.primary, color: '#fff', height: 34, fontSize: 13 }}>
            <Plus size={14} style={{ marginRight: 6 }} /> Nuevo
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Cabecera */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 120px',
          padding: '10px 18px', background: '#f8fafc',
          fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <span>Indicador</span>
          <span>Perspectiva</span>
          <span>Meta · Frecuencia</span>
          <span style={{ textAlign: 'center' }}>Estado</span>
          <span style={{ textAlign: 'right' }}>Acciones</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>
            <Target size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>{search || filterP || filterS ? 'Sin resultados con estos filtros.' : 'No hay indicadores aún.'}</p>
          </div>
        ) : (
          filtered.map((ind, ii) => {
            const pct   = calcPct(ind);
            const sKey  = getStatus(pct);
            const s     = STATUS[sKey];
            const persp = PERSP.find(p => p.key === ind.perspective);
            return (
              <div key={ind.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 120px',
                alignItems: 'center', padding: '12px 18px',
                borderTop: '1px solid #f3f4f6',
                background: ii % 2 === 0 ? '#fff' : '#fafafa',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ind.indicator_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {ind.objective || '—'}
                    {ind.last_measurement_value != null && ` · Último: ${ind.last_measurement_value}`}
                  </p>
                </div>

                {persp ? (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: persp.color,
                    background: persp.bg, borderRadius: 8, padding: '3px 10px',
                    border: `1px solid ${persp.ring}`, display: 'inline-block',
                  }}>{persp.label}</span>
                ) : (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
                )}

                <div>
                  <p style={{ fontSize: 12, color: '#374151' }}>{ind.goal || '—'}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>{ind.frequency || '—'}</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <SemBadge pct={pct} small />
                </div>

                <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                  {canMeasure && (
                    <button onClick={() => setMedModal(ind)} style={{
                      background: G.primary, color: '#fff', border: 'none',
                      borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}>+ Medir</button>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => setModal({ mode: 'edit', item: ind })}
                        style={{ background: '#f3f4f6', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: G.primary }}>
                        <Edit size={12} />
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${ind.indicator_name}"?`)) deleteIndicator(ind.id).then(fetchIndicators); }}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#dc2626' }}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modal && (
        <IndicadorModal
          mode={modal.mode} indicator={modal.item} profiles={profiles}
          onSave={modal.mode === 'create' ? createIndicator : (data) => updateIndicator(modal.item.id, data)}
          onClose={() => { setModal(null); fetchIndicators(); }}
          fetchMeasurements={fetchMeasurements} deleteMeasurement={deleteMeasurement}
        />
      )}
      {medModal && (
        <MedicionModal
          indicator={medModal}
          onSave={(id, data) => addMeasurement(id, data).then(() => { fetchIndicators(); setMedModal(null); })}
          onClose={() => setMedModal(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4 — PLATAFORMA ESTRATÉGICA
// ═══════════════════════════════════════════════════════════════════
function PlataformaTab() {
  const INFO = [
    { title: 'Misión',  icon: '🎯', color: G.primary,
      text: 'Confeccionar y comercializar trajes de baño cómodos e innovadores, en una empresa consolidada, versátil, competente y con capacidad de adaptación, enfocada en la satisfacción de sus clientes, el bienestar y la seguridad de sus colaboradores, apoyados en la mejora continua de procesos y la competencia laboral.' },
    { title: 'Visión',  icon: '👁️', color: G.mint,
      text: 'INDECON tendrá una rentabilidad sostenible mediante el posicionamiento de su marca "Garana Art" y mayor participación en el mercado nacional e internacional, con un ambiente extraordinario de trabajo y un equipo humano altamente motivado.' },
    { title: 'Propuesta de Valor', icon: '💎', color: G.olive,
      text: 'Ofrecer a las mujeres de hoy prendas que combinan seguridad y comodidad, empoderándolas a través de su estilo. Para nuestros clientes y distribuidores, aseguramos versatilidad, excelencia y oportunidad en la entrega.' },
  ];
  const VALORES = ['🤝 Honestidad', '✅ Responsabilidad', '🌿 Respeto', '❤️ Amor', '⚓ Lealtad'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${G.primary} 0%, #3d6b5a 50%, ${G.mint} 100%)`,
        borderRadius: 16, padding: '28px 32px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <p style={{ fontSize: 10, opacity: 0.7, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            INDECON S.A.S. · Plataforma Estratégica
          </p>
          <h2 style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Garana Art</h2>
          <p style={{ opacity: 0.8, fontSize: 13 }}>Riosucio, Caldas · Desde 2006 · 19 años de excelencia</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['ISO 9001', 'SELLO SOLAR PREMIUM', 'CEMEX'].map(c => (
            <div key={c} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 9, opacity: 0.7, marginBottom: 2 }}>Certificación</p>
              <p style={{ fontSize: 11, fontWeight: 700 }}>{c}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Misión / Visión / Valor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {INFO.map(item => (
          <div key={item.title} style={{
            background: '#fff', borderRadius: 14, padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `5px solid ${item.color}`,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.title}</h3>
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{item.text}</p>
          </div>
        ))}
      </div>

      {/* Valores */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: G.primary, marginBottom: 14 }}>🌟 Valores Corporativos</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {VALORES.map(v => (
            <span key={v} style={{
              background: `${G.primary}08`, border: `1px solid ${G.primary}25`,
              borderRadius: 30, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: G.primary,
            }}>{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5 — PLANEACIÓN ESTRATÉGICA 2026 (independiente, solo lectura)
// ═══════════════════════════════════════════════════════════════════

// Datos estáticos extraídos del documento oficial "Planeación Estratégica"
// Revisado y firmado: 05/02/2026 · Margarita Milena Ramírez (Gerente) ·
// Aprobado por Lina María Ruiz Guzmán (Subgerente)

const P26_POLITICAS = [
  {
    id: 'sig',
    title: 'Política del Sistema Integrado de Gestión (SIG + BASC)',
    icon: ShieldCheck,
    color: G.primary,
    text: 'INDECON S.A.S integra su Sistema de Gestión de Calidad (ISO 9000), el sistema de gestión de Seguridad y Salud en el Trabajo (Decreto 1072) y los estándares de seguridad BASC. Se compromete con la seguridad de la cadena de suministros, la prevención de actividades ilícitas y la integridad de la información, superando las expectativas de clientes, proveedores y socios.',
  },
  {
    id: 'consumo',
    title: 'Prevención de Consumo de Tabaco, Alcohol y Sustancias Psicoactivas',
    icon: Ban,
    color: '#dc2626',
    text: 'Prohíbe fumar en instalaciones y anexos, así como el consumo, posesión y venta de sustancias psicoactivas, bebidas alcohólicas y energizantes en los lugares de trabajo. Ningún contratista puede laborar bajo su efecto. Basado en las resoluciones 1075/1992, 4225/1992 y 2646/2008.',
  },
  {
    id: 'calidad_sst',
    title: 'Política Integral de Calidad y Seguridad y Salud en el Trabajo',
    icon: Award,
    color: G.olive,
    text: 'INDECON confecciona prendas con calidad mediante procesos de mejora continua, reduciendo riesgos laborales y promoviendo la salud en el trabajo, con dirección comprometida con el medio ambiente y el bienestar de sus colaboradores.',
  },
  {
    id: 'genero',
    title: 'Política de Género y Diversidad',
    icon: Heart,
    color: '#be185d',
    text: 'Compromiso con una cultura organizacional diversa e inclusiva: igualdad de oportunidades, no discriminación, ambiente inclusivo y cero tolerancia al acoso, incluido el acoso sexual, con procedimientos confidenciales para reportar.',
  },
  {
    id: 'desconexion',
    title: 'Política de Desconexión Laboral',
    icon: Scale,
    color: G.mint,
    text: 'En cumplimiento de la Ley 2191 de 2022, regula el derecho a no tener contacto laboral fuera de la jornada ordinaria, garantizando el disfrute efectivo del tiempo libre, descansos, licencias y vacaciones. Aplica a todos los colaboradores, con excepciones para cargos de dirección y confianza, y situaciones de urgencia manifiesta.',
  },
  {
    id: 'convivencia',
    title: 'Política de Convivencia',
    icon: Handshake,
    color: G.amber,
    text: 'Establece normas para un ambiente laboral armonioso y respetuoso: trato cordial, cero acoso o violencia, cumplimiento de horarios, uso consciente de recursos y confidencialidad. El incumplimiento puede acarrear amonestaciones, suspensiones o terminación de contrato según la gravedad.',
  },
];

const P26_FODA = {
  debilidades: [
    'Falta de seguridad de la información',
    'Falta de conocimiento en el personal administrativo sobre seguridad informática',
    'Poca seguridad de datos',
    'Falta de formación auditores ISO 19011',
    'Falta de un sistema documental para el SIG',
    'Falta de integralidad de datos de producción, insumos y ventas para toma efectiva de decisiones',
  ],
  oportunidades: [
    'Nuevos mercados: México, España, USA',
    'Convocatorias del gobierno nacional para mejoramiento e inversión',
    'Creciente interés en producto como fajas',
    'Creciente demanda del mercado de trajes de baño',
    'Implementación de software de producción como Busint',
    'Participación en macro rueda de las Américas, Colombia Tex, Colombia Moda, Eje Moda y Rioesmoda',
  ],
  fortalezas: [
    'Equipo administrativo altamente capacitado',
    'Equipo operativo con polivalencia',
    'Capacidad instalada articulada que permite adaptabilidad a las necesidades del mercado',
    'Alta satisfacción del cliente',
    'Marca reconocida en Colombia',
    'Proactividad de la junta directiva',
  ],
  amenazas: [
    'Tensión financiera a nivel mundial por guerra en Irán/USA/Israel',
    'Inestabilidad económica de políticas y reformas',
    'Dependencia de una maquila y un solo cliente en Ecuador para flujo de caja',
    'Fenómenos naturales: terremoto y maremoto',
    'Cambios en tratados de libre comercio con Ecuador y arancel que afecte la venta',
    'Tasa de cambio',
  ],
};

const P26_COMPETENCIA = [
  { nombre: 'Sueño Real',       precio: 3, calidad: 4, variedad: 4, estampacion: 4, redes: 3, puntoVenta: 5, total: 3.8 },
  { nombre: 'Nikelena',         precio: 5, calidad: 3, variedad: 3, estampacion: 5, redes: 4, puntoVenta: 4, total: 4.0 },
  { nombre: 'Arena y Mar',      precio: 3, calidad: 3, variedad: 3, estampacion: 3, redes: 3, puntoVenta: 5, total: 3.3 },
  { nombre: 'Swinware',         precio: 3, calidad: 5, variedad: 5, estampacion: 5, redes: 5, puntoVenta: 5, total: 4.6 },
  { nombre: 'Tropical/Vastago', precio: 4, calidad: 4, variedad: 4, estampacion: 3, redes: 3, puntoVenta: 5, total: 3.8 },
  { nombre: 'Safala',           precio: 4, calidad: 4, variedad: 4, estampacion: 4, redes: 4, puntoVenta: 4, total: 4.0 },
];

const P26_INDICADORES = [
  { nombre: '% de rentabilidad',                          meta2025: '≥5%',      resultado2025: '6,05',    meta2026: '≥5%'  },
  { nombre: 'Días de rotación de cartera',                meta2025: '<100 días', resultado2025: '82,25',   meta2026: '<90 días' },
  { nombre: '% de aumento en ventas TB',                  meta2025: '>10%',     resultado2025: '0,117',   meta2026: '≥2%'  },
  { nombre: '% Incremento de ingreso x maquila',          meta2025: '≥10%',     resultado2025: '0,1975',  meta2026: '≥10%' },
  { nombre: '% de satisfacción de clientes',              meta2025: '>80%',     resultado2025: '0,25',    meta2026: '>80%' },
  { nombre: '% de Eficiencia',                            meta2025: '>75%',     resultado2025: '80,25',   meta2026: '>80%' },
  { nombre: '% de producto no conforme',                  meta2025: '<2,5%',    resultado2025: '0,2855',  meta2026: '<2,5%' },
  { nombre: '% de desperdicio',                           meta2025: '<16%',     resultado2025: '4,3125',  meta2026: '<16%' },
  { nombre: 'N° de acciones de mejora implementadas',     meta2025: '>19',      resultado2025: '0',       meta2026: '>19' },
  { nombre: '% de ejecución del Plan de dirección y matriz legal', meta2025: '>90%', resultado2025: '0,235', meta2026: '>90%' },
  { nombre: '% de Confiabilidad de proveedores',          meta2025: '>80%',     resultado2025: '—',       meta2026: '>80%' },
  { nombre: '% de ejecución del plan de trabajo del SGGT', meta2025: '>80%',    resultado2025: '67,73',   meta2026: '>80%' },
  { nombre: '% de satisfacción laboral',                  meta2025: '>80%',     resultado2025: '0,467',   meta2026: '>85%' },
  { nombre: 'Nivel de competencia y desempeño',           meta2025: '>75%',     resultado2025: '—',       meta2026: '>80%' },
  { nombre: '% de ejecución del plan de capacitación',    meta2025: '>90%',     resultado2025: '108,25%', meta2026: '>90%' },
  { nombre: 'Índice de accidentalidad',                   meta2025: '<2%',      resultado2025: '0,83',    meta2026: '<1%'  },
  { nombre: '% de ausentismo',                            meta2025: '<2%',      resultado2025: '2,77',    meta2026: '<2%'  },
  { nombre: '% de incidentes',                            meta2025: '<5%',      resultado2025: '2,40',    meta2026: '<3%'  },
];

const P26_ESTRATEGIAS = [
  'Mantener los inventarios mínimos (30 días de telas) para reducir el riesgo de endeudamiento.',
  'Aprovechar al 100% las convocatorias del gobierno, alcaldía y cámara de comercio para crecer en productividad, transformación digital y capacitación.',
  'Generar políticas de protección de la información, con procesos y responsables designados.',
  'Planificar reportes quincenales de días de cartera para gestión de cobro más asertiva.',
  'Adoptar un software/ERP que integre insumos, producción y ventas con trazabilidad total.',
  'Desarrollar una app para control del SIG que prevenga el uso de documentos obsoletos.',
  'Participar en eventos y ruedas de negocio para comercializar al exterior.',
  'Implementar estándares BASC para mejorar la seguridad de la cadena de suministros y la posibilidad de exportar.',
  'Capacitar al personal en seguridad de la información para prevenir ataques cibernéticos.',
  'Implementar medidas de seguridad en la cadena de suministros, desde insumos hasta despacho.',
  'Tener rotación más rápida para Medellín y reducir la presencia de Nikelena en el mercado.',
  'Tener aprobación de tonos según sugerencias del mercado de Medellín para subir las ventas.',
  'Mantener las redes sociales con información de planta y motivación empresarial.',
  'Pedir sugerencias a los clientes en tonos y referencias solicitadas, con respuesta más acertada.',
  'Sacar línea económica sin forro total para bajar costos.',
];

function competenciaColor(v) {
  if (v >= 4.5) return '#16a34a';
  if (v >= 3.5) return G.amber;
  return '#dc2626';
}

function Plan2026Section({ title, icon: Icon, color, children, defaultOpenBadge }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0ec',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px', borderBottom: `3px solid ${color}`,
        background: `${color}0d`,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={16} color="#fff" />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: G.primary, flex: 1 }}>{title}</h3>
        {defaultOpenBadge}
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  );
}

function Plan2026Tab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hero + descarga PDF */}
      <div style={{
        background: `linear-gradient(135deg, ${G.primary} 0%, #3d6b5a 55%, ${G.mint} 100%)`,
        borderRadius: 16, padding: '28px 32px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <p style={{ fontSize: 10, opacity: 0.75, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            INDECON S.A.S. · Documento oficial
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>
            Planeación Estratégica 2026
          </h2>
          <p style={{ opacity: 0.85, fontSize: 13 }}>
            Revisión y análisis de la vigencia anterior · Parámetros definidos para el año 2026
          </p>
          <p style={{ opacity: 0.65, fontSize: 12, marginTop: 8 }}>
            Realizado por Margarita Milena Ramírez (Gerente) · Aprobado por Lina María Ruiz Guzmán (Subgerente) · 05/02/2026
          </p>
        </div>
        <a
          href={PLAN_2026_PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 12, padding: '12px 20px', color: '#fff', fontWeight: 700, fontSize: 13,
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <Download size={16} /> Descargar PDF original
        </a>
      </div>

      {/* Misión / Visión / Propuesta de valor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {[
          { title: 'Misión', icon: Target, color: G.primary,
            text: 'Confeccionar y comercializar trajes de baño cómodos e innovadores, en una empresa consolidada, versátil, competente y con capacidad de adaptación, enfocada en la satisfacción de sus clientes, el bienestar y la seguridad de sus colaboradores, apoyados en la mejora continua de procesos y la competencia laboral.' },
          { title: 'Visión', icon: Building2, color: G.mint,
            text: 'INDECON tendrá una rentabilidad sostenible, mediante el posicionamiento de su marca "Garana Art" y mayor participación en el mercado nacional e internacional, con un ambiente extraordinario de trabajo, un equipo humano altamente motivado y una cultura de excelencia operativa que garanticen la fidelización de sus clientes.' },
          { title: 'Propuesta de Valor', icon: Gem, color: G.olive,
            text: 'Desarrollar y ofrecer vestidos de baño que se adaptan perfectamente al cuerpo de la mujer, combinando seguridad y comodidad. Empoderamos a nuestras clientas con prendas que realzan su estilo único, garantizando a clientes y distribuidores versatilidad, excelencia en cada diseño y puntualidad en la entrega.' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} style={{
              background: '#fff', borderRadius: 14, padding: '20px 22px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `5px solid ${item.color}`,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <Icon size={18} color={item.color} />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.title}</h3>
              </div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.75 }}>{item.text}</p>
            </div>
          );
        })}
      </div>

      {/* Valores */}
      <Plan2026Section title="Valores" icon={Heart} color="#be185d">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Honestidad',     text: 'Congruencia entre lo que se piensa y lo que se hace, generando beneficio común.' },
            { label: 'Responsabilidad', text: 'Asumir las consecuencias de nuestros actos y cumplir compromisos y obligaciones.' },
            { label: 'Respeto',        text: 'Reconocer, apreciar y valorar a los demás con reciprocidad de derechos y deberes.' },
            { label: 'Amor',           text: 'Buscar la felicidad de los demás e inducir bienestar en las relaciones interpersonales.' },
            { label: 'Lealtad',        text: 'Fidelidad en acciones y comportamientos individuales y sociales.' },
          ].map(v => (
            <div key={v.label} style={{ background: '#fdf2f8', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#be185d', marginBottom: 4 }}>{v.label}</p>
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{v.text}</p>
            </div>
          ))}
        </div>
      </Plan2026Section>

      {/* Políticas */}
      <Plan2026Section title="Revisión de Políticas 2026" icon={ShieldCheck} color={G.primary}
        defaultOpenBadge={
          <span style={{ fontSize: 11, fontWeight: 700, color: G.primary, background: `${G.primary}12`, borderRadius: 20, padding: '3px 10px' }}>
            6 políticas + código de ética
          </span>
        }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {P26_POLITICAS.map(pol => {
            const Icon = pol.icon;
            return (
              <div key={pol.id} style={{
                background: '#fafafa', borderRadius: 12, padding: '14px 16px',
                borderTop: `3px solid ${pol.color}`,
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <Icon size={15} color={pol.color} style={{ marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 12.5, fontWeight: 800, color: '#1f2937', lineHeight: 1.4 }}>{pol.title}</p>
                </div>
                <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.65 }}>{pol.text}</p>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, background: `${G.mint}12`, borderRadius: 12, padding: '14px 16px', borderLeft: `4px solid ${G.mint}` }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: G.primary, marginBottom: 6 }}>Código de Ética y Conducta</p>
          <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
            Durante más de veinte años, INDECON ha confeccionado trajes de baño y prendas con el sello del talento caldense.
            El Código de Ética eleva los valores de honestidad, responsabilidad, respeto, amor y lealtad a compromisos formales
            con cada persona de la cadena de valor, incorporando en 2026 los desafíos de la tecnología, la sostenibilidad y la
            salud mental de los equipos.
          </p>
        </div>
      </Plan2026Section>

      {/* FODA */}
      <Plan2026Section title="Diagnóstico Estratégico — FODA" icon={Swords} color={G.olive}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { key: 'debilidades',    label: 'Debilidades',    color: '#dc2626', bg: '#fef2f2' },
            { key: 'oportunidades',  label: 'Oportunidades',  color: G.mint,    bg: '#f0faf5' },
            { key: 'fortalezas',     label: 'Fortalezas',     color: G.primary, bg: '#edf3f0' },
            { key: 'amenazas',       label: 'Amenazas',       color: G.amber,   bg: '#fdf8ee' },
          ].map(box => (
            <div key={box.key} style={{ background: box.bg, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: box.color, marginBottom: 10 }}>{box.label}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {P26_FODA[box.key].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 7, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                    <span style={{ color: box.color, fontWeight: 900 }}>•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Plan2026Section>

      {/* Análisis de competencia */}
      <Plan2026Section title="Análisis de Competencia" icon={Users} color={G.mint}
        defaultOpenBadge={
          <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fee2e2', borderRadius: 20, padding: '3px 10px' }}>
            Principal competidor: Nikelena
          </span>
        }>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Competidor', 'Precio', 'Calidad', 'Variedad', 'Estampación', 'Redes', 'Punto de venta', 'Total'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Competidor' ? 'left' : 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {P26_COMPETENCIA.map((c, i) => (
                <tr key={c.nombre} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1f2937' }}>{c.nombre}</td>
                  {['precio', 'calidad', 'variedad', 'estampacion', 'redes', 'puntoVenta'].map(k => (
                    <td key={k} style={{ padding: '9px 12px', textAlign: 'center', color: '#374151' }}>{c[k]}</td>
                  ))}
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 800, color: competenciaColor(c.total) }}>{c.total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 12, lineHeight: 1.6 }}>
          Escala de 1 (menor) a 5 (mayor). Swinware es el competidor más fuerte en atributos de marca (enfocado en estrato alto),
          mientras Nikelena compite agresivamente por precio y velocidad de respuesta al mercado de Medellín.
        </p>
      </Plan2026Section>

      {/* Indicadores 2025 vs 2026 */}
      <Plan2026Section title="Cumplimiento de Indicadores · Meta 2026" icon={BarChart3} color={G.primary}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Indicador', 'Meta 2025', 'Resultado 2025', 'Meta 2026'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Indicador' ? 'left' : 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {P26_INDICADORES.map((row, i) => (
                <tr key={row.nombre} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '9px 12px', color: '#1f2937' }}>{row.nombre}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#6b7280' }}>{row.meta2025}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: G.primary }}>{row.resultado2025}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: G.mint }}>{row.meta2026}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Plan2026Section>

      {/* Mapa estratégico — imagen oficial de marca */}
      <Plan2026Section title="Mapa Estratégico — 8 Objetivos" icon={LayoutDashboard} color={G.amber}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src="/mapa-estrategico-2026.png"
            alt="Mapa Estratégico Garana Art 2026 — 8 objetivos por perspectiva"
            style={{
              width: '100%', maxWidth: 620, height: 'auto',
              borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0ec',
            }}
          />
        </div>
      </Plan2026Section>

      {/* Estrategias */}
      <Plan2026Section title="Definición de Estrategias 2026" icon={Handshake} color={G.olive}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {P26_ESTRATEGIAS.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: '#374151', lineHeight: 1.6 }}>
              <span style={{
                flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: `${G.olive}15`,
                color: G.olive, fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              {e}
            </div>
          ))}
        </div>
      </Plan2026Section>

      {/* Firma */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '18px 22px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: G.primary }}>Margarita Milena Ramírez Alarcón</p>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>Gerente · Realizado</p>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: G.primary }}>Lina María Ruiz Guzmán</p>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>Subgerente · Aprobado</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>Fecha del documento</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: G.primary }}>5 de febrero de 2026</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — V2
// ═══════════════════════════════════════════════════════════════════
export default function PlaneacionEstrategicaV2() {
  const { isAdmin, isGerencia, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const canView    = isAdmin || isGerencia || hasPermission('cmi:indicadores:view');
  const canManage  = isAdmin || isGerencia || hasPermission('cmi:indicadores:manage');
  const canMeasure = canManage || hasPermission('cmi:valores:create');

  // ✅ fetchIndicators (no refresh), hook correcto
  const hook = useIndicadores();
  const { profiles, fetchProfiles } = useProfiles();
  const { indicators = [], loading, error, fetchIndicators } = hook;

  useEffect(() => {
    fetchIndicators();
    fetchProfiles();
  }, [fetchIndicators, fetchProfiles]);

  if (!canView) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <Target size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 600 }}>Sin acceso a este módulo</p>
      </div>
    </div>
  );

  return (
    <div className="p-3 space-y-3">
      <ModuleHero
        title="Planeación Estratégica"
        subtitle="Cuadro de Mando Integral · Balanced Scorecard · INDECON S.A.S."
        icon={Target} color="#6dbd96"
      />

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center',
        background: '#fff', borderRadius: 14, padding: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === id ? 700 : 400,
              background: activeTab === id ? G.primary : 'transparent',
              color: activeTab === id ? '#fff' : '#6b7280',
              transition: 'all 0.15s',
            }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {/* ✅ fetchIndicators (no refresh) */}
        <button onClick={fetchIndicators} disabled={loading} style={{
          background: '#f3f4f6', border: 'none', borderRadius: 10,
          padding: '8px 14px', cursor: 'pointer', color: G.primary,
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
        }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13, display: 'flex', gap: 8 }}>
          <AlertCircle size={15} /> Error cargando indicadores: {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <Loader2 size={36} className="animate-spin" style={{ marginBottom: 12, color: G.primary }} />
            <p style={{ fontSize: 13 }}>Cargando tablero ejecutivo...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard'    && <DashboardTab    indicators={indicators} />}
          {activeTab === 'perspectivas' && <PerspTab        indicators={indicators} hook={hook} profiles={profiles} canManage={canManage} canMeasure={canMeasure} />}
          {activeTab === 'indicadores'  && <IndicadoresTab  indicators={indicators} hook={hook} profiles={profiles} canManage={canManage} canMeasure={canMeasure} />}
          {activeTab === 'plataforma'   && <PlataformaTab />}
          {activeTab === 'plan2026'     && <Plan2026Tab />}
        </>
      )}
    </div>
  );
}