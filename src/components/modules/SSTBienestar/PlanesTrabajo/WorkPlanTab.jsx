// src/components/modules/SSTBienestar/Planestrabajo/WorkPlanTab.jsx
// ═══════════════════════════════════════════════════════════════════════
// Componente REUTILIZABLE — Plan de trabajo para los 3 comités SST
//
// Uso en SegBienestar.jsx (PlanesTab):
//   <WorkPlanTab planType="convivencia" />
//   <WorkPlanTab planType="copasst"     />
//   <WorkPlanTab planType="bienestar"   />
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth }    from '@/context/AuthContext';
import { useWorkPlan, MONTH_KEYS } from '@/hooks/useWorkPlan';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Plus, Download, Trash2, Pencil, ChevronDown,
  Loader2, AlertCircle, CheckCircle2, CalendarDays, DollarSign,
} from 'lucide-react';
import { exportWorkPlan } from '@/utils/exportWorkPlan';

// ─── Paleta ──────────────────────────────────────────────────────────
const C = { primary:'#2e5244', mint:'#6dbd96', olive:'#6f7b2c', sand:'#dedecc' };

const MONTHS_LABEL = ['EN','FE','MA','AB','MA','JU','JL','AG','SE','OC','NO','DI'];

// Config por tipo de plan
const PLAN_CONFIG = {
  convivencia: {
    title:    'Comité de Convivencia',
    subtitle: 'Plan de trabajo anual — Comité de Convivencia Laboral (COCOLA)',
    perm:     'sst_bienestar:convivencia',
    color:    '#1d4ed8',
    code:     'RE-GS-32',
  },
  copasst: {
    title:    'COPASST',
    subtitle: 'Plan de trabajo anual — Comité Paritario de SST',
    perm:     'sst_bienestar:copasst',
    color:    '#15803d',
    code:     'RE-GS-32',
  },
  bienestar: {
    title:    'Bienestar Social',
    subtitle: 'Plan de trabajo anual — Programa de Bienestar Social',
    perm:     'sst_bienestar:bienestar',
    color:    '#dc2626',
    code:     'RE-GS-32',
  },
  sst: {
    title:    'SST',
    subtitle: 'Plan de trabajo anual — Seguridad y Salud en el Trabajo',
    perm:     'sst_bienestar:sst',
    color:    '#7e22ce',
    code:     'RE-GS-32',
  },
  promocion_prevencion: {
    title:    'Promoción y Prevención',
    subtitle: 'Plan anual — Programa de Promoción y Prevención en Salud',
    perm:     'sst_bienestar:promocion_prevencion',
    color:    '#0891b2',
    code:     'RE-GS-32',
  },
};

const fmtCOP = (v) => v ? `$ ${Number(v).toLocaleString('es-CO')}` : '—';

// ─── Celda de mes ─────────────────────────────────────────────────────
// Click simple → toggle 'x' / vacío
// Doble click → edición libre de texto
function MonthCell({ value, onToggle, onEdit, disabled, accent }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const hasValue = value?.trim();

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(value || '');
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    onEdit(draft);
  };

  if (editing) return (
    <td style={{ padding: 2, minWidth: 36 }}>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
        style={{
          width: 52, fontSize: 11, textAlign: 'center',
          border: `1.5px solid ${accent}`, borderRadius: 4,
          padding: '2px 4px', outline: 'none',
        }}
      />
    </td>
  );

  return (
    <td
      onClick={!disabled ? onToggle : undefined}
      onDoubleClick={!disabled ? startEdit : undefined}
      title={disabled ? '' : 'Click: marcar · Doble click: texto libre'}
      style={{
        minWidth: 36, textAlign: 'center', padding: '6px 2px',
        background: hasValue ? accent : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.12s',
        borderRight: '1px solid #e5e7eb',
        userSelect: 'none',
        fontSize: 11, fontWeight: 700,
        color: hasValue ? '#fff' : 'transparent',
      }}
    >
      {hasValue ? (value.trim() === 'x' ? '✓' : value.trim()) : '·'}
    </td>
  );
}

