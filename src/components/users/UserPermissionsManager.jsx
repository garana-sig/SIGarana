// src/components/users/UserPermissionsManager.jsx
// ═══════════════════════════════════════════════════════════════════
// v3 (23 oct 2026) — Permisos por Módulo › Submódulo › CRUD
//  · La estructura sale de src/data/permisosEstructura.js (igual al menú).
//  · Matriz Ver / Crear / Editar / Eliminar + acciones especiales.
//  · Marcar Crear/Editar/Eliminar marca Ver; quitar Ver quita toda la fila.
//  · "Acceso al módulo" (permiso de entrada): se marca solo al dar cualquier
//    permiso del módulo; desmarcarlo quita todo lo del módulo.
//  · Registros de "Ayúdanos a mejorar": casilla de Responsable.
//  · Copiar permisos de otro usuario (RPC copiar_permisos, solo admin).
//  · Limpiar permisos antiguos que ya no hacen nada.
// Props iguales a la v2: { open, onClose, userId, userName, userRole }
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Shield, Loader2, ChevronDown, Copy, Search, Eraser, Inbox, HardHat, Info } from 'lucide-react';
import {
  ESTRUCTURA_PERMISOS, ACCIONES_CRUD, codigosSub, codigosModulo, TODOS_LOS_CODIGOS,
} from '@/data/permisosEstructura';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', red: '#dc2626' };
const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Códigos que la BD todavía usa aunque la pantalla no los muestre: no se limpian
const NO_LIMPIAR = new Set(['cmi:indicadores:register_values']);

function Casilla({ checked, onChange, disabled, title }) {
  return (
    <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} title={title}
      style={{ width: 17, height: 17, accentColor: C.green, cursor: disabled ? 'default' : 'pointer' }} />
  );
}

function Chip({ on, onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 9px', cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${on ? C.green : '#d1d5db'}`, background: on ? C.green : 'white', color: on ? 'white' : '#6b7280',
        whiteSpace: 'nowrap' }}>
      {on ? '✓ ' : ''}{children}
    </button>
  );
}

