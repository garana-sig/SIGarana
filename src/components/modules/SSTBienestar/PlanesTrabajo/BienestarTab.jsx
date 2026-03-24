// src/components/modules/SSTBienestar/PlanesTrabajo/BienestarTab.jsx
// ═══════════════════════════════════════════════════════════════════════
// Plan de trabajo Bienestar Social — versión extendida de WorkPlanTab
// Diferencias vs otros planes:
//   ✅ Columna PRECIO UNITARIO visible
//   ✅ Responsable seleccionable desde usuarios activos
//   ✅ Fondo rojo en meses vencidos no ejecutados (compartido con todos)
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth }    from '@/context/AuthContext';
import { supabase }   from '@/lib/supabase';
import { useWorkPlan, MONTH_KEYS } from '@/hooks/useWorkPlan';
import { exportWorkPlan } from '@/utils/exportWorkPlan';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Plus, Download, Trash2, Pencil, ChevronDown,
  Loader2, AlertCircle, CheckCircle2, CalendarDays,
  DollarSign, Users,
} from 'lucide-react';

const C = { primary:'#2e5244', mint:'#6dbd96', olive:'#6f7b2c', sand:'#dedecc' };
const PLAN_COLOR    = '#6dbd96'; // menta Garana — cálido para bienestar
const OVERDUE_COLOR = '#d97706'; // ámbar — advertencia suave, sin agresividad
const MONTHS_LABEL = ['EN','FE','MA','AB','MA','JU','JL','AG','SE','OC','NO','DI'];

const fmtCOP = (v) => v ? `$ ${Number(v).toLocaleString('es-CO')}` : '—';

// ─── Determina si una celda de mes está vencida (rojo) ────────────────
// Mes pasado + tiene valor + no ejecutada
function isOverdue(item, monthIdx) {
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-11
  if (monthIdx >= currentMonthIdx) return false;
  const key = MONTH_KEYS[monthIdx];
  return !!(item[key]?.trim()) && !item.is_executed;
}

// ─── Hook para cargar usuarios activos con email ──────────────────────
function useActiveUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    supabase
      .from('profile')
      .select('id, full_name, email, role')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data, error }) => {
        // Filtrar solo los que tienen email
        setUsers((data || []).filter(u => u.email));
      });
  }, []);
  return users;
}

// ─── Celda de mes con lógica de color ────────────────────────────────
function MonthCell({ value, onToggle, onEdit, disabled, monthIdx, item }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const hasValue  = value?.trim();
  const overdue   = isOverdue(item, monthIdx);

  // Color de fondo:
  // - Rojo: vencida (mes pasó + tiene valor + no ejecutada)
  // - Verde oscuro: activa con valor
  // - Transparente: vacía
  const bgColor = overdue
    ? OVERDUE_COLOR
    : hasValue ? C.primary : 'transparent';

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
        autoFocus value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
        style={{ width: 52, fontSize: 11, textAlign: 'center',
          border: `1.5px solid ${PLAN_COLOR}`, borderRadius: 4, padding: '2px 4px', outline: 'none' }}
      />
    </td>
  );

  return (
    <td
      onClick={!disabled ? onToggle : undefined}
      onDoubleClick={!disabled ? startEdit : undefined}
      title={overdue ? '⚠️ Actividad vencida' : disabled ? '' : 'Click: marcar · Doble click: texto libre'}
      style={{
        minWidth: 36, textAlign: 'center', padding: '6px 2px',
        background: bgColor,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.12s',
        borderRight: '1px solid #e5e7eb',
        userSelect: 'none',
        fontSize: 11, fontWeight: 700,
        color: (hasValue || overdue) ? '#fff' : 'transparent',
        position: 'relative',
      }}
    >
      {overdue ? '!' : hasValue ? (value.trim() === 'x' ? '✓' : value.trim()) : '·'}
    </td>
  );
}

// ─── Modal Nuevo Plan ─────────────────────────────────────────────────
function NuevoPlanModal({ open, onClose, plans, onConfirm }) {
  const [year, setYear]       = useState(new Date().getFullYear() + 1);
  const [copy, setCopy]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

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
          <h2 className="text-white font-bold text-lg">Nuevo plan de Bienestar</h2>
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
                <p className="text-xs text-gray-400 mt-0.5">Sin meses ni evidencias.</p>
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
  activity:'', responsible:'', responsible_user_id:'',
  responsible_user_ids:[], resp_mode:'usuario',
  resources:'', num_persons:'', hours:'', unit_price:'', budget:'',
  evidence_text:'', evidence_date:'', is_executed: false,
};