// ─── Modal Nuevo Plan ─────────────────────────────────────────────────
function NuevoPlanModal({ open, onClose, plans, onConfirm }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear]     = useState(currentYear + 1);
  const [copy, setCopy]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');

  const handleConfirm = async () => {
    const y = parseInt(year, 10);
    if (!y || y < 2020 || y > 2050) { setErr('Año inválido'); return; }
    setLoading(true); setErr('');
    try {
      await onConfirm(y, copy && plans[0]?.id ? plans[0].id : null);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0">
        <div className="px-6 py-4 rounded-t-lg" style={{ background: C.primary }}>
          <h2 className="text-white font-bold text-lg">Nuevo plan anual</h2>
          <p className="text-white/60 text-sm mt-0.5">Crea el plan para un nuevo año</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1" style={{ color: C.primary }}>
              Año <span className="text-red-500">*</span>
            </label>
            <Input type="number" min={2020} max={2050} value={year}
              onChange={e => { setYear(e.target.value); setErr(''); }}
              className="text-center font-bold text-lg" />
          </div>
          {plans.length > 0 && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={copy}
                onChange={e => setCopy(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#2e5244]" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Copiar actividades de {plans[0].year}</p>
                <p className="text-xs text-gray-400 mt-0.5">Se copian actividades sin meses ni evidencias.</p>
              </div>
            </label>
          )}
          {err && <p className="text-red-600 text-sm flex items-center gap-1"><AlertCircle size={13}/>{err}</p>}
        </div>
        <DialogFooter className="px-6 pb-5 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading}
            className="text-white" style={{ background: C.primary }}>
            {loading ? <><Loader2 size={14} className="mr-2 animate-spin"/>Creando...</> : 'Crear plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Editar / Crear ítem ────────────────────────────────────────
const EMPTY = {
  activity:'', responsible:'', resources:'', num_persons:'',
  hours:'', unit_price:'', budget:'',
  evidence_text:'', evidence_date:'', is_executed: false,
};

function ItemModal({ open, onClose, item, planId, onSave }) {
  const [form, setForm]     = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');
  const isEdit = !!item;

  useEffect(() => {
    if (open) { setForm(item ? { ...item } : { ...EMPTY }); setErr(''); }
  }, [open, item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.activity.trim()) { setErr('La actividad es obligatoria.'); return; }
    setLoading(true); setErr('');
    try {
      const n = (v) => v !== '' && v != null ? Number(v) : null;
      await onSave({
        activity:      form.activity.trim(),
        responsible:   form.responsible?.trim()   || null,
        resources:     form.resources?.trim()     || null,
        num_persons:   n(form.num_persons),
        hours:         n(form.hours),
        unit_price:    n(form.unit_price),
        budget:        n(form.budget),
        evidence_text: form.evidence_text?.trim() || null,
        evidence_date: form.evidence_date         || null,
        is_executed:   !!form.is_executed,
      });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <div style={{ background: C.primary, padding:'20px 24px', borderRadius:'8px 8px 0 0' }}>
          <h2 style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>
            {isEdit ? 'Editar actividad' : 'Nueva actividad'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:4 }}>
            {isEdit ? 'Modifica los campos y guarda' : 'Completa los datos de la actividad'}
          </p>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          {/* Actividad */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
              Actividad <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <Textarea value={form.activity || ''} rows={3}
              onChange={e => { set('activity', e.target.value); setErr(''); }}
              className="resize-none text-sm" disabled={loading}
              placeholder="Describe la actividad a realizar" />
          </div>

          {/* Responsable */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Responsable</label>
            <Input value={form.responsible || ''} onChange={e => set('responsible', e.target.value)}
              className="text-sm" disabled={loading} placeholder="Ej: Comité convivencia" />
          </div>

          {/* Recursos */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Recursos</label>
            <Input value={form.resources || ''} onChange={e => set('resources', e.target.value)}
              className="text-sm" disabled={loading} placeholder="Ej: Humano, Administrativo, Tecnológico" />
          </div>

          {/* Fila: Personas + Horas + Presupuesto */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { key:'num_persons', label:'# Personas', placeholder:'0' },
              { key:'hours',       label:'Horas',       placeholder:'0' },
              { key:'budget',      label:'Presupuesto (COP)', placeholder:'0' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{f.label}</label>
                <Input type="number" min={0} value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  className="text-sm" disabled={loading} placeholder={f.placeholder} />
              </div>
            ))}
          </div>

          {/* Evidencia */}
          <div style={{ borderTop:`2px dashed ${C.sand}`, paddingTop:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color: C.olive, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
              Evidencia de ejecución
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Fecha de ejecución</label>
                <Input type="date" value={form.evidence_date || ''}
                  onChange={e => set('evidence_date', e.target.value)}
                  className="text-sm" disabled={loading} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:6 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!form.is_executed}
                    onChange={e => set('is_executed', e.target.checked)}
                    className="h-4 w-4 accent-[#2e5244]" disabled={loading} />
                  <span style={{ fontSize:13, fontWeight:500, color:'#374151' }}>Actividad ejecutada</span>
                </label>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Descripción / Evidencia</label>
              <Textarea value={form.evidence_text || ''} rows={3}
                onChange={e => set('evidence_text', e.target.value)}
                className="resize-none text-sm" disabled={loading}
                placeholder="Describe cómo se ejecutó la actividad, adjuntos, observaciones..." />
            </div>
          </div>

          {err && <p style={{ color:'#dc2626', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
            <AlertCircle size={14}/>{err}</p>}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.sand}`,
          display:'flex', justifyContent:'flex-end', gap:10, background:'#fafaf8',
          borderRadius:'0 0 8px 8px' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}
            className="text-white" style={{ background: C.primary }}>
            {loading
              ? <><Loader2 size={14} className="mr-2 animate-spin"/>Guardando...</>
              : <><CheckCircle2 size={14} className="mr-2"/>{isEdit ? 'Guardar cambios' : 'Crear actividad'}</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal eliminar ───────────────────────────────────────────────────
function DeleteModal({ open, onClose, item, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-700">¿Eliminar actividad?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 mt-1">
          Se eliminará permanentemente. Esta acción no se puede deshacer.
        </p>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handle} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
            {loading ? <Loader2 size={14} className="animate-spin mr-2"/> : <Trash2 size={14} className="mr-2"/>}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
export default function WorkPlanTab({ planType }) {
  const cfg = PLAN_CONFIG[planType];
  const { isAdmin, isGerencia, hasPermission } = useAuth();
  const {
    plans, items, activePlan, setActivePlan,
    loading, error, totalBudget, trazabilidad,
    createPlan, createItem, updateItem,
    toggleMonth, setMonthValue, deleteItem,
  } = useWorkPlan(planType);

  const canCreate = isAdmin || isGerencia || hasPermission(`${cfg.perm}:create`);
  const canEdit   = isAdmin || isGerencia || hasPermission(`${cfg.perm}:edit`);

  const [showNuevoPlan, setShowNuevoPlan] = useState(false);
  const [modalItem, setModalItem]         = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [exporting, setExporting]         = useState(false);
  const [exportErr, setExportErr]         = useState('');

  const handleExport = async () => {
    if (!activePlan || !items.length) return;
    setExporting(true); setExportErr('');
    try {
      // Forzar plan_type desde props para evitar estado desincronizado
      await exportWorkPlan(items, { ...activePlan, plan_type: planType }, trazabilidad);
    } catch (e) {
      setExportErr(e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !plans.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <Loader2 size={28} className="animate-spin" style={{ color: C.mint }} />
    </div>
  );

  if (error) return (
    <div style={{ padding:24, textAlign:'center', color:'#dc2626' }}>
      <AlertCircle size={28} style={{ margin:'0 auto 8px' }} />
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Barra superior ──────────────────────────────────────── */}
      <div style={{
        background:'#fff', borderRadius:14, padding:'12px 16px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
      }}>
        {/* Selector año */}
        <div style={{ position:'relative' }}>
          <select
            value={activePlan?.id || ''}
            onChange={e => setActivePlan(plans.find(p => p.id === e.target.value))}
            style={{
              appearance:'none', paddingRight:28, paddingLeft:14,
              paddingTop:8, paddingBottom:8,
              background:`${cfg.color}12`, border:`1.5px solid ${cfg.color}30`,
              borderRadius:10, fontSize:14, fontWeight:700, color: cfg.color,
              cursor:'pointer',
            }}
          >
            {plans.map(p => <option key={p.id} value={p.id}>Plan {p.year}</option>)}
            {!plans.length && <option value="">Sin planes</option>}
          </select>
          <ChevronDown size={14} style={{ position:'absolute', right:8, top:'50%',
            transform:'translateY(-50%)', color: cfg.color, pointerEvents:'none' }} />
        </div>

        {/* KPIs */}
        <Kpi icon={CheckCircle2} label="Actividades" value={items.length} color={cfg.color} />
        <Kpi icon={DollarSign}   label="Presupuesto" value={fmtCOP(totalBudget)} color={C.olive} />

        {/* Acciones */}
        <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
          {canCreate && (
            <Button variant="outline" size="sm" onClick={() => setShowNuevoPlan(true)}
              style={{ borderColor: C.sand, fontSize:12 }}>
              <CalendarDays size={13} className="mr-1.5"/> Nuevo año
            </Button>
          )}
          {canEdit && activePlan && (
            <Button size="sm" className="text-white"
              style={{ background: cfg.color, fontSize:12 }}
              onClick={() => setModalItem({})}>
              <Plus size={13} className="mr-1.5"/> Nueva actividad
            </Button>
          )}
          <Button
            variant="outline" size="sm"
            onClick={handleExport}
            disabled={exporting || !items.length}
            style={{ borderColor: C.sand, fontSize:12 }}
          >
            {exporting
              ? <Loader2 size={13} className="mr-1.5 animate-spin"/>
              : <Download size={13} className="mr-1.5"/>}
            Descargar
          </Button>
        </div>
      </div>

      {exportErr && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10,
          padding:'10px 14px', fontSize:13, color:'#dc2626',
          display:'flex', alignItems:'center', gap:8 }}>
          <AlertCircle size={14}/> {exportErr}
        </div>
      )}

      {/* ── Tabla principal ──────────────────────────────────────── */}
      {!activePlan || items.length === 0 ? (
        <EmptyState cfg={cfg} canCreate={canEdit} onCreate={() => setModalItem({})} />
      ) : (
        <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>

          {/* Header del formato — amarillo como el Excel */}
          <div style={{ padding:'10px 20px',
            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:'0.03em' }}>
              PROPUESTA PLAN DE TRABAJO — {cfg.title.toUpperCase()} {activePlan.year}
            </p>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)' }}>
              {cfg.code} · v1
            </span>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                {/* Grupos */}
                <tr style={{ background:'#fffbeb' }}>
                  <Th w={200} rowSpan={2} style={{ borderLeft:'none' }}>ACTIVIDADES</Th>
                  <Th w={110} rowSpan={2}>RESPONSABLE</Th>
                  <Th w={120} rowSpan={2}>RECURSOS</Th>
                  <Th w={55}  rowSpan={2} center># PERS.</Th>
                  <Th w={50}  rowSpan={2} center>HORAS</Th>
                  <Th w={90}  rowSpan={2} center>PRESUPUESTO</Th>
                  <Th w={432} colSpan={12} center
                    style={{ background:'#fef3c7', color:'#92400e', fontWeight:800 }}>
                    CRONOGRAMA
                  </Th>
                  <Th w={140} rowSpan={2}>EVIDENCIA</Th>
                  {canEdit && <Th w={60} rowSpan={2} center>ACC.</Th>}
                </tr>
                <tr style={{ background:'#fef9ee' }}>
                  {MONTHS_LABEL.map(m => (
                    <Th key={m} w={36} center style={{ fontSize:10, padding:'4px 2px',
                      color:'#78350f', fontWeight:700 }}>{m}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const bg = idx % 2 === 0 ? '#fff' : '#fafaf8';
                  return (
                    <tr key={item.id} style={{ background: bg }}>
                      <Td style={{ borderLeft:'none' }}>
                        <p style={{ fontWeight:600, color:'#1f2937', lineHeight:1.4,
                          fontSize:11 }}>{item.activity}</p>
                        {item.is_executed && (
                          <span style={{ fontSize:10, color:'#16a34a', fontWeight:700 }}>
                            ✓ Ejecutada
                          </span>
                        )}
                      </Td>
                      <Td>
                        <span style={{ fontSize:11, color:'#374151' }}>
                          {item.responsible || <em style={{ color:'#9ca3af' }}>—</em>}
                        </span>
                      </Td>
                      <Td>
                        <span style={{ fontSize:11, color:'#374151' }}>
                          {item.resources || <em style={{ color:'#9ca3af' }}>—</em>}
                        </span>
                      </Td>
                      <Td center><span style={{ fontSize:11 }}>{item.num_persons ?? '—'}</span></Td>
                      <Td center><span style={{ fontSize:11 }}>{item.hours ?? '—'}</span></Td>
                      <Td center>
                        <span style={{ fontWeight:700, color: item.budget ? C.olive : '#9ca3af' }}>
                          {fmtCOP(item.budget)}
                        </span>
                      </Td>

                      {/* Meses */}
                      {MONTH_KEYS.map(key => (
                        <MonthCell
                          key={key}
                          value={item[key]}
                          disabled={!canEdit}
                          accent={cfg.color}
                          onToggle={() => toggleMonth(item.id, key, item[key])}
                          onEdit={(val) => setMonthValue(item.id, key, val)}
                        />
                      ))}

                      {/* Evidencia */}
                      <Td>
                        <span style={{ fontSize:11, color:'#374151', lineHeight:1.4 }}>
                          {item.evidence_text || <em style={{ color:'#9ca3af' }}>—</em>}
                        </span>
                      </Td>

                      {canEdit && (
                        <Td center>
                          <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                            <button onClick={() => setModalItem(item)}
                              style={{ padding:'4px 6px', borderRadius:6,
                                background:`${cfg.color}18`, border:'none',
                                cursor:'pointer', color: cfg.color }}
                              title="Editar">
                              <Pencil size={12}/>
                            </button>
                            <button onClick={() => setDeleteTarget(item)}
                              style={{ padding:'4px 6px', borderRadius:6,
                                background:'#fef2f2', border:'none',
                                cursor:'pointer', color:'#dc2626' }}
                              title="Eliminar">
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </Td>
                      )}
                    </tr>
                  );
                })}

                {/* Fila total presupuesto */}
                <tr style={{ background:'#fffbeb', borderTop:`2px solid #f59e0b40` }}>
                  <td colSpan={5} style={{ padding:'10px 14px', textAlign:'right',
                    fontWeight:700, fontSize:12, color:'#92400e', borderLeft:'none' }}>
                    TOTAL PRESUPUESTO
                  </td>
                  <td style={{ padding:'10px 8px', textAlign:'center',
                    fontWeight:800, fontSize:13, color: C.olive }}>
                    {fmtCOP(totalBudget)}
                  </td>
                  <td colSpan={canEdit ? 14 : 13}/>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Trazabilidad ──────────────────────────────────────── */}
          <div style={{ borderTop:'2px solid #f3f4f6', padding:'0 0 4px' }}>
            <div style={{ padding:'10px 20px 6px',
              background:'#f0f5f3',
              borderBottom:'1px solid #e5e7eb' }}>
              <p style={{ fontSize:12, fontWeight:800, color: C.primary,
                textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Trazabilidad de la ejecución de las actividades
              </p>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f8faf9' }}>
                  <th style={{ width:300, padding:'6px 20px', textAlign:'left',
                    fontSize:11, fontWeight:700, color:'#6b7280' }}/>
                  {MONTHS_LABEL.map(m => (
                    <th key={m} style={{ width:36, textAlign:'center', fontSize:10,
                      fontWeight:700, color:'#6b7280', padding:'6px 2px' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Actividades planeadas — verde */}
                <tr>
                  <td style={{ padding:'7px 20px', fontWeight:700, fontSize:11,
                    color:'#166534', background:'#dcfce7' }}>
                    ACTIVIDADES PLANEADAS
                  </td>
                  {trazabilidad.map((t, i) => (
                    <td key={i} style={{ textAlign:'center', padding:'7px 2px',
                      fontWeight:700, fontSize:12, background:'#dcfce7',
                      color: t.planeadas > 0 ? '#166534' : '#9ca3af',
                      borderLeft:'1px solid #bbf7d0' }}>
                      {t.planeadas > 0 ? t.planeadas : ''}
                    </td>
                  ))}
                </tr>
                {/* Actividades ejecutadas — amarillo */}
                <tr>
                  <td style={{ padding:'7px 20px', fontWeight:700, fontSize:11,
                    color:'#92400e', background:'#fef9c3' }}>
                    ACTIVIDADES EJECUTADAS
                  </td>
                  {trazabilidad.map((t, i) => (
                    <td key={i} style={{ textAlign:'center', padding:'7px 2px',
                      fontWeight:700, fontSize:12, background:'#fef9c3',
                      color: t.ejecutadas > 0 ? '#92400e' : '#9ca3af',
                      borderLeft:'1px solid #fde68a' }}>
                      {t.ejecutadas > 0 ? t.ejecutadas : ''}
                    </td>
                  ))}
                </tr>
                {/* % Cumplimiento — naranja */}
                <tr>
                  <td style={{ padding:'7px 20px', fontWeight:700, fontSize:11,
                    color:'#9a3412', background:'#ffedd5' }}>
                    PORCENTAJE DE CUMPLIMIENTO
                  </td>
                  {trazabilidad.map((t, i) => (
                    <td key={i} style={{ textAlign:'center', padding:'7px 2px',
                      fontWeight:700, fontSize:11, background:'#ffedd5',
                      color: t.pct > 0 ? '#9a3412' : '#9ca3af',
                      borderLeft:'1px solid #fed7aa' }}>
                      {t.planeadas > 0 ? `${t.pct}%` : ''}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <NuevoPlanModal open={showNuevoPlan} onClose={() => setShowNuevoPlan(false)}
        plans={plans} onConfirm={createPlan} />

      <ItemModal
        open={modalItem !== null}
        onClose={() => setModalItem(null)}
        item={modalItem?.id ? modalItem : null}
        planId={activePlan?.id}
        onSave={async (payload) => {
          if (modalItem?.id) await updateItem(modalItem.id, payload);
          else await createItem(activePlan.id, payload);
        }}
      />

      <DeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        item={deleteTarget} onConfirm={() => deleteItem(deleteTarget.id)} />
    </div>
  );
}

// ─── Helpers de tabla ─────────────────────────────────────────────────
function Th({ children, w, colSpan, rowSpan, center, style = {} }) {
  return (
    <th style={{ width:w, minWidth:w, padding:'7px 8px',
      fontSize:11, fontWeight:700, color:'#374151',
      textAlign: center ? 'center' : 'left',
      borderBottom:'2px solid #e5e7eb', borderRight:'1px solid #e5e7eb',
      whiteSpace:'nowrap', ...style,
    }} colSpan={colSpan} rowSpan={rowSpan}>{children}</th>
  );
}

function Td({ children, center, style = {} }) {
  return (
    <td style={{ padding:'8px 10px', verticalAlign:'top',
      textAlign: center ? 'center' : 'left',
      borderBottom:'1px solid #f3f4f6', borderRight:'1px solid #f3f4f6',
      fontSize:12, ...style,
    }}>{children}</td>
  );
}

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7,
      background:`${color}0f`, borderRadius:10, padding:'6px 12px' }}>
      <Icon size={13} style={{ color, flexShrink:0 }} />
      <span style={{ fontSize:11, color:'#6b7280' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color }}>{value}</span>
    </div>
  );
}

function EmptyState({ cfg, canCreate, onCreate }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:48,
      textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <p style={{ color:'#374151', fontWeight:600, fontSize:15, marginBottom:6 }}>
        No hay plan de {cfg.title} aún
      </p>
      <p style={{ color:'#9ca3af', fontSize:13, marginBottom:20 }}>
        {canCreate ? 'Crea el primer plan anual para empezar.' : 'Contacta a un administrador.'}
      </p>
      {canCreate && (
        <Button onClick={onCreate} className="text-white" style={{ background: cfg.color }}>
          <Plus size={14} className="mr-2"/> Crear primer plan
        </Button>
      )}
    </div>
  );
}