// src/components/modules/SSTBienestar/Capacitaciones/CapacitacionesTab.jsx
// ═══════════════════════════════════════════════════════════════════════
// Plan de Capacitaciones SST — tabla fiel al formato de calidad RE-GH-03
// Features: toggle de meses inline · edición por drawer · nuevo plan anual
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCapacitaciones } from '@/hooks/useCapacitaciones';
import { parseMonthVal, buildMonthVal } from '@/hooks/useWorkPlan';
import { exportCapacitaciones } from '@/utils/exportCapacitaciones';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  BookOpen, Plus, Download, Trash2, Pencil,
  ChevronDown, Loader2, AlertCircle, CheckCircle2,
  CalendarDays, DollarSign, Users, Clock,
  XCircle, Calendar,
} from 'lucide-react';

// ─── Paleta ──────────────────────────────────────────────────────────
const C = { primary:'#2e5244', mint:'#6dbd96', olive:'#6f7b2c', sand:'#dedecc' };

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const MONTH_KEYS = [
  'month_jan','month_feb','month_mar','month_apr','month_may','month_jun',
  'month_jul','month_aug','month_sep','month_oct','month_nov','month_dec',
];

const fmtCOP = (v) =>
  v ? `$\u00a0${Number(v).toLocaleString('es-CO')}` : '—';

// ─── Estado visual por tipo ───────────────────────────────────────────
const MONTH_STATUS_META = {
  empty:        { bg: 'transparent', color: 'transparent', symbol: '·' },
  programada:   { bg: C.primary,     color: C.mint,        symbol: '●' },
  ejecutada:    { bg: '#16a34a',     color: '#fff',        symbol: '✓' },
  no_ejecutada: { bg: '#d97706',     color: '#fff',        symbol: '✗' },
};

