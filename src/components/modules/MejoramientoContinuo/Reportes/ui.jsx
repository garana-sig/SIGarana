// src/components/modules/MejoramientoContinuo/Reportes/ui.jsx
// Piezas de interfaz compartidas por los registros de "Ayúdanos a mejorar"
// (Actos inseguros RE-GS-02 · Sugerencias RE-GH-05 · Operación inusual RE-GF-10)
import { useEffect } from 'react';
import { Button } from '@/app/components/ui/button';

export const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };
export const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const hoyISO = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);   // fecha Colombia
export const horaAhora = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 16);
export const fmtFecha = (s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export const fmtFechaHora = (s) => s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
// Hora del reporte (timestamptz) en Colombia → 'HH:MM'
export const horaDe = (iso) => iso ? new Date(new Date(iso).getTime() - 5 * 3600e3).toISOString().slice(11, 16) : '';

export const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: C.green, margin: '12px 0 5px' };
export const inp = { width: '100%', border: `1px solid ${C.sand}`, borderRadius: 10, padding: '8px 10px', fontSize: 13.5, outline: 'none', background: 'white' };

export function Modal({ titulo, sub, onClose, children, ancho = 640 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 flex items-center justify-center p-3" style={{ zIndex: 50, background: 'rgba(26,46,37,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth: ancho, maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3" style={{ background: C.green, padding: '14px 18px', borderRadius: '16px 16px 0 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15.5, margin: 0 }}>{titulo}</p>
            {sub && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>{sub}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: 30, height: 30 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

export function Check({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, background: checked ? `${C.mint}1f` : 'transparent' }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} style={{ width: 16, height: 16, accentColor: C.green }} /> {children}
    </label>
  );
}

export function Radio({ name, value, checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: checked ? `${C.mint}1f` : 'transparent', border: `1px solid ${checked ? C.mint : '#ececdf'}` }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} style={{ accentColor: C.green }} /> {children}
    </label>
  );
}

// Pie con error + botones
export function PieForm({ err, saving, editando, onClose, onGuardar }) {
  return (
    <>
      {err && <p style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, marginTop: 12 }}>{err}</p>}
      <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={onGuardar} disabled={saving} style={{ background: C.green, color: 'white' }}>
          {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar registro'}
        </Button>
      </div>
    </>
  );
}

// Aviso "desde el reporte REP-…"
export function DesdeReporte({ reporte }) {
  if (!reporte) return null;
  return (
    <p style={{ fontSize: 12.5, background: '#f6f6ef', borderRadius: 10, padding: '8px 12px', margin: 0, color: '#4b5563' }}>
      Desde el reporte <b>{reporte.consecutivo}</b>: el número del formato será el mismo consecutivo.
      {reporte.is_anonimo && <> Es <b>anónimo</b>: los datos de quien reporta quedan como "Anónimo".</>}
    </p>
  );
}