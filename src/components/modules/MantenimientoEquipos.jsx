// src/components/modules/MantenimientoEquipos.jsx
// ═══════════════════════════════════════════════════════════════════
// Plan de Mantenimiento — Registro y mantenimiento de equipos
// Diseño fiel a la app de sistemas (GARANA-PCs) con la paleta Garana:
//   Portada  → GESTIONAR / IMPRIMIR + chips + Agregar PC / Mantenimiento
//   Info     → Ficha del equipo + características + historial
//   Mant     → Ficha de mantenimiento (seleccionar fila → editar/eliminar)
//   Imprimir → Hoja de vida formato RE-GR-11 (utils/printHojaVidaEquipo)
//
// Uso: <MantenimientoEquipos tipo="computador" />   (o "maquinaria")
// Permisos: mantenimiento:<computadores|maquinaria>:view/create/edit/delete/export
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import {
  Monitor, Wrench, Printer, ChevronDown, ChevronUp, FileText, Pencil, ArrowLeft,
  Plus, Trash2, Camera, Loader2, Upload, AlertTriangle, CheckCircle2, X, Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useMantenimiento, MANT_CONFIG, ESTADOS_EQUIPO, TIPOS_MANT, ESTADOS_REGISTRO,
  fmtFecha, hoyISO,
} from '@/hooks/useMantenimiento';
import { printHojasVida } from '@/utils/printHojaVidaEquipo';

// ── Paleta Garana ────────────────────────────────────────────────────
const C = {
  green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc',
  dark: '#1a2e25', amber: '#d97706', cream: '#faf9f5',
  chipBg: '#24402f', chipBd: '#3d6b55', chipTx: '#cfeadc',
  text2: '#56625c', text3: '#8a958f', border: '#e3e6df',
};
const LOGO = '/garana1.png';

// ── Piezas visuales (fieles a la app de sistemas) ────────────────────
function Logo({ size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border: `1px solid ${C.mint}`, flexShrink: 0,
      background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <img src={LOGO} alt="Garana" style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
    </div>
  );
}

function BtnW({ children, onClick, danger, disabled, title }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="inline-flex items-center gap-2 rounded-lg font-semibold transition-colors"
      style={{
        background: 'white', color: danger ? '#b02020' : C.dark, border: 'none',
        padding: '7px 12px', fontSize: 13, opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = '#eef6f1'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
    >{children}</button>
  );
}

function Btn({ children, onClick, primary, danger, disabled, type = 'button', full }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg font-medium ${full ? 'w-full justify-center' : ''}`}
      style={{
        padding: '8px 14px', fontSize: 13.5,
        background: primary ? C.green : 'white',
        color: primary ? 'white' : danger ? '#b02020' : C.dark,
        border: `1px solid ${primary ? C.green : danger ? '#e7b4b4' : '#c9cfc6'}`,
        opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{children}</button>
  );
}

function Sec({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: C.green, borderBottom: `2px solid ${C.green}`,
      paddingBottom: 3, margin: '0 0 6px',
    }}>{children}</div>
  );
}

function KV({ k, v, w = 112 }) {
  return (
    <div className="flex gap-2" style={{ padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      <b style={{ width: w, flexShrink: 0, color: C.green, fontWeight: 600, fontSize: 12 }}>{k}</b>
      <span style={{ color: '#1f2937', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
        {v === null || v === undefined || v === '' ? '—' : v}
      </span>
    </div>
  );
}

function Foto({ url, Icon }) {
  return (
    <div style={{
      aspectRatio: '4/3', background: '#f1f3ef', border: `1px solid ${C.border}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
      color: C.text3, overflow: 'hidden', fontSize: 13,
    }}>
      {url
        ? <img src={url} alt="Foto del equipo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <><Icon size={40} /><span>Foto del equipo</span></>}
    </div>
  );
}

function ViewHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center gap-3 flex-wrap" style={{ background: C.dark, color: 'white', padding: '12px 16px' }}>
      <Logo />
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.02em' }}>{title}</div>
        <div style={{ color: C.mint, fontSize: 13, fontWeight: 600 }}>{subtitle}</div>
      </div>
      <span className="flex-1" />
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  );
}

