// src/components/modules/MejoramientoContinuo/Reportes/RegistroReporteManager.jsx
// ═══════════════════════════════════════════════════════════════════
// Manager GENÉRICO de los registros que vienen de "Ayúdanos a mejorar"
//   Bandeja   → reportes iniciales del tipo (nuevo → en gestión → registrado → cerrado)
//   Registros → formatos diligenciados + Excel sobre el formato oficial de GD
// Se configura con un objeto de ./registros.js (uno por formato).
// Reemplaza a ActosInseguros/ActosInsegurosManager.jsx (oct 2026).
// v2: eliminación definitiva (admin + responsable del tipo) — RM_04.
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Inbox, FileSpreadsheet, Search, Loader2, AlertTriangle, Camera, UserX,
  X, Clock, CheckCircle2, Ban, PenLine, Plus, Download, History, Trash2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useFormato, etiquetaFormato } from '@/hooks/useFormatoVinculado';
import { useRegistroReporte, ESTADOS, urlFoto } from '@/hooks/useRegistroReporte';
import { Modal, C, norm, fmtFecha, fmtFechaHora, lbl, inp } from './ui';

function Badge({ status }) {
  const e = ESTADOS[status] || ESTADOS.nuevo;
  return <span style={{ fontSize: 11, fontWeight: 700, color: e.color, background: e.bg, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{e.label}</span>;
}

// ─── Confirmar eliminación definitiva ───────────────────────────────
function ConfirmarEliminar({ que, onClose, onConfirmar }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const esReporte = que.tipo === 'reporte';
  const numero = esReporte ? que.item.consecutivo : que.item.numero;
  const deReporte = !esReporte && que.item.reporte_id;
  const ir = async () => {
    setBusy(true); setErr(null);
    try { await onConfirmar(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal titulo={esReporte ? `Eliminar reporte ${numero}` : `Eliminar registro ${numero}`} sub="Esta acción no se puede deshacer" onClose={onClose} ancho={480}>
      <div className="flex gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12 }}>
        <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.55 }}>
          {esReporte ? (
            <>Se borrará <b>definitivamente</b> el reporte, su historial{que.item.foto_path ? ', su foto' : ''}
              {que.item.registro_id ? ' y el registro diligenciado' : ''}. No quedará rastro en el sistema.</>
          ) : (
            <>Se borrará <b>definitivamente</b> este formato diligenciado.
              {deReporte ? <> El reporte de origen <b>vuelve a la bandeja como "En gestión"</b> para diligenciarlo de nuevo.</> : ''}</>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>
        Úsalo solo para pruebas, duplicados o errores de diligenciamiento.
      </p>
      {err && <p style={{ color: '#b91c1c', fontSize: 12.5, marginTop: 8 }}>{err}</p>}
      <div className="flex justify-end gap-2" style={{ marginTop: 14 }}>
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button onClick={ir} disabled={busy} style={{ background: '#dc2626', color: 'white' }} className="flex items-center gap-1.5">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar definitivamente
        </Button>
      </div>
    </Modal>
  );
}

// ─── Detalle de un reporte de la bandeja ────────────────────────────
function DetalleReporte({ reporte, registro, onClose, onEstado, onDiligenciar, onVerRegistro, onEliminar }) {
  const [foto, setFoto] = useState(undefined);   // undefined = cargando · null = no disponible
  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState(null);       // 'descartar' | 'cerrar'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { urlFoto(reporte.foto_path).then(setFoto); }, [reporte.foto_path]);

  const run = async (status, nota) => {
    if (status === 'descartado' && !nota?.trim()) { setErr('Escribe el motivo del descarte.'); return; }
    setBusy(true); setErr(null);
    try { await onEstado(reporte.id, status, nota?.trim() || null); setModo(null); setMotivo(''); }
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

      <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
        {abierto && !registro && (
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
        {onEliminar && (
          <Button variant="outline" onClick={onEliminar} className="flex items-center gap-1.5" style={{ color: '#dc2626', borderColor: '#fecaca', marginLeft: 'auto' }}>
            <Trash2 size={15} /> Eliminar
          </Button>
        )}
      </div>
      {modo && (
        <div style={{ marginTop: 10, background: '#f6f6ef', borderRadius: 12, padding: 12 }}>
          <label style={{ ...lbl, marginTop: 0 }}>{modo === 'descartar' ? 'Motivo del descarte *' : 'Nota de cierre (opcional)'}</label>
          <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder={modo === 'descartar' ? 'Ej.: duplicado, no corresponde a este registro…' : 'Ej.: se implementó la mejora'} />
          <div className="flex justify-end gap-2" style={{ marginTop: 8 }}>
            <Button variant="outline" size="sm" onClick={() => { setModo(null); setMotivo(''); setErr(null); }}>Cancelar</Button>
            <Button size="sm" disabled={busy} onClick={() => run(modo === 'descartar' ? 'descartado' : 'cerrado', motivo)}
              style={{ background: modo === 'descartar' ? '#6b7280' : C.green, color: 'white' }}>
              {modo === 'descartar' ? 'Descartar' : 'Cerrar'}
            </Button>
          </div>
        </div>
      )}
      {err && <p style={{ color: '#b91c1c', fontSize: 12.5, marginTop: 8 }}>{err}</p>}

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
// config: { titulo, subtitulo, claveFormato, tipo, tabla, columnas[{h, v(g), mono?, ancho?}],
//           buscar(g) → texto, Formulario, exportar(registro, formato) }
export default function RegistroReporteManager({ config, onBack, volverA = 'Evaluaciones' }) {
  const { titulo, subtitulo, claveFormato, tipo, tabla, columnas, buscar, Formulario, exportar } = config;
  const { formato } = useFormato(claveFormato);
  const { reportes, registros, loading, error, puedeEliminar, cambiarEstado, guardarRegistro, eliminarRegistro, eliminarReporte } = useRegistroReporte({ tipo, tabla });
  const [tab, setTab]       = useState('bandeja');
  const [filtro, setFiltro] = useState('pendientes');
  const [q, setQ]           = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [form, setForm]     = useState(null);     // { reporte?, registro? }
  const [toast, setToast]   = useState(null);
  const [exportando, setExportando] = useState(null);
  const [borrar, setBorrar] = useState(null);     // { tipo: 'registro' | 'reporte', item }

  const aviso = (msg, t = 'ok') => { setToast({ msg, tipo: t }); setTimeout(() => setToast(null), 4500); };
  const detalle = reportes.find((r) => r.id === detalleId) || null;
  const regPorId = useMemo(() => Object.fromEntries(registros.map((g) => [g.id, g])), [registros]);
  const pendientes = reportes.filter((r) => ['nuevo', 'en_gestion'].includes(r.status)).length;
  const codigo = formato?.code || '';

  const FILTROS = {
    pendientes:  (r) => ['nuevo', 'en_gestion'].includes(r.status),
    registrados: (r) => r.status === 'registrado',
    cerrados:    (r) => ['cerrado', 'descartado'].includes(r.status),
    todos:       () => true,
  };
  const fq = norm(q.trim());
  const listaRep = reportes.filter(FILTROS[filtro]).filter((r) => !fq || norm(`${r.consecutivo} ${r.descripcion} ${r.area || ''}`).includes(fq));
  const listaReg = registros.filter((g) => !fq || norm(`${g.numero} ${g.descripcion || ''} ${g.area || ''} ${g.reportado_por || ''} ${buscar ? buscar(g) : ''}`).includes(fq));

  const descargar = async (g) => {
    if (!formato) { aviso('Este registro no tiene formato vinculado en Gestión Documental.', 'error'); return; }
    setExportando(g.id);
    try { await exportar(g, formato); }
    catch (e) { aviso(e.message, 'error'); }
    finally { setExportando(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100" style={{ color: C.green }}>
          <ArrowLeft className="h-4 w-4" /> {volverA}
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: C.green }}>{titulo}</h2>
          <p className="text-sm mt-1" style={{ color: C.olive }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{etiquetaFormato(formato)}</span>
            {' · '}{subtitulo}
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
          { id: 'registros', label: `Registros ${codigo}`.trim(), icon: FileSpreadsheet, n: registros.length },
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
                  {['N°', 'Fecha', ...columnas.map((c) => c.h), 'Recibido por', ''].map((h, i) => (
                    <th key={i} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaReg.map((g, i) => (
                  <tr key={g.id} style={{ borderTop: `1px solid ${C.sand}`, background: i % 2 ? '#fafaf6' : 'white' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.green, whiteSpace: 'nowrap' }}>{g.numero}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtFecha(g.fecha)}</td>
                    {columnas.map((c, j) => (
                      <td key={j} style={{ padding: '8px 10px', maxWidth: c.ancho || undefined, whiteSpace: c.nowrap ? 'nowrap' : undefined }}>
                        {c.clamp ? <span className="line-clamp-2">{c.v(g) || '—'}</span> : (c.v(g) || '—')}
                      </td>
                    ))}
                    <td style={{ padding: '8px 10px' }}>{g.receptor?.full_name || '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <button type="button" title="Editar" onClick={() => setForm({ registro: g })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, padding: 4 }}><PenLine size={16} /></button>
                      <button type="button" title="Descargar Excel" disabled={exportando === g.id} onClick={() => descargar(g)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.olive, padding: 4 }}>
                        {exportando === g.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      </button>
                      {puedeEliminar && (
                        <button type="button" title="Eliminar definitivamente" onClick={() => setBorrar({ tipo: 'registro', item: g })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}><Trash2 size={16} /></button>
                      )}
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
          onEliminar={puedeEliminar ? () => setBorrar({ tipo: 'reporte', item: detalle }) : null}
        />
      )}

      {borrar && (
        <ConfirmarEliminar que={borrar} onClose={() => setBorrar(null)}
          onConfirmar={async () => {
            if (borrar.tipo === 'reporte') {
              const r = await eliminarReporte(borrar.item.id);
              setBorrar(null); setDetalleId(null);
              aviso(r.aviso || `Reporte ${r.consecutivo} eliminado`, r.aviso ? 'error' : 'ok');
            } else {
              const r = await eliminarRegistro(borrar.item.id);
              setBorrar(null);
              aviso(r?.reporte_id ? `Registro ${r.numero} eliminado. El reporte volvió a "En gestión".` : `Registro ${r?.numero} eliminado`);
            }
          }} />
      )}

      {form && (
        <Formulario formato={formato} reporte={form.reporte} registro={form.registro}
          onClose={() => setForm(null)}
          onGuardar={async (campos) => {
            const id = form.registro?.id || null;
            await guardarRegistro(campos, id, form.reporte?.id || null);
            setForm(null);
            aviso(id ? 'Registro actualizado' : form.reporte ? 'Registro guardado. El reporte quedó como "Registrado".' : 'Registro guardado');
          }} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 shadow-lg"
          style={{ zIndex: 70, background: toast.tipo === 'error' ? '#b91c1c' : C.green, color: 'white', borderRadius: 12, padding: '10px 16px', fontSize: 13, maxWidth: '92vw' }}>
          {toast.msg}
          <button type="button" onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}