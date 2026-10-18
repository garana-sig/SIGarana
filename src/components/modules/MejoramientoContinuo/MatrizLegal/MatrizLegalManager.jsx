// src/components/modules/MejoramientoContinuo/MatrizLegal/MatrizLegalManager.jsx
// ═══════════════════════════════════════════════════════════════════════
// MATRIZ LEGAL · RE-DP-04 — Mejoramiento Continuo
// Pestañas: Matriz General · Matriz SST · Derogadas
// Filtros: texto · responsable (proceso/usuario/cargo/comité) · estado ·
//          "Mis requisitos"
// v2: letra más compacta + EDICIÓN EN LÍNEA (clic en la celda):
//     · Texto (año, norma, ente, asunto, artículo, requisito, evidencia,
//       motivo de derogación) → se edita en la misma celda.
//       Enter guarda (en textos largos Ctrl+Enter o salir de la celda),
//       Esc cancela.
//     · Responsables → panel rápido para quitar/agregar.
//     · Estado → abre la verificación.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  ChevronLeft, Plus, RefreshCw, Search, Loader2, Eye, Trash2, ClipboardCheck,
  Scale, ShieldCheck, Archive, X, UserCheck, ChevronRight, ChevronsLeft, ChevronsRight,
  BarChart3, ChevronDown, Link2, CheckCircle2, AlertTriangle, Pencil, Check,
} from 'lucide-react';
import {
  useMatrizLegal, ESTADOS_VERIF, ESTADO_CONTROL, TIPOS_RESPONSABLE, nombreResponsable, fmtFecha,
} from '@/hooks/useMatrizLegal';
import RequisitoModal from './RequisitoModal';
import VerificacionModal from './VerificacionModal';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', bg: '#f5f5ef' };
const PAGE = 25;

const TABS = [
  { id: 'general',   label: 'Matriz General', icon: Scale },
  { id: 'sst',       label: 'Matriz SST',     icon: ShieldCheck },
  { id: 'derogadas', label: 'Derogadas',      icon: Archive },
];

const FILTRO_ESTADOS = [
  { id: '',              label: 'Todos los estados' },
  { id: 'cumple',        label: 'Cumple' },
  { id: 'parcial',       label: 'Parcial' },
  { id: 'no_cumple',     label: 'No cumple' },
  { id: 'no_aplica',     label: 'No aplica' },
  { id: 'sin_verificar', label: 'Sin verificar' },
  { id: 'vencida',       label: 'Verificación vencida' },
];

const selCls = 'rounded-md border px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2';

// ── Chips ───────────────────────────────────────────────────────────────
function Chip({ bg, color, children, title, onRemove }) {
  return (
    <span title={title} className="inline-flex items-center gap-0.5 rounded px-1.5 py-[1px] text-[9.5px] font-semibold whitespace-nowrap" style={{ background: bg, color }}>
      {children}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:opacity-60"><X className="h-2.5 w-2.5" /></button>
      )}
    </span>
  );
}

