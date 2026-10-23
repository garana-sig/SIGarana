// src/components/modules/MejoramientoContinuo/ActosInseguros/ActosInsegurosManager.jsx
// ═══════════════════════════════════════════════════════════════════
// Registro de Actos / Condiciones Inseguras o de Salud — RE-GS-02 (oct 2026)
//   Bandeja  → reportes iniciales de "Ayúdanos a mejorar" (tipo acto_inseguro)
//   Registros → formatos diligenciados (reg_acto_inseguro) + Excel oficial
// Código/versión/plantilla: formato vinculado 'registro_actos_inseguros'.
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Inbox, FileSpreadsheet, Search, Loader2, AlertTriangle, Camera, UserX,
  X, Clock, CheckCircle2, Ban, PenLine, Plus, Download, History,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useFormato, etiquetaFormato } from '@/hooks/useFormatoVinculado';
import { useActosInseguros, EPP_OPCIONES, ESTADOS, urlFoto } from '@/hooks/useActosInseguros';
import { exportActoInseguro } from '@/utils/exportActoInseguro';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25', red: '#dc2626' };
const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hoyISO = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);   // Colombia
const fmtFecha = (s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const fmtFechaHora = (s) => s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function Badge({ status }) {
  const e = ESTADOS[status] || ESTADOS.nuevo;
  return <span style={{ fontSize: 11, fontWeight: 700, color: e.color, background: e.bg, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{e.label}</span>;
}

function Modal({ titulo, sub, onClose, children, ancho = 640 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: 'rgba(26,46,37,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth: ancho, maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3" style={{ background: C.green, padding: '14px 18px', borderRadius: '16px 16px 0 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15.5, margin: 0 }}>{titulo}</p>
            {sub && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>{sub}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: 30, height: 30 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: C.green, margin: '12px 0 5px' };
const inp = { width: '100%', border: `1px solid ${C.sand}`, borderRadius: 10, padding: '8px 10px', fontSize: 13.5, outline: 'none', background: 'white' };

// ─── Formulario RE-GS-02 ────────────────────────────────────────────
function FormRegistro({ formato, reporte, registro, onClose, onGuardar }) {
  const anonimo = reporte?.is_anonimo || registro?.reporte?.is_anonimo;
  const [f, setF] = useState(() => registro ? {
    fecha: registro.fecha, reportado_por: registro.reportado_por, area: registro.area || '',
    es_acto_inseguro: registro.es_acto_inseguro, es_condicion_insegura: registro.es_condicion_insegura,
    es_condicion_salud: registro.es_condicion_salud, descripcion: registro.descripcion,
    epp_omitidos: registro.epp_omitidos || [], epp_otro: registro.epp_otro || '', correctivos: registro.correctivos || '',
  } : {
    fecha: reporte ? String(reporte.created_at).slice(0, 10) : hoyISO(),
    reportado_por: reporte ? (reporte.is_anonimo ? 'Anónimo' : reporte.autor?.full_name || '') : '',
    area: reporte?.area || '', es_acto_inseguro: false, es_condicion_insegura: false, es_condicion_salud: false,
    descripcion: reporte?.descripcion || '', epp_omitidos: [], epp_otro: '', correctivos: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleEpp = (k) => set('epp_omitidos', f.epp_omitidos.includes(k) ? f.epp_omitidos.filter((x) => x !== k) : [...f.epp_omitidos, k]);

  const guardar = async () => {
    if (!f.es_acto_inseguro && !f.es_condicion_insegura && !f.es_condicion_salud) { setErr('Marca qué se reporta: acto inseguro, condición insegura o condición de salud.'); return; }
    if (f.descripcion.trim().length < 5) { setErr('La descripción es obligatoria.'); return; }
    if (!anonimo && !f.reportado_por.trim()) { setErr('Escribe el nombre de quien reporta.'); return; }
    setSaving(true); setErr(null);
    try { await onGuardar({ ...f, reporte_id: reporte?.id }, registro?.id); }
    catch (e) { setErr(e.message); setSaving(false); }
  };

  const Check = ({ checked, onChange, children }) => (
    <label className="flex items-center gap-2" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, background: checked ? `${C.mint}1f` : 'transparent' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 16, height: 16, accentColor: C.green }} /> {children}
    </label>
  );

  return (
    <Modal titulo={registro ? `Registro ${registro.numero}` : 'Diligenciar formato'}
      sub={`${etiquetaFormato(formato)} · Reporte de actos y/o condiciones inseguras o condiciones de salud`}
      onClose={onClose} ancho={720}>
      {reporte && (
        <p style={{ fontSize: 12.5, background: '#f6f6ef', borderRadius: 10, padding: '8px 12px', margin: 0, color: '#4b5563' }}>
          Desde el reporte <b>{reporte.consecutivo}</b>: el número del formato será el mismo consecutivo.
        </p>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
        <div>
          <label style={lbl}>Nombre de quien reporta</label>
          <input style={{ ...inp, background: anonimo ? '#f3f4f6' : 'white' }} value={anonimo ? 'Anónimo' : f.reportado_por} disabled={anonimo}
            onChange={(e) => set('reportado_por', e.target.value)} placeholder="Nombre" />
        </div>
        <div><label style={lbl}>Área</label><input style={inp} value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="Área o proceso" /></div>
      </div>

      <label style={lbl}>¿Qué se reporta? *</label>
      <div className="flex flex-wrap gap-1">
        <Check checked={f.es_acto_inseguro} onChange={(e) => set('es_acto_inseguro', e.target.checked)}>Acto inseguro</Check>
        <Check checked={f.es_condicion_insegura} onChange={(e) => set('es_condicion_insegura', e.target.checked)}>Condición insegura</Check>
        <Check checked={f.es_condicion_salud} onChange={(e) => set('es_condicion_salud', e.target.checked)}>Condición de salud</Check>
      </div>

      <label style={lbl}>Descripción del acto y/o condición insegura o condición de salud *</label>
      <textarea rows={4} style={{ ...inp, resize: 'vertical' }} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />

      <label style={lbl}>Omisión de uso de elementos de protección personal y normas de seguridad</label>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 2 }}>
        {EPP_OPCIONES.map((o) => (
          <Check key={o.key} checked={f.epp_omitidos.includes(o.key)} onChange={() => toggleEpp(o.key)}>{o.label}</Check>
        ))}
      </div>
      {f.epp_omitidos.includes('otro') && (
        <input style={{ ...inp, marginTop: 6 }} value={f.epp_otro} onChange={(e) => set('epp_otro', e.target.value)} placeholder="¿Cuál?" />
      )}

      <label style={lbl}>Correctivos emprendidos o propuestos / comportamiento a mejorar</label>
      <textarea rows={4} style={{ ...inp, resize: 'vertical' }} value={f.correctivos} onChange={(e) => set('correctivos', e.target.value)} />

      {err && <p style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, marginTop: 12 }}>{err}</p>}
      <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={guardar} disabled={saving} style={{ background: C.green, color: 'white' }}>
          {saving ? 'Guardando…' : registro ? 'Guardar cambios' : 'Guardar registro'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Detalle de un reporte de la bandeja ────────────────────────────
function DetalleReporte({ reporte, registro, onClose, onEstado, onDiligenciar, onVerRegistro }) {
  const [foto, setFoto] = useState(undefined);   // undefined = cargando · null = no disponible
  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState(null);       // 'descartar' | 'cerrar'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { urlFoto(reporte.foto_path).then(setFoto); }, [reporte.foto_path]);

  const run = async (status, nota) => {
    setBusy(true); setErr(null);
    try { await onEstado(reporte.id, status, nota); setModo(null); setMotivo(''); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  const abierto = ['nuevo', 'en_gestion'].includes(reporte.status);

  return (
    <Modal titulo={`Reporte ${reporte.consecutivo}`} sub={`Recibido el ${fmtFechaHora(reporte.created_at)}`} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge status={reporte.status} />
        {reporte.area && <span style={{ fontSize: 12, color: '#4b5563', background: '#f6f6ef', borderRadius: 20, padding: '2px 9px' }}>Área: {reporte.area}</span>}
        <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#4b5563' }}>
          {reporte.is_anonimo ? <><UserX size={13} /> Anónimo</> : <>Reportado por <b>{reporte.autor?.full_name || '—'}</b></>}
        </span>
      </div>
      <p style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.6, whiteSpace: 'pre-line', margin: '12px 0' }}>{reporte.descripcion}</p>
      {reporte.foto_path && (
        foto
          ? <a href={foto} target="_blank" rel="noreferrer"><img src={foto} alt="Foto del reporte" style={{ maxHeight: 260, borderRadius: 12, border: `1px solid ${C.sand}` }} /></a>
          : <p style={{ fontSize: 12, color: '#9ca3af' }}>{foto === undefined ? 'Cargando foto…' : 'No se pudo cargar la foto.'}</p>
      )}
      {reporte.cierre_nota && (
        <p style={{ fontSize: 12.5, background: '#f6f6ef', borderRadius: 10, padding: '8px 12px', color: '#374151' }}><b>Nota:</b> {reporte.cierre_nota}</p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
        {abierto && (
          <Button onClick={onDiligenciar} style={{ background: C.green, color: 'white' }} className="flex items-center gap-1.5">
            <PenLine size={15} /> Diligenciar formato
          </Button>
        )}
        {reporte.status === 'nuevo' && (
          <Button variant="outline" disabled={busy} onClick={() => run('en_gestion')} className="flex items-center gap-1.5">
            <Clock size={15} /> Marcar en gestión
          </Button>
        )}
        {registro && (
          <Button variant="outline" onClick={onVerRegistro} className="flex items-center gap-1.5">
            <FileSpreadsheet size={15} /> Ver registro
          </Button>
        )}
        {reporte.status === 'registrado' && (
          <Button variant="outline" disabled={busy} onClick={() => setModo('cerrar')} className="flex items-center gap-1.5">
            <CheckCircle2 size={15} /> Cerrar reporte
          </Button>
        )}
        {abierto && (
          <Button variant="outline" disabled={busy} onClick={() => setModo('descartar')} className="flex items-center gap-1.5" style={{ color: '#6b7280' }}>
            <Ban size={15} /> Descartar
          </Button>
        )}
      </div>
      {modo && (
        <div style={{ marginTop: 10, background: '#f6f6ef', borderRadius: 12, padding: 12 }}>
          <label style={{ ...lbl, marginTop: 0 }}>{modo === 'descartar' ? 'Motivo del descarte *' : 'Nota de cierre (opcional)'}</label>
          <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder={modo === 'descartar' ? 'Ej.: duplicado, no corresponde a SST…' : 'Ej.: correctivos implementados'} />
          <div className="flex justify-end gap-2" style={{ marginTop: 8 }}>
            <Button variant="outline" size="sm" onClick={() => { setModo(null); setMotivo(''); }}>Cancelar</Button>
            <Button size="sm" disabled={busy} onClick={() => run(modo === 'descartar' ? 'descartado' : 'cerrado', motivo)}
              style={{ background: modo === 'descartar' ? '#6b7280' : C.green, color: 'white' }}>
              {modo === 'descartar' ? 'Descartar' : 'Cerrar'}
            </Button>
          </div>
        </div>
      )}
      {err && <p style={{ color: '#b91c1c', fontSize: 12.5, marginTop: 8 }}>{err}</p>}

      {/* Historial */}
      <p className="flex items-center gap-1.5" style={{ ...lbl, marginTop: 18 }}><History size={14} /> Historial</p>
      <div style={{ borderLeft: `2px solid ${C.sand}`, marginLeft: 6, paddingLeft: 14 }}>
        {reporte.eventos.map((ev) => (
          <div key={ev.id} style={{ position: 'relative', paddingBottom: 10 }}>
            <span style={{ position: 'absolute', left: -21, top: 4, width: 12, height: 12, borderRadius: '50%', background: (ESTADOS[ev.status] || ESTADOS.nuevo).color, border: '2px solid white' }} />
            <p style={{ fontSize: 12.5, margin: 0, color: '#1f2937' }}>
              <b>{(ESTADOS[ev.status] || { label: ev.status }).label}</b>{ev.nota ? ` — ${ev.nota}` : ''}
            </p>
            <p style={{ fontSize: 11.5, margin: 0, color: '#9ca3af' }}>
              {fmtFechaHora(ev.created_at)}{ev.usuario?.full_name ? ` · ${ev.usuario.full_name}` : (ev.status === 'nuevo' && reporte.is_anonimo ? ' · Anónimo' : '')}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function ActosInsegurosManager({ onBack }) {
  const { formato } = useFormato('registro_actos_inseguros');
  const { reportes, registros, loading, error, cambiarEstado, guardarRegistro } = useActosInseguros();
  const [tab, setTab]       = useState('bandeja');
  const [filtro, setFiltro] = useState('pendientes');
  const [q, setQ]           = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [form, setForm]     = useState(null);     // { reporte?, registro? }
  const [toast, setToast]   = useState(null);
  const [exportando, setExportando] = useState(null);

  const aviso = (msg, tipo = 'ok') => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 4000); };
  const detalle = reportes.find((r) => r.id === detalleId) || null;
  const regPorId = useMemo(() => Object.fromEntries(registros.map((g) => [g.id, g])), [registros]);
  const pendientes = reportes.filter((r) => ['nuevo', 'en_gestion'].includes(r.status)).length;

  const FILTROS = {
    pendientes:  (r) => ['nuevo', 'en_gestion'].includes(r.status),
    registrados: (r) => r.status === 'registrado',
    cerrados:    (r) => ['cerrado', 'descartado'].includes(r.status),
    todos:       () => true,
  };
  const fq = norm(q.trim());
  const listaRep = reportes.filter(FILTROS[filtro]).filter((r) => !fq || norm(`${r.consecutivo} ${r.descripcion} ${r.area || ''}`).includes(fq));
  const listaReg = registros.filter((g) => !fq || norm(`${g.numero} ${g.descripcion} ${g.area || ''} ${g.reportado_por}`).includes(fq));

  const exportar = async (g) => {
    setExportando(g.id);
    try { await exportActoInseguro(g, formato); }
    catch (e) { aviso(e.message, 'error'); }
    finally { setExportando(null); }
  };

  const tipos = (g) => [g.es_acto_inseguro && 'Acto', g.es_condicion_insegura && 'Condición', g.es_condicion_salud && 'Salud'].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100" style={{ color: C.green }}>
          <ArrowLeft className="h-4 w-4" /> Evaluaciones
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: C.green }}>Registro Actos Inseguros</h2>
          <p className="text-sm mt-1" style={{ color: C.olive }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{etiquetaFormato(formato)}</span>
            {' · '}Actos y/o condiciones inseguras o condiciones de salud
          </p>
        </div>
        {tab === 'registros' && (
          <Button onClick={() => setForm({})} className="flex items-center gap-2" style={{ background: C.green, color: 'white' }}>
            <Plus size={16} /> Nuevo registro
          </Button>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 border-b" style={{ borderColor: C.sand }}>
        {[
          { id: 'bandeja', label: 'Bandeja de reportes', icon: Inbox, n: pendientes },
          { id: 'registros', label: 'Registros RE-GS-02', icon: FileSpreadsheet, n: registros.length },
        ].map((t) => {
          const I = t.icon; const on = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium"
              style={{ color: on ? C.green : '#6b7280', borderBottom: on ? `2px solid ${C.mint}` : '2px solid transparent', marginBottom: -1, background: 'none', cursor: 'pointer' }}>
              <I size={16} /> {t.label}
              {t.n > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: 'white', background: t.id === 'bandeja' ? '#d97706' : C.olive, borderRadius: 20, padding: '0 7px' }}>{t.n}</span>}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <Search size={15} className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, descripción o área…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, fontSize: 13, border: `1px solid ${C.sand}`, background: 'white', outline: 'none' }} />
        </div>
        {tab === 'bandeja' && [
          ['pendientes', 'Pendientes'], ['registrados', 'Registrados'], ['cerrados', 'Cerrados / descartados'], ['todos', 'Todos'],
        ].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFiltro(k)}
            style={{ padding: '7px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 600,
              border: `1px solid ${filtro === k ? C.green : C.sand}`, background: filtro === k ? C.green : 'white', color: filtro === k ? 'white' : '#4b5563' }}>
            {l}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin" style={{ color: C.mint }} /></div>}
      {error && <div className="flex items-center gap-2" style={{ background: '#fef3e2', border: '1px solid #f3c98b', color: '#854f0b', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}><AlertTriangle size={15} /> {error}</div>}

      {/* ── Bandeja ── */}
      {!loading && tab === 'bandeja' && (
        listaRep.length === 0 ? (
          <div className="text-center py-14" style={{ color: '#9ca3af', fontSize: 13 }}>
            <Inbox size={30} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            {filtro === 'pendientes' ? 'No hay reportes pendientes. 🌿' : 'Sin reportes en esta vista.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {listaRep.map((r) => (
              <button key={r.id} type="button" onClick={() => setDetalleId(r.id)} className="text-left transition-shadow hover:shadow-md"
                style={{ background: 'white', border: `1px solid ${C.sand}`, borderLeft: `5px solid ${(ESTADOS[r.status] || ESTADOS.nuevo).color}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, color: C.green, fontSize: 13 }}>{r.consecutivo}</span>
                  <Badge status={r.status} />
                  <span style={{ fontSize: 11.5, color: '#9ca3af', marginLeft: 'auto' }}>{fmtFechaHora(r.created_at)}</span>
                </div>
                <p className="line-clamp-2" style={{ fontSize: 13, color: '#1f2937', margin: '6px 0', lineHeight: 1.5 }}>{r.descripcion}</p>
                <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 11.5, color: '#6b7280' }}>
                  {r.area && <span>Área: {r.area}</span>}
                  <span className="flex items-center gap-1">{r.is_anonimo ? <><UserX size={12} /> Anónimo</> : r.autor?.full_name}</span>
                  {r.foto_path && <span className="flex items-center gap-1"><Camera size={12} /> Foto</span>}
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* ── Registros ── */}
      {!loading && tab === 'registros' && (
        listaReg.length === 0 ? (
          <div className="text-center py-14" style={{ color: '#9ca3af', fontSize: 13 }}>
            <FileSpreadsheet size={30} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            Aún no hay registros. Se crean desde la bandeja con "Diligenciar formato" o con "Nuevo registro".
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'white', border: `1px solid ${C.sand}`, borderRadius: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 760 }}>
              <thead>
                <tr style={{ background: C.green, color: 'white' }}>
                  {['N°', 'Fecha', 'Reporta', 'Tipo', 'Área', 'Descripción', 'Recibido por', ''].map((h) => (
                    <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaReg.map((g, i) => (
                  <tr key={g.id} style={{ borderTop: `1px solid ${C.sand}`, background: i % 2 ? '#fafaf6' : 'white' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.green, whiteSpace: 'nowrap' }}>{g.numero}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtFecha(g.fecha)}</td>
                    <td style={{ padding: '8px 10px' }}>{g.reportado_por}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{tipos(g)}</td>
                    <td style={{ padding: '8px 10px' }}>{g.area || '—'}</td>
                    <td style={{ padding: '8px 10px', maxWidth: 280 }}><span className="line-clamp-2">{g.descripcion}</span></td>
                    <td style={{ padding: '8px 10px' }}>{g.receptor?.full_name || '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <button type="button" title="Editar" onClick={() => setForm({ registro: g })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, padding: 4 }}><PenLine size={16} /></button>
                      <button type="button" title="Descargar Excel" disabled={exportando === g.id} onClick={() => exportar(g)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.olive, padding: 4 }}>
                        {exportando === g.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {detalle && (
        <DetalleReporte
          reporte={detalle}
          registro={detalle.registro_id ? regPorId[detalle.registro_id] : null}
          onClose={() => setDetalleId(null)}
          onEstado={async (id, st, nota) => { await cambiarEstado(id, st, nota); aviso('Estado actualizado'); }}
          onDiligenciar={() => setForm({ reporte: detalle })}
          onVerRegistro={() => setForm({ registro: regPorId[detalle.registro_id] })}
        />
      )}

      {form && (
        <FormRegistro formato={formato} reporte={form.reporte} registro={form.registro}
          onClose={() => setForm(null)}
          onGuardar={async (payload, id) => {
            await guardarRegistro(payload, id);
            setForm(null);
            aviso(id ? 'Registro actualizado' : 'Registro guardado. El reporte quedó como "Registrado".');
          }} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 shadow-lg"
          style={{ zIndex: 70, background: toast.tipo === "error" ? "#b91c1c" : C.green, color: "white", borderRadius: 12, padding: "10px 16px", fontSize: 13 }}>
          {toast.msg}
          <button type="button" onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}