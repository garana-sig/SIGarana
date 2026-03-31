// src/components/modules/SSTBienestar/Estandares/EstandaresTab.jsx
import { useState, useEffect } from 'react';
import { useEstandares } from '@/hooks/useEstandares';
import { useAuth } from '@/context/AuthContext';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog, DialogContent,
} from '@/app/components/ui/dialog';
import {
  ChevronDown, ChevronRight, Plus, Loader2,
  CheckCircle2, XCircle, MinusCircle, Clock,
  AlertCircle, Shield, CalendarDays,
} from 'lucide-react';

// ── Paleta ────────────────────────────────────────────────────────────
const C = {
  primary: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c',
  sand: '#dedecc', dark: '#1a2e25',
};

const CICLO_META = {
  PLANEAR:    { label: 'Planear',    weight: 25, color: '#2e5244', emoji: '📋' },
  HACER:      { label: 'Hacer',      weight: 60, color: '#6dbd96', emoji: '⚙️'  },
  VERIFICAR:  { label: 'Verificar',  weight: 5,  color: '#6f7b2c', emoji: '🔍' },
  ACTUAR:     { label: 'Actuar',     weight: 10, color: '#d97706', emoji: '🚀' },
};

const STATUS_META = {
  cumple:                { label: 'Cumple',           color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  no_cumple:             { label: 'No cumple',         color: '#dc2626', bg: '#fee2e2', icon: XCircle     },
  no_aplica_justifica:   { label: 'No aplica (just.)', color: '#6f7b2c', bg: '#f0f4e0', icon: MinusCircle },
  no_aplica_no_justifica:{ label: 'No aplica (s/just)',color: '#9ca3af', bg: '#f3f4f6', icon: MinusCircle },
  pendiente:             { label: 'Pendiente',         color: '#d97706', bg: '#fef3c7', icon: Clock       },
};

// ── Gauge (velocímetro) ───────────────────────────────────────────────
function ScoreGauge({ score }) {
  const pct   = Math.min(score, 100);
  const angle = -135 + (pct / 100) * 270;
  const classification = score >= 86
    ? { label: 'ACEPTABLE',                color: '#16a34a', bg: '#dcfce7' }
    : score >= 61
    ? { label: 'MODERADAMENTE ACEPTABLE',  color: '#d97706', bg: '#fef3c7' }
    : { label: 'CRÍTICO',                  color: '#dc2626', bg: '#fee2e2' };

  return (
    <div style={{ textAlign:'center' }}>
      <svg viewBox="0 0 200 130" style={{ width:200, height:130 }}>
        {/* Arco fondo */}
        <path d="M 20 110 A 80 80 0 1 1 180 110" fill="none"
          stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
        {/* Arco coloreado según puntaje */}
        <path d="M 20 110 A 80 80 0 1 1 180 110" fill="none"
          stroke={classification.color}
          strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(pct/100)*251.2} 251.2`}
          style={{ transformOrigin:'100px 110px', transform:'rotate(0deg)' }}/>
        {/* Aguja */}
        <line x1="100" y1="110" x2="100" y2="42"
          stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"
          style={{
            transformOrigin:'100px 110px',
            transform:`rotate(${angle}deg)`,
          }}/>
        <circle cx="100" cy="110" r="6" fill={C.dark}/>
        {/* Puntaje */}
        <text x="100" y="96" textAnchor="middle"
          fontSize="26" fontWeight="800" fill={C.dark}>{score.toFixed(1)}</text>
        <text x="100" y="108" textAnchor="middle"
          fontSize="10" fill="#6b7280">puntos / 100</text>
      </svg>
      <div style={{
        display:'inline-block', marginTop:4,
        padding:'4px 16px', borderRadius:20, fontWeight:700, fontSize:13,
        background: classification.bg, color: classification.color,
      }}>
        {classification.label}
      </div>
    </div>
  );
}

// ── Tarjeta de ciclo ──────────────────────────────────────────────────
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
            <p style={{ fontWeight:700, fontSize:13, color: meta.color, margin:0 }}>{meta.label}</p>
            <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>{meta.weight}% del total</p>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontWeight:800, fontSize:18, color: meta.color, margin:0 }}>{data.score.toFixed(1)}</p>
          <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>de {data.maxScore.toFixed(1)}</p>
        </div>
      </div>
      {/* Barra de progreso */}
      <div style={{ background:'#f3f4f6', borderRadius:6, height:6, overflow:'hidden' }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: meta.color, borderRadius:6,
          transition:'width 0.4s ease',
        }}/>
      </div>
      {/* Mini stats */}
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        {[
          { label:'✅', count: data.cumple,   color:'#16a34a' },
          { label:'❌', count: data.noCumple,  color:'#dc2626' },
          { label:'⚪', count: data.noAplica,  color:'#9ca3af' },
          { label:'⏳', count: data.pendiente, color:'#d97706' },
        ].map(s => s.count > 0 && (
          <span key={s.label} style={{ fontSize:11, color: s.color, fontWeight:600 }}>
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Chip de estado ────────────────────────────────────────────────────
function StatusChip({ status, onChange, disabled }) {
  const meta = STATUS_META[status] || STATUS_META.pendiente;
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);

  if (disabled) return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
      background: meta.bg, color: meta.color,
    }}>
      <Icon size={11}/> {meta.label}
    </span>
  );

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display:'inline-flex', alignItems:'center', gap:4,
        padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600,
        background: meta.bg, color: meta.color,
        border:`1.5px solid ${meta.color}40`,
        cursor:'pointer',
      }}>
        <Icon size={11}/> {meta.label} <ChevronDown size={9}/>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, zIndex:50, marginTop:4,
          background:'#fff', borderRadius:10, padding:6,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          border:'1px solid #e5e7eb', minWidth:190,
        }}>
          {Object.entries(STATUS_META).map(([key, m]) => {
            const I = m.icon;
            return (
              <button key={key} onClick={() => { onChange(key); setOpen(false); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8,
                  padding:'7px 10px', borderRadius:8, border:'none',
                  background: key === status ? `${m.bg}` : 'transparent',
                  cursor:'pointer', fontSize:12, color: m.color, fontWeight:600,
                  textAlign:'left',
                }}>
                <I size={13}/> {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Modal de detalle / edición de ítem ────────────────────────────────
function ItemModal({ open, onClose, item, onSave, canEdit }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) setForm({ ...item });
  }, [open, item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.id, {
      eval_status:  form.eval_status,
      score:        form.eval_status === 'cumple'                 ? item.max_score
                  : form.eval_status === 'no_aplica_justifica'   ? item.max_score
                  : form.eval_status === 'no_aplica_no_justifica' ? 0
                  : form.eval_status === 'no_cumple'              ? 0
                  : 0,
      evidence:     form.evidence    || null,
      action_plan:  form.action_plan || null,
      responsible:  form.responsible || null,
      due_date:     form.due_date    || null,
      resources:    form.resources   || null,
      foundations:  form.foundations || null,
    });
    setSaving(false);
    onClose();
  };

  if (!item) return null;
  const meta = STATUS_META[form.eval_status] || STATUS_META.pendiente;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div style={{ background: C.primary, padding:'20px 24px', borderRadius:'8px 8px 0 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              background:'rgba(255,255,255,0.15)', borderRadius:8,
              padding:'6px 10px', fontSize:14, fontWeight:800, color:C.mint,
            }}>
              {item.numeral}
            </div>
            <div>
              <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>
                {item.item_name}
              </h2>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 }}>
                {item.standard_group}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Criterio */}
          {item.criterio && (
            <div style={{
              background:`${C.mint}12`, borderLeft:`3px solid ${C.mint}`,
              borderRadius:8, padding:'12px 14px',
            }}>
              <p style={{ fontSize:11, fontWeight:700, color: C.primary,
                textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
                Criterio
              </p>
              <p style={{ fontSize:12, color:'#374151', lineHeight:1.6, margin:0 }}>
                {item.criterio}
              </p>
            </div>
          )}

          {/* Estado — lo más importante */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color: C.primary,
              textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:8 }}>
              Estado de cumplimiento
            </label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(STATUS_META).map(([key, m]) => {
                const I = m.icon;
                const selected = form.eval_status === key;
                return (
                  <button key={key}
                    onClick={() => canEdit && set('eval_status', key)}
                    disabled={!canEdit}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      padding:'8px 14px', borderRadius:10,
                      border:`2px solid ${selected ? m.color : '#e5e7eb'}`,
                      background: selected ? m.bg : '#fff',
                      color: selected ? m.color : '#6b7280',
                      fontWeight: selected ? 700 : 500,
                      fontSize:12, cursor: canEdit ? 'pointer' : 'default',
                      transition:'all 0.15s',
                    }}>
                    <I size={13}/> {m.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
              Puntaje máximo: <strong>{item.max_score}</strong> pts ·
              Obtenido: <strong>{
                form.eval_status === 'cumple' || form.eval_status === 'no_aplica_justifica'
                  ? item.max_score : 0
              }</strong> pts
            </p>
          </div>

          {/* Evidencias y plan de acción */}
          {[
            { key:'evidence',   label:'Evidencias / Observaciones', placeholder:'Describe las evidencias encontradas...' },
            { key:'action_plan',label:'Plan de Acción',             placeholder:'Acciones a implementar...' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, fontWeight:600, color: C.primary,
                textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                {f.label}
              </label>
              <Textarea value={form[f.key] || ''} rows={3}
                onChange={e => set(f.key, e.target.value)}
                disabled={!canEdit}
                placeholder={f.placeholder}
                className="text-sm resize-none"/>
            </div>
          ))}

          {/* Responsable, Fecha, Recursos */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { key:'responsible', label:'Responsable',     type:'text',  placeholder:'Nombre del responsable' },
              { key:'due_date',    label:'Fecha de plazo',  type:'date',  placeholder:'' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color: C.primary,
                  textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                  {f.label}
                </label>
                <Input type={f.type} value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  disabled={!canEdit} placeholder={f.placeholder}
                  className="text-sm"/>
              </div>
            ))}
          </div>

          {[
            { key:'resources',   label:'Recursos', placeholder:'Recursos requeridos...' },
            { key:'foundations', label:'Fundamentos y soportes de efectividad', placeholder:'Ubicación de los soportes...' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, fontWeight:600, color: C.primary,
                textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                {f.label}
              </label>
              <Input value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                disabled={!canEdit} placeholder={f.placeholder} className="text-sm"/>
            </div>
          ))}

          {/* Modo de verificación (solo lectura) */}
          {item.modo_verificacion && (
            <details style={{ fontSize:12, color:'#6b7280' }}>
              <summary style={{ cursor:'pointer', fontWeight:600, color: C.olive }}>
                📋 Modo de verificación
              </summary>
              <p style={{ marginTop:8, lineHeight:1.6, paddingLeft:12,
                borderLeft:`2px solid ${C.sand}` }}>
                {item.modo_verificacion}
              </p>
            </details>
          )}

          {/* Botones */}
          {canEdit && (
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:8,
              borderTop:'1px solid #f3f4f6' }}>
              <Button variant="outline" onClick={onClose} disabled={saving}
                style={{ borderColor: C.sand }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}
                style={{ background: C.primary, color:'#fff' }}>
                {saving ? <><Loader2 size={13} className="mr-1.5 animate-spin"/>Guardando...</>
                        : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────
export default function EstandaresTab() {
  const { hasPermission, profile } = useAuth();
  const canView   = profile?.role === 'admin' || profile?.role === 'gerencia'
    || hasPermission('sst_bienestar:estandares:view');
  const canCreate = profile?.role === 'admin' || profile?.role === 'gerencia'
    || hasPermission('sst_bienestar:estandares:create');
  const canEdit   = profile?.role === 'admin' || profile?.role === 'gerencia'
    || hasPermission('sst_bienestar:estandares:edit');

  const {
    evaluations, activeEval, setActiveEval,
    items, loading, saving, error,
    updateItem, createEvaluation,
    groupedByCiclo, totalScore,
  } = useEstandares();

  const [activeCiclo,    setActiveCiclo]    = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedItem,   setSelectedItem]   = useState(null);
  const [showNewYear,    setShowNewYear]     = useState(false);
  const [newYear,        setNewYear]         = useState('');
  const [newYearErr,     setNewYearErr]      = useState('');

  const ciclos = groupedByCiclo();

  // Seleccionar primer ciclo al cargar
  useEffect(() => {
    if (ciclos.length && !activeCiclo) setActiveCiclo(ciclos[0].ciclo);
  }, [items]);

  const toggleGroup = (key) =>
    setExpandedGroups(p => ({ ...p, [key]: !p[key] }));

  const handleCreateYear = async () => {
    const y = parseInt(newYear);
    if (!y || y < 2020 || y > 2035) { setNewYearErr('Ingresa un año válido (2020-2035)'); return; }
    const result = await createEvaluation(y);
    if (!result.ok) { setNewYearErr(result.error); return; }
    setShowNewYear(false); setNewYear(''); setNewYearErr('');
  };

  const handleUpdateItem = async (itemId, changes) => {
    await updateItem(itemId, changes);
  };

  if (loading && !items.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <Loader2 size={28} className="animate-spin" style={{ color: C.mint }}/>
    </div>
  );

  if (error) return (
    <div style={{ padding:24, textAlign:'center', color:'#dc2626' }}>
      <AlertCircle size={28} style={{ margin:'0 auto 8px' }}/><p>{error}</p>
    </div>
  );

  const currentCicloData = ciclos.find(c => c.ciclo === activeCiclo);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Barra superior ─────────────────────────────────────────── */}
      <div style={{ background:'#fff', borderRadius:14, padding:'12px 16px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>

        {/* Selector de año */}
        <div style={{ position:'relative' }}>
          <select value={activeEval?.id || ''}
            onChange={e => setActiveEval(evaluations.find(ev => ev.id === e.target.value))}
            style={{ appearance:'none', paddingRight:28, paddingLeft:14,
              paddingTop:8, paddingBottom:8,
              background:`${C.primary}12`, border:`1.5px solid ${C.primary}30`,
              borderRadius:10, fontSize:14, fontWeight:700, color: C.primary, cursor:'pointer' }}>
            {evaluations.map(ev => (
              <option key={ev.id} value={ev.id}>Evaluación {ev.year}</option>
            ))}
            {!evaluations.length && <option>Sin evaluaciones</option>}
          </select>
          <ChevronDown size={14} style={{ position:'absolute', right:8, top:'50%',
            transform:'translateY(-50%)', color: C.primary, pointerEvents:'none' }}/>
        </div>

        {/* Puntaje total badge */}
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
          {canCreate && (
            <Button variant="outline" size="sm"
              onClick={() => { setShowNewYear(true); setNewYear(String(new Date().getFullYear() + 1)); }}
              style={{ borderColor: C.sand, fontSize:12 }}>
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
            <Button className="mt-4 text-white" style={{ background: C.primary }}
              onClick={() => setShowNewYear(true)}>
              <Plus size={14} className="mr-1.5"/> Crear primera evaluación
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── Dashboard ─────────────────────────────────────────── */}
          <div style={{
            display:'grid', gridTemplateColumns:'220px 1fr',
            gap:16, alignItems:'start',
          }}>
            {/* Gauge */}
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 16px',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', textAlign:'center' }}>
              <p style={{ fontWeight:700, fontSize:13, color: C.primary,
                marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Puntaje Total {activeEval.year}
              </p>
              <ScoreGauge score={totalScore}/>
            </div>

            {/* Tarjetas ciclos */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {ciclos.map(cicloData => (
                <CicloCard key={cicloData.ciclo}
                  data={cicloData}
                  active={activeCiclo === cicloData.ciclo}
                  onClick={() => setActiveCiclo(cicloData.ciclo)}/>
              ))}
            </div>
          </div>

          {/* ── Detalle del ciclo activo ───────────────────────────── */}
          {currentCicloData && (
            <div style={{ background:'#fff', borderRadius:14,
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' }}>

              {/* Header ciclo */}
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
                      {currentCicloData.total} ítems ·
                      {currentCicloData.score.toFixed(1)} / {currentCicloData.maxScore.toFixed(1)} pts
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  {[
                    { label:'Cumple',    count:currentCicloData.cumple,    color:'#4ade80' },
                    { label:'No cumple', count:currentCicloData.noCumple,  color:'#f87171' },
                    { label:'No aplica', count:currentCicloData.noAplica,  color:'#d1d5db' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign:'center' }}>
                      <p style={{ fontWeight:800, fontSize:18, color: s.color, margin:0 }}>{s.count}</p>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,0.5)', margin:0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acordeón por grupo / estándar */}
              <div style={{ padding:'8px 0' }}>
                {currentCicloData.groups.map(grp => {
                  const grpKey = `${activeCiclo}::${grp.group}`;
                  const expanded = expandedGroups[grpKey] !== false; // expandido por defecto
                  return (
                    <div key={grp.group}>
                      {/* Sub-header del grupo */}
                      <button onClick={() => toggleGroup(grpKey)} style={{
                        width:'100%', display:'flex', alignItems:'center',
                        justifyContent:'space-between',
                        padding:'10px 20px', background:`${C.mint}10`,
                        border:'none', borderBottom:'1px solid #f3f4f6',
                        cursor:'pointer', textAlign:'left',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {expanded ? <ChevronDown size={14} color={C.primary}/> :
                                       <ChevronRight size={14} color={C.primary}/>}
                          <span style={{ fontWeight:700, fontSize:12, color: C.primary }}>
                            {grp.group}
                          </span>
                        </div>
                        <span style={{ fontWeight:700, fontSize:12, color: C.olive }}>
                          {grp.score.toFixed(1)} / {grp.maxScore.toFixed(1)} pts
                        </span>
                      </button>

                      {/* Ítems del grupo */}
                      {expanded && grp.items.map((item, idx) => {
                        const sm = STATUS_META[item.eval_status] || STATUS_META.pendiente;
                        const Icon = sm.icon;
                        return (
                          <div key={item.id} onClick={() => setSelectedItem(item)}
                            style={{
                              display:'flex', alignItems:'center', gap:12,
                              padding:'12px 20px 12px 36px',
                              borderBottom: idx < grp.items.length - 1 ? '1px solid #f9fafb' : 'none',
                              cursor:'pointer', transition:'background 0.1s',
                              background:'#fff',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>

                            {/* Chip de estado */}
                            <div style={{
                              display:'flex', alignItems:'center', gap:4,
                              padding:'3px 8px', borderRadius:16, fontSize:11, fontWeight:600,
                              background: sm.bg, color: sm.color, flexShrink:0,
                            }}>
                              <Icon size={10}/> {item.numeral}
                            </div>

                            {/* Nombre */}
                            <p style={{ flex:1, fontSize:13, color:'#374151',
                              fontWeight:500, margin:0, lineHeight:1.4 }}>
                              {item.item_name}
                            </p>

                            {/* Puntaje */}
                            <span style={{ fontSize:12, fontWeight:700,
                              color: item.score > 0 ? C.primary : '#9ca3af', flexShrink:0 }}>
                              {item.score.toFixed(1)} / {item.max_score.toFixed(1)}
                            </span>

                            <ChevronRight size={14} color="#d1d5db"/>
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

      {/* ── Modal nuevo año ────────────────────────────────────────── */}
      <Dialog open={showNewYear} onOpenChange={setShowNewYear}>
        <DialogContent className="max-w-sm p-0">
          <div style={{ background: C.primary, padding:'18px 22px', borderRadius:'8px 8px 0 0' }}>
            <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>
              Nueva evaluación
            </h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 }}>
              Se copian los 60 ítems del año anterior como base
            </p>
          </div>
          <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color: C.primary,
                textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                Año de evaluación
              </label>
              <Input type="number" value={newYear}
                onChange={e => { setNewYear(e.target.value); setNewYearErr(''); }}
                placeholder="Ej: 2026" min={2020} max={2035}/>
              {newYearErr && (
                <p style={{ fontSize:12, color:'#dc2626', marginTop:4 }}>{newYearErr}</p>
              )}
            </div>
            <div style={{ background:`${C.mint}15`, borderRadius:8, padding:'10px 12px',
              fontSize:12, color: C.primary }}>
              💡 Los ítems del nuevo año tendrán estado <strong>"Pendiente"</strong> y sin
              evidencias — solo se copia la estructura base (criterio, marco legal, numerales).
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Button variant="outline" onClick={() => setShowNewYear(false)}
                style={{ borderColor: C.sand }}>Cancelar</Button>
              <Button onClick={handleCreateYear} disabled={saving}
                style={{ background: C.primary, color:'#fff' }}>
                {saving ? <Loader2 size={13} className="mr-1.5 animate-spin"/> : <Plus size={13} className="mr-1.5"/>}
                Crear evaluación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal ítem ────────────────────────────────────────────── */}
      <ItemModal
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onSave={handleUpdateItem}
        canEdit={canEdit}
      />
    </div>
  );
}