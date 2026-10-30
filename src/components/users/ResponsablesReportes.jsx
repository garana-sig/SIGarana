// src/components/users/ResponsablesReportes.jsx
// ═══════════════════════════════════════════════════════════════════
// Admin: responsables de "Ayúdanos a mejorar" (Gestión de Usuarios)
//   · Ver por tipo quién recibe el correo y gestiona los reportes
//   · Agregar / quitar responsables (varios por tipo)
//   · Activar / desactivar un tipo (si se desactiva no aparece en el modal)
// BD: reporte_tipo, reporte_tipo_responsable (escritura solo admin por RLS)
// ═══════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { X, Loader2, UserPlus, Bell } from 'lucide-react';
import { useResponsablesReportes } from '@/hooks/useReportes';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };

// Tipos retirados que no se muestran en este modal (operación inusual salió de la hoja 30-oct-2026;
// su registro RE-GF-10 sigue en Mejoramiento Continuo)
const OCULTOS = ['operacion_inusual'];

// (30-oct-2026) Mismo estilo que la hoja: ⛑️ → casco SST; "· SST" / "· BASC" → chip amarillo
function IconoTipo({ icono }) {
  if (icono === '⛑️' || icono === '⛑') return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 31c0-9.4 7.2-17 16-17s16 7.6 16 17z" fill="#f59e0b" />
      <rect x="21.5" y="9" width="5" height="22" rx="1.5" fill="#fbbf24" />
      <rect x="4" y="30" width="40" height="6" rx="3" fill="#d97706" />
    </svg>
  );
  return <>{icono}</>;
}
function NombreTipo({ nombre = '' }) {
  const m = nombre.match(/^(.*?)\s*·\s*(SST|BASC)\s*$/i);
  if (!m) return <>{nombre}</>;
  return (<>{m[1]}<span style={{ display: 'inline-block', marginLeft: 6, verticalAlign: 'middle', fontSize: 10.5, fontWeight: 800, letterSpacing: .5,
    color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 20, padding: '1px 7px' }}>{m[2].toUpperCase()}</span></>);
}

export default function ResponsablesReportes({ open, onClose, onToast }) {
  const { tipos, usuarios, loading, error, agregar, quitar, toggleActivo } = useResponsablesReportes(open);
  const [sel, setSel]       = useState({});     // { tipo_codigo: user_id }
  const [ocupado, setOcupado] = useState(null);

  if (!open) return null;

  const run = async (key, fn, okMsg) => {
    setOcupado(key);
    try { await fn(); if (okMsg) onToast?.(okMsg); }
    catch (e) { onToast?.(e.message, 'error'); }
    finally { setOcupado(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,46,37,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3" style={{ background: C.green, padding: '16px 20px', borderRadius: '16px 16px 0 0' }}>
          <Bell size={20} color={C.mint} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>Responsables de reportes</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>"Ayúdanos a mejorar" · reciben el correo y gestionan cada tipo</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: 18 }} className="space-y-3">
          {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" style={{ color: C.mint }} /></div>}
          {error && <p style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}

          {!loading && tipos.filter((t) => !OCULTOS.includes(t.codigo)).sort((a, b) => (b.is_active - a.is_active) || (a.orden - b.orden)).map((t) => {
            const disponibles = usuarios.filter((u) => !t.responsables.some((r) => r.user_id === u.id));
            return (
              <div key={t.codigo} style={{ border: `1px solid ${C.sand}`, borderLeft: `5px solid ${t.color}`, borderRadius: 14, padding: '12px 14px', opacity: t.is_active ? 1 : 0.6 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 20, display: 'flex' }}><IconoTipo icono={t.icono} /></span>
                  <span style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}><NombreTipo nombre={t.nombre} /></span>
                  {!t.is_active && <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 20, padding: '1px 8px' }}>Oculto en la hoja</span>}
                  <label className="flex items-center gap-1.5 ml-auto" style={{ fontSize: 12, color: '#4b5563', cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.is_active} disabled={ocupado === `act-${t.codigo}`}
                      onChange={(e) => run(`act-${t.codigo}`, () => toggleActivo(t.codigo, e.target.checked),
                        e.target.checked ? 'Tipo activado' : 'Tipo desactivado')} />
                    Visible en el modal
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {t.responsables.length === 0 && (
                    <span style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', borderRadius: 20, padding: '3px 10px' }}>
                      ⚠️ Sin responsables: los reportes no le llegarán a nadie por correo
                    </span>
                  )}
                  {t.responsables.map((r) => (
                    <span key={r.id} className="flex items-center gap-1.5" style={{ fontSize: 12, background: `${C.mint}1f`, color: C.green, borderRadius: 20, padding: '3px 6px 3px 10px' }}>
                      <b>{r.full_name}</b> <span style={{ color: '#6b7280' }}>{r.email}</span>
                      <button type="button" title="Quitar" disabled={ocupado === r.id}
                        onClick={() => run(r.id, () => quitar(r.id), 'Responsable quitado')}
                        style={{ background: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#9ca3af', lineHeight: '18px', fontSize: 11 }}>✕</button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 mt-2.5">
                  <select value={sel[t.codigo] || ''} onChange={(e) => setSel({ ...sel, [t.codigo]: e.target.value })}
                    style={{ flex: 1, minWidth: 0, border: `1px solid ${C.sand}`, borderRadius: 10, padding: '7px 10px', fontSize: 13 }}>
                    <option value="">Agregar responsable…</option>
                    {disponibles.map((u) => <option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}
                  </select>
                  <button type="button" disabled={!sel[t.codigo] || ocupado === `add-${t.codigo}`}
                    onClick={() => run(`add-${t.codigo}`, async () => { await agregar(t.codigo, sel[t.codigo]); setSel({ ...sel, [t.codigo]: '' }); }, 'Responsable agregado')}
                    className="flex items-center gap-1.5"
                    style={{ background: C.green, color: 'white', border: 'none', borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sel[t.codigo] ? 1 : 0.5 }}>
                    <UserPlus size={14} /> Agregar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}