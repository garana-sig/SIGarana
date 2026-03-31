// src/components/modules/SSTBienestar/Estandares/EstandaresTab.jsx
import { useState, useEffect } from 'react';
import { useEstandares } from '@/hooks/useEstandares';
import { useAuth } from '@/context/AuthContext';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import {
  ChevronDown, ChevronRight, Plus, Loader2, Trash2,
  CheckCircle2, XCircle, MinusCircle, Clock,
  AlertCircle, Shield, CalendarDays, BarChart2,
} from 'lucide-react';

const C = { primary:'#2e5244', mint:'#6dbd96', olive:'#6f7b2c', sand:'#dedecc', dark:'#1a2e25' };

const CICLO_META = {
  PLANEAR:   { label:'Planear',   color:'#2e5244', emoji:'📋' },
  HACER:     { label:'Hacer',     color:'#6dbd96', emoji:'⚙️'  },
  VERIFICAR: { label:'Verificar', color:'#6f7b2c', emoji:'🔍' },
  ACTUAR:    { label:'Actuar',    color:'#d97706', emoji:'🚀' },
};

const STATUS_META = {
  cumple:                 { label:'Cumple',            color:'#16a34a', bg:'#dcfce7', icon:CheckCircle2 },
  no_cumple:              { label:'No cumple',          color:'#dc2626', bg:'#fee2e2', icon:XCircle      },
  no_aplica_justifica:    { label:'No aplica (just.)',  color:'#6f7b2c', bg:'#f0f4e0', icon:MinusCircle  },
  no_aplica_no_justifica: { label:'No aplica (s/just)', color:'#9ca3af', bg:'#f3f4f6', icon:MinusCircle  },
  pendiente:              { label:'Pendiente',          color:'#d97706', bg:'#fef3c7', icon:Clock        },
};