// ── Celda editable en línea ─────────────────────────────────────────────
// Muestra el texto (máx. N líneas). Con permiso: clic → input/textarea.
function EditCell({ value, onSave, editable, multiline, type = 'text', lines = 3, placeholder = '—', bold, color, minW }) {
  const [edit, setEdit]   = useState(false);
  const [val, setVal]     = useState('');
  const [saving, setSav]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!edit || !ref.current) return;
    const el = ref.current;
    el.focus();
    if (multiline) { el.setSelectionRange(el.value.length, el.value.length); el.scrollTop = 0; }
    else el.select?.();
  }, [edit]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = () => { if (!editable || saving) return; setVal(value ?? ''); setEdit(true); };
  const cancelar = () => setEdit(false);
  const guardar = async () => {
    const nuevo = String(val ?? '').trim();
    if (nuevo === String(value ?? '').trim()) return setEdit(false);
    setSav(true);
    const ok = await onSave(nuevo);
    setSav(false);
    if (ok) setEdit(false); else ref.current?.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cancelar(); }
    if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); guardar(); }
  };

  if (edit) {
    const common = {
      ref, value: val, onChange: (e) => setVal(e.target.value), onKeyDown: onKey, onBlur: guardar, disabled: saving,
      className: 'w-full rounded border px-1.5 py-1 text-[11px] leading-snug focus:outline-none focus:ring-2 bg-white',
      style: { borderColor: C.mint, '--tw-ring-color': `${C.mint}80`, minWidth: minW },
    };
    return (
      <div className="relative">
        {multiline ? <textarea rows={Math.min(12, Math.max(4, Math.ceil(String(val).length / 34) + 1))} {...common} /> : <input type={type} {...common} />}
        {saving && <Loader2 className="h-3 w-3 animate-spin absolute right-1 top-1" style={{ color: C.mint }} />}
        {multiline && !saving && <p className="text-[9px] text-gray-400 mt-0.5">Ctrl+Enter guarda · Esc cancela</p>}
      </div>
    );
  }

  const vacio = value == null || value === '';
  return (
    <div
      onClick={abrir}
      title={editable ? 'Clic para editar' : (value ? String(value) : '')}
      className={`group relative rounded px-1 -mx-1 py-0.5 ${editable ? 'cursor-text hover:bg-white hover:ring-1 hover:ring-[#6dbd96]' : ''}`}
      style={{ minWidth: minW }}
    >
      <div
        className={`${vacio ? 'text-gray-300 italic' : ''} ${bold ? 'font-semibold' : ''}`}
        style={{ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: vacio ? undefined : color, wordBreak: 'break-word' }}
      >
        {vacio ? (editable ? placeholder : '') : value}
      </div>
      {editable && <Pencil className="h-2.5 w-2.5 absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-60" style={{ color: C.olive }} />}
    </div>
  );
}