function ItemModal({ open, onClose, item, planId, activePlan, onSave, users }) {
  const [form, setForm]       = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const isEdit = !!item;

  useEffect(() => {
    if (open) {
      if (item) {
        // Priorizar el array; si no existe, construirlo desde el campo singular
        const ids = (item.responsible_user_ids?.length > 0)
          ? item.responsible_user_ids
          : item.responsible_user_id ? [item.responsible_user_id] : [];
        setForm({
          ...item,
          responsible_user_ids: ids,
          resp_mode: ids.length > 0 ? 'usuario' : 'texto',
        });
      } else {
        setForm({ ...EMPTY });
      }
      setErr('');
    }
  }, [open, item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.activity.trim()) { setErr('La actividad es obligatoria.'); return; }
    setLoading(true); setErr('');
    try {
      const n = (v) => v !== '' && v != null ? Number(v) : null;
      const ids = form.responsible_user_ids || [];

      const payload = {
        activity:             form.activity.trim(),
        responsible:          form.responsible?.trim()  || null,
        // Guardar primero para FK y array completo para emails/alertas
        responsible_user_id:  ids[0] || null,
        responsible_user_ids: ids,                        // ← array completo en BD
        resources:            form.resources?.trim()    || null,
        num_persons:          n(form.num_persons),
        hours:                n(form.hours),
        unit_price:           n(form.unit_price),
        budget:               n(form.budget),
        evidence_text:        form.evidence_text?.trim() || null,
        evidence_date:        form.evidence_date          || null,
        is_executed:          !!form.is_executed,
      };

      await onSave(payload);

      // ── Correo a TODOS los responsables asignados ─────────────────
      const emailIds = payload.responsible_user_ids?.length > 0
        ? payload.responsible_user_ids
        : payload.responsible_user_id ? [payload.responsible_user_id] : [];


      if (emailIds.length > 0) {
        const emails = emailIds
          .map(id => users.find(u => u.id === id)?.email)
          .filter(Boolean);


        const nombres = emailIds
          .map(id => users.find(u => u.id === id)?.full_name)
          .filter(Boolean)
          .join(', ');

        const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                           'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const mesesActivos = MONTH_KEYS
          .map((k, i) => form[k]?.trim() ? MONTHS_ES[i] : null)
          .filter(Boolean).join(', ');

        if (emails.length > 0) {
          const { data: emailResp, error: emailErr } = await supabase.functions.invoke('send-email', {
            body: {
              type: 'sst_asignacion_actividad',
              to:   emails,
              data: {
                is_edit:          isEdit,
                responsible_name: nombres,
                plan_label:       'Bienestar Social',
                plan_year:        activePlan?.year,
                activity:         payload.activity,
                resources:        payload.resources,
                budget:           payload.budget
                  ? `$ ${Number(payload.budget).toLocaleString('es-CO')}` : null,
                months_scheduled: mesesActivos || null,
              },
            },
          });
        } else {
        }
      } else {
      }

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
            Plan de Bienestar Social
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
              placeholder="Describe la actividad" />
          </div>

          {/* Responsable — múltiples personas (usuarios o texto libre) */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
              Responsable(s)
            </label>

            {/* Toggle modo */}
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {['usuario','texto'].map(mode => (
                <button key={mode} type="button"
                  onClick={() => { set('resp_mode', mode); }}
                  style={{
                    padding:'5px 14px', borderRadius:8, border:'none', cursor:'pointer',
                    fontSize:12, fontWeight:600,
                    background: (form.resp_mode || 'usuario') === mode ? C.primary : '#f3f4f6',
                    color: (form.resp_mode || 'usuario') === mode ? '#fff' : '#6b7280',
                    transition:'all 0.15s',
                  }}>
                  {mode === 'usuario' ? '👤 Usuarios del sistema' : '✏️ Texto libre'}
                </button>
              ))}
            </div>

            {(form.resp_mode || 'usuario') === 'usuario' ? (
              <div>
                {/* Chips de usuarios ya seleccionados */}
                {(form.responsible_user_ids || []).length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                    {(form.responsible_user_ids || []).map(uid => {
                      const u = users.find(u => u.id === uid);
                      return (
                        <span key={uid} style={{
                          display:'flex', alignItems:'center', gap:6,
                          background:`${C.mint}20`, border:`1px solid ${C.mint}50`,
                          borderRadius:20, padding:'3px 10px 3px 8px',
                          fontSize:12, color: C.primary, fontWeight:600,
                        }}>
                          👤 {u?.full_name || uid}
                          <button type="button"
                            onClick={() => set('responsible_user_ids',
                              (form.responsible_user_ids || []).filter(id => id !== uid)
                            )}
                            style={{ background:'none', border:'none', cursor:'pointer',
                              color:'#9ca3af', fontSize:14, lineHeight:1, padding:0 }}>
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Dropdown para agregar */}
                <div style={{ position:'relative' }}>
                  <select
                    value=""
                    onChange={e => {
                      if (!e.target.value) return;
                      const ids = form.responsible_user_ids || [];
                      if (!ids.includes(e.target.value))
                        set('responsible_user_ids', [...ids, e.target.value]);
                    }}
                    disabled={loading}
                    style={{
                      width:'100%', appearance:'none', paddingRight:28, paddingLeft:12,
                      paddingTop:9, paddingBottom:9,
                      border:'1px solid #e5e7eb', borderRadius:6,
                      fontSize:13, background:'#fff', cursor:'pointer', color:'#374151',
                    }}
                  >
                    <option value="">+ Agregar usuario responsable...</option>
                    {users
                      .filter(u => !(form.responsible_user_ids || []).includes(u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                  </select>
                  <ChevronDown size={13} style={{ position:'absolute', right:8, top:'50%',
                    transform:'translateY(-50%)', pointerEvents:'none', color:'#6b7280' }} />
                </div>
              </div>
            ) : (
              <div>
                <Input value={form.responsible || ''}
                  onChange={e => set('responsible', e.target.value)}
                  className="text-sm" disabled={loading}
                  placeholder="Ej: Ana y Alfonso, Gerencia y Administración..." />
                {form.responsible?.toLowerCase().includes('gerencia') && (
                  <div style={{
                    marginTop:8, padding:'8px 12px', borderRadius:8,
                    background:`${C.primary}10`, border:`1px solid ${C.primary}30`,
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    <span style={{ fontSize:16 }}>📧</span>
                    <p style={{ fontSize:12, color: C.primary, margin:0 }}>
                      Se detectó <strong>"gerencia"</strong> — las alertas se enviarán
                      a <strong>todos los usuarios con rol Gerencia</strong> registrados.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recursos */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Recursos</label>
            <Input value={form.resources || ''} onChange={e => set('resources', e.target.value)}
              className="text-sm" disabled={loading}
              placeholder="Ej: Humano y financiero" />
          </div>

          {/* Personas + Horas + Precio unitario + Presupuesto */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              { key:'num_persons', label:'# Personas' },
              { key:'hours',       label:'Horas' },
              { key:'unit_price',  label:'Precio unitario' },
              { key:'budget',      label:'Presupuesto (COP)' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{f.label}</label>
                <Input type="number" min={0} value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  className="text-sm" disabled={loading} placeholder="0" />
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
            <Textarea value={form.evidence_text || ''} rows={3}
              onChange={e => set('evidence_text', e.target.value)}
              className="resize-none text-sm" disabled={loading}
              placeholder="Describe cómo se ejecutó..." />
          </div>

          {err && <p style={{ color:'#dc2626', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
            <AlertCircle size={14}/>{err}</p>}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.sand}`,
          display:'flex', justifyContent:'flex-end', gap:10, background:'#fafaf8',
          borderRadius:'0 0 8px 8px' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}
            className="text-white" style={{ background: PLAN_COLOR }}>
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
        <DialogHeader><DialogTitle className="text-red-700">¿Eliminar actividad?</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-600 mt-1">Se eliminará permanentemente. Esta acción no se puede deshacer.</p>
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
export default function BienestarTab() {
  const { isAdmin, isGerencia, hasPermission } = useAuth();
  const {
    plans, items, activePlan, setActivePlan,
    loading, error, totalBudget, trazabilidad,
    createPlan, createItem, updateItem,
    toggleMonth, setMonthValue, deleteItem,
  } = useWorkPlan('bienestar');

  const users   = useActiveUsers();
  const canCreate = isAdmin || isGerencia || hasPermission('sst_bienestar:bienestar:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('sst_bienestar:bienestar:edit');

  const [showNuevoPlan, setShowNuevoPlan] = useState(false);
  const [modalItem, setModalItem]         = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [exporting, setExporting]         = useState(false);
  const [exportErr, setExportErr]         = useState('');

  const handleExport = async () => {
    if (!activePlan || !items.length) return;
    setExporting(true); setExportErr('');
    try {
      await exportWorkPlan(items, { ...activePlan, plan_type: 'bienestar' }, trazabilidad);
    } catch (e) { setExportErr(e.message); }
    finally { setExporting(false); }
  };

  const getResponsible = (item) => {
    const ids = item.responsible_user_ids?.length > 0
      ? item.responsible_user_ids
      : item.responsible_user_id ? [item.responsible_user_id] : [];
    if (ids.length > 0) {
      const nombres = ids
        .map(id => users.find(u => u.id === id)?.full_name)
        .filter(Boolean).join(', ');
      return nombres || item.responsible || '—';
    }
    return item.responsible || '—';
  };

  if (loading && !plans.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <Loader2 size={28} className="animate-spin" style={{ color: C.mint }} />
    </div>
  );
  if (error) return (
    <div style={{ padding:24, textAlign:'center', color:'#dc2626' }}>
      <AlertCircle size={28} style={{ margin:'0 auto 8px' }}/><p>{error}</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Barra superior ──────────────────────────────────────── */}
      <div style={{ background:'#fff', borderRadius:14, padding:'12px 16px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>

        <div style={{ position:'relative' }}>
          <select value={activePlan?.id || ''}
            onChange={e => setActivePlan(plans.find(p => p.id === e.target.value))}
            style={{ appearance:'none', paddingRight:28, paddingLeft:14,
              paddingTop:8, paddingBottom:8,
              background:`${PLAN_COLOR}12`, border:`1.5px solid ${PLAN_COLOR}30`,
              borderRadius:10, fontSize:14, fontWeight:700, color: PLAN_COLOR, cursor:'pointer' }}>
            {plans.map(p => <option key={p.id} value={p.id}>Plan {p.year}</option>)}
            {!plans.length && <option value="">Sin planes</option>}
          </select>
          <ChevronDown size={14} style={{ position:'absolute', right:8, top:'50%',
            transform:'translateY(-50%)', color: PLAN_COLOR, pointerEvents:'none' }} />
        </div>

        <Kpi icon={CheckCircle2} label="Actividades" value={items.length}     color={C.primary} />
        <Kpi icon={DollarSign}   label="Presupuesto" value={fmtCOP(totalBudget)} color={C.olive} />

        {/* Leyenda vencida */}
        <div style={{ display:'flex', alignItems:'center', gap:6,
          background:`${OVERDUE_COLOR}15`, borderRadius:8, padding:'4px 10px',
          border:`1px solid ${OVERDUE_COLOR}30` }}>
          <div style={{ width:10, height:10, borderRadius:2, background: OVERDUE_COLOR }}/>
          <span style={{ fontSize:11, color: OVERDUE_COLOR, fontWeight:600 }}>Vencida</span>
        </div>

        <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
          {canCreate && (
            <Button variant="outline" size="sm" onClick={() => setShowNuevoPlan(true)}
              style={{ borderColor: C.sand, fontSize:12 }}>
              <CalendarDays size={13} className="mr-1.5"/> Nuevo año
            </Button>
          )}
          {canEdit && activePlan && (
            <Button size="sm" className="text-white"
              style={{ background: C.primary, fontSize:12 }}
              onClick={() => setModalItem({})}>
              <Plus size={13} className="mr-1.5"/> Nueva actividad
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}
            disabled={exporting || !items.length}
            style={{ borderColor: C.sand, fontSize:12 }}>
            {exporting ? <Loader2 size={13} className="mr-1.5 animate-spin"/> : <Download size={13} className="mr-1.5"/>}
            Descargar
          </Button>
        </div>
      </div>

      {exportErr && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10,
          padding:'10px 14px', fontSize:13, color:'#92400e', display:'flex', alignItems:'center', gap:8 }}>
          <AlertCircle size={14}/> {exportErr}
        </div>
      )}

      {/* ── Tabla ───────────────────────────────────────────────── */}
      {!activePlan || items.length === 0 ? (
        <EmptyState canCreate={canEdit} onCreate={() => setModalItem({})} />
      ) : (
        <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>

          <div style={{ padding:'10px 20px',
            background:`linear-gradient(135deg, ${C.primary} 0%, ${C.mint} 100%)`,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ color:'#fff', fontWeight:800, fontSize:13 }}>
              PLAN DE TRABAJO COMITÉ DE BIENESTAR SOCIAL {activePlan.year}
            </p>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>RE-GS-32 · v1</span>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:`${C.mint}08` }}>
                  <Th w={200} rowSpan={2} style={{ borderLeft:'none' }}>ACTIVIDADES</Th>
                  <Th w={110} rowSpan={2}>RESPONSABLE</Th>
                  <Th w={120} rowSpan={2}>RECURSOS</Th>
                  <Th w={55}  rowSpan={2} center># PERS.</Th>
                  <Th w={50}  rowSpan={2} center>HORAS</Th>
                  <Th w={90}  rowSpan={2} center style={{ color:'#dc2626' }}>PRECIO UNIT.</Th>
                  <Th w={90}  rowSpan={2} center>PRESUPUESTO</Th>
                  <Th w={432} colSpan={12} center
                    style={{ background:`${C.mint}25`, color: C.primary, fontWeight:800 }}>
                    CRONOGRAMA
                  </Th>
                  <Th w={140} rowSpan={2}>EVIDENCIA</Th>
                  {canEdit && <Th w={60} rowSpan={2} center>ACC.</Th>}
                </tr>
                <tr style={{ background:`${C.mint}12` }}>
                  {MONTHS_LABEL.map(m => (
                    <Th key={m} w={36} center style={{ fontSize:10, padding:'4px 2px',
                      color: C.olive, fontWeight:700 }}>{m}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const bg = idx % 2 === 0 ? '#fff' : '#fafaf8';
                  return (
                    <tr key={item.id} style={{ background: bg }}>
                      <Td style={{ borderLeft:'none' }}>
                        <p style={{ fontWeight:600, color:'#1f2937', lineHeight:1.4, fontSize:11 }}>
                          {item.activity}
                        </p>
                        {item.is_executed && (
                          <span style={{ fontSize:10, color:'#16a34a', fontWeight:700 }}>✓ Ejecutada</span>
                        )}
                      </Td>
                      <Td>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          {item.responsible_user_id && (
                            <Users size={11} style={{ color: PLAN_COLOR, flexShrink:0 }}/>
                          )}
                          <span style={{ fontSize:11, color:'#374151' }}>
                            {getResponsible(item)}
                          </span>
                        </div>
                      </Td>
                      <Td><span style={{ fontSize:11 }}>{item.resources || '—'}</span></Td>
                      <Td center><span style={{ fontSize:11 }}>{item.num_persons ?? '—'}</span></Td>
                      <Td center><span style={{ fontSize:11 }}>{item.hours ?? '—'}</span></Td>
                      <Td center>
                        <span style={{ fontSize:11, color: item.unit_price ? '#dc2626' : '#9ca3af', fontWeight: item.unit_price ? 700 : 400 }}>
                          {fmtCOP(item.unit_price)}
                        </span>
                      </Td>
                      <Td center>
                        <span style={{ fontWeight:700, color: item.budget ? C.olive : '#9ca3af' }}>
                          {fmtCOP(item.budget)}
                        </span>
                      </Td>

                      {/* Meses con lógica de vencido */}
                      {MONTH_KEYS.map((key, mi) => (
                        <MonthCell
                          key={key}
                          value={item[key]}
                          monthIdx={mi}
                          item={item}
                          disabled={!canEdit}
                          onToggle={() => toggleMonth(item.id, key, item[key])}
                          onEdit={(val) => setMonthValue(item.id, key, val)}
                        />
                      ))}

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
                                background:'#fee2e2', border:'none', cursor:'pointer', color: PLAN_COLOR }}>
                              <Pencil size={12}/>
                            </button>
                            <button onClick={() => setDeleteTarget(item)}
                              style={{ padding:'4px 6px', borderRadius:6,
                                background:'#fef2f2', border:'none', cursor:'pointer', color:'#dc2626' }}>
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </Td>
                      )}
                    </tr>
                  );
                })}

                {/* Total */}
                <tr style={{ background:`${C.mint}10`, borderTop:`2px solid ${C.mint}40` }}>
                  <td colSpan={6} style={{ padding:'10px 14px', textAlign:'right',
                    fontWeight:700, fontSize:12, color: C.primary, borderLeft:'none' }}>
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

          {/* Trazabilidad */}
          <div style={{ borderTop:'2px solid #f3f4f6', paddingBottom:4 }}>
            <div style={{ padding:'10px 20px 6px', background:'#f0f5f3', borderBottom:'1px solid #e5e7eb' }}>
              <p style={{ fontSize:12, fontWeight:800, color: C.primary, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Trazabilidad de la ejecución de las actividades
              </p>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <tbody>
                <tr>
                  <td style={{ padding:'7px 20px', fontWeight:700, fontSize:11,
                    color:'#166534', background:'#dcfce7', width:300 }}>ACTIVIDADES PLANEADAS</td>
                  {trazabilidad.map((t, i) => (
                    <td key={i} style={{ textAlign:'center', padding:'7px 2px', minWidth:36,
                      fontWeight:700, fontSize:12, background:'#dcfce7',
                      color: t.planeadas > 0 ? '#166534' : '#9ca3af',
                      borderLeft:'1px solid #bbf7d0' }}>
                      {t.planeadas > 0 ? t.planeadas : ''}
                    </td>
                  ))}
                  <td style={{ background:'#dcfce7' }}/>
                </tr>
                <tr>
                  <td style={{ padding:'7px 20px', fontWeight:700, fontSize:11,
                    color:'#92400e', background:'#fef9c3' }}>ACTIVIDADES EJECUTADAS</td>
                  {trazabilidad.map((t, i) => (
                    <td key={i} style={{ textAlign:'center', padding:'7px 2px',
                      fontWeight:700, fontSize:12, background:'#fef9c3',
                      color: t.ejecutadas > 0 ? '#92400e' : '#9ca3af',
                      borderLeft:'1px solid #fde68a' }}>
                      {t.ejecutadas > 0 ? t.ejecutadas : ''}
                    </td>
                  ))}
                  <td style={{ background:'#fef9c3' }}/>
                </tr>
                <tr>
                  <td style={{ padding:'7px 20px', fontWeight:700, fontSize:11,
                    color:'#9a3412', background:'#ffedd5' }}>PORCENTAJE DE CUMPLIMIENTO</td>
                  {trazabilidad.map((t, i) => (
                    <td key={i} style={{ textAlign:'center', padding:'7px 2px',
                      fontWeight:700, fontSize:11, background:'#ffedd5',
                      color: t.pct > 0 ? '#9a3412' : '#9ca3af',
                      borderLeft:'1px solid #fed7aa' }}>
                      {t.planeadas > 0 ? `${t.pct}%` : ''}
                    </td>
                  ))}
                  <td style={{ background:'#ffedd5' }}/>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <NuevoPlanModal open={showNuevoPlan} onClose={() => setShowNuevoPlan(false)}
        plans={plans} onConfirm={createPlan} />
      <ItemModal open={modalItem !== null} onClose={() => setModalItem(null)}
        item={modalItem?.id ? modalItem : null}
        planId={activePlan?.id} activePlan={activePlan} users={users}
        onSave={async (payload) => {
          if (modalItem?.id) await updateItem(modalItem.id, payload);
          else await createItem(activePlan.id, payload);
        }} />
      <DeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        item={deleteTarget} onConfirm={() => deleteItem(deleteTarget.id)} />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
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
      fontSize:12, ...style }}>{children}</td>
  );
}
function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7,
      background:`${color}0f`, borderRadius:10, padding:'6px 12px' }}>
      <Icon size={13} style={{ color, flexShrink:0 }}/>
      <span style={{ fontSize:11, color:'#6b7280' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color }}>{value}</span>
    </div>
  );
}
function EmptyState({ canCreate, onCreate }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:48,
      textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <p style={{ color:'#374151', fontWeight:600, fontSize:15, marginBottom:6 }}>
        No hay plan de Bienestar Social aún
      </p>
      {canCreate && (
        <Button onClick={onCreate} className="text-white mt-4" style={{ background: C.primary }}>
          <Plus size={14} className="mr-2"/> Crear primer plan
        </Button>
      )}
    </div>
  );
}