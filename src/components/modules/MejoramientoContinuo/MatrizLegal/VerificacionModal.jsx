// src/components/modules/MejoramientoContinuo/MatrizLegal/VerificacionModal.jsx
// Verificación de cumplimiento de una norma + historial.
// Si el resultado es "No cumple" o "Parcial" se puede abrir directamente
// una Acción de Mejora (M1) prellenada, que queda enlazada a la verificación.
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  X, Save, Loader2, ClipboardCheck, History, Trash2, CheckCircle2, AlertTriangle, Link2,
} from 'lucide-react';
import AccionMejoraModal from '../AccionesMejora/AccionMejoraModal';
import {
  ESTADOS_VERIF, ESTADO_CONTROL, TIPOS_RESPONSABLE, nombreResponsable, fmtFecha, hoyISO,
} from '@/hooks/useMatrizLegal';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc' };
const inputCls = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2';

const hallazgoDe = (req, v) =>
  `Matriz legal (${req.matriz === 'sst' ? 'SST' : 'General'}): ${req.norma}` +
  `${req.articulo ? ` · Art. ${req.articulo}` : ''} — ${ESTADOS_VERIF[v.estado]?.label.toUpperCase()}` +
  `${v.observaciones ? `. ${v.observaciones}` : ''}`;

export default function VerificacionModal({
  isOpen, requisito, puedeVerificar, can, onClose,
  listarVerificaciones, registrarVerificacion, eliminarVerificacion, enlazarUltimaAccion,
}) {
  const [hist, setHist]       = useState([]);
  const [cargando, setCarg]   = useState(false);
  const [f, setF]             = useState({ fecha: hoyISO(), estado: '', evidencia: '', observaciones: '' });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);
  const [accionPara, setAccionPara] = useState(null); // verificación para la que se crea la acción

  const recargar = useCallback(async () => {
    if (!requisito) return;
    setCarg(true);
    try { setHist(await listarVerificaciones(requisito.id)); }
    catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setCarg(false); }
  }, [requisito, listarVerificaciones]);

  useEffect(() => {
    if (!isOpen) return;
    setF({ fecha: hoyISO(), estado: '', evidencia: requisito?.evidencia || '', observaciones: '' });
    setMsg(null);
    recargar();
  }, [isOpen, requisito?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !requisito) return null;

  const guardar = async () => {
    if (!f.estado) return setMsg({ type: 'error', text: 'Selecciona el resultado de la verificación.' });
    setSaving(true);
    const res = await registrarVerificacion(requisito.id, f);
    setSaving(false);
    if (!res.success) return setMsg({ type: 'error', text: res.error });
    const nueva = { id: res.id, ...f };
    setF({ fecha: hoyISO(), estado: '', evidencia: requisito.evidencia || '', observaciones: '' });
    await recargar();
    if (['no_cumple', 'parcial'].includes(nueva.estado) && can.accion) {
      setMsg({ type: 'warn', text: 'Verificación registrada. Como no se cumple totalmente, puedes crear la acción de mejora.', verif: nueva });
    } else {
      setMsg({ type: 'ok', text: 'Verificación registrada.' });
    }
  };

  const borrar = async (v) => {
    if (!window.confirm('¿Eliminar esta verificación? No se puede deshacer.')) return;
    const res = await eliminarVerificacion(v.id);
    if (!res.success) return setMsg({ type: 'error', text: res.error });
    recargar();
  };

  const procesoInicial = requisito.responsables?.find((r) => r.tipo === 'proceso')?.process_id || '';
  const estadoCtl = ESTADO_CONTROL[requisito.estado_verificacion] || ESTADO_CONTROL.sin_verificar;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 rounded-t-xl"
            style={{ background: `linear-gradient(135deg, ${C.green} 0%, ${C.mint} 100%)` }}>
            <div className="flex items-center gap-2 text-white min-w-0">
              <ClipboardCheck className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight truncate">{requisito.norma}</h2>
                <p className="text-xs opacity-90 truncate">
                  Verificación de cumplimiento · {requisito.matriz === 'sst' ? 'Matriz SST' : 'Matriz General'}
                  {requisito.articulo ? ` · Art. ${requisito.articulo}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Resumen */}
            <div className="rounded-lg p-3 text-sm space-y-2" style={{ background: '#f5f5ef' }}>
              {requisito.asunto && <p className="text-gray-700"><b style={{ color: C.green }}>Asunto:</b> {requisito.asunto}</p>}
              {requisito.evidencia && <p className="text-gray-700"><b style={{ color: C.green }}>Evidencia esperada:</b> {requisito.evidencia}</p>}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold" style={{ color: C.green }}>Responsables:</span>
                {requisito.aplica_todos_procesos && (
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#e8f5ee', color: C.green }}>Todos los procesos</span>
                )}
                {requisito.responsables.map((r) => {
                  const t = TIPOS_RESPONSABLE[r.tipo];
                  return <span key={r.id} className="rounded-full px-2 py-0.5 text-xs" style={{ background: t.bg, color: t.color }}>{nombreResponsable(r)}</span>;
                })}
                {!requisito.aplica_todos_procesos && requisito.responsables.length === 0 && <span className="text-xs text-gray-400 italic">Sin asignar</span>}
                <span className="ml-auto rounded px-2 py-0.5 text-xs font-semibold" style={{ background: estadoCtl.bg, color: estadoCtl.color }}>
                  {estadoCtl.label} · cada {requisito.frecuencia_meses} meses
                </span>
              </div>
            </div>

            {/* Mensajes */}
            {msg && (
              <div className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${
                msg.type === 'error' ? 'bg-red-50 text-red-700' : msg.type === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
                {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
                <div className="flex-1">{msg.text}</div>
                {msg.verif && (
                  <Button size="sm" onClick={() => setAccionPara(msg.verif)} style={{ background: C.olive, color: 'white' }}>
                    Crear acción de mejora
                  </Button>
                )}
              </div>
            )}

            {/* Formulario */}
            {puedeVerificar ? (
              <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: C.sand }}>
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.olive }}>Nueva verificación</h4>
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 items-end">
                  <label className="block">
                    <span className="block text-xs font-semibold mb-1" style={{ color: C.green }}>Fecha</span>
                    <input type="date" className={inputCls} value={f.fecha} max={hoyISO()} onChange={(e) => setF((p) => ({ ...p, fecha: e.target.value }))} />
                  </label>
                  <div>
                    <span className="block text-xs font-semibold mb-1" style={{ color: C.green }}>Resultado <span className="text-red-500">*</span></span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ESTADOS_VERIF).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => setF((p) => ({ ...p, estado: k }))}
                          className="rounded-md px-3 py-2 text-sm font-semibold border-2 transition-all"
                          style={{
                            background: f.estado === k ? v.color : v.bg,
                            color: f.estado === k ? 'white' : v.color,
                            borderColor: f.estado === k ? v.color : 'transparent',
                          }}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <label className="block">
                  <span className="block text-xs font-semibold mb-1" style={{ color: C.green }}>Evidencia revisada</span>
                  <textarea rows={2} className={inputCls} value={f.evidencia} onChange={(e) => setF((p) => ({ ...p, evidencia: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold mb-1" style={{ color: C.green }}>Observaciones</span>
                  <textarea rows={2} className={inputCls} value={f.observaciones} onChange={(e) => setF((p) => ({ ...p, observaciones: e.target.value }))} />
                </label>
                <div className="flex justify-end">
                  <Button onClick={guardar} disabled={saving} style={{ background: C.green, color: 'white' }}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Registrar verificación
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                {requisito.vigencia === 'derogada'
                  ? 'Norma derogada: no requiere verificación.'
                  : 'Solo pueden verificar los responsables de esta norma o quienes tengan el permiso "Verificar".'}
              </p>
            )}

            {/* Historial */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: C.olive }}>
                <History className="h-3.5 w-3.5" /> Historial ({hist.length})
              </h4>
              {cargando ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: C.mint }} /></div>
              ) : hist.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-2">Esta norma aún no tiene verificaciones.</p>
              ) : (
                <div className="space-y-2">
                  {hist.map((v) => {
                    const e = ESTADOS_VERIF[v.estado];
                    const nc = ['no_cumple', 'parcial'].includes(v.estado);
                    return (
                      <div key={v.id} className="rounded-lg border p-3 text-sm" style={{ borderColor: '#e5e7eb' }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: e.bg, color: e.color }}>{e.label}</span>
                          <span className="font-medium" style={{ color: C.green }}>{fmtFecha(v.fecha)}</span>
                          <span className="text-xs text-gray-500">· {v.verificador}</span>
                          <div className="ml-auto flex items-center gap-2">
                            {v.accion ? (
                              <span className="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5" style={{ background: '#eef2e0', color: C.olive }}>
                                <Link2 className="h-3 w-3" /> Acción {v.accion.consecutive || ''}
                              </span>
                            ) : nc && can.accion && (
                              <button className="text-xs underline" style={{ color: C.olive }} onClick={() => setAccionPara(v)}>
                                Crear acción de mejora
                              </button>
                            )}
                            {can.delete && (
                              <button title="Eliminar" onClick={() => borrar(v)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {v.evidencia && <p className="mt-1 text-gray-700"><b className="text-xs">Evidencia:</b> {v.evidencia}</p>}
                        {v.observaciones && <p className="mt-0.5 text-gray-600"><b className="text-xs">Obs.:</b> {v.observaciones}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end px-5 py-3 border-t" style={{ borderColor: C.sand }}>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>

      {/* Acción de mejora (M1) prellenada */}
      {accionPara && (
        <AccionMejoraModal
          isOpen
          mode="create"
          accion={{
            date: accionPara.fecha || hoyISO(),
            process_id: procesoInicial,
            origin_autocontrol: true,
            finding_description: hallazgoDe(requisito, accionPara),
          }}
          onClose={() => setAccionPara(null)}
          onSuccess={async () => {
            const v = accionPara;
            setAccionPara(null);
            // El hallazgo pudo editarse en el modal: se enlaza la última acción creada por el usuario
            const res = await enlazarUltimaAccion(v.id, hallazgoDe(requisito, v));
            setMsg(res.success
              ? { type: 'ok', text: 'Acción de mejora creada y enlazada a la verificación.' }
              : { type: 'warn', text: 'Acción de mejora creada. No se pudo enlazar automáticamente (¿cambiaste el hallazgo?).' });
            recargar();
          }}
        />
      )}
    </>
  );
}