// ── Responsables: vista + panel rápido de edición ───────────────────────
function RespCell({ req, editable, procesos, cargosSug, comitesSug, onSave }) {
  const [open, setOpen]   = useState(false);
  const [saving, setSav]  = useState(false);
  const [tipo, setTipo]   = useState('proceso');
  const [txt, setTxt]     = useState('');
  const [pos, setPos]     = useState(null);
  const boxRef = useRef(null);
  const popRef = useRef(null);
  const lista = req.responsables || [];

  // El panel va en position:fixed para que la tabla (overflow) no lo recorte
  const abrir = () => {
    if (!editable) return;
    const r = boxRef.current.getBoundingClientRect();
    const alto = 230;
    const arriba = r.bottom + alto > window.innerHeight;
    setPos({ left: Math.min(r.left, window.innerWidth - 300), top: arriba ? Math.max(8, r.top - alto - 4) : r.bottom + 4 });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const fuera = (e) => {
      if (popRef.current?.contains(e.target) || boxRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const cerrar = () => setOpen(false);
    document.addEventListener('mousedown', fuera);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [open]);

  const guardar = async (nuevaLista, aplicaTodos = req.aplica_todos_procesos) => {
    setSav(true);
    await onSave(nuevaLista, aplicaTodos);
    setSav(false);
  };
  const quitar = (i) => guardar(lista.filter((_, j) => j !== i));
  const agregar = (valor) => {
    if (!valor?.trim()) return;
    let item;
    if (tipo === 'proceso') {
      if (lista.some((r) => r.tipo === 'proceso' && r.process_id === valor)) return;
      item = { tipo, process_id: valor };
    } else {
      const n = valor.trim();
      if (lista.some((r) => r.tipo === tipo && r.nombre?.toLowerCase() === n.toLowerCase())) return;
      item = { tipo, nombre: n };
    }
    setTxt('');
    guardar([...lista, item]);
  };

  const chips = (conQuitar) => (
    <div className="flex flex-wrap gap-0.5">
      {req.aplica_todos_procesos && <Chip bg="#e8f5ee" color={C.green}>Todos los procesos</Chip>}
      {lista.map((r, i) => {
        const t = TIPOS_RESPONSABLE[r.tipo];
        return <Chip key={r.id || i} bg={t.bg} color={t.color} title={t.label} onRemove={conQuitar && !saving ? () => quitar(i) : undefined}>{nombreResponsable(r)}</Chip>;
      })}
      {!lista.length && !req.aplica_todos_procesos && <span className="text-[10px] text-gray-300 italic">{editable ? 'Asignar…' : 'Sin asignar'}</span>}
    </div>
  );

  return (
    <div className="relative" ref={boxRef}>
      <div onClick={abrir}
        className={`rounded px-1 -mx-1 py-0.5 ${editable ? 'cursor-pointer hover:bg-white hover:ring-1 hover:ring-[#6dbd96]' : ''}`}>
        {chips(false)}
      </div>
      {open && (
        <div ref={popRef} className="fixed z-40 w-72 rounded-lg border bg-white shadow-xl p-2.5 space-y-2" style={{ borderColor: C.sand, left: pos?.left, top: pos?.top }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.olive }}>Responsables</span>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: C.mint }} />
              : <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
          </div>
          {chips(true)}
          <label className="flex items-center gap-1.5 text-[11px]">
            <input type="checkbox" disabled={saving} checked={!!req.aplica_todos_procesos} onChange={(e) => guardar(lista, e.target.checked)} />
            Aplica a todos los procesos
          </label>
          <div className="flex gap-1">
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setTxt(''); }} className="rounded border px-1 py-1 text-[11px]">
              <option value="proceso">Proceso</option>
              <option value="cargo">Cargo</option>
              <option value="comite">Comité</option>
            </select>
            {tipo === 'proceso' ? (
              <select value="" disabled={saving} onChange={(e) => agregar(e.target.value)} className="flex-1 rounded border px-1 py-1 text-[11px]">
                <option value="">+ Agregar proceso…</option>
                {procesos.filter((p) => !lista.some((r) => r.process_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <>
                <input list={`rc-${tipo}`} value={txt} disabled={saving} onChange={(e) => setTxt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(txt); } }}
                  placeholder={tipo === 'cargo' ? 'Ej. Gerencia' : 'Ej. COPASST'} className="flex-1 min-w-0 rounded border px-1.5 py-1 text-[11px]" />
                <datalist id={`rc-${tipo}`}>{(tipo === 'cargo' ? cargosSug : comitesSug).map((n) => <option key={n} value={n} />)}</datalist>
                <button onClick={() => agregar(txt)} disabled={!txt.trim() || saving} className="rounded px-1.5 text-white disabled:opacity-40" style={{ background: C.green }}>
                  <Check className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
          <p className="text-[9.5px] text-gray-400">Usuarios específicos: desde la ficha completa (ojo).</p>
        </div>
      )}
    </div>
  );
}

function EstadoCelda({ req, onClick }) {
  const ev = req.ultimo_estado ? ESTADOS_VERIF[req.ultimo_estado] : null;
  const ctl = ESTADO_CONTROL[req.estado_verificacion];
  return (
    <button onClick={onClick} title="Verificar / historial" className="flex flex-col gap-0.5 items-start rounded px-1 -mx-1 py-0.5 hover:bg-white hover:ring-1 hover:ring-[#6dbd96]">
      {ev ? <Chip bg={ev.bg} color={ev.color}>{ev.label}</Chip> : <Chip bg={ctl.bg} color={ctl.color}>{ctl.label}</Chip>}
      {ev && req.estado_verificacion === 'vencida' && <Chip bg={ctl.bg} color={ctl.color}>Vencida</Chip>}
      {req.improvement_action_id && (
        <span className="inline-flex items-center gap-0.5 text-[9.5px]" style={{ color: C.olive }}><Link2 className="h-2.5 w-2.5" />Acción</span>
      )}
    </button>
  );
}

