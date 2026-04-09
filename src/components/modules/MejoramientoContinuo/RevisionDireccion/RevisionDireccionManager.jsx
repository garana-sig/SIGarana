// src/components/modules/MejoramientoContinuo/RevisionDireccion/RevisionDireccionManager.jsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Loader2, FileDown, RefreshCw, Calendar,
  TrendingUp, TrendingDown, Minus, ClipboardCheck,
  AlertTriangle, CheckCircle2, HelpCircle, BarChart3,
  Target, Activity, Shield, X, Star, Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
  ReferenceLine,
} from 'recharts';
import ExcelJS    from 'exceljs';
import { saveAs } from 'file-saver';

// ─── Tema Power BI oscuro ────────────────────────────────────────────────────
const T = {
  bg:        '#0f1923',
  panel:     '#162032',
  panel2:    '#1e2d3d',
  panel3:    '#243447',
  border:    '#1e3448',
  text:      '#e2e8f0',
  textMuted: '#64748b',
  textDim:   '#94a3b8',
  verde:     '#2e5244',
  menta:     '#6dbd96',
  oliva:     '#6f7b2c',
  accent:    '#38bdf8',
  good:      '#22c55e',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  purple:    '#a78bfa',
  orange:    '#fb923c',
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const PERSP = {
  financiera:             { label:'Financiera',        color:'#f59e0b', icon:'💰' },
  cliente:                { label:'Clientes',          color:'#38bdf8', icon:'🤝' },
  procesos_internos:      { label:'Procesos Internos', color:'#22c55e', icon:'⚙️'  },
  crecimiento_desarrollo: { label:'Aprendizaje',       color:'#a78bfa', icon:'🚀' },
};
const PERSP_ORDER = ['financiera','cliente','procesos_internos','crecimiento_desarrollo'];

const STATUS_MAP = {
  good:    { label:'Cumple',      color:T.good,      icon:'🟢' },
  warning: { label:'Advertencia', color:T.warning,   icon:'🟡' },
  critical:{ label:'Crítico',     color:T.danger,    icon:'🔴' },
  no_data: { label:'Sin datos',   color:T.textMuted, icon:'⚫' },
};

const now      = new Date();
const defStart = `${now.getFullYear()}-01-01`;
const defEnd   = now.toISOString().split('T')[0];

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtNum = (n, dec = 1) => (n === null || n === undefined) ? '—' : Number(n).toFixed(dec);

// Convierte score 1-5 a color semáforo
function scoreColor(score) {
  if (!score) return T.textMuted;
  if (score >= 4.5) return T.good;
  if (score >= 3.5) return T.warning;
  return T.danger;
}

// ─── Tooltip oscuro ──────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor:T.panel3, border:`1px solid ${T.border}`,
      borderRadius:8, padding:'8px 12px', fontSize:11, color:T.text,
      boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <p style={{ fontWeight:700, color:T.accent, margin:'0 0 5px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color:p.color||T.text, margin:'2px 0', display:'flex', gap:8, justifyContent:'space-between' }}>
          <span>{p.name}</span>
          <strong>{typeof p.value === 'number' ? fmtNum(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────
function KpiTile({ title, value, unit='', sub, trend, color, icon:Icon, delay=0 }) {
  const dir        = trend > 0.5 ? 'up' : trend < -0.5 ? 'down' : 'flat';
  const TrendIcon  = dir==='up' ? TrendingUp : dir==='down' ? TrendingDown : Minus;
  const trendColor = dir==='up' ? T.good : dir==='down' ? T.danger : T.textMuted;
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      style={{
        backgroundColor:T.panel, border:`1px solid ${T.border}`,
        borderTop:`3px solid ${color}`, borderRadius:8, padding:'14px 16px',
        display:'flex', flexDirection:'column', gap:6,
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>
          {title}
        </span>
        <div style={{ width:28, height:28, borderRadius:6, backgroundColor:color+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
        <span style={{ fontSize:28, fontWeight:800, color:T.text, lineHeight:1 }}>{value}</span>
        {unit && <span style={{ fontSize:13, color:T.textDim }}>{unit}</span>}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:10, color:T.textMuted }}>{sub}</span>
        {trend !== undefined && (
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            <TrendIcon size={11} style={{ color:trendColor }} />
            <span style={{ fontSize:10, color:trendColor, fontWeight:700 }}>
              {dir!=='flat' ? `${Math.abs(fmtNum(trend,1))}%` : 'Estable'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Panel contenedor ────────────────────────────────────────────────────────
function Panel({ title, icon:Icon, color=T.menta, children, delay=0 }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      style={{ backgroundColor:T.panel, border:`1px solid ${T.border}`, borderRadius:8, overflow:'hidden' }}>
      <div style={{
        padding:'10px 14px', borderBottom:`1px solid ${T.border}`,
        display:'flex', alignItems:'center', gap:8, backgroundColor:T.panel2,
      }}>
        {Icon && <Icon size={13} style={{ color }} />}
        <span style={{ fontSize:11, fontWeight:700, color:T.text, textTransform:'uppercase', letterSpacing:0.8 }}>
          {title}
        </span>
      </div>
      <div style={{ padding:14 }}>{children}</div>
    </motion.div>
  );
}

// ─── Separador de sección ────────────────────────────────────────────────────
function SectionDivider({ title, icon:Icon, color }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'6px 0', marginTop:4,
    }}>
      <div style={{ width:3, height:18, backgroundColor:color, borderRadius:2 }} />
      {Icon && <Icon size={13} style={{ color }} />}
      <span style={{ fontSize:11, fontWeight:800, color:T.text, textTransform:'uppercase', letterSpacing:1.2 }}>
        {title}
      </span>
      <div style={{ flex:1, height:1, backgroundColor:T.border, marginLeft:4 }} />
    </div>
  );
}

// ─── Score de estrella visual ────────────────────────────────────────────────
function ScoreStars({ score }) {
  const filled = Math.round(score || 0);
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11}
          fill={i <= filled ? T.warning : 'none'}
          style={{ color: i <= filled ? T.warning : T.border }} />
      ))}
    </div>
  );
}

// ─── Modal Drill-down de Indicador ───────────────────────────────────────────
function IndicadorDrillModal({ ind, allMeasurements, onClose }) {
  if (!ind) return null;
  const persp  = PERSP[ind.perspective] || { label:ind.perspective, color:T.menta, icon:'📊' };
  const sorted = [...(allMeasurements[ind.id] || [])].sort((a,b) =>
    new Date(a.measurement_date) - new Date(b.measurement_date));
  const last   = sorted[sorted.length-1] || null;
  const prev   = sorted[sorted.length-2] || null;
  const sk     = last?.measurement_status || 'no_data';
  const sc     = STATUS_MAP[sk];
  const variation = (last && prev && prev.measured_value)
    ? ((last.measured_value - prev.measured_value) / Math.abs(prev.measured_value)) * 100 : null;
  const lineColor = { good:T.good, warning:T.warning, critical:T.danger, no_data:T.accent }[sk];
  const chartData = sorted.map(m => ({
    periodo: m.period_label || m.measurement_date?.substring(0,7),
    valor:   m.measured_value !== null ? Number(m.measured_value) : null,
    meta:    m.goal_value !== null ? Number(m.goal_value) : (ind.goal_value ? Number(ind.goal_value) : null),
    status:  m.measurement_status,
  }));

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{
          position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:2000, padding:16,
        }}
        onClick={onClose}>
        <motion.div
          initial={{ opacity:0, scale:0.93, y:20 }}
          animate={{ opacity:1, scale:1, y:0 }}
          exit={{ opacity:0, scale:0.93 }}
          transition={{ duration:0.2 }}
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor:T.panel, border:`1px solid ${T.border}`,
            borderRadius:12, width:'100%', maxWidth:780,
            maxHeight:'90vh', overflow:'auto',
            boxShadow:'0 24px 60px rgba(0,0,0,0.7)',
          }}>
          {/* Header */}
          <div style={{
            padding:'14px 18px', borderBottom:`1px solid ${T.border}`,
            backgroundColor:T.panel2,
            display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:9, fontWeight:700, color:persp.color, backgroundColor:persp.color+'22', borderRadius:4, padding:'2px 7px', textTransform:'uppercase', letterSpacing:0.8 }}>
                  {persp.icon} {persp.label}
                </span>
                <span style={{ fontSize:9, fontWeight:700, color:sc.color, backgroundColor:sc.color+'22', borderRadius:4, padding:'2px 7px' }}>
                  {sc.icon} {sc.label}
                </span>
              </div>
              <h3 style={{ fontSize:16, fontWeight:800, color:T.text, margin:0, lineHeight:1.3 }}>
                {ind.indicator_name}
              </h3>
              {ind.objective && (
                <p style={{ fontSize:10, color:T.textMuted, margin:'4px 0 0' }}>Objetivo: {ind.objective}</p>
              )}
            </div>
            <button onClick={onClose} style={{
              background:T.panel3, border:`1px solid ${T.border}`, borderRadius:6,
              cursor:'pointer', color:T.textDim, padding:6, display:'flex', flexShrink:0, marginLeft:12,
            }}>
              <X size={15} />
            </button>
          </div>

          <div style={{ padding:18 }}>
            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:18 }}>
              {[
                { label:'Último Valor', value: last ? `${fmtNum(last.measured_value)} ${last.unit||'%'}` : '—', color:sc.color },
                { label:'Meta',         value: ind.goal,                                                          color:T.textDim },
                { label:'Variación',    value: variation!==null ? `${variation>=0?'+':''}${fmtNum(variation)}%` : '—',
                  color: variation===null ? T.textMuted : ind.goal_direction==='asc' ? (variation>=0?T.good:T.danger) : (variation<=0?T.good:T.danger) },
                { label:'Frecuencia',  value: ind.frequency,  color:T.accent  },
                { label:'Mediciones',  value: sorted.length,  color:T.purple  },
                { label:'Período',     value: last?.period_label||'—', color:T.textDim },
              ].map(k => (
                <div key={k.label} style={{ backgroundColor:T.panel2, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:9, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:4 }}>{k.label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Gráfica evolución */}
            {chartData.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', backgroundColor:T.panel2, borderRadius:8, border:`1px solid ${T.border}`, marginBottom:16 }}>
                <BarChart3 size={36} style={{ color:T.textMuted, display:'block', margin:'0 auto 10px', opacity:0.3 }} />
                <p style={{ color:T.textMuted, fontSize:12, margin:0 }}>Sin mediciones registradas</p>
              </div>
            ) : (
              <div style={{ backgroundColor:T.panel2, borderRadius:8, padding:14, border:`1px solid ${T.border}`, marginBottom:16 }}>
                <p style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10, fontWeight:700 }}>
                  📈 Evolución Histórica
                </p>
                <div style={{ height:240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top:10, right:10, bottom:0, left:-15 }}>
                      <defs>
                        <linearGradient id={`grad_${ind.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={lineColor} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="periodo" style={{ fontSize:9 }} tick={{ fill:T.textMuted }} stroke={T.border} />
                      <YAxis style={{ fontSize:9 }} tick={{ fill:T.textMuted }} stroke={T.border} />
                      <Tooltip content={<DarkTooltip />} />
                      {chartData[0]?.meta !== null && chartData[0]?.meta !== undefined && (
                        <ReferenceLine y={chartData[0].meta} stroke={T.warning} strokeDasharray="5 3"
                          label={{ value:`Meta: ${ind.goal}`, fill:T.warning, fontSize:9, position:'insideTopRight' }} />
                      )}
                      <Area type="monotone" dataKey="valor" name="Valor medido"
                        stroke={lineColor} fill={`url(#grad_${ind.id})`} strokeWidth={2.5}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const c = { good:T.good, warning:T.warning, critical:T.danger, no_data:T.textMuted };
                          return <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={5} fill={c[payload?.status]||T.accent} stroke={T.panel} strokeWidth={2} />;
                        }}
                        activeDot={{ r:7, stroke:T.panel, strokeWidth:2 }}
                        connectNulls={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Info + Tabla */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {ind.formula_expression && (
                <div style={{ backgroundColor:T.panel2, borderRadius:8, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:9, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.8, fontWeight:700, marginBottom:6 }}>📐 Fórmula</p>
                  <code style={{ fontSize:12, color:T.accent, fontFamily:'monospace' }}>{ind.formula_expression}</code>
                  {ind.formula_variables?.length > 0 && (
                    <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                      {ind.formula_variables.map(v => (
                        <div key={v.key} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                          <span style={{ fontSize:9, fontWeight:800, color:T.panel, backgroundColor:T.accent, borderRadius:3, padding:'1px 5px', flexShrink:0 }}>{v.key}</span>
                          <span style={{ fontSize:10, color:T.textDim }}>{v.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ backgroundColor:T.panel2, borderRadius:8, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <p style={{ fontSize:9, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.8, fontWeight:700, marginBottom:8 }}>ℹ️ Detalles</p>
                {[
                  { label:'Proceso',     value:ind.process_source||'—' },
                  { label:'Divulgado a', value:ind.disclosed_to||'—' },
                  { label:'Dirección',   value:ind.goal_direction==='asc'?'↑ Mayor es mejor':'↓ Menor es mejor' },
                  { label:'Tipo',        value:ind.indicator_subtype||ind.indicator_type||'—' },
                ].map(d => (
                  <div key={d.label} style={{ display:'flex', justifyContent:'space-between', paddingBottom:5, marginBottom:5, borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:10, color:T.textMuted }}>{d.label}</span>
                    <span style={{ fontSize:10, color:T.textDim, fontWeight:600, textAlign:'right', maxWidth:'55%' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {sorted.length > 0 && (
              <div style={{ backgroundColor:T.panel2, borderRadius:8, border:`1px solid ${T.border}`, overflow:'hidden' }}>
                <div style={{ padding:'8px 14px', borderBottom:`1px solid ${T.border}`, backgroundColor:T.panel3 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:'uppercase', letterSpacing:0.8 }}>📋 Historial de Mediciones</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr>
                        {['Período','Fecha','Valor','Meta','Estado','Observaciones'].map(h => (
                          <th key={h} style={{ padding:'7px 12px', backgroundColor:T.panel3, color:T.textMuted, fontWeight:700, textAlign:'left', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap', fontSize:9, textTransform:'uppercase', letterSpacing:0.6 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...sorted].reverse().map((m, idx) => {
                        const msk = m.measurement_status || 'no_data';
                        const msc = STATUS_MAP[msk];
                        return (
                          <tr key={m.id} style={{ backgroundColor:idx%2===0?'transparent':T.panel3+'55' }}>
                            <td style={{ padding:'6px 12px', color:T.text, fontWeight:600 }}>{m.period_label||'—'}</td>
                            <td style={{ padding:'6px 12px', color:T.textDim, whiteSpace:'nowrap' }}>{m.measurement_date||'—'}</td>
                            <td style={{ padding:'6px 12px', color:msc.color, fontWeight:700 }}>
                              {m.measured_value!==null?`${fmtNum(m.measured_value)} ${m.unit||'%'}`:'—'}
                            </td>
                            <td style={{ padding:'6px 12px', color:T.textDim }}>
                              {m.goal_value!==null?`${fmtNum(m.goal_value)} ${m.unit||'%'}`:ind.goal}
                            </td>
                            <td style={{ padding:'6px 12px' }}>
                              <span style={{ fontSize:9, fontWeight:700, color:msc.color, backgroundColor:msc.color+'22', borderRadius:4, padding:'2px 6px' }}>
                                {msc.icon} {msc.label}
                              </span>
                            </td>
                            <td style={{ padding:'6px 12px', color:T.textMuted, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {m.notes||'—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Card perspectiva CMI ────────────────────────────────────────────────────
function CmiPerspCard({ persp, items, measurements, allMeasurements, onIndicatorClick }) {
  const good     = items.filter(i=>measurements[i.id]?.measurement_status==='good').length;
  const warning  = items.filter(i=>measurements[i.id]?.measurement_status==='warning').length;
  const critical = items.filter(i=>measurements[i.id]?.measurement_status==='critical').length;
  const noData   = items.length - good - warning - critical;
  const pct      = items.length>0?Math.round((good/items.length)*100):0;

  return (
    <div style={{ backgroundColor:T.panel2, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}`, marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:700, color:persp.color }}>{persp.icon} {persp.label}</span>
        <span style={{ fontSize:18, fontWeight:800, color:T.text }}>{pct}%</span>
      </div>
      <div style={{ display:'flex', height:6, borderRadius:3, overflow:'hidden', gap:1, marginBottom:6 }}>
        {good>0     && <div style={{ flex:good,    backgroundColor:T.good     }} />}
        {warning>0  && <div style={{ flex:warning,  backgroundColor:T.warning  }} />}
        {critical>0 && <div style={{ flex:critical, backgroundColor:T.danger   }} />}
        {noData>0   && <div style={{ flex:noData,   backgroundColor:T.textMuted+'55' }} />}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
        {[{label:'Cumple',val:good,color:T.good},{label:'Alerta',val:warning,color:T.warning},{label:'Crítico',val:critical,color:T.danger},{label:'Sin dato',val:noData,color:T.textMuted}]
          .filter(s=>s.val>0).map(s=>(
            <span key={s.label} style={{ fontSize:9, color:s.color, display:'flex', alignItems:'center', gap:3 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', backgroundColor:s.color, display:'inline-block' }} />
              {s.val} {s.label}
            </span>
          ))}
      </div>
      {items.map(ind => {
        const m   = measurements[ind.id];
        const sk  = m?.measurement_status || 'no_data';
        const sc  = STATUS_MAP[sk];
        const pctInd = (m?.measured_value!=null && ind.goal_value)
          ? Math.min(100, Math.round(Math.abs(m.measured_value/ind.goal_value)*100)) : 0;
        const histCount = (allMeasurements[ind.id]||[]).length;
        return (
          <div key={ind.id} onClick={()=>onIndicatorClick(ind)}
            style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}`, cursor:'pointer', borderRadius:6, transition:'background 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.backgroundColor=T.panel3}
            onMouseLeave={e=>e.currentTarget.style.backgroundColor='transparent'}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, padding:'2px 4px' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:10, color:T.textDim, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                  {ind.indicator_name}
                </span>
                {histCount>0 && (
                  <span style={{ fontSize:8, color:T.textMuted }}>
                    {histCount} medición{histCount!==1?'es':''} · click para ver historial
                  </span>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', flexShrink:0, gap:2 }}>
                <span style={{ fontSize:10, color:sc.color, fontWeight:700 }}>
                  {m?.measured_value!=null ? `${fmtNum(m.measured_value)} / ${ind.goal}` : 'Sin datos'}
                </span>
                <span style={{ fontSize:8, fontWeight:700, color:sc.color, backgroundColor:sc.color+'22', borderRadius:3, padding:'1px 5px' }}>
                  {sc.icon} {sc.label}
                </span>
              </div>
            </div>
            <div style={{ height:3, borderRadius:2, backgroundColor:T.border, margin:'0 4px' }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${pctInd}%` }} transition={{ duration:0.8, ease:'easeOut' }}
                style={{ height:'100%', borderRadius:2, backgroundColor:sc.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function RevisionDireccionManager({ onBack }) {
  const [range,     setRange]     = useState({ start:defStart, end:defEnd });
  const [loading,   setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [proceso,   setProceso]   = useState('todos');
  const [drillInd,  setDrillInd]  = useState(null);
  const [data, setData] = useState({
    indicators:[], measurements:{}, allMeasurements:{},
    actions:[], qrsf:[], pnc:[], produccion:[],
    encuestas:{ satisfaccion:[], clima:[] },
  });

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [indRes, actRes, qrsfRes, pncItemRes, prodRes, encuestasRes] = await Promise.all([

        // Indicadores con TODAS sus mediciones (historial completo para modal)
        supabase.from('indicator')
          .select('*, indicator_measurement(*)')
          .eq('status','active')
          .order('indicator_name'),

        // Acciones de mejora del período
        supabase.from('improvement_action')
          .select('id,finding_description,status,is_closed,proposed_date,created_at')
          .gte('created_at', range.start)
          .lte('created_at', range.end+'T23:59:59'),

        // QRSF del período
        supabase.from('qrsf_registro')
          .select('id,tipo,is_cerrado,fecha_recepcion')
          .gte('fecha_recepcion', range.start)
          .lte('fecha_recepcion', range.end),

        // PNC ítems del período
        supabase.from('pnc_item')
          .select(`
            id, total, fecha_reporte, defecto_texto,
            causa_modulo, causa_operacion, causa_insumo,
            causa_corte, causa_sublimacion, causa_revision,
            clasificacion_correccion, clasificacion_reclasificacion, clasificacion_concesion,
            verificacion_fecha, tratamiento_fecha,
            registro_id, pnc_registro!inner(proceso, anio, mes)
          `)
          .gte('fecha_reporte', range.start)
          .lte('fecha_reporte', range.end),

        // Producción mensual (para % PNC)
        supabase.from('pnc_produccion_mensual')
          .select('anio,mes,total_produccion')
          .gte('anio', parseInt(range.start.substring(0,4)))
          .lte('anio', parseInt(range.end.substring(0,4))),

        // Encuestas — respuestas + answers + período + tipo
        supabase.from('survey_response')
          .select(`
            id, work_area, company_name, submitted_at,
            survey_period!inner(
              name,
              survey_type!inner(code, name)
            ),
            survey_answer(value_number)
          `)
          .gte('submitted_at', range.start)
          .lte('submitted_at', range.end+'T23:59:59'),
      ]);

      // ── Procesar indicadores ──────────────────────────────────────────────
      const inds = indRes.data || [];
      const msMap = {}, allMsMap = {};
      inds.forEach(ind => {
        const all = ind.indicator_measurement || [];
        allMsMap[ind.id] = [...all].sort((a,b) => new Date(a.measurement_date)-new Date(b.measurement_date));
        const inRange = all
          .filter(m => m.measurement_date >= range.start && m.measurement_date <= range.end)
          .sort((a,b) => new Date(b.measurement_date)-new Date(a.measurement_date));
        msMap[ind.id] = inRange[0] || null;
        delete ind.indicator_measurement;
      });

      // ── Procesar encuestas ────────────────────────────────────────────────
      // Separar satisfacción vs clima, calcular score promedio por respuesta
      const satisfaccion = [], clima = [];
      (encuestasRes.data || []).forEach(resp => {
        const code    = resp.survey_period?.survey_type?.code;
        const answers = resp.survey_answer || [];
        const nums    = answers.map(a => a.value_number).filter(v => v !== null && v !== undefined);
        const avg     = nums.length > 0 ? nums.reduce((s,n) => s+n, 0) / nums.length : null;
        const d       = new Date(resp.submitted_at);
        const entry   = {
          id:          resp.id,
          avg,
          work_area:   resp.work_area || 'Sin área',
          company:     resp.company_name || '—',
          periodo:     resp.survey_period?.name || '—',
          mes:         MESES[d.getMonth()],
          mesNum:      d.getMonth() + 1,
          anio:        d.getFullYear(),
        };
        if (code === 'customer_satisfaction') satisfaccion.push(entry);
        else if (code === 'work_climate')     clima.push(entry);
      });

      setData({
        indicators:      inds,
        measurements:    msMap,
        allMeasurements: allMsMap,
        actions:         actRes.data     || [],
        qrsf:            qrsfRes.data    || [],
        pnc:             pncItemRes.data || [],
        produccion:      prodRes.data    || [],
        encuestas: { satisfaccion, clima },
      });
      setGenerated(true);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // ── PNC filtrado por proceso ──────────────────────────────────────────────
  const pncFiltrado    = proceso==='todos' ? data.pnc : data.pnc.filter(p=>p.pnc_registro?.proceso===proceso);
  const procesosUnicos = [...new Set((data.pnc||[]).map(p=>p.pnc_registro?.proceso).filter(Boolean))];

  // ── Stats CMI ────────────────────────────────────────────────────────────
  const cmiStats = (() => {
    const good     = data.indicators.filter(i=>data.measurements[i.id]?.measurement_status==='good').length;
    const warning  = data.indicators.filter(i=>data.measurements[i.id]?.measurement_status==='warning').length;
    const critical = data.indicators.filter(i=>data.measurements[i.id]?.measurement_status==='critical').length;
    const total    = data.indicators.length;
    return { good, warning, critical, noData:total-good-warning-critical, total, pct:total>0?Math.round((good/total)*100):0 };
  })();

  // ── Stats Acciones ────────────────────────────────────────────────────────
  const actStats = (() => {
    const nowD    = new Date();
    const closed  = data.actions.filter(a=>a.is_closed===true||a.status==='closed').length;
    const inProg  = data.actions.filter(a=>a.status==='in_progress').length;
    const open    = data.actions.filter(a=>a.status==='open').length;
    const overdue = data.actions.filter(a=>!a.is_closed&&a.status!=='closed'&&a.proposed_date&&new Date(a.proposed_date)<nowD).length;
    const total   = data.actions.length;
    return { closed, inProg, open, overdue, total, pctClose:total>0?Math.round((closed/total)*100):0 };
  })();

  // ── Stats QRSF ───────────────────────────────────────────────────────────
  const qrsfStats = (() => {
    const byType = { queja:0, reclamo:0, sugerencia:0, felicitacion:0 };
    data.qrsf.forEach(q=>{ if(q.tipo in byType) byType[q.tipo]++; });
    const closed    = data.qrsf.filter(q=>q.is_cerrado).length;
    const closeRate = data.qrsf.length>0?Math.round((closed/data.qrsf.length)*100):0;
    return { ...byType, total:data.qrsf.length, closed, closeRate };
  })();

  // ── Stats PNC ────────────────────────────────────────────────────────────
  const pncStats = (() => {
    const totalUnidades = pncFiltrado.reduce((s,p)=>s+(p.total||0),0);
    const totalProd     = data.produccion.reduce((s,p)=>s+(p.total_produccion||0),0);
    const pctPNC        = totalProd>0?(totalUnidades/totalProd)*100:0;
    const pctTrat       = pncFiltrado.length>0?Math.round((pncFiltrado.filter(p=>p.tratamiento_fecha).length/pncFiltrado.length)*100):0;

    const defFreq = {};
    pncFiltrado.forEach(p=>{ const k=p.defecto_texto||'Sin clasificar'; defFreq[k]=(defFreq[k]||0)+(p.total||1); });
    const topDefectos = Object.entries(defFreq).sort((a,b)=>b[1]-a[1]).slice(0,7)
      .map(([name,value])=>({ name:name.length>20?name.substring(0,18)+'…':name, value }));

    const causas = [
      { name:'Módulo',      value:pncFiltrado.filter(p=>p.causa_modulo).length      },
      { name:'Operación',   value:pncFiltrado.filter(p=>p.causa_operacion).length   },
      { name:'Insumo',      value:pncFiltrado.filter(p=>p.causa_insumo).length      },
      { name:'Corte',       value:pncFiltrado.filter(p=>p.causa_corte).length       },
      { name:'Sublimación', value:pncFiltrado.filter(p=>p.causa_sublimacion).length },
      { name:'Revisión',    value:pncFiltrado.filter(p=>p.causa_revision).length    },
    ].filter(c=>c.value>0).sort((a,b)=>b.value-a.value);

    const clasificacion = [
      { name:'Corrección',      value:pncFiltrado.filter(p=>p.clasificacion_correccion).length,      color:T.good    },
      { name:'Reclasificación', value:pncFiltrado.filter(p=>p.clasificacion_reclasificacion).length, color:T.warning },
      { name:'Concesión',       value:pncFiltrado.filter(p=>p.clasificacion_concesion).length,       color:T.danger  },
    ].filter(c=>c.value>0);

    const byMes={}, prodByMes={};
    pncFiltrado.forEach(p=>{ const k=`${p.pnc_registro?.anio}-${String(p.pnc_registro?.mes).padStart(2,'0')}`; byMes[k]=(byMes[k]||0)+(p.total||0); });
    data.produccion.forEach(p=>{ prodByMes[`${p.anio}-${String(p.mes).padStart(2,'0')}`]=p.total_produccion||0; });
    const tendenciaPNC = Object.keys(byMes).sort().map(k=>({
      mes:MESES[parseInt(k.split('-')[1])-1], nc:byMes[k], prod:prodByMes[k]||0,
      pct:prodByMes[k]>0?parseFloat(((byMes[k]/prodByMes[k])*100).toFixed(2)):0, meta:2.5,
    }));

    return { totalUnidades, totalProd, pctPNC, pctTrat, topDefectos, causas, clasificacion, tendenciaPNC };
  })();

  // ── Stats Encuestas ───────────────────────────────────────────────────────
  const encStats = (() => {
    const calcStats = (arr) => {
      if (!arr.length) return { avg:null, total:0, tendencia:[], porArea:[] };
      const avg   = arr.reduce((s,e)=>s+(e.avg||0),0) / arr.length;
      // Tendencia mensual
      const byMes = {};
      arr.forEach(e=>{
        const k=`${e.anio}-${String(e.mesNum).padStart(2,'0')}`;
        if(!byMes[k]) byMes[k]={vals:[],mes:e.mes};
        if(e.avg!==null) byMes[k].vals.push(e.avg);
      });
      const tendencia = Object.keys(byMes).sort().map(k=>({
        mes:byMes[k].mes,
        avg:byMes[k].vals.length>0?parseFloat((byMes[k].vals.reduce((s,v)=>s+v,0)/byMes[k].vals.length).toFixed(2)):null,
        meta:4,
      }));
      // Por área (clima) o por empresa (satisfacción)
      const byArea={};
      arr.forEach(e=>{
        const k=e.work_area||e.company||'Sin clasificar';
        if(!byArea[k]) byArea[k]=[];
        if(e.avg!==null) byArea[k].push(e.avg);
      });
      const porArea = Object.entries(byArea)
        .map(([name,vals])=>({ name:name.length>18?name.substring(0,16)+'…':name, avg:parseFloat((vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2)) }))
        .sort((a,b)=>b.avg-a.avg).slice(0,8);
      return { avg:parseFloat(avg.toFixed(2)), total:arr.length, tendencia, porArea };
    };
    return {
      satisfaccion: calcStats(data.encuestas.satisfaccion),
      clima:        calcStats(data.encuestas.clima),
    };
  })();

  // ── Tendencias secundarias ────────────────────────────────────────────────
  const tendenciaQRSF = (() => {
    const byMes={};
    data.qrsf.forEach(q=>{
      if(!q.fecha_recepcion) return;
      const d=new Date(q.fecha_recepcion);
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(!byMes[k]) byMes[k]={queja:0,reclamo:0,sugerencia:0,felicitacion:0};
      if(q.tipo in byMes[k]) byMes[k][q.tipo]++;
    });
    return Object.keys(byMes).sort().map(k=>({ mes:MESES[parseInt(k.split('-')[1])-1], ...byMes[k] }));
  })();

  const tendenciaAcciones = (() => {
    const byMes={};
    data.actions.forEach(a=>{
      if(!a.created_at) return;
      const d=new Date(a.created_at);
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(!byMes[k]) byMes[k]={abiertas:0,cerradas:0};
      if(a.is_closed===true||a.status==='closed') byMes[k].cerradas++; else byMes[k].abiertas++;
    });
    return Object.keys(byMes).sort().map(k=>({ mes:MESES[parseInt(k.split('-')[1])-1], ...byMes[k] }));
  })();

  const radialData = PERSP_ORDER.map(k=>{
    const items=data.indicators.filter(i=>i.perspective===k);
    const good=items.filter(i=>data.measurements[i.id]?.measurement_status==='good').length;
    return { name:PERSP[k]?.label||k, value:items.length>0?Math.round((good/items.length)*100):0, fill:PERSP[k]?.color||T.menta };
  });

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true);
    try {
      const wb=new ExcelJS.Workbook(); wb.creator='Garana SIG';
      const hs=(ws,vals)=>{ const r=ws.addRow(vals); r.eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'},size:10}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2E5244'}}; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; }); r.height=26; };
      const ws1=wb.addWorksheet('Resumen Ejecutivo');
      ws1.addRow([`REVISIÓN POR LA DIRECCIÓN — ${range.start} al ${range.end}`]); ws1.mergeCells('A1:G1');
      ws1.getCell('A1').font={bold:true,size:13,color:{argb:'FF2E5244'}}; ws1.getCell('A1').alignment={horizontal:'center'}; ws1.getRow(1).height=28;
      ws1.addRow([`Generado: ${new Date().toLocaleString('es-CO')}`]); ws1.mergeCells('A2:G2'); ws1.addRow([]);

      ws1.addRow(['CMI']); ws1.getCell(`A${ws1.rowCount}`).font={bold:true,color:{argb:'FF6F7B2C'}};
      hs(ws1,['Perspectiva','Objetivo','Indicador','Frecuencia','Meta','Último Valor','Estado']);
      data.indicators.forEach(ind=>{ const m=data.measurements[ind.id]; const lbl={good:'✅ Cumple',warning:'⚠️ Alerta',critical:'🔴 Crítico',no_data:'⚫ Sin datos'}; ws1.addRow([PERSP[ind.perspective]?.label||ind.perspective,ind.objective||'—',ind.indicator_name,ind.frequency,ind.goal,m?.measured_value??'—',lbl[m?.measurement_status||'no_data']]); });
      ws1.addRow([]);

      ws1.addRow(['ACCIONES']); ws1.getCell(`A${ws1.rowCount}`).font={bold:true,color:{argb:'FF6F7B2C'}};
      hs(ws1,['Total','Cerradas','En Proceso','Abiertas','Vencidas','% Cierre','']);
      ws1.addRow([actStats.total,actStats.closed,actStats.inProg,actStats.open,actStats.overdue,`${actStats.pctClose}%`,'']); ws1.addRow([]);

      ws1.addRow(['QRSF']); ws1.getCell(`A${ws1.rowCount}`).font={bold:true,color:{argb:'FF6F7B2C'}};
      hs(ws1,['Total','Quejas','Reclamos','Sugerencias','Felicitaciones','Cerradas','% Cierre']);
      ws1.addRow([qrsfStats.total,qrsfStats.queja,qrsfStats.reclamo,qrsfStats.sugerencia,qrsfStats.felicitacion,qrsfStats.closed,`${qrsfStats.closeRate}%`]); ws1.addRow([]);

      ws1.addRow(['PNC']); ws1.getCell(`A${ws1.rowCount}`).font={bold:true,color:{argb:'FF6F7B2C'}};
      hs(ws1,['Uds NC','Total Prod','% PNC','Meta','','','']);
      ws1.addRow([pncStats.totalUnidades,pncStats.totalProd,`${fmtNum(pncStats.pctPNC)}%`,'<2,5%','','','']); ws1.addRow([]);

      ws1.addRow(['ENCUESTAS']); ws1.getCell(`A${ws1.rowCount}`).font={bold:true,color:{argb:'FF6F7B2C'}};
      hs(ws1,['Tipo','Respuestas','Score Promedio','Escala','','','']);
      ws1.addRow(['Satisfacción Clientes',encStats.satisfaccion.total,encStats.satisfaccion.avg??'—','1 a 5','','','']);
      ws1.addRow(['Clima Laboral',encStats.clima.total,encStats.clima.avg??'—','1 a 5','','','']);
      ws1.columns=Array(7).fill(null).map(()=>({width:18}));
      const buf=await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`RevisionDireccion_${range.start}_${range.end}.xlsx`);
    } catch(e){console.error(e);} finally{setExporting(false);}
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', backgroundColor:T.bg, color:T.text }}>

      {/* Modal drill-down */}
      {drillInd && <IndicadorDrillModal ind={drillInd} allMeasurements={data.allMeasurements} onClose={()=>setDrillInd(null)} />}

      {/* ── Header ── */}
      <div style={{ backgroundColor:T.panel, borderBottom:`1px solid ${T.border}`, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${T.border}`, borderRadius:6, cursor:'pointer', color:T.text, padding:'5px 10px', display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
            <ChevronLeft size={13}/> Volver
          </button>
          <div style={{ width:1, height:24, backgroundColor:T.border }}/>
          <ClipboardCheck size={16} style={{ color:T.menta }}/>
          <div>
            <span style={{ fontSize:14, fontWeight:800, color:T.text }}>Revisión por la Dirección</span>
            <span style={{ fontSize:10, color:T.textMuted, marginLeft:10 }}>Sistema de Gestión Integral — Garana Art</span>
          </div>
        </div>
        {generated && (
          <button onClick={exportExcel} disabled={exporting} style={{ backgroundColor:T.oliva+'cc', border:`1px solid ${T.oliva}`, borderRadius:6, cursor:'pointer', color:'white', padding:'6px 12px', display:'flex', alignItems:'center', gap:5, fontSize:11, opacity:exporting?0.6:1 }}>
            {exporting?<Loader2 size={12} className="animate-spin"/>:<FileDown size={12}/>}
            {exporting?'Exportando…':'Exportar Excel'}
          </button>
        )}
      </div>

      {/* ── Filtros ── */}
      <div style={{ backgroundColor:T.panel2, borderBottom:`1px solid ${T.border}`, padding:'8px 20px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <Calendar size={12} style={{ color:T.menta }}/>
        <span style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase' }}>Período</span>
        {['start','end'].map(k=>(
          <input key={k} type="date" value={range[k]}
            onChange={e=>{ setRange(p=>({...p,[k]:e.target.value})); setGenerated(false); }}
            style={{ backgroundColor:T.panel, border:`1px solid ${T.border}`, borderRadius:5, color:T.text, fontSize:11, padding:'4px 8px', height:28 }}/>
        ))}
        {generated && procesosUnicos.length>0 && (
          <>
            <div style={{ width:1, height:20, backgroundColor:T.border }}/>
            <span style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase' }}>Proceso PNC</span>
            <select value={proceso} onChange={e=>setProceso(e.target.value)}
              style={{ backgroundColor:T.panel, border:`1px solid ${T.border}`, borderRadius:5, color:T.text, fontSize:11, padding:'4px 8px', height:28 }}>
              <option value="todos">Todos</option>
              {procesosUnicos.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </>
        )}
        <button onClick={loadData} disabled={loading}
          style={{ backgroundColor:T.menta, border:'none', borderRadius:6, cursor:'pointer', color:'#0f1923', fontWeight:700, padding:'5px 14px', display:'flex', alignItems:'center', gap:5, fontSize:11, opacity:loading?0.6:1 }}>
          {loading?<Loader2 size={12} className="animate-spin"/>:<RefreshCw size={12}/>}
          {loading?'Cargando…':'Generar'}
        </button>
        {generated && <span style={{ fontSize:10, color:T.menta, fontWeight:700 }}>✓ {range.start} → {range.end}</span>}
      </div>

      {/* Estado vacío */}
      {!generated && !loading && (
        <div style={{ textAlign:'center', padding:'100px 20px', color:T.textMuted }}>
          <ClipboardCheck size={56} style={{ margin:'0 auto 16px', opacity:0.15, display:'block' }}/>
          <p style={{ fontSize:15, fontWeight:600, color:T.textDim, marginBottom:6 }}>Dashboard Ejecutivo — Revisión por la Dirección</p>
          <p style={{ fontSize:12 }}>Selecciona el período y haz clic en <strong style={{ color:T.menta }}>Generar</strong></p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:'100px 20px' }}>
          <Loader2 size={36} className="animate-spin" style={{ color:T.menta, display:'block', margin:'0 auto 14px' }}/>
          <p style={{ color:T.textMuted, fontSize:12 }}>Consolidando datos del Sistema de Gestión…</p>
        </div>
      )}

      {/* ══════════════════ DASHBOARD ══════════════════ */}
      {generated && !loading && (
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* ── KPI tiles globales ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))', gap:10 }}>
            <KpiTile icon={TrendingUp}    color={T.menta}   delay={0.04}
              title="CMI — Indicadores OK"   value={`${cmiStats.good}/${cmiStats.total}`}
              sub={`${cmiStats.pct}% cumplimiento`} trend={0} />
            <KpiTile icon={AlertTriangle} color={T.warning}  delay={0.07}
              title="CMI — Alerta / Crítico" value={cmiStats.warning+cmiStats.critical}
              sub={`${cmiStats.warning} alerta · ${cmiStats.critical} crítico`} />
            <KpiTile icon={CheckCircle2}  color={T.good}    delay={0.10}
              title="Acciones de Mejora"    value={actStats.total}
              sub={`${actStats.pctClose}% cerradas · ${actStats.overdue} vencidas`}
              trend={actStats.pctClose-50} />
            <KpiTile icon={HelpCircle}    color={T.orange}  delay={0.13}
              title="QRSF del Período"      value={qrsfStats.total}
              sub={`${qrsfStats.closeRate}% tasa de cierre`}
              trend={qrsfStats.closeRate-70} />
            <KpiTile icon={Shield}
              color={pncStats.pctPNC<=2.5?T.good:pncStats.pctPNC<=4?T.warning:T.danger}
              delay={0.16}
              title="% Producto No Conforme" value={fmtNum(pncStats.pctPNC)} unit="%"
              sub={`Meta <2,5% · ${pncStats.totalUnidades} uds NC`}
              trend={-(pncStats.pctPNC-2.5)} />
            <KpiTile icon={Star}
              color={scoreColor(encStats.satisfaccion.avg)}
              delay={0.19}
              title="Satisfacción Clientes"  value={encStats.satisfaccion.avg??'—'} unit="/5"
              sub={`${encStats.satisfaccion.total} respuestas · meta ≥4,0`}
              trend={encStats.satisfaccion.avg?(encStats.satisfaccion.avg-4)*10:0} />
            <KpiTile icon={Users}
              color={scoreColor(encStats.clima.avg)}
              delay={0.22}
              title="Clima Laboral"          value={encStats.clima.avg??'—'} unit="/5"
              sub={`${encStats.clima.total} respuestas · meta ≥4,0`}
              trend={encStats.clima.avg?(encStats.clima.avg-4)*10:0} />
          </div>

          {/* ════════════════════════════════════════════
              SECCIÓN 1 — CMI
          ════════════════════════════════════════════ */}
          <SectionDivider title="Cuadro de Mando Integral" icon={BarChart3} color={T.menta} />
          <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:12 }}>
            <Panel title="Cumplimiento por Perspectiva" icon={Target} color={T.menta} delay={0.12}>
              <div style={{ height:200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
                    data={radialData} startAngle={90} endAngle={-270}>
                    <RadialBar minAngle={5} dataKey="value" cornerRadius={4} background={{ fill:T.border }}/>
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize:10, color:T.textDim }}/>
                    <Tooltip content={<DarkTooltip/>} formatter={v=>[`${v}%`,'Cumplimiento']}/>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:6 }}>
                {radialData.map(d=>(
                  <div key={d.name} style={{ backgroundColor:T.panel2, borderRadius:6, padding:'6px 8px', border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:9, color:T.textMuted, marginBottom:2 }}>{d.name}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:d.fill }}>{d.value}%</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Indicadores por Perspectiva (click → historial)" icon={BarChart3} color={T.accent} delay={0.15}>
              <div style={{ maxHeight:440, overflowY:'auto', paddingRight:4 }}>
                {PERSP_ORDER.map(k=>(
                  <CmiPerspCard key={k} persp={PERSP[k]}
                    items={data.indicators.filter(i=>i.perspective===k)}
                    measurements={data.measurements}
                    allMeasurements={data.allMeasurements}
                    onIndicatorClick={setDrillInd}/>
                ))}
              </div>
            </Panel>
          </div>

          {/* ════════════════════════════════════════════
              SECCIÓN 2 — Encuestas
          ════════════════════════════════════════════ */}
          <SectionDivider title="Encuestas" icon={Star} color={T.warning} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

            {/* Satisfacción Clientes */}
            <Panel title="Satisfacción de Clientes" icon={Star} color={T.warning} delay={0.15}>
              {encStats.satisfaccion.total===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'30px 0' }}>Sin respuestas en el período</p>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:42, fontWeight:900, color:scoreColor(encStats.satisfaccion.avg), lineHeight:1 }}>
                        {encStats.satisfaccion.avg}
                      </div>
                      <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>/ 5.0 · Promedio</div>
                      <ScoreStars score={encStats.satisfaccion.avg} />
                    </div>
                    <div style={{ flex:1 }}>
                      {[5,4,3,2,1].map(v=>{
                        const cnt = data.encuestas.satisfaccion.filter(e=>Math.round(e.avg||0)===v).length;
                        const pct = encStats.satisfaccion.total>0?Math.round((cnt/encStats.satisfaccion.total)*100):0;
                        return (
                          <div key={v} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:9, color:T.textMuted, width:8, textAlign:'right' }}>{v}</span>
                            <div style={{ flex:1, height:6, borderRadius:3, backgroundColor:T.border }}>
                              <div style={{ width:`${pct}%`, height:'100%', borderRadius:3, backgroundColor:scoreColor(v) }}/>
                            </div>
                            <span style={{ fontSize:9, color:T.textDim, width:28 }}>{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {encStats.satisfaccion.tendencia.length>0 && (
                    <div style={{ height:140 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={encStats.satisfaccion.tendencia} margin={{ top:5, right:10, bottom:0, left:-15 }}>
                          <defs>
                            <linearGradient id="gradSat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={T.warning} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={T.warning} stopOpacity={0.02}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                          <XAxis dataKey="mes" style={{ fontSize:9 }} tick={{ fill:T.textMuted }}/>
                          <YAxis domain={[1,5]} style={{ fontSize:9 }} tick={{ fill:T.textMuted }}/>
                          <Tooltip content={<DarkTooltip/>}/>
                          <ReferenceLine y={4} stroke={T.good} strokeDasharray="4 4"
                            label={{ value:'Meta 4,0', fill:T.good, fontSize:8, position:'insideTopRight' }}/>
                          <Area type="monotone" dataKey="avg" name="Score" stroke={T.warning} fill="url(#gradSat)" strokeWidth={2} dot={{ fill:T.warning, r:3 }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </Panel>

            {/* Clima Laboral */}
            <Panel title="Clima Laboral" icon={Users} color={T.purple} delay={0.18}>
              {encStats.clima.total===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'30px 0' }}>Sin respuestas en el período</p>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:42, fontWeight:900, color:scoreColor(encStats.clima.avg), lineHeight:1 }}>
                        {encStats.clima.avg}
                      </div>
                      <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>/ 5.0 · Promedio</div>
                      <ScoreStars score={encStats.clima.avg} />
                    </div>
                    {/* Por área de trabajo */}
                    <div style={{ flex:1 }}>
                      {encStats.clima.porArea.slice(0,5).map(a=>(
                        <div key={a.name} style={{ marginBottom:4 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                            <span style={{ fontSize:9, color:T.textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:100 }}>{a.name}</span>
                            <span style={{ fontSize:9, fontWeight:700, color:scoreColor(a.avg) }}>{a.avg}</span>
                          </div>
                          <div style={{ height:4, borderRadius:2, backgroundColor:T.border }}>
                            <div style={{ width:`${(a.avg/5)*100}%`, height:'100%', borderRadius:2, backgroundColor:scoreColor(a.avg) }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {encStats.clima.tendencia.length>0 && (
                    <div style={{ height:140 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={encStats.clima.tendencia} margin={{ top:5, right:10, bottom:0, left:-15 }}>
                          <defs>
                            <linearGradient id="gradClima" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={T.purple} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={T.purple} stopOpacity={0.02}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                          <XAxis dataKey="mes" style={{ fontSize:9 }} tick={{ fill:T.textMuted }}/>
                          <YAxis domain={[1,5]} style={{ fontSize:9 }} tick={{ fill:T.textMuted }}/>
                          <Tooltip content={<DarkTooltip/>}/>
                          <ReferenceLine y={4} stroke={T.good} strokeDasharray="4 4"
                            label={{ value:'Meta 4,0', fill:T.good, fontSize:8, position:'insideTopRight' }}/>
                          <Area type="monotone" dataKey="avg" name="Score" stroke={T.purple} fill="url(#gradClima)" strokeWidth={2} dot={{ fill:T.purple, r:3 }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </Panel>
          </div>

          {/* ════════════════════════════════════════════
              SECCIÓN 3 — PNC
          ════════════════════════════════════════════ */}
          <SectionDivider title="Producto No Conforme" icon={Shield} color={T.danger} />
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <Panel title="Tendencia Mensual % PNC vs Meta 2,5%" icon={TrendingUp} color={T.danger} delay={0.18}>
              {pncStats.tendenciaPNC.length===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'40px 0' }}>Sin datos en el período</p>
              ) : (
                <div style={{ height:220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pncStats.tendenciaPNC} margin={{ top:5, right:10, bottom:0, left:-10 }}>
                      <defs>
                        <linearGradient id="gradPNC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={T.danger} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={T.danger} stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="mes" style={{ fontSize:9 }} tick={{ fill:T.textMuted }} stroke={T.border}/>
                      <YAxis style={{ fontSize:9 }} tick={{ fill:T.textMuted }} stroke={T.border} unit="%"/>
                      <Tooltip content={<DarkTooltip/>}/>
                      <ReferenceLine y={2.5} stroke={T.warning} strokeDasharray="4 4"
                        label={{ value:'Meta 2,5%', fill:T.warning, fontSize:9 }}/>
                      <Area type="monotone" dataKey="pct" name="% NC" stroke={T.danger} fill="url(#gradPNC)" strokeWidth={2} dot={{ fill:T.danger, r:3 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel title="Causas Principales" icon={AlertTriangle} color={T.warning} delay={0.21}>
              {pncStats.causas.length===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'40px 0' }}>Sin datos</p>
              ) : (
                <div style={{ height:220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pncStats.causas} layout="vertical" margin={{ left:2, right:20, top:5, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
                      <XAxis type="number" style={{ fontSize:9 }} tick={{ fill:T.textMuted }} allowDecimals={false}/>
                      <YAxis type="category" dataKey="name" style={{ fontSize:9 }} tick={{ fill:T.textDim }} width={72}/>
                      <Tooltip content={<DarkTooltip/>}/>
                      <Bar dataKey="value" name="Registros" radius={[0,4,4,0]}>
                        {pncStats.causas.map((_,i)=>(
                          <Cell key={i} fill={[T.danger,T.warning,T.orange,T.accent,T.menta,T.purple][i%6]}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12 }}>
            <Panel title="Top Defectos (unidades)" icon={Shield} color={T.danger} delay={0.23}>
              {pncStats.topDefectos.length===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'40px 0' }}>Sin datos</p>
              ) : (
                <div style={{ height:220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pncStats.topDefectos} layout="vertical" margin={{ left:2, right:20, top:5, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
                      <XAxis type="number" style={{ fontSize:9 }} tick={{ fill:T.textMuted }}/>
                      <YAxis type="category" dataKey="name" style={{ fontSize:9 }} tick={{ fill:T.textDim }} width={95}/>
                      <Tooltip content={<DarkTooltip/>}/>
                      <Bar dataKey="value" name="Unidades" fill={T.danger} radius={[0,4,4,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel title="Clasificación" icon={Activity} color={T.orange} delay={0.25}>
              {pncStats.clasificacion.length===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'40px 0' }}>Sin datos</p>
              ) : (
                <>
                  <div style={{ height:160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pncStats.clasificacion} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={3}>
                          {pncStats.clasificacion.map((e,i)=><Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip content={<DarkTooltip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {pncStats.clasificacion.map(c=>(
                    <div key={c.name} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', backgroundColor:c.color, display:'inline-block' }}/>
                        <span style={{ fontSize:10, color:T.textDim }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:c.color }}>{c.value}</span>
                    </div>
                  ))}
                </>
              )}
            </Panel>
            <Panel title="Acciones de Mejora" icon={CheckCircle2} color={T.good} delay={0.27}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Cerradas',   val:actStats.closed,  color:T.good      },
                  { label:'En Proceso', val:actStats.inProg,  color:T.accent    },
                  { label:'Abiertas',   val:actStats.open,    color:T.textMuted },
                  { label:'Vencidas',   val:actStats.overdue, color:T.danger    },
                ].map(s=>(
                  <div key={s.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:10, color:T.textDim }}>{s.label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{s.val}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, backgroundColor:T.border }}>
                      <motion.div initial={{ width:0 }} animate={{ width:actStats.total>0?`${(s.val/actStats.total)*100}%`:'0%' }} transition={{ duration:0.8, ease:'easeOut' }}
                        style={{ height:'100%', borderRadius:2, backgroundColor:s.color }}/>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:8, textAlign:'center', backgroundColor:T.panel2, borderRadius:8, padding:'10px 0' }}>
                  <div style={{ fontSize:28, fontWeight:800, color:actStats.pctClose>=70?T.good:T.warning }}>{actStats.pctClose}%</div>
                  <div style={{ fontSize:10, color:T.textMuted }}>Tasa de cierre</div>
                </div>
                {tendenciaAcciones.length>0 && (
                  <div style={{ marginTop:6 }}>
                    <p style={{ fontSize:9, color:T.textMuted, marginBottom:4, textTransform:'uppercase' }}>Tendencia mensual</p>
                    <div style={{ height:80 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tendenciaAcciones} margin={{ left:-20, right:4, top:2, bottom:0 }}>
                          <XAxis dataKey="mes" style={{ fontSize:8 }} tick={{ fill:T.textMuted }}/>
                          <Tooltip content={<DarkTooltip/>}/>
                          <Bar dataKey="cerradas" name="Cerradas" fill={T.good}  stackId="a"/>
                          <Bar dataKey="abiertas" name="Abiertas" fill={T.accent} stackId="a" radius={[3,3,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* ════════════════════════════════════════════
              SECCIÓN 4 — QRSF
          ════════════════════════════════════════════ */}
          <SectionDivider title="QRSF / Devoluciones" icon={HelpCircle} color={T.orange} />
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <Panel title="Tendencia Mensual por Tipo" icon={HelpCircle} color={T.orange} delay={0.22}>
              {tendenciaQRSF.length===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'40px 0' }}>Sin QRSF en el período</p>
              ) : (
                <div style={{ height:200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tendenciaQRSF} margin={{ top:5, right:10, bottom:0, left:-15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="mes" style={{ fontSize:9 }} tick={{ fill:T.textMuted }}/>
                      <YAxis style={{ fontSize:9 }} tick={{ fill:T.textMuted }} allowDecimals={false}/>
                      <Tooltip content={<DarkTooltip/>}/>
                      <Legend iconSize={8} wrapperStyle={{ fontSize:9, color:T.textDim }}/>
                      <Bar dataKey="queja"        name="Quejas"         fill="#ef4444" stackId="a"/>
                      <Bar dataKey="reclamo"      name="Reclamos"       fill="#f97316" stackId="a"/>
                      <Bar dataKey="sugerencia"   name="Sugerencias"    fill="#38bdf8" stackId="a"/>
                      <Bar dataKey="felicitacion" name="Felicitaciones" fill={T.menta} stackId="a" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel title="Distribución y Cierre" icon={Activity} color={T.orange} delay={0.25}>
              {qrsfStats.total===0 ? (
                <p style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'40px 0' }}>Sin QRSF en el período</p>
              ) : (
                <>
                  <div style={{ height:150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[
                          { name:'Quejas',         value:qrsfStats.queja,        fill:'#ef4444' },
                          { name:'Reclamos',       value:qrsfStats.reclamo,      fill:'#f97316' },
                          { name:'Sugerencias',    value:qrsfStats.sugerencia,   fill:'#38bdf8' },
                          { name:'Felicitaciones', value:qrsfStats.felicitacion, fill:T.menta   },
                        ].filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                          {[0,1,2,3].map(i=><Cell key={i} fill={['#ef4444','#f97316','#38bdf8',T.menta][i]}/>)}
                        </Pie>
                        <Tooltip content={<DarkTooltip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {[
                    { label:'Quejas',         val:qrsfStats.queja,        color:'#ef4444' },
                    { label:'Reclamos',       val:qrsfStats.reclamo,      color:'#f97316' },
                    { label:'Sugerencias',    val:qrsfStats.sugerencia,   color:'#38bdf8' },
                    { label:'Felicitaciones', val:qrsfStats.felicitacion, color:T.menta   },
                  ].map(s=>(
                    <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', backgroundColor:s.color, display:'inline-block' }}/>
                        <span style={{ fontSize:10, color:T.textDim }}>{s.label}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{s.val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:8, textAlign:'center', backgroundColor:T.panel2, borderRadius:8, padding:'8px 0' }}>
                    <div style={{ fontSize:22, fontWeight:800, color:qrsfStats.closeRate>=80?T.good:T.warning }}>{qrsfStats.closeRate}%</div>
                    <div style={{ fontSize:9, color:T.textMuted }}>Tasa de cierre</div>
                  </div>
                </>
              )}
            </Panel>
          </div>

          {/* ════════════════════════════════════
              PLACEHOLDER — Próximos módulos
              Cada nuevo submodulo se añade aquí
          ════════════════════════════════════ */}
          {/* PRÓXIMAMENTE: Matriz de Riesgos, Auditorías, Estándares SST, etc. */}

          {/* Footer */}
          <div style={{ textAlign:'center', paddingBottom:8, paddingTop:4 }}>
            <span style={{ fontSize:9, color:T.textMuted }}>
              Garana SIG · Revisión por la Dirección · {new Date().toLocaleString('es-CO')}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}