// ── Gauge ─────────────────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const pct   = Math.min(score, 100);
  const angle = -135 + (pct / 100) * 270;
  const cls   = score >= 86
    ? { label:'ACEPTABLE',               color:'#16a34a', bg:'#dcfce7' }
    : score >= 61
    ? { label:'MODERADAMENTE ACEPTABLE', color:'#d97706', bg:'#fef3c7' }
    : { label:'CRÍTICO',                 color:'#dc2626', bg:'#fee2e2' };
  return (
    <div style={{ textAlign:'center' }}>
      <svg viewBox="0 0 200 130" style={{ width:200, height:130 }}>
        <path d="M 20 110 A 80 80 0 1 1 180 110" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
        <path d="M 20 110 A 80 80 0 1 1 180 110" fill="none"
          stroke={cls.color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(pct/100)*251.2} 251.2`}/>
        <line x1="100" y1="110" x2="100" y2="42"
          stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"
          style={{ transformOrigin:'100px 110px', transform:`rotate(${angle}deg)` }}/>
        <circle cx="100" cy="110" r="6" fill={C.dark}/>
        <text x="100" y="96" textAnchor="middle" fontSize="26" fontWeight="800" fill={C.dark}>{score.toFixed(1)}</text>
        <text x="100" y="108" textAnchor="middle" fontSize="10" fill="#6b7280">puntos / 100</text>
      </svg>
      <div style={{
        display:'inline-block', marginTop:4,
        padding:'4px 16px', borderRadius:20, fontWeight:700, fontSize:13,
        background:cls.bg, color:cls.color,
      }}>{cls.label}</div>
    </div>
  );
}

// ── Gráfico de barras por ciclo ───────────────────────────────────────────────
function BarChartByGroup({ groupedData }) {
  const chartData = groupedData.map(ciclo => ({
    name:     CICLO_META[ciclo.ciclo]?.label || ciclo.ciclo,
    obtenido: Number(ciclo.score.toFixed(2)),
    maximo:   Number(ciclo.maxScore.toFixed(2)),
    pct:      ciclo.maxScore > 0 ? Math.round((ciclo.score / ciclo.maxScore) * 100) : 0,
    color:    CICLO_META[ciclo.ciclo]?.color || C.primary,
    emoji:    CICLO_META[ciclo.ciclo]?.emoji || '',
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = chartData.find(x => x.name === label);
    return (
      <div style={{
        background:'#1a2e25', borderRadius:10, padding:'10px 14px',
        boxShadow:'0 8px 24px rgba(0,0,0,0.2)', minWidth:160,
      }}>
        <p style={{ color:C.mint, fontWeight:700, fontSize:13, marginBottom:6 }}>
          {d?.emoji} {label}
        </p>
        <p style={{ color:'#fff', fontSize:12 }}>Obtenido: <strong>{payload[0]?.value}</strong> pts</p>
        <p style={{ color:'#9ca3af', fontSize:12 }}>Máximo: <strong>{d?.maximo}</strong> pts</p>
        <p style={{
          fontSize:13, fontWeight:700, marginTop:4,
          color: d?.pct >= 86 ? '#4ade80' : d?.pct >= 61 ? '#fbbf24' : '#f87171',
        }}>
          {d?.pct}% cumplimiento
        </p>
      </div>
    );
  };

  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px',
      boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <BarChart2 size={16} color={C.primary}/>
        <p style={{ fontWeight:700, fontSize:13, color:C.primary,
          textTransform:'uppercase', letterSpacing:'0.06em' }}>
          Puntaje por ciclo PHVA
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top:8, right:16, left:-10, bottom:8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
          <XAxis dataKey="name" tick={{ fontSize:13, fill:'#374151', fontWeight:600 }}/>
          <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} domain={[0, 'dataMax + 5']}/>
          <Tooltip content={<CustomTooltip/>}/>
          <Bar dataKey="obtenido" radius={[6,6,0,0]} maxBarSize={60}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.88}/>
            ))}
          </Bar>
          <Bar dataKey="maximo" radius={[4,4,0,0]} maxBarSize={60} fill="#6dbd96" fillOpacity={0.4}/>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:12, height:12, borderRadius:3, background:C.primary, opacity:0.88 }}/>
          <span style={{ fontSize:11, color:'#6b7280' }}>Puntaje obtenido</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:12, height:12, borderRadius:3, background:'#6dbd96' }}/>
          <span style={{ fontSize:11, color:'#6b7280' }}>Puntaje máximo</span>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de ciclo ──────────────────────────────────────────────────────────
function CicloCard({ data, onClick, active }) {
  const meta = CICLO_META[data.ciclo];
  const pct  = data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0;
  return (
    <div onClick={onClick} style={{
      background:'#fff', borderRadius:12, padding:'14px 16px',
      border:`2px solid ${active ? meta.color : '#e5e7eb'}`,
      cursor:'pointer', transition:'all 0.15s',
      boxShadow: active ? `0 4px 16px ${meta.color}30` : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>{meta.emoji}</span>
          <div>
            <p style={{ fontWeight:700, fontSize:13, color:meta.color, margin:0 }}>{meta.label}</p>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontWeight:800, fontSize:18, color:meta.color, margin:0 }}>{data.score.toFixed(1)}</p>
          <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>de {data.maxScore.toFixed(1)}</p>
        </div>
      </div>
      <div style={{ background:'#f3f4f6', borderRadius:6, height:6, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:meta.color, borderRadius:6, transition:'width 0.4s' }}/>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        {[
          { label:'✅', count:data.cumple,    color:'#16a34a' },
          { label:'❌', count:data.noCumple,  color:'#dc2626' },
          { label:'⚪', count:data.noAplica,  color:'#9ca3af' },
          { label:'⏳', count:data.pendiente, color:'#d97706' },
        ].filter(s => s.count > 0).map(s => (
          <span key={s.label} style={{ fontSize:11, color:s.color, fontWeight:600 }}>
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Modal ítem (ver/editar) ───────────────────────────────────────────────────
function ItemModal({ open, onClose, item, onSave, canEdit }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && item) setForm({ ...item }); }, [open, item]);
  const set = (k,v) => setForm(p => ({ ...p, [k]:v }));

  const computedScore = () => {
    if (form.eval_status === 'cumple' || form.eval_status === 'no_aplica_justifica')
      return item?.max_score || 0;
    return 0;
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.id, {
      eval_status:  form.eval_status,
      score:        computedScore(),
      evidence:     form.evidence     || null,
      action_plan:  form.action_plan  || null,
      responsible:  form.responsible  || null,
      due_date:     form.due_date     || null,
      resources:    form.resources    || null,
      foundations:  form.foundations  || null,
    });
    setSaving(false);
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <div style={{ background:C.primary, padding:'20px 24px', borderRadius:'8px 8px 0 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              background:'rgba(255,255,255,0.15)', borderRadius:8,
              padding:'6px 10px', fontSize:14, fontWeight:800, color:C.mint,
            }}>{item.numeral}</div>
            <div>
              <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>{item.item_name}</h2>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 }}>{item.standard_group}</p>
            </div>
          </div>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {item.criterio && (
            <div style={{ background:`${C.mint}12`, borderLeft:`3px solid ${C.mint}`, borderRadius:8, padding:'12px 14px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:C.primary, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Criterio</p>
              <p style={{ fontSize:12, color:'#374151', lineHeight:1.6, margin:0 }}>{item.criterio}</p>
            </div>
          )}

          {/* Estado */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.primary, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:8 }}>
              Estado de cumplimiento
            </label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(STATUS_META).map(([key, m]) => {
                const I = m.icon;
                const selected = form.eval_status === key;
                return (
                  <button key={key} onClick={() => canEdit && set('eval_status', key)}
                    disabled={!canEdit}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      padding:'8px 14px', borderRadius:10,
                      border:`2px solid ${selected ? m.color : '#e5e7eb'}`,
                      background: selected ? m.bg : '#fff',
                      color: selected ? m.color : '#6b7280',
                      fontWeight: selected ? 700 : 500, fontSize:12,
                      cursor: canEdit ? 'pointer' : 'default', transition:'all 0.15s',
                    }}>
                    <I size={13}/> {m.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
              Máximo: <strong>{item.max_score}</strong> pts · Obtenido: <strong>{computedScore()}</strong> pts
            </p>
          </div>

          {/* Evidencias y plan de acción */}
          {[
            { key:'evidence',   label:'Evidencias / Observaciones', placeholder:'Describe las evidencias encontradas...' },
            { key:'action_plan',label:'Plan de Acción',             placeholder:'Acciones a implementar...' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>{f.label}</label>
              <Textarea value={form[f.key] || ''} rows={3}
                onChange={e => set(f.key, e.target.value)}
                disabled={!canEdit} placeholder={f.placeholder} className="text-sm resize-none"/>
            </div>
          ))}

          {/* Responsable + Fecha */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { key:'responsible', label:'Responsable', type:'text',  placeholder:'Nombre del responsable' },
              { key:'due_date',    label:'Fecha plazo',  type:'date',  placeholder:'' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>{f.label}</label>
                <Input type={f.type} value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  disabled={!canEdit} placeholder={f.placeholder} className="text-sm"/>
              </div>
            ))}
          </div>

          {[
            { key:'resources',   label:'Recursos' },
            { key:'foundations', label:'Fundamentos y soportes' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>{f.label}</label>
              <Input value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                disabled={!canEdit} className="text-sm"/>
            </div>
          ))}

          {item.modo_verificacion && (
            <details style={{ fontSize:12, color:'#6b7280' }}>
              <summary style={{ cursor:'pointer', fontWeight:600, color:C.olive }}>📋 Modo de verificación</summary>
              <p style={{ marginTop:8, lineHeight:1.6, paddingLeft:12, borderLeft:`2px solid ${C.sand}` }}>
                {item.modo_verificacion}
              </p>
            </details>
          )}

          {canEdit && (
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:8, borderTop:'1px solid #f3f4f6' }}>
              <Button variant="outline" onClick={onClose} disabled={saving} style={{ borderColor:C.sand }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} style={{ background:C.primary, color:'#fff' }}>
                {saving ? <><Loader2 size={13} className="mr-1.5 animate-spin"/>Guardando...</> : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal: agregar ítem personalizado ────────────────────────────────────────
function AddItemModal({ open, onClose, evalId, onAdded }) {
  const CICLOS   = ['PLANEAR','HACER','VERIFICAR','ACTUAR'];
  const [form, setForm] = useState({
    ciclo:'PLANEAR', standard_group:'', numeral:'',
    item_name:'', max_score:'0', criterio:'', marco_legal:'',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k,v) => setForm(p => ({ ...p, [k]:v }));
  const { supabase } = window.__supabase_ref || {};

  const handleSave = async () => {
    if (!form.numeral.trim() || !form.item_name.trim()) {
      setErr('El numeral y el nombre del ítem son obligatorios.'); return;
    }
    setSaving(true); setErr('');
    try {
      const { createCustomItem } = onAdded;
      await createCustomItem({
        evaluation_id: evalId,
        ciclo:          form.ciclo,
        standard_group: form.standard_group || `${form.ciclo} — Personalizado`,
        numeral:        form.numeral.trim(),
        item_name:      form.item_name.trim(),
        max_score:      parseFloat(form.max_score) || 0,
        criterio:       form.criterio  || null,
        marco_legal:    form.marco_legal || null,
        eval_status:    'pendiente',
        score:          0,
      });
      onClose();
      setForm({ ciclo:'PLANEAR', standard_group:'', numeral:'', item_name:'', max_score:'0', criterio:'', marco_legal:'' });
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0">
        <div style={{ background:C.primary, padding:'18px 22px', borderRadius:'8px 8px 0 0' }}>
          <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>Agregar ítem personalizado</h2>
          <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 }}>
            Útil cuando la normativa agrega nuevos numerales o la empresa lo requiere
          </p>
        </div>
        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {err && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8,
              padding:'8px 12px', fontSize:12, color:'#dc2626', display:'flex', gap:8 }}>
              <AlertCircle size={13}/> {err}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Ciclo PHVA</label>
              <select value={form.ciclo} onChange={e => set('ciclo', e.target.value)}
                style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13 }}>
                {CICLOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Numeral</label>
              <Input value={form.numeral} onChange={e => set('numeral', e.target.value)} placeholder="Ej: 2.12.1" className="text-sm"/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Grupo / Estándar</label>
            <Input value={form.standard_group} onChange={e => set('standard_group', e.target.value)} placeholder="Ej: E2.12 Nuevo requisito (2%)" className="text-sm"/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Nombre del ítem *</label>
            <Input value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="Descripción corta del criterio" className="text-sm"/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Puntaje máximo</label>
            <Input type="number" value={form.max_score} onChange={e => set('max_score', e.target.value)} placeholder="0" className="text-sm" min="0" step="0.5"/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:C.primary, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Criterio (opcional)</label>
            <Textarea value={form.criterio} onChange={e => set('criterio', e.target.value)} rows={2} placeholder="Descripción del criterio a evaluar..." className="text-sm resize-none"/>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
            <Button variant="outline" onClick={onClose} disabled={saving} style={{ borderColor:C.sand }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} style={{ background:C.primary, color:'#fff' }}>
              {saving ? <Loader2 size={13} className="mr-1.5 animate-spin"/> : <Plus size={13} className="mr-1.5"/>}
              Agregar ítem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
export default function EstandaresTab() {
  const { hasPermission, profile } = useAuth();
  const canCreate = profile?.role === 'admin' || profile?.role === 'gerencia' || hasPermission('sst_bienestar:estandares:create');
  const canEdit   = profile?.role === 'admin' || profile?.role === 'gerencia' || hasPermission('sst_bienestar:estandares:edit');

  const {
    evaluations, activeEval, setActiveEval,
    items, loading, saving, error,
    updateItem, createEvaluation, createCustomItem, deleteItem,
    groupedByCiclo, totalScore,
  } = useEstandares();

  const [activeCiclo,    setActiveCiclo]    = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedItem,   setSelectedItem]   = useState(null);
  const [showNewYear,    setShowNewYear]     = useState(false);
  const [showAddItem,    setShowAddItem]     = useState(false);
  const [showChart,      setShowChart]       = useState(false);
  const [newYear,        setNewYear]         = useState('');
  const [newYearErr,     setNewYearErr]      = useState('');
  const [deleteConfirm,  setDeleteConfirm]   = useState(null); // itemId

  const ciclos = groupedByCiclo();

  useEffect(() => {
    if (ciclos.length && !activeCiclo) setActiveCiclo(ciclos[0].ciclo);
  }, [items]);

  const toggleGroup = (key) => setExpandedGroups(p => ({ ...p, [key]: !p[key] }));

  const handleCreateYear = async () => {
    const y = parseInt(newYear);
    if (!y || y < 2020 || y > 2040) { setNewYearErr('Ingresa un año válido (2020-2040)'); return; }
    const result = await createEvaluation(y);
    if (!result.ok) { setNewYearErr(result.error); return; }
    setShowNewYear(false); setNewYear(''); setNewYearErr('');
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirm) return;
    await deleteItem(deleteConfirm);
    setDeleteConfirm(null);
    if (selectedItem?.id === deleteConfirm) setSelectedItem(null);
  };

  const currentCicloData = ciclos.find(c => c.ciclo === activeCiclo);

  if (loading && !items.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <Loader2 size={28} className="animate-spin" style={{ color:C.mint }}/>
    </div>
  );

  if (error) return (
    <div style={{ padding:24, textAlign:'center', color:'#dc2626' }}>
      <AlertCircle size={28} style={{ margin:'0 auto 8px' }}/><p>{error}</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Barra superior ─────────────────────────────────────────────── */}
      <div style={{ background:'#fff', borderRadius:14, padding:'12px 16px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>

        <div style={{ position:'relative' }}>
          <select value={activeEval?.id || ''}
            onChange={e => {
              setActiveCiclo(null);
              setActiveEval(evaluations.find(ev => ev.id === e.target.value));
            }}
            style={{ appearance:'none', paddingRight:28, paddingLeft:14,
              paddingTop:8, paddingBottom:8,
              background:`${C.primary}12`, border:`1.5px solid ${C.primary}30`,
              borderRadius:10, fontSize:14, fontWeight:700, color:C.primary, cursor:'pointer' }}>
            {evaluations.map(ev => <option key={ev.id} value={ev.id}>Evaluación {ev.year}</option>)}
            {!evaluations.length && <option>Sin evaluaciones</option>}
          </select>
          <ChevronDown size={14} style={{ position:'absolute', right:8, top:'50%',
            transform:'translateY(-50%)', color:C.primary, pointerEvents:'none' }}/>
        </div>

        {activeEval && (
          <div style={{
            padding:'6px 14px', borderRadius:20, fontWeight:700, fontSize:13,
            background: totalScore >= 86 ? '#dcfce7' : totalScore >= 61 ? '#fef3c7' : '#fee2e2',
            color:       totalScore >= 86 ? '#16a34a' : totalScore >= 61 ? '#d97706' : '#dc2626',
          }}>
            <Shield size={13} style={{ marginRight:5, display:'inline' }}/>
            {totalScore.toFixed(1)} / 100
          </div>
        )}

        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {/* Toggle gráfico */}
          {activeEval && items.length > 0 && (
            <Button variant="outline" size="sm"
              onClick={() => setShowChart(!showChart)}
              style={{ borderColor: showChart ? C.primary : C.sand,
                background: showChart ? `${C.primary}12` : 'transparent',
                color: showChart ? C.primary : undefined, fontSize:12 }}>
              <BarChart2 size={13} className="mr-1.5"/>
              {showChart ? 'Ocultar gráfico' : 'Ver gráfico'}
            </Button>
          )}
          {canEdit && activeEval && (
            <Button variant="outline" size="sm"
              onClick={() => setShowAddItem(true)}
              style={{ borderColor:C.sand, fontSize:12 }}>
              <Plus size={13} className="mr-1.5"/> Agregar ítem
            </Button>
          )}
          {canCreate && (
            <Button variant="outline" size="sm"
              onClick={() => { setShowNewYear(true); setNewYear(String(new Date().getFullYear() + 1)); }}
              style={{ borderColor:C.sand, fontSize:12 }}>
              <CalendarDays size={13} className="mr-1.5"/> Nuevo año
            </Button>
          )}
        </div>
      </div>

      {!activeEval ? (
        <div style={{ background:'#fff', borderRadius:14, padding:48,
          textAlign:'center', color:'#9ca3af', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <Shield size={40} style={{ margin:'0 auto 12px', color:'#e5e7eb' }}/>
          <p style={{ fontWeight:600, fontSize:15 }}>No hay evaluaciones aún</p>
          {canCreate && (
            <Button className="mt-4 text-white" style={{ background:C.primary }}
              onClick={() => setShowNewYear(true)}>
              <Plus size={14} className="mr-1.5"/> Crear primera evaluación
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── Dashboard ────────────────────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16, alignItems:'start' }}>
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 16px',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', textAlign:'center' }}>
              <p style={{ fontWeight:700, fontSize:13, color:C.primary,
                marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Puntaje {activeEval.year}
              </p>
              <ScoreGauge score={totalScore}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {ciclos.map(cicloData => (
                <CicloCard key={cicloData.ciclo} data={cicloData}
                  active={activeCiclo === cicloData.ciclo}
                  onClick={() => setActiveCiclo(cicloData.ciclo)}/>
              ))}
            </div>
          </div>

          {/* ── Gráfico de barras (togglable) ────────────────────────── */}
          {showChart && <BarChartByGroup groupedData={ciclos}/>}

          {/* ── Acordeón por ciclo ───────────────────────────────────── */}
          {currentCicloData && (
            <div style={{ background:'#fff', borderRadius:14,
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' }}>
              <div style={{
                background:`linear-gradient(135deg, ${C.dark} 0%, ${CICLO_META[activeCiclo]?.color} 100%)`,
                padding:'14px 20px',
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{CICLO_META[activeCiclo]?.emoji}</span>
                  <div>
                    <p style={{ color:'#fff', fontWeight:800, fontSize:14, margin:0 }}>
                      {CICLO_META[activeCiclo]?.label}
                    </p>
                    <p style={{ color:'rgba(255,255,255,0.6)', fontSize:11, margin:0 }}>
                      {currentCicloData.total} ítems · {currentCicloData.score.toFixed(1)} / {currentCicloData.maxScore.toFixed(1)} pts
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  {[
                    { label:'Cumple',    count:currentCicloData.cumple,   color:'#4ade80' },
                    { label:'No cumple', count:currentCicloData.noCumple, color:'#f87171' },
                    { label:'No aplica', count:currentCicloData.noAplica, color:'#d1d5db' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign:'center' }}>
                      <p style={{ fontWeight:800, fontSize:18, color:s.color, margin:0 }}>{s.count}</p>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,0.5)', margin:0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding:'8px 0' }}>
                {currentCicloData.groups.map(grp => {
                  const grpKey = `${activeCiclo}::${grp.group}`;
                  const expanded = expandedGroups[grpKey] !== false;
                  return (
                    <div key={grp.group}>
                      <button onClick={() => toggleGroup(grpKey)} style={{
                        width:'100%', display:'flex', alignItems:'center',
                        justifyContent:'space-between', padding:'10px 20px',
                        background:`${C.mint}10`, border:'none',
                        borderBottom:'1px solid #f3f4f6', cursor:'pointer', textAlign:'left',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {expanded ? <ChevronDown size={14} color={C.primary}/> : <ChevronRight size={14} color={C.primary}/>}
                          <span style={{ fontWeight:700, fontSize:12, color:C.primary }}>{grp.group}</span>
                        </div>
                        <span style={{ fontWeight:700, fontSize:12, color:C.olive }}>
                          {grp.score.toFixed(1)} / {grp.maxScore.toFixed(1)} pts
                        </span>
                      </button>

                      {expanded && grp.items.map((item, idx) => {
                        const sm = STATUS_META[item.eval_status] || STATUS_META.pendiente;
                        const Icon = sm.icon;
                        const isCustom = !['1.','2.','3.','4.','5.','6.','7.'].some(p => item.numeral.startsWith(p));
                        return (
                          <div key={item.id} style={{
                            display:'flex', alignItems:'center', gap:12,
                            padding:'11px 20px 11px 36px',
                            borderBottom: idx < grp.items.length - 1 ? '1px solid #f9fafb' : 'none',
                            background:'#fff',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>

                            <div onClick={() => setSelectedItem(item)}
                              style={{ display:'flex', alignItems:'center', gap:12, flex:1, cursor:'pointer' }}>
                              <div style={{
                                display:'flex', alignItems:'center', gap:4,
                                padding:'3px 8px', borderRadius:16, fontSize:11, fontWeight:600,
                                background:sm.bg, color:sm.color, flexShrink:0,
                              }}>
                                <Icon size={10}/> {item.numeral}
                                {isCustom && (
                                  <span style={{ fontSize:9, background:'rgba(255,255,255,0.5)',
                                    borderRadius:4, padding:'0 3px', marginLeft:2 }}>✏️</span>
                                )}
                              </div>
                              <p style={{ flex:1, fontSize:13, color:'#374151', fontWeight:500, margin:0, lineHeight:1.4 }}>
                                {item.item_name}
                              </p>
                              <span style={{ fontSize:12, fontWeight:700,
                                color:item.score > 0 ? C.primary : '#9ca3af', flexShrink:0 }}>
                                {item.score.toFixed(1)} / {item.max_score.toFixed(1)}
                              </span>
                              <ChevronRight size={14} color="#d1d5db"/>
                            </div>

                            {/* Botón eliminar — solo para admin y solo ítems personalizados */}
                            {canEdit && (
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                                title="Eliminar ítem"
                                style={{
                                  background:'none', border:'none', cursor:'pointer',
                                  color:'#fca5a5', padding:'4px', borderRadius:6,
                                  opacity: 0.4, flexShrink:0,
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity='1'}
                                onMouseLeave={e => e.currentTarget.style.opacity='0.4'}>
                                <Trash2 size={13}/>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal nuevo año ─────────────────────────────────────────── */}
      <Dialog open={showNewYear} onOpenChange={setShowNewYear}>
        <DialogContent className="max-w-sm p-0">
          <div style={{ background:C.primary, padding:'18px 22px', borderRadius:'8px 8px 0 0' }}>
            <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>Nueva evaluación</h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 }}>
              Se copian los ítems del año anterior como base
            </p>
          </div>
          <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.primary,
                textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                Año de evaluación
              </label>
              <Input type="number" value={newYear}
                onChange={e => { setNewYear(e.target.value); setNewYearErr(''); }}
                placeholder="Ej: 2026" min={2020} max={2040}/>
              {newYearErr && <p style={{ fontSize:12, color:'#dc2626', marginTop:4 }}>{newYearErr}</p>}
            </div>
            <div style={{ background:`${C.mint}15`, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.primary }}>
              💡 Los ítems nuevos tendrán estado <strong>"Pendiente"</strong> — solo se copia la estructura base.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Button variant="outline" onClick={() => setShowNewYear(false)} style={{ borderColor:C.sand }}>Cancelar</Button>
              <Button onClick={handleCreateYear} disabled={saving} style={{ background:C.primary, color:'#fff' }}>
                {saving ? <Loader2 size={13} className="mr-1.5 animate-spin"/> : <Plus size={13} className="mr-1.5"/>}
                Crear evaluación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal confirmar eliminar ─────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm p-0">
          <div style={{ background:'#dc2626', padding:'18px 22px', borderRadius:'8px 8px 0 0' }}>
            <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>⚠️ Eliminar ítem</h2>
          </div>
          <div style={{ padding:'20px 22px' }}>
            <p style={{ fontSize:14, color:'#374151', marginBottom:20, lineHeight:1.6 }}>
              ¿Estás seguro de eliminar este ítem de la evaluación?
              Esta acción <strong>no se puede deshacer</strong> y afectará el puntaje total.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} style={{ borderColor:C.sand }}>Cancelar</Button>
              <Button onClick={handleDeleteItem} disabled={saving}
                style={{ background:'#dc2626', color:'#fff' }}>
                {saving ? <Loader2 size={13} className="mr-1.5 animate-spin"/> : <Trash2 size={13} className="mr-1.5"/>}
                Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal agregar ítem ───────────────────────────────────────── */}
      <AddItemModal open={showAddItem} onClose={() => setShowAddItem(false)}
        evalId={activeEval?.id}
        onAdded={{ createCustomItem }}/>

      {/* ── Modal ítem (ver/editar) ──────────────────────────────────── */}
      <ItemModal open={!!selectedItem} onClose={() => setSelectedItem(null)}
        item={selectedItem} onSave={updateItem} canEdit={canEdit}/>
    </div>
  );
}