// ── Stat ────────────────────────────────────────────────────────────────
function Stat({ label, value, color, sub, active, onClick }) {
  return (
    <button onClick={onClick} className="text-left rounded-lg bg-white px-3 py-2 shadow-sm border-2 transition-all hover:shadow-md"
      style={{ borderColor: active ? color : 'transparent' }}>
      <p className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-bold leading-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[9.5px] text-gray-400">{sub}</p>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
export default function MatrizLegalManager({ onBack }) {
  const ml = useMatrizLegal();
  const { requisitos, procesos, usuarios, loading, error, can, puedeVerificar, esMio } = ml;

  const [tab, setTab]         = useState('general');
  const [q, setQ]             = useState('');
  const [fResp, setFResp]     = useState('');
  const [fEstado, setFEstado] = useState('');
  const [soloMios, setMios]   = useState(false);
  const [page, setPage]       = useState(1);
  const [verDash, setVerDash] = useState(false);
  const [modal, setModal]     = useState(null);      // { mode, req }
  const [verif, setVerif]     = useState(null);      // req
  const [flash, setFlash]     = useState(null);

  const showFlash = (type, text) => { setFlash({ type, text }); setTimeout(() => setFlash(null), 3500); };
  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  // ── Conjuntos por pestaña ─────────────────────────────────────────────
  const porTab = useMemo(() => ({
    general:   requisitos.filter((r) => r.matriz === 'general' && r.vigencia === 'vigente'),
    sst:       requisitos.filter((r) => r.matriz === 'sst'     && r.vigencia === 'vigente'),
    derogadas: requisitos.filter((r) => r.vigencia === 'derogada'),
  }), [requisitos]);

  const base = porTab[tab];

  // ── Opciones de responsables (de lo que existe en los datos) ──────────
  const opcionesResp = useMemo(() => {
    const cargos = new Set(), comites = new Set(), users = new Map(), procs = new Map();
    requisitos.forEach((r) => r.responsables.forEach((x) => {
      if (x.tipo === 'cargo') cargos.add(x.nombre);
      if (x.tipo === 'comite') comites.add(x.nombre);
      if (x.tipo === 'usuario' && x.user) users.set(x.user_id, x.user.full_name);
      if (x.tipo === 'proceso' && x.process) procs.set(x.process_id, x.process.name);
    }));
    return {
      procesos: procesos.filter((p) => procs.has(p.id)),
      usuarios: [...users.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      cargos: [...cargos].sort(), comites: [...comites].sort(),
    };
  }, [requisitos, procesos]);

  const coincideResp = (r) => {
    if (!fResp) return true;
    if (fResp === 'none') return !r.aplica_todos_procesos && r.responsables.length === 0;
    if (fResp === 'todos') return r.aplica_todos_procesos;
    const [t, v] = [fResp.slice(0, 1), fResp.slice(2)];
    return r.responsables.some((x) =>
      (t === 'p' && x.tipo === 'proceso' && x.process_id === v) ||
      (t === 'u' && x.tipo === 'usuario' && x.user_id === v) ||
      (t === 'c' && x.tipo === 'cargo' && x.nombre === v) ||
      (t === 'm' && x.tipo === 'comite' && x.nombre === v));
  };

  const coincideEstado = (r) => {
    if (!fEstado) return true;
    if (fEstado === 'sin_verificar' || fEstado === 'vencida') return r.estado_verificacion === fEstado;
    return r.ultimo_estado === fEstado;
  };

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    return base.filter((r) => {
      if (soloMios && !esMio(r)) return false;
      if (!coincideResp(r) || !coincideEstado(r)) return false;
      if (!s) return true;
      return [r.norma, r.ente_emisor, r.asunto, r.articulo, r.requisito, r.evidencia, r.numero, String(r.anio_emision || '')]
        .some((t) => t && String(t).toLowerCase().includes(s));
    });
  }, [base, q, fResp, fEstado, soloMios, esMio]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const pg = Math.min(page, totalPages);
  const filas = filtrados.slice((pg - 1) * PAGE, pg * PAGE);

  // ── Estadísticas (pestaña actual, vigentes) ───────────────────────────
  const stats = useMemo(() => {
    const vig = tab === 'derogadas' ? [] : base;
    const cuenta = (k) => vig.filter((r) => r.ultimo_estado === k).length;
    const cumple = cuenta('cumple'), parcial = cuenta('parcial'), nc = cuenta('no_cumple'), na = cuenta('no_aplica');
    const evaluadas = cumple + parcial + nc;
    return {
      total: vig.length, cumple, parcial, nc, na,
      sinVerif: vig.filter((r) => r.estado_verificacion === 'sin_verificar').length,
      vencidas: vig.filter((r) => r.estado_verificacion === 'vencida').length,
      pct: evaluadas ? Math.round((cumple + parcial * 0.5) / evaluadas * 100) : null,
      evaluadas,
    };
  }, [base, tab]);

  // ── Cumplimiento por proceso (pestaña actual) ─────────────────────────
  const porProceso = useMemo(() => {
    if (tab === 'derogadas') return [];
    return procesos.map((p) => {
      const rs = base.filter((r) => r.aplica_todos_procesos || r.responsables.some((x) => x.tipo === 'proceso' && x.process_id === p.id));
      const cumple = rs.filter((r) => r.ultimo_estado === 'cumple').length;
      const ev = rs.filter((r) => ['cumple', 'parcial', 'no_cumple'].includes(r.ultimo_estado)).length;
      return { ...p, total: rs.length, cumple, ev, sinVerif: rs.filter((r) => r.estado_verificacion !== 'al_dia').length };
    }).filter((p) => p.total > 0);
  }, [base, procesos, tab]);

  // Sugerencias
  const cargosSug  = useMemo(() => [...new Set(['Gerencia', 'Contador', 'Asesor contable', ...opcionesResp.cargos])], [opcionesResp]);
  const comitesSug = useMemo(() => [...new Set(['Comité de Convivencia Laboral', 'COPASST', 'Brigada de Emergencias', ...opcionesResp.comites])], [opcionesResp]);

  // ── Acciones ──────────────────────────────────────────────────────────
  const guardar = async (form, resp) => {
    const res = modal.mode === 'create'
      ? await ml.crearRequisito(form, resp)
      : await ml.actualizarRequisito(modal.req.id, form, resp);
    if (res.success) {
      setModal(null);
      showFlash('success', modal.mode === 'create' ? 'Norma creada.' : 'Norma actualizada.');
      if (form.vigencia === 'derogada' && tab !== 'derogadas') setTab('derogadas');
    }
    return res;
  };

  // Edición en línea de un campo
  const guardarCampo = (id, campo) => async (valor) => {
    if (campo === 'motivo_derogacion' && !valor) { showFlash('error', 'El motivo de derogación no puede quedar vacío.'); return false; }
    const res = await ml.actualizarCampo(id, campo, valor);
    if (!res.success) showFlash('error', res.error);
    return res.success;
  };

  // Responsables desde el panel rápido
  const guardarResp = (req) => async (lista, aplicaTodos) => {
    const res = await ml.actualizarRequisito(req.id, { aplica_todos_procesos: aplicaTodos }, lista);
    if (!res.success) showFlash('error', res.error);
    return res.success;
  };

  const eliminar = async (r) => {
    if (!window.confirm(`¿Eliminar "${r.norma}"?\nSe borran también sus responsables y verificaciones.`)) return;
    const res = await ml.eliminarRequisito(r.id);
    showFlash(res.success ? 'success' : 'error', res.success ? 'Norma eliminada.' : res.error);
  };

  const limpiar = () => { setQ(''); setFResp(''); setFEstado(''); setMios(false); setPage(1); };
  const hayFiltros = q || fResp || fEstado || soloMios;

  const verifActual = verif ? requisitos.find((r) => r.id === verif.id) || verif : null;
  const ed = can.edit;
  const derog = tab === 'derogadas';

  // Columnas (ancho mínimo para que la tabla respire)
  const cols = [
    ['#', 30], ['Año', 52], ['Norma', 150], ['Ente emisor', 120], ['Asunto que regula', 210], ['Artículo', 80],
    ['Requisito / parámetro', 240], ['Evidencia', 170], ['Responsables', 160],
    [derog ? 'Motivo de derogación' : 'Estado', derog ? 170 : 90], [derog ? 'Matriz' : 'Últ. verif.', 70], ['', 60],
  ];

  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-3 px-2">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Volver</Button>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-xl font-bold leading-tight" style={{ color: C.green }}>Matriz Legal</h2>
          <p className="text-xs" style={{ color: C.olive }}>
            Requisitos legales y normativos · RE-DP-04
            {ed && <span className="text-gray-400"> · Clic sobre una celda para editarla</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={ml.cargar} disabled={loading} className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />Actualizar
        </Button>
        {can.create && (
          <Button size="sm" onClick={() => setModal({ mode: 'create', req: null })} className="text-xs" style={{ background: C.green, color: 'white' }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Nueva norma
          </Button>
        )}
      </div>

      {flash && (
        <div className={`fixed bottom-4 right-4 z-[60] rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-2 ${flash.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {flash.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{flash.text}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-xs">Error: {error}</div>}

      {/* Pestañas */}
      <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: C.sand }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); setFEstado(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold -mb-px border-b-2 transition-colors"
              style={{ borderColor: on ? C.green : 'transparent', color: on ? C.green : '#9ca3af' }}>
              <Icon className="h-3.5 w-3.5" />{t.label}
              <span className="rounded-full px-1.5 text-[10px]" style={{ background: on ? C.green : '#f3f4f6', color: on ? 'white' : '#6b7280' }}>
                {porTab[t.id].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      {!derog && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Cumplimiento" color={C.green}
            value={stats.pct == null ? '—' : `${stats.pct}%`}
            sub={stats.evaluadas ? `${stats.evaluadas} evaluadas (parcial = ½)` : 'Sin evaluaciones'} />
          <Stat label="Cumple" value={stats.cumple} color="#15803d" active={fEstado === 'cumple'} onClick={() => resetPage(setFEstado)(fEstado === 'cumple' ? '' : 'cumple')} />
          <Stat label="Parcial" value={stats.parcial} color="#b45309" active={fEstado === 'parcial'} onClick={() => resetPage(setFEstado)(fEstado === 'parcial' ? '' : 'parcial')} />
          <Stat label="No cumple" value={stats.nc} color="#b91c1c" active={fEstado === 'no_cumple'} onClick={() => resetPage(setFEstado)(fEstado === 'no_cumple' ? '' : 'no_cumple')} />
          <Stat label="Sin verificar" value={stats.sinVerif} color="#64748b" active={fEstado === 'sin_verificar'} onClick={() => resetPage(setFEstado)(fEstado === 'sin_verificar' ? '' : 'sin_verificar')} />
          <Stat label="Vencidas" value={stats.vencidas} color="#c2410c" active={fEstado === 'vencida'} onClick={() => resetPage(setFEstado)(fEstado === 'vencida' ? '' : 'vencida')} />
        </div>
      )}

      {/* Cumplimiento por proceso */}
      {!derog && porProceso.length > 0 && (
        <Card className="border-0 shadow-sm">
          <button onClick={() => setVerDash((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold" style={{ color: C.green }}>
            <BarChart3 className="h-3.5 w-3.5" />Cumplimiento por proceso
            <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${verDash ? 'rotate-180' : ''}`} />
          </button>
          {verDash && (
            <CardContent className="pt-0 pb-3 space-y-1.5">
              {porProceso.map((p) => {
                const pct = p.ev ? Math.round(p.cumple / p.ev * 100) : 0;
                return (
                  <button key={p.id} onClick={() => resetPage(setFResp)(`p:${p.id}`)} className="w-full text-left">
                    <div className="flex justify-between text-[10.5px] mb-0.5">
                      <span className="font-medium" style={{ color: C.green }}>{p.name}</span>
                      <span className="text-gray-500">
                        {p.ev ? `${pct}% · ${p.cumple}/${p.ev} evaluadas` : 'sin evaluar'} · {p.total} normas
                        {p.sinVerif > 0 && <span style={{ color: '#c2410c' }}> · {p.sinVerif} pendiente{p.sinVerif === 1 ? '' : 's'}</span>}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#eef0e8' }}>
                      <div className="h-full rounded-full" style={{ width: `${p.ev ? pct : 0}%`, background: `linear-gradient(90deg, ${C.mint}, ${C.green})` }} />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${selCls} w-full pl-8`} placeholder="Buscar norma, asunto, artículo, evidencia…"
            value={q} onChange={(e) => resetPage(setQ)(e.target.value)} />
        </div>
        <select className={selCls} value={fResp} onChange={(e) => resetPage(setFResp)(e.target.value)}>
          <option value="">Todos los responsables</option>
          <option value="todos">Aplica a todos los procesos</option>
          <option value="none">Sin responsable</option>
          {opcionesResp.procesos.length > 0 && (
            <optgroup label="Procesos">{opcionesResp.procesos.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}</optgroup>
          )}
          {opcionesResp.cargos.length > 0 && (
            <optgroup label="Cargos">{opcionesResp.cargos.map((n) => <option key={n} value={`c:${n}`}>{n}</option>)}</optgroup>
          )}
          {opcionesResp.comites.length > 0 && (
            <optgroup label="Comités">{opcionesResp.comites.map((n) => <option key={n} value={`m:${n}`}>{n}</option>)}</optgroup>
          )}
          {opcionesResp.usuarios.length > 0 && (
            <optgroup label="Usuarios">{opcionesResp.usuarios.map(([id, n]) => <option key={id} value={`u:${id}`}>{n}</option>)}</optgroup>
          )}
        </select>
        {!derog && (
          <select className={selCls} value={fEstado} onChange={(e) => resetPage(setFEstado)(e.target.value)}>
            {FILTRO_ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        )}
        <button onClick={() => resetPage(setMios)(!soloMios)}
          className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
          style={{ background: soloMios ? C.green : 'white', color: soloMios ? 'white' : C.green, borderColor: soloMios ? C.green : '#d1d5db' }}>
          <UserCheck className="h-3.5 w-3.5" />Mis requisitos
        </button>
        {hayFiltros && (
          <button onClick={limpiar} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <X className="h-3.5 w-3.5" />Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <Card className="border-0 shadow-md overflow-hidden">
        {loading && !requisitos.length ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" style={{ color: C.mint }} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] leading-snug">
              <thead>
                <tr style={{ background: C.green, color: 'white' }}>
                  {cols.map(([h, w], i) => (
                    <th key={i} className="px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-[9px] whitespace-nowrap" style={{ minWidth: w }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr><td colSpan={cols.length} className="text-center py-10 text-gray-400">No hay normas con estos filtros.</td></tr>
                )}
                {filas.map((r, i) => (
                  <tr key={r.id} className="border-b hover:bg-[#f0f7f4] align-top" style={{ background: i % 2 ? '#fafaf7' : 'white', borderColor: '#eee' }}>
                    <td className="px-1.5 py-1.5 text-gray-400">{(pg - 1) * PAGE + i + 1}</td>
                    <td className="px-1.5 py-1.5">
                      <EditCell value={r.anio_emision} type="number" editable={ed} bold color={C.green} onSave={guardarCampo(r.id, 'anio_emision')} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <EditCell value={r.norma} editable={ed} bold color={C.green} lines={2} onSave={guardarCampo(r.id, 'norma')} />
                      {r.is_digital && <span className="text-[8.5px] rounded px-1" style={{ background: '#eff6ff', color: '#1d4ed8' }}>DIGITAL</span>}
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-600">
                      <EditCell value={r.ente_emisor} editable={ed} lines={2} onSave={guardarCampo(r.id, 'ente_emisor')} />
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-700">
                      <EditCell value={r.asunto} multiline editable={ed} onSave={guardarCampo(r.id, 'asunto')} />
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-600">
                      <EditCell value={r.articulo} editable={ed} lines={2} onSave={guardarCampo(r.id, 'articulo')} />
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-700">
                      <EditCell value={r.requisito} multiline editable={ed} onSave={guardarCampo(r.id, 'requisito')} />
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-700">
                      <EditCell value={r.evidencia} multiline editable={ed} onSave={guardarCampo(r.id, 'evidencia')} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <RespCell req={r} editable={ed} procesos={procesos} cargosSug={cargosSug} comitesSug={comitesSug} onSave={guardarResp(r)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      {derog
                        ? <EditCell value={r.motivo_derogacion} editable={ed} lines={3} onSave={guardarCampo(r.id, 'motivo_derogacion')} />
                        : <EstadoCelda req={r} onClick={() => setVerif(r)} />}
                    </td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap text-gray-600">
                      {derog ? (r.matriz === 'sst' ? 'SST' : 'General') : (fmtFecha(r.ultima_fecha) || '—')}
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-0.5 justify-end">
                        {!derog && (
                          <button title={puedeVerificar(r) ? 'Verificar / historial' : 'Ver historial'} onClick={() => setVerif(r)}
                            className="p-1 rounded hover:bg-white" style={{ color: puedeVerificar(r) ? C.olive : '#9ca3af' }}>
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button title={ed ? 'Ficha completa (matriz, vigencia, usuarios…)' : 'Ver ficha'} onClick={() => setModal({ mode: ed ? 'edit' : 'view', req: r })}
                          className="p-1 rounded hover:bg-white" style={{ color: C.green }}>
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {can.delete && (
                          <button title="Eliminar" onClick={() => eliminar(r)} className="p-1 rounded hover:bg-white text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filtrados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t" style={{ borderColor: '#eee' }}>
            <span className="text-[11px] text-gray-500">
              Mostrando <b>{(pg - 1) * PAGE + 1}–{Math.min(pg * PAGE, filtrados.length)}</b> de <b>{filtrados.length}</b> norma(s)
            </span>
            <div className="flex items-center gap-1">
              {[
                { icon: ChevronsLeft, to: 1, off: pg === 1 },
                { icon: ChevronLeft, to: pg - 1, off: pg === 1 },
              ].map((b, i) => (
                <button key={i} disabled={b.off} onClick={() => setPage(b.to)} className="p-1 rounded border disabled:opacity-30"><b.icon className="h-3 w-3" /></button>
              ))}
              <span className="px-2 text-[11px] font-medium" style={{ color: C.green }}>{pg} / {totalPages}</span>
              {[
                { icon: ChevronRight, to: pg + 1, off: pg === totalPages },
                { icon: ChevronsRight, to: totalPages, off: pg === totalPages },
              ].map((b, i) => (
                <button key={i} disabled={b.off} onClick={() => setPage(b.to)} className="p-1 rounded border disabled:opacity-30"><b.icon className="h-3 w-3" /></button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modales */}
      <RequisitoModal
        isOpen={!!modal}
        mode={modal?.mode}
        requisito={modal?.req}
        matrizInicial={tab === 'sst' ? 'sst' : 'general'}
        procesos={procesos}
        usuarios={usuarios}
        cargosSugeridos={cargosSug}
        comitesSugeridos={comitesSug}
        onClose={() => setModal(null)}
        onSave={guardar}
      />

      <VerificacionModal
        isOpen={!!verif}
        requisito={verifActual}
        puedeVerificar={puedeVerificar(verifActual)}
        can={can}
        onClose={() => setVerif(null)}
        listarVerificaciones={ml.listarVerificaciones}
        registrarVerificacion={ml.registrarVerificacion}
        eliminarVerificacion={ml.eliminarVerificacion}
        enlazarUltimaAccion={ml.enlazarUltimaAccion}
      />
    </div>
  );
}