// src/components/modules/GestionDocumental/FormatosSistema.jsx
// ═══════════════════════════════════════════════════════════════════
// Formatos del sistema (solo admin) — Gestión Documental
// Vincula cada uso de la app con su documento del Listado Maestro.
// La app toma de ahí código, versión, fecha y la plantilla del Excel.
// ═══════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Link2, Search, X, Loader2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useFormatosAdmin, etiquetaFormato } from '@/hooks/useFormatoVinculado';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };
const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtFecha = (s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

function Selector({ uso, docs, onClose, onGuardar }) {
  const [q, setQ]     = useState('');
  const [sel, setSel] = useState(uso.document?.id || null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const f = norm(q.trim());
  const lista = docs.filter((d) => !f || norm(`${d.code} ${d.name}`).includes(f)).slice(0, 80);

  const guardar = async () => {
    setSaving(true); setErr(null);
    try { await onGuardar(sel); } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,46,37,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3" style={{ background: C.green, padding: '14px 18px', borderRadius: '16px 16px 0 0' }}>
          <Link2 size={18} color={C.mint} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{uso.nombre}</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, margin: 0 }}>Elige el documento del Listado Maestro</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 14 }} className="relative">
          <Search size={15} className="absolute" style={{ left: 26, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código o nombre…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, fontSize: 13, border: `1px solid ${C.sand}`, outline: 'none' }} />
        </div>
        <div style={{ overflowY: 'auto', padding: '0 14px', flex: 1 }}>
          <label className="flex items-center gap-2" style={{ padding: '8px 10px', borderRadius: 10, cursor: 'pointer', background: sel === null ? '#f3f4f6' : 'transparent', fontSize: 13, color: '#6b7280' }}>
            <input type="radio" checked={sel === null} onChange={() => setSel(null)} /> Sin formato vinculado
          </label>
          {lista.map((d) => (
            <label key={d.id} className="flex items-center gap-2" style={{ padding: '8px 10px', borderRadius: 10, cursor: 'pointer', background: sel === d.id ? `${C.mint}22` : 'transparent', fontSize: 13 }}>
              <input type="radio" checked={sel === d.id} onChange={() => setSel(d.id)} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.green, minWidth: 82 }}>{d.code}</span>
              <span style={{ color: '#374151', flex: 1 }}>{d.name}</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>v{String(d.version ?? 1).padStart(2, '0')}</span>
            </label>
          ))}
        </div>
        {err && <p style={{ color: '#b91c1c', fontSize: 12.5, margin: '8px 16px 0' }}>{err}</p>}
        <div className="flex justify-end gap-2" style={{ padding: 14, borderTop: `1px solid ${C.sand}` }}>
          <button type="button" onClick={onClose} style={{ background: 'white', border: `1px solid ${C.sand}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={saving}
            style={{ background: C.green, color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FormatosSistema() {
  const { usos, docs, loading, error, vincular } = useFormatosAdmin();
  const [editando, setEditando] = useState(null);

  const modulos = [...new Set(usos.map((u) => u.modulo))];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: C.green }}>Formatos del sistema</h2>
        <p className="text-sm mt-1" style={{ color: C.olive }}>
          Cada pantalla de la app toma el código, la versión y la plantilla del documento que elijas aquí.
          Al actualizar el formato en Gestión Documental, la app lo refleja sola.
        </p>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" style={{ color: C.mint }} /></div>}
      {error && <p style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}

      {!loading && modulos.map((m) => (
        <section key={m} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.dark }}>{m}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {usos.filter((u) => u.modulo === m).map((u) => {
              const d = u.document;
              const xls = d?.file_path && !/\.xlsx$/i.test(d.file_path);
              return (
                <div key={u.clave} style={{ background: 'white', border: `1px solid ${C.sand}`, borderLeft: `5px solid ${d ? C.mint : '#e5e7eb'}`, borderRadius: 14, padding: '12px 14px' }}>
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet size={20} style={{ color: d ? C.green : '#9ca3af', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: C.dark, fontSize: 14, margin: 0 }}>{u.nombre}</p>
                      {u.descripcion && <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{u.descripcion}</p>}
                      {d ? (
                        <p style={{ fontSize: 12.5, margin: '6px 0 0', color: '#374151' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.green }}>{etiquetaFormato(d)}</span>
                          {' · '}{d.name}{d.change_date ? ` · ${fmtFecha(d.change_date)}` : ''}
                        </p>
                      ) : (
                        <p style={{ fontSize: 12.5, margin: '6px 0 0', color: '#d97706' }}>Sin formato vinculado</p>
                      )}
                      {xls && (
                        <p className="flex items-center gap-1" style={{ fontSize: 11.5, color: '#b45309', margin: '4px 0 0' }}>
                          <AlertTriangle size={12} /> El archivo es .{d.file_path.split('.').pop()}: súbelo en .xlsx para que el Excel se pueda exportar.
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => setEditando(u)}
                      style={{ background: 'white', color: C.green, border: `1px solid ${C.mint}`, borderRadius: 10, padding: '6px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      {d ? 'Cambiar' : 'Vincular'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {editando && (
        <Selector uso={editando} docs={docs} onClose={() => setEditando(null)}
          onGuardar={async (docId) => { await vincular(editando.clave, docId); setEditando(null); }} />
      )}
    </div>
  );
}