export function UserPermissionsManager({ open, onClose, userId, userName, userRole }) {
  const { permissionCodes, loading, saving, error, assignPermissions, revokePermissions, refresh } = useUserPermissions(userId);

  const [abiertos, setAbiertos] = useState(['mejoramiento']);
  const [q, setQ] = useState('');
  const [responsables, setResponsables] = useState([]);  // códigos de tipo
  const [usuarios, setUsuarios] = useState([]);
  const [copiarDe, setCopiarDe] = useState('');
  const [confirmarCopia, setConfirmarCopia] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);

  const tengo = useMemo(() => new Set(permissionCodes), [permissionCodes]);
  const bloqueado = saving || ocupado || loading;

  // ── Responsables y lista de usuarios ───────────────────────────
  const cargarResponsables = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('reporte_tipo_responsable').select('tipo_codigo').eq('user_id', userId);
    setResponsables((data || []).map((r) => r.tipo_codigo));
  }, [userId]);

  useEffect(() => {
    if (!open || !userId) return;
    setAviso(null); setCopiarDe(''); setConfirmarCopia(false);
    cargarResponsables();
    supabase.from('profile').select('id, full_name, role').eq('is_active', true).neq('id', userId).order('full_name')
      .then(({ data }) => setUsuarios((data || []).filter((u) => u.role !== 'admin')));
  }, [open, userId, cargarResponsables]);

  const flash = (msg, tipo = 'ok') => { setAviso({ msg, tipo }); setTimeout(() => setAviso(null), 3500); };

  // ── Entrada del módulo ─────────────────────────────────────────
  // Se asigna sola al dar cualquier permiso del módulo. Se quita solo
  // desmarcando "Acceso al módulo" (que quita todo lo del módulo).
  const ajustarEntrada = async (mod, quedan) => {
    if (!quedan.has(mod.entrada)) await assignPermissions([mod.entrada]);
  };

  const agregar = async (mod, codigos) => {
    const nuevos = codigos.filter((c) => !tengo.has(c));
    if (nuevos.length) await assignPermissions(nuevos);
    await ajustarEntrada(mod, new Set([...tengo, ...nuevos]));
  };
  const quitar = async (mod, codigos) => {
    const fuera = codigos.filter((c) => tengo.has(c));
    if (fuera.length) await revokePermissions(fuera);
  };

  // Celda CRUD (si la fila no tiene "Ver", p. ej. Documentos, ver = acceso al módulo)
  const toggleCrud = (mod, sub, accion) => {
    const code = sub[accion];
    if (!code || bloqueado) return;
    if (tengo.has(code)) {
      // Quitar "Ver" quita toda la fila
      return accion === 'ver' ? quitar(mod, codigosSub(sub)) : quitar(mod, [code]);
    }
    return agregar(mod, [code, sub.ver].filter(Boolean));
  };
  const toggleExtra = (mod, sub, extra) => {
    if (bloqueado) return;
    const codes = [extra.code, ...(extra.tambien || [])];
    return tengo.has(extra.code) ? quitar(mod, codes) : agregar(mod, [...codes, sub.ver].filter(Boolean));
  };
  const filaCompleta = (sub) => codigosSub(sub).every((c) => tengo.has(c));
  const toggleFila = (mod, sub) => (filaCompleta(sub) ? quitar(mod, codigosSub(sub)) : agregar(mod, codigosSub(sub)));

  // Responsable de "Ayúdanos a mejorar"
  const toggleResponsable = async (mod, tipo) => {
    if (bloqueado) return;
    setOcupado(true);
    try {
      let quedan;
      if (responsables.includes(tipo)) {
        const { error: e } = await supabase.from('reporte_tipo_responsable').delete().eq('user_id', userId).eq('tipo_codigo', tipo).select('id');
        if (e) throw e;
        quedan = responsables.filter((t) => t !== tipo);
      } else {
        const { error: e } = await supabase.from('reporte_tipo_responsable').insert({ user_id: userId, tipo_codigo: tipo });
        if (e) throw e;
        quedan = [...responsables, tipo];
      }
      setResponsables(quedan);
      if (quedan.length) await ajustarEntrada(mod, tengo);
    } catch (e) { flash(e.message, 'error'); }
    finally { setOcupado(false); }
  };

  // Todo / nada por módulo
  const todoModulo = (mod) => agregar(mod, codigosModulo(mod));
  const toggleAcceso = (mod) => (tengo.has(mod.entrada) ? nadaModulo(mod) : agregar(mod, [mod.entrada]));
  const nadaModulo = async (mod) => {
    setOcupado(true);
    try {
      if (mod.id === 'mejoramiento' && responsables.length) {
        await supabase.from('reporte_tipo_responsable').delete().eq('user_id', userId).select('id');
        setResponsables([]);
      }
      const fuera = [...codigosModulo(mod), mod.entrada].filter((c) => tengo.has(c));
      if (fuera.length) await revokePermissions(fuera);
    } finally { setOcupado(false); }
  };

  // Copiar de otro usuario
  const copiar = async () => {
    setOcupado(true);
    try {
      const { data, error: e } = await supabase.rpc('copiar_permisos', { p_origen: copiarDe, p_destino: userId, p_incluir_responsables: true });
      if (e) throw e;
      if (data?.success === false) throw new Error(data.error);
      await refresh(true); await cargarResponsables();
      setConfirmarCopia(false); setCopiarDe('');
      flash(`Listo: ${data?.permisos ?? 0} permisos copiados`);
    } catch (e) { flash(e.message, 'error'); }
    finally { setOcupado(false); }
  };

  // Permisos antiguos que la pantalla no maneja
  const antiguos = useMemo(
    () => permissionCodes.filter((c) => !TODOS_LOS_CODIGOS.includes(c) && !NO_LIMPIAR.has(c)),
    [permissionCodes],
  );
  const limpiar = async () => {
    setOcupado(true);
    try { await revokePermissions(antiguos); flash(`${antiguos.length} permisos antiguos quitados`); }
    finally { setOcupado(false); }
  };

  // Búsqueda
  const fq = norm(q.trim());
  const visible = (sub, grupo, mod) => !fq || norm(`${sub.nombre} ${sub.desc || ''} ${grupo.nombre || ''} ${mod.nombre}`).includes(fq);

  const esAdmin = userRole === 'admin';
  const esGerencia = userRole === 'gerencia';
  const usuarioOrigen = usuarios.find((u) => u.id === copiarDe);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-3 border-b">
          <SheetTitle className="flex items-center gap-2" style={{ color: C.green }}>
            <Shield className="h-5 w-5" style={{ color: C.mint }} /> Permisos — {userName}
          </SheetTitle>
          <p className="text-xs text-gray-500">
            Rol: <b className="capitalize">{userRole || 'usuario'}</b>
            {esGerencia && <span style={{ color: C.olive }}> · Ve todos los módulos; aquí marcas lo que puede crear, editar o eliminar.</span>}
          </p>
          {(error || aviso) && (
            <p className="text-xs" style={{ color: aviso?.tipo === 'ok' ? C.green : C.red, background: aviso?.tipo === 'ok' ? '#ecf5f0' : '#fef2f2', borderRadius: 8, padding: '6px 10px' }}>
              {aviso?.msg || error}
            </p>
          )}
        </SheetHeader>

        {esAdmin ? (
          <div className="py-12 text-center">
            <Shield className="h-14 w-14 mx-auto mb-3" style={{ color: C.olive }} />
            <p className="font-bold" style={{ color: C.green }}>Administrador</p>
            <p className="text-sm text-gray-500 mt-1">Tiene acceso total a todos los módulos. No necesita permisos.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: C.mint }} /></div>
        ) : (
          <div className="py-3 space-y-3">
            {/* Barra: buscar + copiar */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1" style={{ minWidth: 200 }}>
                <Search size={14} className="absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pantalla…"
                  style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 10, fontSize: 13, border: `1px solid ${C.sand}`, outline: 'none' }} />
              </div>
              <select value={copiarDe} onChange={(e) => { setCopiarDe(e.target.value); setConfirmarCopia(false); }}
                style={{ padding: '7px 10px', borderRadius: 10, fontSize: 13, border: `1px solid ${C.sand}`, maxWidth: 220 }}>
                <option value="">Copiar permisos de…</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              {copiarDe && !confirmarCopia && (
                <button type="button" onClick={() => setConfirmarCopia(true)} className="flex items-center gap-1"
                  style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 10, border: 'none', background: C.green, color: 'white', cursor: 'pointer' }}>
                  <Copy size={14} /> Copiar
                </button>
              )}
            </div>
            {confirmarCopia && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 12, fontSize: 13, color: '#78350f' }}>
                {userName} quedará con <b>exactamente</b> los permisos de <b>{usuarioOrigen?.full_name}</b> (se reemplazan los actuales)
                y recibirá también sus responsabilidades de "Ayúdanos a mejorar".
                <div className="flex justify-end gap-2" style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => setConfirmarCopia(false)} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.sand}`, background: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="button" onClick={copiar} disabled={bloqueado} style={{ fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', background: C.green, color: 'white', cursor: 'pointer' }}>
                    {ocupado ? 'Copiando…' : 'Sí, copiar'}
                  </button>
                </div>
              </div>
            )}

            {/* Módulos */}
            {ESTRUCTURA_PERMISOS.map((mod) => {
              const codes = codigosModulo(mod);
              const activos = codes.filter((c) => tengo.has(c)).length + (mod.id === 'mejoramiento' ? responsables.length : 0);
              const abierto = abiertos.includes(mod.id) || !!fq;
              const grupos = mod.grupos.map((g) => ({ ...g, subs: g.submodulos.filter((s) => visible(s, g, mod)) })).filter((g) => g.subs.length);
              if (fq && !grupos.length) return null;
              return (
                <div key={mod.id} style={{ border: `2px solid ${C.sand}`, borderRadius: 14, overflow: 'hidden' }}>
                  {/* Cabecera del módulo */}
                  <div className="flex items-center gap-2" style={{ background: activos ? '#f0f7f4' : '#fafaf6', padding: '10px 12px' }}>
                    <button type="button" onClick={() => setAbiertos((a) => (a.includes(mod.id) ? a.filter((x) => x !== mod.id) : [...a, mod.id]))}
                      className="flex items-center gap-2 flex-1 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <ChevronDown size={16} style={{ color: C.green, transform: abierto ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
                      <span style={{ fontWeight: 700, color: C.green, fontSize: 14.5 }}>{mod.nombre}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: activos ? C.green : '#9ca3af', background: activos ? `${C.mint}30` : '#f3f4f6', borderRadius: 20, padding: '1px 8px' }}>
                        {tengo.has(mod.entrada) ? `${activos} permisos` : 'Sin acceso'}
                      </span>
                    </button>
                    <label className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: tengo.has(mod.entrada) ? C.green : '#9ca3af', cursor: 'pointer', marginRight: 4 }}
                      title="Ver el módulo en el menú. Al quitarlo se quitan todos sus permisos.">
                      <Casilla checked={tengo.has(mod.entrada)} disabled={bloqueado} onChange={() => toggleAcceso(mod)} /> Acceso al módulo
                    </label>
                    <button type="button" disabled={bloqueado} onClick={() => todoModulo(mod)} style={{ fontSize: 11.5, fontWeight: 600, color: C.green, background: 'white', border: `1px solid ${C.sand}`, borderRadius: 8, padding: '4px 9px', cursor: 'pointer' }}>Todo</button>
                    <button type="button" disabled={bloqueado} onClick={() => nadaModulo(mod)} style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7280', background: 'white', border: `1px solid ${C.sand}`, borderRadius: 8, padding: '4px 9px', cursor: 'pointer' }}>Nada</button>
                  </div>

                  {abierto && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
                        <thead>
                          <tr style={{ background: '#fafaf6', color: '#6b7280', fontSize: 11.5 }}>
                            <th style={{ textAlign: 'left', padding: '6px 12px', fontWeight: 600 }}>Submódulo</th>
                            {ACCIONES_CRUD.map((a) => <th key={a.key} style={{ width: 62, fontWeight: 600 }}>{a.label}</th>)}
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Acciones especiales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupos.map((g, gi) => [
                            g.nombre && (
                              <tr key={`g${gi}`}>
                                <td colSpan={6} style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: C.olive, borderTop: `1px solid ${C.sand}` }}>
                                  {g.nombre}
                                </td>
                              </tr>
                            ),
                            ...g.subs.map((sub) => (
                              <tr key={sub.id} style={{ borderTop: '1px solid #f1f1ea' }}>
                                <td style={{ padding: '7px 12px' }}>
                                  <div className="flex items-center gap-2">
                                    {!sub.responsable && (
                                      <button type="button" title={filaCompleta(sub) ? 'Quitar todo' : 'Dar todo'} disabled={bloqueado} onClick={() => toggleFila(mod, sub)}
                                        style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer',
                                          background: filaCompleta(sub) ? C.green : codigosSub(sub).some((c) => tengo.has(c)) ? C.mint : '#d1d5db' }} />
                                    )}
                                    <span style={{ color: '#1f2937', fontWeight: 600 }}>{sub.nombre}</span>
                                    {sub.enConstruccion && <span title="Pantalla en construcción" style={{ fontSize: 10, color: '#b45309', background: '#fffbeb', borderRadius: 10, padding: '0 6px' }}><HardHat size={10} style={{ display: 'inline' }} /> en construcción</span>}
                                  </div>
                                  {(sub.desc || sub.nota) && <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0 16px' }}>{sub.desc || sub.nota}</p>}
                                </td>

                                {sub.responsable ? (
                                  <td colSpan={5} style={{ padding: '7px 8px' }}>
                                    <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: 12.5, color: '#374151' }}>
                                      <Casilla checked={responsables.includes(sub.responsable)} disabled={bloqueado} onChange={() => toggleResponsable(mod, sub.responsable)} />
                                      <Inbox size={14} style={{ color: C.olive }} /> Responsable: recibe los reportes por correo, los gestiona y diligencia el formato
                                    </label>
                                  </td>
                                ) : (
                                  <>
                                    {ACCIONES_CRUD.map((a) => (
                                      <td key={a.key} style={{ textAlign: 'center' }}>
                                        {sub[a.key]
                                          ? <Casilla checked={tengo.has(sub[a.key])} disabled={bloqueado} onChange={() => toggleCrud(mod, sub, a.key)} title={`${a.label} · ${sub.nombre}`} />
                                          : <span style={{ color: '#d1d5db' }}>—</span>}
                                      </td>
                                    ))}
                                    <td style={{ padding: '6px 8px' }}>
                                      <div className="flex flex-wrap gap-1">
                                        {(sub.extras || []).map((ex) => (
                                          <Chip key={ex.code} on={tengo.has(ex.code)} disabled={bloqueado} onClick={() => toggleExtra(mod, sub, ex)}>{ex.label}</Chip>
                                        ))}
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )),
                          ])}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Gestión de usuarios: solo admin */}
            <p className="flex items-center gap-2" style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', borderRadius: 10, padding: '8px 12px' }}>
              <Info size={14} /> Gestión de Usuarios y la asignación de permisos son exclusivas del rol Administrador.
            </p>

            {/* Permisos antiguos */}
            {antiguos.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 12, color: '#78350f', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px' }}>
                <span className="flex-1">Tiene {antiguos.length} permiso{antiguos.length === 1 ? '' : 's'} antiguo{antiguos.length === 1 ? '' : 's'} que ya no se usa{antiguos.length === 1 ? '' : 'n'} en ninguna pantalla.</span>
                <button type="button" disabled={bloqueado} onClick={limpiar} className="flex items-center gap-1"
                  style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8, border: '1px solid #fcd34d', background: 'white', color: '#92400e', cursor: 'pointer' }}>
                  <Eraser size={13} /> Limpiar
                </button>
              </div>
            )}

            {bloqueado && !loading && (
              <p className="flex items-center gap-2 text-xs" style={{ color: C.olive }}><Loader2 size={13} className="animate-spin" /> Guardando…</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}