function Field({ label, children, req, span2 }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label style={{ display: 'block', fontSize: 12, color: C.text2, marginBottom: 3 }}>
        {label}{req && ' *'}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-lg text-sm outline-none';
const inputSt = { border: '1px solid #c9cfc6', padding: '8px 10px', background: 'white' };

function TextIn(props) { return <input {...props} className={inputCls} style={inputSt} />; }
function TextArea(props) { return <textarea rows={3} {...props} className={inputCls} style={{ ...inputSt, resize: 'vertical' }} />; }
function SelectIn({ options, placeholder = '—', ...props }) {
  return (
    <select {...props} className={inputCls} style={inputSt}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function FormGroup({ title, color, children }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>
      <p style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color, marginBottom: 8, letterSpacing: '.04em' }}>{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

// ── Formulario vacío / desde equipo ──────────────────────────────────
function emptyEquipo(cfg) {
  const esp = {};
  cfg.especificaciones.forEach((c) => { esp[c.k] = ''; });
  cfg.perifericos.forEach((c) => { esp[c.k] = true; });
  if (cfg.otrosPerifericos) esp.otros = '';
  return {
    codigo: '', tipo_equipo: '', marca: '', modelo: '', serial: '', area: '',
    usuario_responsable: '', estado: 'Bueno', fecha_compra: '', garantia_hasta: '',
    funcion: '', especificaciones: esp, mant_rutinario: '', mant_preventivo: '',
    herramientas: '', observaciones: '', is_active: true,
  };
}

function equipoToForm(eq, cfg) {
  const base = emptyEquipo(cfg);
  const out = { ...base };
  Object.keys(base).forEach((k) => {
    if (k === 'especificaciones') return;
    out[k] = eq[k] ?? base[k];
  });
  out.especificaciones = { ...base.especificaciones, ...(eq.especificaciones || {}) };
  return out;
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function MantenimientoEquipos({ tipo = 'computador' }) {
  const cfg = MANT_CONFIG[tipo];
  const IconEq = tipo === 'computador' ? Monitor : Wrench;
  const { hasPermission } = useAuth();
  const can = {
    view:   hasPermission(`${cfg.perm}:view`),
    create: hasPermission(`${cfg.perm}:create`),
    edit:   hasPermission(`${cfg.perm}:edit`),
    delete: hasPermission(`${cfg.perm}:delete`),
    export: hasPermission(`${cfg.perm}:export`),
  };

  const {
    equipos, registros, fotoUrls, loading, error, fetchAll,
    createEquipo, updateEquipo, deleteEquipo,
    createRegistro, updateRegistro, deleteRegistro, importarJSON,
  } = useMantenimiento(tipo);

  const [view, setView]         = useState('portada');   // portada | info | mant
  const [equipoId, setEquipoId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pick, setPick]         = useState(null);        // null | 'todos' | id
  const [buscar, setBuscar]     = useState('');
  const [selReg, setSelReg]     = useState(null);
  const [msg, setMsg]           = useState(null);

  // Modales
  const [eqModal, setEqModal]     = useState({ open: false, equipo: null });
  const [eqForm, setEqForm]       = useState(emptyEquipo(cfg));
  const [eqFoto, setEqFoto]       = useState({ file: null, preview: null, quitar: false });
  const [eqErr, setEqErr]         = useState('');
  const [regModal, setRegModal]   = useState({ open: false, registro: null });
  const [regForm, setRegForm]     = useState({ fecha: hoyISO(), tipo: '', descripcion: '', tecnico: '', estado: '' });
  const [regErr, setRegErr]       = useState('');
  const [pickModal, setPickModal] = useState(false);
  const [pickVal, setPickVal]     = useState('');
  const [confirm, setConfirm]     = useState(null);      // { title, text, onYes }
  const [saving, setSaving]       = useState(false);

  const fotoEqRef   = useRef(null);
  const fotoMantRef = useRef(null);
  const jsonRef     = useRef(null);

  useEffect(() => { if (can.view) fetchAll(); }, [fetchAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4500); };

  const equipo    = equipos.find((e) => e.id === equipoId) || null;
  const regsDe    = (id) => registros.filter((r) => r.equipo_id === id);
  const pendientes = registros.filter((r) => r.estado === 'Pendiente').length;

  const equiposFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return equipos;
    return equipos.filter((e) =>
      [e.codigo, e.usuario_responsable, e.area, e.tipo_equipo].some((v) => (v || '').toLowerCase().includes(q)));
  }, [equipos, buscar]);

  // ── Sin permiso de ver ─────────────────────────────────────────────
  if (!can.view) {
    return (
      <div className="flex items-start gap-2 py-8 justify-center" style={{ color: C.text3, fontSize: 13 }}>
        <AlertTriangle size={15} style={{ color: C.amber, marginTop: 2 }} />
        No tienes acceso al plan de mantenimiento de {cfg.label.toLowerCase()}. Solicítalo al administrador.
      </div>
    );
  }

  // ── Navegación ─────────────────────────────────────────────────────
  const irA = (v, id = equipoId) => {
    setView(v); setEquipoId(id); setSelReg(null); setMenuOpen(false); setPick(null);
  };

  const imprimir = (lista) => {
    const ok = printHojasVida({ equipos: lista, registros, fotoUrls, config: cfg });
    if (!ok) showMsg('error', 'No se pudo abrir la ventana de impresión. Revisa el bloqueador de ventanas emergentes.');
  };

  // ── Equipo: abrir / guardar / eliminar ─────────────────────────────
  const abrirEquipo = (eq = null) => {
    setEqForm(eq ? equipoToForm(eq, cfg) : emptyEquipo(cfg));
    setEqFoto({ file: null, preview: eq ? (fotoUrls[eq.foto_path] || null) : null, quitar: false });
    setEqErr('');
    setEqModal({ open: true, equipo: eq });
  };

  const setE  = (k, v) => setEqForm((p) => ({ ...p, [k]: v }));
  const setEs = (k, v) => setEqForm((p) => ({ ...p, especificaciones: { ...p.especificaciones, [k]: v } }));

  const onFotoEquipo = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setEqErr('El archivo debe ser una imagen.'); return; }
    setEqFoto({ file: f, preview: URL.createObjectURL(f), quitar: false });
  };

  const guardarEquipo = async () => {
    if (!eqForm.codigo.trim()) { setEqErr('El código del equipo es obligatorio.'); return; }
    if (eqForm.fecha_compra && eqForm.garantia_hasta && eqForm.garantia_hasta < eqForm.fecha_compra) {
      setEqErr('La garantía no puede terminar antes de la fecha de compra.'); return;
    }
    setSaving(true); setEqErr('');
    const eq = eqModal.equipo;
    const r = eq
      ? await updateEquipo(eq, eqForm, { fotoFile: eqFoto.file, quitarFoto: eqFoto.quitar })
      : await createEquipo(eqForm, eqFoto.file);
    setSaving(false);
    if (!r.success) { setEqErr(r.error); return; }
    setEqModal({ open: false, equipo: null });
    showMsg('success', eq ? 'Equipo actualizado.' : 'Equipo registrado.');
    if (!eq && r.id) irA('info', r.id);
  };

  const pedirEliminarEquipo = (eq) => {
    setConfirm({
      title: `¿Eliminar el equipo ${eq.codigo}?`,
      text: 'Se eliminarán también su foto y todo su historial de mantenimiento. Esta acción no se puede deshacer.',
      onYes: async () => {
        const r = await deleteEquipo(eq);
        if (r.success) {
          setEqModal({ open: false, equipo: null });
          irA('portada', null);
          showMsg('success', `Equipo ${eq.codigo} eliminado.`);
        } else showMsg('error', r.error);
      },
    });
  };

  // Cambiar foto desde la ficha de mantenimiento
  const onFotoMant = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !equipo) return;
    setSaving(true);
    const r = await updateEquipo(equipo, equipoToForm(equipo, cfg), { fotoFile: f });
    setSaving(false);
    showMsg(r.success ? 'success' : 'error', r.success ? 'Foto actualizada.' : r.error);
  };

  // ── Registro: abrir / guardar / eliminar ───────────────────────────
  const abrirRegistro = (reg = null) => {
    setRegForm(reg
      ? { fecha: reg.fecha, tipo: reg.tipo, descripcion: reg.descripcion, tecnico: reg.tecnico || '', estado: reg.estado }
      : { fecha: hoyISO(), tipo: '', descripcion: '', tecnico: '', estado: '' });
    setRegErr('');
    setRegModal({ open: true, registro: reg });
  };

  const setR = (k, v) => setRegForm((p) => ({ ...p, [k]: v }));

  const guardarRegistro = async () => {
    if (!regForm.fecha || !regForm.tipo || !regForm.descripcion.trim() || !regForm.tecnico.trim() || !regForm.estado) {
      setRegErr('Todos los campos son obligatorios.'); return;
    }
    setSaving(true); setRegErr('');
    const reg = regModal.registro;
    const r = reg ? await updateRegistro(reg.id, regForm) : await createRegistro(equipoId, regForm);
    setSaving(false);
    if (!r.success) { setRegErr(r.error); return; }
    setRegModal({ open: false, registro: null });
    setSelReg(null);
    showMsg('success', reg ? 'Registro actualizado.' : 'Registro de mantenimiento guardado.');
  };

  const pedirEliminarRegistro = () => {
    const reg = registros.find((r) => r.id === selReg);
    if (!reg) { showMsg('error', 'Selecciona primero la fila a eliminar.'); return; }
    setConfirm({
      title: '¿Eliminar este registro?',
      text: `${fmtFecha(reg.fecha)} · ${reg.tipo} · ${reg.descripcion}`,
      onYes: async () => {
        const r = await deleteRegistro(reg.id);
        setSelReg(null);
        showMsg(r.success ? 'success' : 'error', r.success ? 'Registro eliminado.' : r.error);
      },
    });
  };

  // ── Importar JSON de la app de sistemas ────────────────────────────
  const onImportJSON = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      setSaving(true);
      const r = await importarJSON(json);
      setSaving(false);
      const partes = [`${r.creados} equipo(s) importado(s)`, `${r.mantenimientos} mantenimiento(s)`];
      if (r.omitidos.length) partes.push(`omitidos por código repetido: ${r.omitidos.join(', ')}`);
      if (r.errores.length) partes.push(`errores: ${r.errores.join(' | ')}`);
      showMsg(r.errores.length ? 'error' : 'success', partes.join(' · '));
    } catch {
      setSaving(false);
      showMsg('error', 'El archivo no es un JSON válido.');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  //  VISTAS
  // ══════════════════════════════════════════════════════════════════
  const n = equipos.length;
  const nm = registros.length;

  const Portada = () => {
    const nomPick = pick === 'todos' ? 'Todos los equipos' : equipos.find((e) => e.id === pick)?.codigo;
    return (
      <div style={{
        position: 'relative', background: C.dark, color: 'white', borderRadius: 14,
        minHeight: 480, padding: '30px 18px 110px', display: 'flex', justifyContent: 'center',
      }}>
        <div className="flex flex-col items-center gap-2 w-full">
          <Logo size={84} />
          <h1 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: '.4px', lineHeight: 1.3 }}>
            REGISTRO Y MANTENIMIENTO<br />DE {cfg.label.toUpperCase()}
          </h1>
          <div style={{ color: C.mint, fontSize: 15, letterSpacing: '.4px' }}>INDECON S.A.S</div>

          {/* GESTIONAR / IMPRIMIR */}
          <div className="flex flex-col items-center w-full" style={{ marginTop: 14 }}>
            <BtnW onClick={() => { setMenuOpen(!menuOpen); setPick(null); setBuscar(''); }}>
              <Printer size={16} /> GESTIONAR / IMPRIMIR {menuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </BtnW>

            {menuOpen && (
              <div className="flex gap-2 flex-wrap justify-center items-start" style={{ marginTop: 10 }}>
                <div style={{ background: 'white', color: '#1f2937', border: '1px solid #b8c3bd', borderRadius: 10, minWidth: 230, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', fontSize: 12, color: C.text3, borderBottom: `1px solid ${C.border}` }}>
                    {n} equipo{n === 1 ? '' : 's'} en sistema
                  </div>
                  {n > 8 && (
                    <div className="relative" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <Search size={13} className="absolute" style={{ left: 12, top: 11, color: C.text3 }} />
                      <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar..."
                        style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: 13, outline: 'none', border: 'none' }} />
                    </div>
                  )}
                  <div style={{ maxHeight: 230, overflowY: 'auto' }}>
                    {!n ? (
                      <div style={{ padding: 14, color: C.text3, fontSize: 13, maxWidth: 260, textAlign: 'center' }}>
                        No hay equipos registrados.<br />Usa el botón <b>Agregar</b> para iniciar.
                      </div>
                    ) : (
                      <>
                        <DDItem sel={pick === 'todos'} italic onClick={() => setPick('todos')}>Todos los equipos</DDItem>
                        {equiposFiltrados.map((e) => (
                          <DDItem key={e.id} sel={pick === e.id} onClick={() => setPick(e.id)}>
                            {e.codigo}
                            {!e.is_active && <span style={{ fontSize: 11, color: C.amber, marginLeft: 6 }}>(de baja)</span>}
                          </DDItem>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {pick !== null && (
                  <div style={{ background: 'white', color: '#1f2937', border: `1px solid ${C.mint}`, borderRadius: 10, minWidth: 250, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', fontSize: 12, color: C.text3, borderBottom: `1px solid ${C.border}` }}>{nomPick}</div>
                    <PopBtn disabled={pick === 'todos'} onClick={() => irA('info', pick)}
                      icon={<FileText size={20} />}
                      label="Ver información y mantenimientos"
                      hint={pick === 'todos' ? 'Selecciona un equipo de la lista' : null} />
                    <PopBtn disabled={!can.export} onClick={() => imprimir(pick === 'todos' ? equipos : equipos.filter((e) => e.id === pick))}
                      icon={<Printer size={20} />}
                      label="Imprimir o guardar PDF"
                      hint={!can.export ? 'Sin permiso de exportar' : 'Formato RE-GR-11'} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chips */}
          <div className="flex gap-2 flex-wrap justify-center" style={{ marginTop: 22 }}>
            <Chip>{n} equipo{n === 1 ? '' : 's'}</Chip>
            <Chip>{nm} mantenimiento{nm === 1 ? '' : 's'}</Chip>
            <Chip warn={pendientes > 0}>{pendientes} pendiente{pendientes === 1 ? '' : 's'}</Chip>
          </div>
        </div>

        {/* Botones de esquina */}
        <div className="absolute flex gap-4" style={{ left: 16, bottom: 16 }}>
          {can.create && (
            <CornerBtn icon={<IconEq size={24} />} label={`Agregar ${tipo === 'computador' ? 'PC' : 'máquina'}`} onClick={() => abrirEquipo(null)} />
          )}
          <CornerBtn icon={<Wrench size={22} />} label="Mantenimiento"
            onClick={() => { if (!n) { showMsg('error', 'Primero registra un equipo.'); return; } setPickVal(''); setPickModal(true); }} />
        </div>

        {/* Importar JSON (app de sistemas) */}
        {can.create && tipo === 'computador' && (
          <div className="absolute" style={{ right: 16, bottom: 16 }}>
            <button type="button" onClick={() => jsonRef.current?.click()}
              className="flex items-center gap-1.5" title="Importar garana_datos.json de la app anterior"
              style={{ background: 'transparent', border: `1px solid ${C.chipBd}`, color: C.chipTx, borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
              <Upload size={14} /> Importar datos (.json)
            </button>
            <input ref={jsonRef} type="file" accept="application/json,.json" hidden onChange={onImportJSON} />
          </div>
        )}
      </div>
    );
  };

  const Info = () => {
    if (!equipo) return null;
    const sp = equipo.especificaciones || {};
    const regs = regsDe(equipo.id);
    return (
      <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <ViewHeader title={equipo.codigo} subtitle="Información del equipo y mantenimientos">
          {can.edit && <BtnW onClick={() => abrirEquipo(equipo)}><Pencil size={15} />Editar equipo</BtnW>}
          <BtnW onClick={() => irA('mant')}><Wrench size={15} />Ficha Mantenimiento</BtnW>
          {can.export && <BtnW onClick={() => imprimir([equipo])}><Printer size={15} />Imprimir</BtnW>}
          <BtnW onClick={() => irA('portada', null)}><ArrowLeft size={15} />Volver</BtnW>
        </ViewHeader>

        <div className="grid gap-4 p-4" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <Foto url={fotoUrls[equipo.foto_path]} Icon={IconEq} />
              <div style={{ marginTop: 12 }}>
                <KV k="Tipo de equipo" v={equipo.tipo_equipo} />
                <KV k="Marca / Modelo" v={[equipo.marca, equipo.modelo].filter(Boolean).join(' · ')} />
                <KV k="Usuario responsable" v={equipo.usuario_responsable} />
                <KV k="Área / Localización" v={equipo.area} />
                <KV k="Estado general" v={<EstadoTag v={equipo.estado} />} />
                <KV k="Número de serie" v={equipo.serial} />
                <KV k="Fecha de compra" v={fmtFecha(equipo.fecha_compra)} />
                <KV k="Garantía hasta" v={<GarantiaTag f={equipo.garantia_hasta} />} />
                <KV k="Fecha de registro" v={fmtFecha(equipo.created_at)} />
              </div>
            </div>

            <div className="space-y-4" style={{ minWidth: 0 }}>
              {(cfg.especificaciones.length > 0 || cfg.perifericos.length > 0) && (
                <div>
                  <Sec>Características técnicas y periféricos</Sec>
                  <div className="grid sm:grid-cols-2 gap-x-5">
                    {cfg.especificaciones.map((c) => <KV key={c.k} k={c.l} v={sp[c.k]} />)}
                    {cfg.perifericos.map((c) => <KV key={c.k} k={c.l} v={sp[c.k] ? 'SI' : 'NO'} />)}
                    {cfg.otrosPerifericos && <KV k="Otros periféricos" v={sp.otros} />}
                  </div>
                </div>
              )}

              <div>
                <Sec>Características y mantenimiento (RE-GR-11)</Sec>
                <KV k="Función" v={equipo.funcion} />
                <div className="grid sm:grid-cols-2 gap-x-5">
                  <KV k="Mant. rutinario" v={equipo.mant_rutinario} />
                  <KV k="Mant. preventivo" v={equipo.mant_preventivo} />
                </div>
                <KV k="Herramientas" v={equipo.herramientas} />
                {equipo.observaciones && <KV k="Observaciones" v={equipo.observaciones} />}
              </div>

              <div>
                <Sec>Historial de mantenimiento</Sec>
                <TablaRegistros regs={regs} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Mant = () => {
    if (!equipo) return null;
    const regs = regsDe(equipo.id);
    return (
      <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <ViewHeader title="FICHA DE MANTENIMIENTO" subtitle={equipo.codigo}>
          {can.delete && <BtnW danger disabled={!selReg} onClick={pedirEliminarRegistro} title={!selReg ? 'Selecciona una fila' : ''}><Trash2 size={15} />Eliminar registro</BtnW>}
          {can.edit && <BtnW disabled={!selReg} onClick={() => abrirRegistro(registros.find((r) => r.id === selReg))} title={!selReg ? 'Selecciona una fila' : ''}><Pencil size={15} />Editar registro</BtnW>}
          {can.create && <BtnW onClick={() => abrirRegistro(null)}><Plus size={15} />Nuevo registro</BtnW>}
          {can.export && <BtnW onClick={() => imprimir([equipo])}><Printer size={15} />Imprimir</BtnW>}
          <BtnW onClick={() => irA('info')}><ArrowLeft size={15} />Volver</BtnW>
        </ViewHeader>

        <div className="grid gap-4 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <Foto url={fotoUrls[equipo.foto_path]} Icon={IconEq} />
            {can.edit && (
              <>
                <div style={{ marginTop: 8 }}>
                  <Btn full onClick={() => fotoMantRef.current?.click()} disabled={saving}>
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}Agregar / cambiar foto
                  </Btn>
                </div>
                <input ref={fotoMantRef} type="file" accept="image/*" hidden onChange={onFotoMant} />
              </>
            )}
            <div style={{ marginTop: 12 }}>
              <KV k="Tipo de equipo" v={equipo.tipo_equipo} />
              <KV k="Usuario" v={equipo.usuario_responsable} />
              <KV k="Área" v={equipo.area} />
              <KV k="N.° de serie" v={equipo.serial} />
              <KV k="Estado general" v={<EstadoTag v={equipo.estado} />} />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <TablaRegistros regs={regs} selectable selId={selReg} onSel={(id) => setSelReg(id === selReg ? null : id)} />
            <p style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>
              {regs.length} registro{regs.length === 1 ? '' : 's'}.
              {(can.edit || can.delete) && ' Selecciona una fila para editarla o eliminarla.'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-3">
      {msg && (
        <div className="flex items-start gap-2" style={{
          borderRadius: 10, padding: '9px 12px', fontSize: 13,
          background: msg.type === 'error' ? '#fef3e2' : '#eef8f2',
          border: `1px solid ${msg.type === 'error' ? '#f3c98b' : C.mint}`,
          color: msg.type === 'error' ? '#854f0b' : C.green,
        }}>
          {msg.type === 'error' ? <AlertTriangle size={15} style={{ marginTop: 2 }} /> : <CheckCircle2 size={15} style={{ marginTop: 2 }} />}
          <span style={{ flex: 1 }}>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)}><X size={14} /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2" style={{ color: '#854f0b', background: '#fef3e2', borderRadius: 10, padding: '9px 12px', fontSize: 13 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading && !equipos.length ? (
        <div className="flex items-center justify-center gap-2 py-16" style={{ color: C.text3, fontSize: 13 }}>
          <Loader2 size={18} className="animate-spin" style={{ color: C.mint }} /> Cargando equipos…
        </div>
      ) : (
        <>
          {view === 'portada' && Portada()}
          {view === 'info' && Info()}
          {view === 'mant' && Mant()}
        </>
      )}

      {saving && view === 'portada' && (
        <div className="flex items-center gap-2" style={{ fontSize: 12.5, color: C.text2 }}>
          <Loader2 size={14} className="animate-spin" /> Procesando…
        </div>
      )}

      {/* ─── MODAL: Agregar / Editar equipo ─── */}
      <Dialog open={eqModal.open} onOpenChange={(o) => { if (!o && !saving) setEqModal({ open: false, equipo: null }); }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <div>
            <DialogTitle style={{ fontSize: 18, color: C.dark }}>
              {eqModal.equipo ? 'Editar equipo' : `Agregar ${cfg.singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: C.text2 }}>
              Completa los campos requeridos y pulsa Guardar.
            </DialogDescription>
          </div>

          {/* Foto */}
          <div className="flex items-start gap-3">
            <div style={{ width: 130, aspectRatio: '4/3', background: '#f1f3ef', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3 }}>
              {eqFoto.preview && !eqFoto.quitar
                ? <img src={eqFoto.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <IconEq size={30} />}
            </div>
            <div className="flex flex-col gap-2">
              <Btn onClick={() => fotoEqRef.current?.click()}><Camera size={15} />{eqFoto.preview && !eqFoto.quitar ? 'Cambiar foto' : 'Agregar foto'}</Btn>
              {eqFoto.preview && !eqFoto.quitar && (
                <Btn onClick={() => setEqFoto({ file: null, preview: null, quitar: true })}>Quitar foto</Btn>
              )}
              <span style={{ fontSize: 11.5, color: C.text3 }}>Foto optimizada automáticamente.</span>
              <input ref={fotoEqRef} type="file" accept="image/*" hidden onChange={onFotoEquipo} />
            </div>
          </div>

          <div className="space-y-4">
            <FormGroup title="Identificación" color={C.green}>
              <Field label="Código del equipo" req>
                <TextIn value={eqForm.codigo} onChange={(e) => setE('codigo', e.target.value.toUpperCase())} placeholder="Ej: EC-CO-01" />
              </Field>
              <Field label="Tipo de equipo">
                {cfg.tiposEquipo.length
                  ? <SelectIn options={cfg.tiposEquipo} value={eqForm.tipo_equipo} onChange={(e) => setE('tipo_equipo', e.target.value)} />
                  : <TextIn value={eqForm.tipo_equipo} onChange={(e) => setE('tipo_equipo', e.target.value)} />}
              </Field>
              <Field label="Marca"><TextIn value={eqForm.marca} onChange={(e) => setE('marca', e.target.value)} /></Field>
              <Field label="Modelo"><TextIn value={eqForm.modelo} onChange={(e) => setE('modelo', e.target.value)} /></Field>
              <Field label="Número de serie"><TextIn value={eqForm.serial} onChange={(e) => setE('serial', e.target.value)} /></Field>
              <Field label="Área / Localización">
                <TextIn list={`areas-${tipo}`} value={eqForm.area} onChange={(e) => setE('area', e.target.value)} placeholder="Elige o escribe" />
                <datalist id={`areas-${tipo}`}>{cfg.areas.map((a) => <option key={a} value={a} />)}</datalist>
              </Field>
              <Field label="Usuario responsable"><TextIn value={eqForm.usuario_responsable} onChange={(e) => setE('usuario_responsable', e.target.value)} /></Field>
              <Field label="Estado general">
                <SelectIn options={ESTADOS_EQUIPO} value={eqForm.estado} onChange={(e) => setE('estado', e.target.value || 'Bueno')} />
              </Field>
              <Field label="Fecha de compra"><TextIn type="date" value={eqForm.fecha_compra || ''} onChange={(e) => setE('fecha_compra', e.target.value)} /></Field>
              <Field label="Garantía hasta"><TextIn type="date" value={eqForm.garantia_hasta || ''} onChange={(e) => setE('garantia_hasta', e.target.value)} /></Field>
            </FormGroup>

            {(cfg.especificaciones.length > 0 || cfg.perifericos.length > 0) && (
              <FormGroup title="Características técnicas y periféricos" color={C.olive}>
                {cfg.especificaciones.map((c) => (
                  <Field key={c.k} label={c.l}>
                    <TextIn value={eqForm.especificaciones[c.k] || ''} onChange={(e) => setEs(c.k, e.target.value)} />
                  </Field>
                ))}
                {cfg.perifericos.map((c) => (
                  <Field key={c.k} label={c.l}>
                    <select className={inputCls} style={inputSt}
                      value={eqForm.especificaciones[c.k] ? 'SI' : 'NO'}
                      onChange={(e) => setEs(c.k, e.target.value === 'SI')}>
                      <option>SI</option><option>NO</option>
                    </select>
                  </Field>
                ))}
                {cfg.otrosPerifericos && (
                  <Field label="Otros periféricos" span2>
                    <TextIn value={eqForm.especificaciones.otros || ''} onChange={(e) => setEs('otros', e.target.value)} />
                  </Field>
                )}
              </FormGroup>
            )}
            {tipo === 'computador' && (
              <p style={{ fontSize: 11.5, color: C.amber, marginTop: -8 }}>
                ⚠ No registres claves de licencia; solo el nombre del producto (ej. "Kaspersky").
              </p>
            )}

            <FormGroup title="Características y mantenimiento (RE-GR-11)" color={C.mint}>
              <Field label="Función" span2><TextArea value={eqForm.funcion} onChange={(e) => setE('funcion', e.target.value)} placeholder="¿Para qué se usa el equipo?" /></Field>
              <Field label="Mantenimiento rutinario"><TextArea value={eqForm.mant_rutinario} onChange={(e) => setE('mant_rutinario', e.target.value)} placeholder="Ej: limpieza externa semanal" /></Field>
              <Field label="Mantenimiento preventivo"><TextArea value={eqForm.mant_preventivo} onChange={(e) => setE('mant_preventivo', e.target.value)} placeholder="Ej: limpieza interna semestral" /></Field>
              <Field label="Herramientas" span2><TextIn value={eqForm.herramientas} onChange={(e) => setE('herramientas', e.target.value)} /></Field>
              <Field label="Observaciones" span2><TextArea rows={2} value={eqForm.observaciones} onChange={(e) => setE('observaciones', e.target.value)} /></Field>
              {eqModal.equipo && (
                <label className="flex items-center gap-2 sm:col-span-2" style={{ fontSize: 13, color: C.text2 }}>
                  <input type="checkbox" checked={!eqForm.is_active} onChange={(e) => setE('is_active', !e.target.checked)} />
                  Equipo dado de baja (conserva su historial)
                </label>
              )}
            </FormGroup>
          </div>

          {eqErr && <ErrBox>{eqErr}</ErrBox>}

          <div className="flex items-center gap-2 flex-wrap pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            {eqModal.equipo && can.delete && (
              <Btn danger onClick={() => pedirEliminarEquipo(eqModal.equipo)} disabled={saving}><Trash2 size={15} />Eliminar equipo</Btn>
            )}
            <span className="flex-1" />
            <Btn onClick={() => setEqModal({ open: false, equipo: null })} disabled={saving}><ArrowLeft size={15} />Cancelar</Btn>
            <Btn primary onClick={guardarEquipo} disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}Guardar
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Nuevo / Editar registro ─── */}
      <Dialog open={regModal.open} onOpenChange={(o) => { if (!o && !saving) setRegModal({ open: false, registro: null }); }}>
        <DialogContent className="sm:max-w-xl">
          <div>
            <DialogTitle style={{ fontSize: 18, color: C.dark }}>
              {regModal.registro ? 'Editar registro de mantenimiento' : 'Nuevo registro de mantenimiento'}
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: C.text2 }}>
              {equipo?.codigo} · todos los campos son obligatorios.
            </DialogDescription>
          </div>
          <div className="space-y-3">
            <Field label="Fecha"><TextIn type="date" value={regForm.fecha} onChange={(e) => setR('fecha', e.target.value)} /></Field>
            <Field label="Tipo"><SelectIn options={TIPOS_MANT} value={regForm.tipo} onChange={(e) => setR('tipo', e.target.value)} /></Field>
            <Field label="Trabajo realizado"><TextArea rows={4} value={regForm.descripcion} onChange={(e) => setR('descripcion', e.target.value)} /></Field>
            <Field label="Técnico"><TextIn value={regForm.tecnico} onChange={(e) => setR('tecnico', e.target.value)} placeholder="Interno o externo" /></Field>
            <Field label="Estado"><SelectIn options={ESTADOS_REGISTRO} value={regForm.estado} onChange={(e) => setR('estado', e.target.value)} /></Field>
          </div>
          {regErr && <ErrBox>{regErr}</ErrBox>}
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setRegModal({ open: false, registro: null })} disabled={saving}><ArrowLeft size={15} />Cancelar</Btn>
            <Btn primary onClick={guardarRegistro} disabled={saving}>{saving && <Loader2 size={15} className="animate-spin" />}Guardar</Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Elegir equipo para mantenimiento ─── */}
      <Dialog open={pickModal} onOpenChange={setPickModal}>
        <DialogContent className="sm:max-w-md">
          <div>
            <DialogTitle style={{ fontSize: 18, color: C.dark }}>Mantenimiento</DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: C.text2 }}>Elige el equipo para abrir su ficha de mantenimiento.</DialogDescription>
          </div>
          <Field label="Equipo">
            <select className={inputCls} style={inputSt} value={pickVal} onChange={(e) => setPickVal(e.target.value)}>
              <option value="">Elige un equipo</option>
              {equipos.map((e) => <option key={e.id} value={e.id}>{e.codigo}{e.usuario_responsable ? ` — ${e.usuario_responsable}` : ''}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setPickModal(false)}>Cancelar</Btn>
            <Btn primary disabled={!pickVal} onClick={() => { setPickModal(false); irA('mant', pickVal); }}>Abrir ficha</Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Confirmación ─── */}
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o && !saving) setConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <div>
            <DialogTitle style={{ fontSize: 17, color: C.dark }}>{confirm?.title}</DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>{confirm?.text}</DialogDescription>
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setConfirm(null)} disabled={saving}>No</Btn>
            <Btn danger disabled={saving} onClick={async () => {
              setSaving(true);
              await confirm.onYes();
              setSaving(false);
              setConfirm(null);
            }}>{saving && <Loader2 size={15} className="animate-spin" />}Sí, eliminar</Btn>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────────
function DDItem({ children, sel, italic, onClick }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={{
        padding: '10px 14px', fontSize: 14, cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
        fontStyle: italic ? 'italic' : 'normal',
        background: sel ? '#e3f3ea' : 'white', color: sel ? C.green : '#1f2937', fontWeight: sel ? 700 : 400,
      }}
      onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = '#f3f5f1'; }}
      onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'white'; }}
    >{children}</div>
  );
}

function PopBtn({ icon, label, hint, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex gap-2.5 items-start w-full text-left"
      style={{
        padding: '12px 14px', fontSize: 14, borderBottom: `1px solid ${C.border}`, background: 'white',
        color: disabled ? C.text3 : '#1f2937', cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      <span style={{ color: disabled ? C.text3 : C.green }}>{icon}</span>
      <span>{label}{hint && <><br /><small style={{ color: C.text3 }}>{hint}</small></>}</span>
    </button>
  );
}

function Chip({ children, warn }) {
  return (
    <span style={{
      fontSize: 12, padding: '4px 12px', borderRadius: 8,
      background: warn ? '#4a3510' : C.chipBg, color: warn ? '#f6c77a' : C.chipTx,
      border: `1px solid ${warn ? '#8a6420' : C.chipBd}`,
    }}>{children}</span>
  );
}

function CornerBtn({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5"
      style={{ background: 'none', border: 'none', color: C.chipTx, fontSize: 12, padding: 0 }}>
      <span className="flex items-center justify-center" style={{
        width: 52, height: 52, borderRadius: '50%', background: C.chipBg, border: `1px solid ${C.chipBd}`, color: C.mint,
      }}>{icon}</span>
      {label}
    </button>
  );
}

function EstadoTag({ v }) {
  const col = v === 'Malo' ? C.amber : v === 'Regular' ? C.olive : C.green;
  return <span style={{ color: col, fontWeight: 600 }}>{v || '—'}</span>;
}

function GarantiaTag({ f }) {
  if (!f) return '—';
  const hoy = hoyISO();
  const vencida = f < hoy;
  return (
    <span>
      {fmtFecha(f)}
      {vencida && <span style={{ marginLeft: 6, fontSize: 11, color: C.amber, fontWeight: 600 }}>(vencida)</span>}
    </span>
  );
}

function ErrBox({ children }) {
  return (
    <div className="flex items-start gap-2" style={{ background: '#fef3e2', border: '1px solid #f3c98b', color: '#854f0b', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
      <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0 }} /> {children}
    </div>
  );
}

function TablaRegistros({ regs, selectable, selId, onSel }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Fecha', 'Tipo', 'Trabajo realizado', 'Técnico', 'Estado', 'Registró'].map((h) => (
              <th key={h} style={{ background: C.green, color: 'white', textAlign: 'left', padding: '9px 10px', fontWeight: 600, border: `1px solid ${C.green}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regs.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: '10px', color: C.text3, border: `1px solid ${C.border}` }}>Sin registros de mantenimiento.</td></tr>
          ) : regs.map((r) => {
            const sel = selectable && selId === r.id;
            return (
              <tr key={r.id}
                onClick={selectable ? () => onSel(r.id) : undefined}
                style={{ cursor: selectable ? 'pointer' : 'default', background: sel ? '#e3f3ea' : 'white', outline: sel ? `2px solid ${C.mint}` : 'none' }}>
                <td style={td}>{fmtFecha(r.fecha)}</td>
                <td style={td}>{r.tipo}</td>
                <td style={{ ...td, minWidth: 200 }}>{r.descripcion}</td>
                <td style={td}>{r.tecnico || '—'}</td>
                <td style={{ ...td, color: r.estado === 'Pendiente' ? C.amber : C.green, fontWeight: 600 }}>{r.estado}</td>
                <td style={{ ...td, fontSize: 12, color: C.text2 }}>{r.registrado?.full_name || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const td = { padding: '9px 10px', border: `1px solid ${C.border}`, verticalAlign: 'top' };