// ─── Modal de estado de mes (Capacitaciones) ──────────────────────────
function MonthStatusModal({ open, onClose, value, monthLabel, onSave }) {
  const parsed = parseMonthVal(value);
  const [status, setStatus] = useState(parsed.s === 'empty' ? 'programada' : parsed.s);
  const [text,   setText]   = useState(parsed.text);
  const [date,   setDate]   = useState(parsed.date || new Date().toISOString().slice(0,10));

  const handleOpen = () => {
    const p = parseMonthVal(value);
    setStatus(p.s === 'empty' ? 'programada' : p.s);
    setText(p.text); setDate(p.date || new Date().toISOString().slice(0,10));
  };

  const handleSave = (s) => {
    onSave(buildMonthVal(s || status, text, date));
    onClose();
  };

  const OPTIONS = [
    { s: 'programada',   label: 'Programada',  icon: Clock,       bg: C.primary, desc: 'Capacitación planificada para este mes' },
    { s: 'ejecutada',    label: 'Ejecutada',    icon: CheckCircle2, bg: '#16a34a', desc: 'Capacitación realizada — indica la fecha' },
    { s: 'no_ejecutada', label: 'Sin ejecutar', icon: XCircle,     bg: '#d97706', desc: 'Capacitación no realizada este mes' },
  ];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-sm p-0" onOpenAutoFocus={handleOpen}>
        <div style={{ background: C.primary, padding: '16px 20px', borderRadius: '8px 8px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color={C.mint} />
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>
              Estado del mes — {monthLabel}
            </h3>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.primary,
              textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
              Descripción (opcional)
            </label>
            <input value={text} onChange={e => setText(e.target.value)}
              placeholder="Ej: Tema de la capacitación..."
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8,
                border: '1px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
          </div>
          {status === 'ejecutada' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#16a34a',
                textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
                Fecha de ejecución
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1.5px solid #16a34a', fontSize: 13, outline: 'none' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
            {OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isSelected = status === opt.s;
              return (
                <button key={opt.s}
                  onClick={() => { setStatus(opt.s); if (opt.s !== 'ejecutada') handleSave(opt.s); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isSelected ? opt.bg : '#f9fafb',
                    color: isSelected ? '#fff' : '#374151',
                    fontWeight: isSelected ? 700 : 500, fontSize: 13,
                    boxShadow: isSelected ? `0 2px 8px ${opt.bg}50` : 'none',
                    transition: 'all 0.12s', textAlign: 'left',
                  }}>
                  <Icon size={16} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{opt.label}</p>
                    <p style={{ margin: 0, fontSize: 11, opacity: 0.75 }}>{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {status === 'ejecutada' && (
            <button onClick={() => handleSave()}
              style={{ background: '#16a34a', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, marginTop: 4 }}>
              ✓ Guardar como ejecutada
            </button>
          )}
          {value && (
            <button onClick={() => { onSave(null); onClose(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 2 }}>
              × Quitar de este mes
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Celda de mes ─────────────────────────────────────────────────────
function MonthCell({ value, onSave, disabled, monthLabel }) {
  const [open, setOpen] = useState(false);
  const parsed = parseMonthVal(value);
  const meta   = MONTH_STATUS_META[parsed.s];

  return (
    <>
      <td
        onClick={!disabled ? () => setOpen(true) : undefined}
        title={disabled ? '' : parsed.s === 'empty' ? 'Clic para programar'
          : parsed.s === 'ejecutada' ? `Ejecutada: ${parsed.date}`
          : parsed.s === 'no_ejecutada' ? 'Sin ejecutar — clic para cambiar'
          : 'Programada — clic para cambiar'}
        style={{
          width: 36, minWidth: 36, textAlign: 'center', padding: '6px 2px',
          background: meta.bg,
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background 0.15s',
          borderRight: '1px solid #e5e7eb',
          userSelect: 'none', fontSize: 13, fontWeight: 700,
          color: meta.color,
        }}
      >
        {meta.symbol}
      </td>
      {open && (
        <MonthStatusModal
          open={open} onClose={() => setOpen(false)}
          value={value} monthLabel={monthLabel}
          onSave={val => onSave(val)} />
      )}
    </>
  );
}

// ─── Modal: Nuevo plan ────────────────────────────────────────────────
function NuevoPlanModal({ open, onClose, plans, onConfirm }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear]     = useState(currentYear + 1);
  const [copy, setCopy]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');

  const handleConfirm = async () => {
    const y = parseInt(year, 10);
    if (!y || y < 2020 || y > 2050) { setErr('Año inválido'); return; }
    if (plans.find(p => p.year === y)) { setErr(`Ya existe un plan para ${y}`); return; }
    setLoading(true); setErr('');
    try {
      const copyId = copy && plans[0]?.id ? plans[0].id : null;
      await onConfirm(y, copyId);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0">
        <div className="px-6 py-4 rounded-t-lg" style={{ background: C.primary }}>
          <h2 className="text-white font-bold text-lg">Nuevo Plan de Capacitaciones</h2>
          <p className="text-white/60 text-sm mt-0.5">Crea el cronograma para un nuevo año</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Año */}
          <div>
            <label className="text-sm font-semibold block mb-1" style={{ color: C.primary }}>
              Año <span className="text-red-500">*</span>
            </label>
            <Input
              type="number" min={2020} max={2050}
              value={year}
              onChange={e => { setYear(e.target.value); setErr(''); }}
              className="text-center font-bold text-lg"
            />
          </div>

          {/* Copiar del año anterior */}
          {plans.length > 0 && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox" checked={copy}
                onChange={e => setCopy(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#2e5244]"
              />
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Copiar capacitaciones de {plans[0].year}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Se copian los títulos y datos básicos. Los meses y ejecución quedan vacíos.
                </p>
              </div>
            </label>
          )}

          {err && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={14} /> {err}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-5 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handleConfirm} disabled={loading}
            className="text-white" style={{ background: C.primary }}
          >
            {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Creando...</> : 'Crear plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Drawer: Editar / crear ítem ──────────────────────────────────────
const EMPTY_ITEM = {
  title:'', objective:'', instructor:'', participants:'',
  duration:'', resources:'', budget:'',
  execution_date:'', execution_description:'', evaluation_done: false,
};

function ItemDrawer({ open, onClose, item, planId, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_ITEM });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!item;

  // ✅ Fix: reinicializar el form cada vez que abre con un item diferente
  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : { ...EMPTY_ITEM });
      setErr('');
    }
  }, [open, item]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('El nombre de la capacitación es obligatorio.'); return; }
    setLoading(true); setErr('');
    try {
      const payload = {
        title: form.title.trim(),
        objective: form.objective?.trim() || null,
        instructor: form.instructor?.trim() || null,
        participants: form.participants?.trim() || null,
        duration: form.duration?.trim() || null,
        resources: form.resources?.trim() || null,
        budget: form.budget ? parseFloat(String(form.budget).replace(/[^0-9.]/g,'')) : null,
        execution_date: form.execution_date || null,
        execution_description: form.execution_description?.trim() || null,
        evaluation_done: !!form.evaluation_done,
      };
      await onSave(payload);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">

        {/* Header */}
        <div style={{ background: C.primary, padding:'20px 24px', borderRadius:'8px 8px 0 0' }}>
          <h2 style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>
            {isEdit ? 'Editar capacitación' : 'Nueva capacitación'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:4 }}>
            {isEdit ? 'Modifica los campos y guarda los cambios' : 'Completa los datos del ítem'}
          </p>
        </div>

        {/* Body — dos columnas para campos cortos */}
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Capacitación (ancho completo) */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
              Capacitación <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <Textarea
              value={form.title || ''}
              onChange={e => { set('title', e.target.value); setErr(''); }}
              rows={2} className="resize-none text-sm" disabled={loading}
              placeholder="Nombre o tema de la capacitación"
            />
          </div>

          {/* Objetivo (ancho completo) */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
              Objetivo
            </label>
            <Textarea
              value={form.objective || ''}
              onChange={e => { set('objective', e.target.value); setErr(''); }}
              rows={3} className="resize-none text-sm" disabled={loading}
              placeholder="¿Qué se espera lograr con esta capacitación?"
            />
          </div>

          {/* Fila: Instructor + Participantes */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
                Instructor
              </label>
              <Input
                value={form.instructor || ''}
                onChange={e => set('instructor', e.target.value)}
                className="text-sm" disabled={loading}
                placeholder="Ej: Lider de SST"
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
                Participantes
              </label>
              <Input
                value={form.participants || ''}
                onChange={e => set('participants', e.target.value)}
                className="text-sm" disabled={loading}
                placeholder="Ej: Todos los colaboradores"
              />
            </div>
          </div>

          {/* Fila: Duración + Presupuesto */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
                Duración
              </label>
              <Input
                value={form.duration || ''}
                onChange={e => set('duration', e.target.value)}
                className="text-sm" disabled={loading}
                placeholder="Ej: 1:30 hora"
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
                Presupuesto (COP)
              </label>
              <Input
                type="number" min={0} step={500}
                value={form.budget || ''}
                onChange={e => set('budget', e.target.value)}
                className="text-sm" disabled={loading}
                placeholder="0"
              />
            </div>
          </div>

          {/* Recursos */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
              Recursos
            </label>
            <Input
              value={form.resources || ''}
              onChange={e => set('resources', e.target.value)}
              className="text-sm" disabled={loading}
              placeholder="Ej: Audiovisuales, papelería y humano"
            />
          </div>

          {/* ── Control de ejecución ── */}
          <div style={{ borderTop:`2px dashed ${C.sand}`, paddingTop:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color: C.olive, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
              Control de ejecución
            </p>

            {/* Fila: Fecha + Evaluación */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
                  Fecha de ejecución
                </label>
                <Input
                  type="date"
                  value={form.execution_date || ''}
                  onChange={e => set('execution_date', e.target.value)}
                  className="text-sm" disabled={loading}
                />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:6 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <input
                    type="checkbox" checked={!!form.evaluation_done}
                    onChange={e => set('evaluation_done', e.target.checked)}
                    className="h-4 w-4 accent-[#2e5244]"
                    disabled={loading}
                  />
                  <span style={{ fontSize:13, fontWeight:500, color:'#374151' }}>
                    Evaluación realizada (SI)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>
                Descripción / Observaciones
              </label>
              <Textarea
                value={form.execution_description || ''}
                onChange={e => set('execution_description', e.target.value)}
                rows={3} className="resize-none text-sm"
                placeholder="¿Cómo se ejecutó? ¿Hubo cambios?"
                disabled={loading}
              />
            </div>
          </div>

          {err && (
            <div style={{ display:'flex', alignItems:'center', gap:8, color:'#dc2626', fontSize:13 }}>
              <AlertCircle size={14} /> {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:'14px 24px', borderTop:`1px solid ${C.sand}`,
          display:'flex', justifyContent:'flex-end', gap:10, background:'#fafaf8',
          borderRadius:'0 0 8px 8px',
        }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handleSave} disabled={loading}
            className="text-white" style={{ background: C.primary }}
          >
            {loading
              ? <><Loader2 size={14} className="mr-2 animate-spin"/>Guardando...</>
              : <><CheckCircle2 size={14} className="mr-2"/>{isEdit ? 'Guardar cambios' : 'Crear ítem'}</>
            }
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Confirmar eliminación ─────────────────────────────────────
function DeleteModal({ open, onClose, item, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-700">¿Eliminar capacitación?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 mt-1">
          Se eliminará permanentemente <strong>"{item?.title}"</strong>.
          Esta acción no se puede deshacer.
        </p>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handle} disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
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
export default function CapacitacionesTab() {
  const { isAdmin, isGerencia, hasPermission } = useAuth();
  const {
    plans, items, activePlan, setActivePlan,
    loading, error, totalBudget, completedItems,
    createPlan, createItem, updateItem, toggleMonth, deleteItem,
  } = useCapacitaciones();

  const canCreate = isAdmin || isGerencia || hasPermission('sst_bienestar:capacitaciones:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('sst_bienestar:capacitaciones:edit');

  const [showNuevoPlan, setShowNuevoPlan] = useState(false);
  const [drawerItem, setDrawerItem]       = useState(null);   // null=cerrado, {}=nuevo, {id,...}=editar
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [exporting, setExporting]         = useState(false);
  const [exportErr, setExportErr]         = useState('');

  // ── Export ──────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!activePlan || !items.length) return;
    setExporting(true); setExportErr('');
    try {
      await exportCapacitaciones(items, activePlan);
    } catch (e) {
      setExportErr(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Loading / Error global ───────────────────────────────────────
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

      {/* ── Barra superior ────────────────────────────────────────── */}
      <div style={{
        background:'#fff', borderRadius:14, padding:'12px 16px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
      }}>
        {/* Selector de año */}
        <div style={{ position:'relative' }}>
          <select
            value={activePlan?.id || ''}
            onChange={e => {
              const plan = plans.find(p => p.id === e.target.value);
              if (plan) setActivePlan(plan);
            }}
            style={{
              appearance:'none', paddingRight:28, paddingLeft:14,
              paddingTop:8, paddingBottom:8,
              background:`${C.primary}12`, border:`1.5px solid ${C.primary}30`,
              borderRadius:10, fontSize:14, fontWeight:700, color: C.primary,
              cursor:'pointer',
            }}
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>Plan {p.year}</option>
            ))}
            {!plans.length && <option value="">Sin planes</option>}
          </select>
          <ChevronDown size={14} style={{
            position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            color: C.primary, pointerEvents:'none',
          }} />
        </div>

        {/* KPIs rápidos */}
        <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
          <Kpi icon={BookOpen}    label="Capacitaciones" value={items.length}       color={C.primary} />
          <Kpi icon={CheckCircle2} label="Completadas"   value={completedItems}     color="#16a34a" />
          <Kpi icon={DollarSign}  label="Presupuesto"    value={fmtCOP(totalBudget)} color={C.olive} />
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:8, marginLeft:'auto', flexShrink:0 }}>
          {canCreate && (
            <Button
              variant="outline" size="sm"
              onClick={() => setShowNuevoPlan(true)}
              style={{ borderColor: C.sand, fontSize:12 }}
            >
              <CalendarDays size={13} className="mr-1.5" /> Nuevo año
            </Button>
          )}
          {canEdit && activePlan && (
            <Button
              size="sm" className="text-white"
              style={{ background: C.mint, fontSize:12 }}
              onClick={() => setDrawerItem({})}
            >
              <Plus size={13} className="mr-1.5" /> Nueva capacitación
            </Button>
          )}
          <Button
            variant="outline" size="sm"
            onClick={handleExport}
            disabled={exporting || !items.length}
            style={{ borderColor: C.sand, fontSize:12 }}
          >
            {exporting
              ? <Loader2 size={13} className="mr-1.5 animate-spin" />
              : <Download size={13} className="mr-1.5" />}
            Descargar
          </Button>
        </div>
      </div>

      {exportErr && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#dc2626' }}>
          <AlertCircle size={14} style={{ display:'inline', marginRight:6 }} />
          {exportErr}
        </div>
      )}

      {/* ── Tabla principal ────────────────────────────────────────── */}
      {!activePlan ? (
        <EmptyState canCreate={canCreate} onCreate={() => setShowNuevoPlan(true)} />
      ) : items.length === 0 && !loading ? (
        <EmptyState message="Este plan no tiene capacitaciones aún." canCreate={canEdit} onCreate={() => setDrawerItem({})} />
      ) : (
        <div style={{
          background:'#fff', borderRadius:14, overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {/* Header del formato */}
          <div style={{
            background: C.primary, padding:'10px 20px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <p style={{ color:'#fff', fontWeight:700, fontSize:13 }}>
              LISTA GENERAL DE CAPACITACIONES {activePlan.year}
            </p>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>
              RE-GH-03 · v1
            </span>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                {/* Fila 1 — grupos */}
                <tr style={{ background:'#f0f5f3' }}>
                  <Th w={30}  rowSpan={2} center>#</Th>
                  <Th w={180} rowSpan={2}>CAPACITACIÓN</Th>
                  <Th w={200} rowSpan={2}>OBJETIVO</Th>
                  <Th w={100} rowSpan={2}>INSTRUCTOR</Th>
                  <Th w={110} rowSpan={2}>PARTICIPANTE</Th>
                  <Th w={70}  rowSpan={2} center>DURACIÓN</Th>
                  <Th w={110} rowSpan={2}>RECURSOS</Th>
                  <Th w={90}  rowSpan={2} center>PRESUPUESTO</Th>
                  <Th w={432} colSpan={12} center style={{ background:`${C.primary}18`, color: C.primary }}>
                    CRONOGRAMA
                  </Th>
                  <Th w={90}  rowSpan={2} center>FECHA EJEC.</Th>
                  <Th w={150} rowSpan={2}>DESCRIPCIÓN EJEC.</Th>
                  <Th w={70}  rowSpan={2} center>EVALUACIÓN</Th>
                  {canEdit && <Th w={60} rowSpan={2} center>ACC.</Th>}
                </tr>
                {/* Fila 2 — meses */}
                <tr style={{ background:'#f8faf9' }}>
                  {MONTHS.map(m => (
                    <Th key={m} w={36} center style={{ fontSize:10, padding:'4px 2px' }}>{m}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const bg = idx % 2 === 0 ? '#fff' : '#f8faf9';
                  const activeMths = MONTH_KEYS.filter(k => item[k]).length;
                  return (
                    <tr key={item.id} style={{ background: bg }}>
                      <Td center style={{ fontWeight:700, color: C.primary }}>{item.order_num}</Td>
                      <Td>
                        <p style={{ fontWeight:600, color:'#1f2937', lineHeight:1.4 }}>{item.title}</p>
                        {activeMths > 0 && (
                          <span style={{ fontSize:10, color: C.mint, fontWeight:600 }}>
                            {activeMths} mes{activeMths !== 1 ? 'es' : ''} programado{activeMths !== 1 ? 's' : ''}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <p style={{ color:'#374151', lineHeight:1.5, fontSize:11 }}>
                          {item.objective || <em style={{ color:'#9ca3af' }}>—</em>}
                        </p>
                      </Td>
                      <Td>{item.instructor || <em style={{color:'#9ca3af'}}>—</em>}</Td>
                      <Td>
                        <span style={{
                          fontSize:10, background:`${C.mint}18`, color: C.primary,
                          borderRadius:6, padding:'2px 8px', fontWeight:600,
                        }}>{item.participants || '—'}</span>
                      </Td>
                      <Td center>
                        <span style={{ fontSize:11, color:'#374151' }}>{item.duration || '—'}</span>
                      </Td>
                      <Td><span style={{ fontSize:11 }}>{item.resources || '—'}</span></Td>
                      <Td center>
                        <span style={{ fontWeight:700, color: item.budget ? C.olive : '#9ca3af' }}>
                          {fmtCOP(item.budget)}
                        </span>
                      </Td>

                      {/* Meses */}
                      {MONTH_KEYS.map((key, mi) => (
                        <MonthCell
                          key={key}
                          value={item[key] === true ? 'x' : item[key] || null}
                          disabled={!canEdit}
                          monthLabel={MONTHS[mi]}
                          onSave={(val) => updateItem(item.id, { [key]: val })}
                        />
                      ))}

                      {/* Control ejecución */}
                      <Td center>
                        <span style={{ fontSize:11, color:'#374151' }}>
                          {item.execution_date
                            ? new Date(item.execution_date+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'2-digit'})
                            : <em style={{color:'#9ca3af'}}>—</em>}
                        </span>
                      </Td>
                      <Td>
                        <span style={{ fontSize:11, color:'#374151', lineHeight:1.4 }}>
                          {item.execution_description || <em style={{color:'#9ca3af'}}>—</em>}
                        </span>
                      </Td>
                      <Td center>
                        {item.evaluation_done
                          ? <span style={{ fontSize:11, fontWeight:700, color:'#16a34a' }}>SI</span>
                          : <span style={{ fontSize:11, color:'#9ca3af' }}>NO</span>}
                      </Td>

                      {canEdit && (
                        <Td center>
                          <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                            <button
                              onClick={() => setDrawerItem(item)}
                              style={{ padding:'4px 6px', borderRadius:6, background:`${C.mint}18`, border:'none', cursor:'pointer', color: C.primary }}
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              style={{ padding:'4px 6px', borderRadius:6, background:'#fef2f2', border:'none', cursor:'pointer', color:'#dc2626' }}
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </Td>
                      )}
                    </tr>
                  );
                })}

                {/* Fila total presupuesto */}
                <tr style={{ background:`${C.primary}08`, borderTop:`2px solid ${C.primary}20` }}>
                  <td colSpan={7} style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, fontSize:12, color: C.primary }}>
                    TOTAL PRESUPUESTO
                  </td>
                  <td style={{ padding:'10px 8px', textAlign:'center', fontWeight:800, fontSize:13, color: C.olive }}>
                    {fmtCOP(totalBudget)}
                  </td>
                  <td colSpan={canEdit ? 16 : 15} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modales y drawer ─────────────────────────────────────── */}
      <NuevoPlanModal
        open={showNuevoPlan}
        onClose={() => setShowNuevoPlan(false)}
        plans={plans}
        onConfirm={createPlan}
      />

      <ItemDrawer
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        item={drawerItem && drawerItem.id ? drawerItem : null}
        planId={activePlan?.id}
        onSave={async (payload) => {
          if (drawerItem?.id) {
            await updateItem(drawerItem.id, payload);
          } else {
            await createItem(activePlan.id, payload);
          }
        }}
      />

      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        item={deleteTarget}
        onConfirm={() => deleteItem(deleteTarget.id)}
      />
    </div>
  );
}

// ─── Helpers de tabla ─────────────────────────────────────────────────
function Th({ children, w, colSpan, rowSpan, center, style = {} }) {
  return (
    <th style={{
      width: w, minWidth: w, padding:'7px 8px',
      fontSize:11, fontWeight:700, color:'#374151',
      textAlign: center ? 'center' : 'left',
      borderBottom:'2px solid #e5e7eb',
      borderRight:'1px solid #e5e7eb',
      whiteSpace:'nowrap',
      ...style,
    }} colSpan={colSpan} rowSpan={rowSpan}>
      {children}
    </th>
  );
}

function Td({ children, center, style = {} }) {
  return (
    <td style={{
      padding:'8px 10px',
      verticalAlign:'top',
      textAlign: center ? 'center' : 'left',
      borderBottom:'1px solid #f3f4f6',
      borderRight:'1px solid #f3f4f6',
      fontSize:12,
      ...style,
    }}>
      {children}
    </td>
  );
}

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:7,
      background:`${color}0f`, borderRadius:10, padding:'6px 12px',
    }}>
      <Icon size={13} style={{ color, flexShrink:0 }} />
      <span style={{ fontSize:11, color:'#6b7280' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color }}>{value}</span>
    </div>
  );
}

function EmptyState({ message, canCreate, onCreate }) {
  return (
    <div style={{
      background:'#fff', borderRadius:14, padding:48,
      textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <BookOpen size={40} style={{ color:`${C.mint}60`, margin:'0 auto 12px' }} />
      <p style={{ color:'#374151', fontWeight:600, fontSize:15, marginBottom:6 }}>
        {message || 'No hay planes de capacitación aún'}
      </p>
      <p style={{ color:'#9ca3af', fontSize:13, marginBottom:20 }}>
        {canCreate ? 'Crea el primer plan anual para empezar.' : 'Contacta a un administrador.'}
      </p>
      {canCreate && (
        <Button onClick={onCreate} className="text-white" style={{ background: C.primary }}>
          <Plus size={14} className="mr-2" /> Crear primer plan
        </Button>
      )}
    </div>
  );
}