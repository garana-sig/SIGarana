// src/components/AyudanosAMejorar.jsx
// ═══════════════════════════════════════════════════════════════════
// "Ayúdanos a mejorar" — hoja Garana con carita, flotante en toda la app.
// Al tocarla abre el modal "Eres importante y tu opinión nos importa":
//   tipo (de la tabla reporte_tipo) → descripción, área, foto, anónimo
//   → crear_reporte() → consecutivo REP-AAAA-NNNN + correo a responsables.
// Se monta una sola vez en Layout.jsx. Imagen: public/hoja-garana.png
// v3 (30-oct-2026): rescate — no se puede esconder detrás del menú lateral (z-index 55 + se corre al soltarla).
// v2 (30-oct-2026): ícono ⛑️ → casco SST dibujado; nombre "… · SST" o "… · BASC" → chip.
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react';
import { useReporteTipos, crearReporte } from '@/hooks/useReportes';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };

const CSS = `
.aam-buddy{position:fixed;right:20px;bottom:18px;z-index:55;display:flex;align-items:flex-end;gap:8px;cursor:grab;user-select:none;-webkit-tap-highlight-color:transparent;background:none;border:none;padding:0;touch-action:none}
.aam-buddy.aam-drag{cursor:grabbing}
.aam-buddy.aam-drag .aam-wrap{animation:none;transform:scale(1.08)}
.aam-mini .aam-leaf{width:52px;height:52px}
.aam-mini .aam-wrap{width:30px;height:44px}
.aam-mini .aam-halo,.aam-mini .aam-ping{display:none}
.aam-tool{position:absolute;top:-4px;left:-4px;width:22px;height:22px;border-radius:50%;border:1px solid #e8e8dc;background:#fff;color:${C.green};font-size:13px;font-weight:800;line-height:18px;cursor:pointer;opacity:0;transition:opacity .15s;box-shadow:0 2px 6px rgba(0,0,0,.15);z-index:2;padding:0}
.aam-buddy:hover .aam-tool,.aam-buddy:focus-within .aam-tool{opacity:1}
@media (hover:none){.aam-tool{opacity:1}}
.aam-bubble{background:#fff;color:${C.green};font-weight:700;font-size:13px;padding:9px 13px;border-radius:16px 16px 4px 16px;box-shadow:0 10px 28px -10px rgba(26,46,37,.45);border:1px solid #e8e8dc;white-space:nowrap;transform-origin:bottom right;animation:aam-pop 8s ease-in-out infinite;text-align:left}
.aam-bubble small{display:block;font-weight:500;color:#6b7280;font-size:11px;margin-top:2px}
@keyframes aam-pop{0%,8%{opacity:0;transform:scale(.6)}14%,68%{opacity:1;transform:scale(1)}76%,100%{opacity:0;transform:scale(.6)}}
.aam-leaf{width:92px;height:92px;position:relative;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 10px 12px rgba(26,46,37,.28))}
.aam-halo{position:absolute;inset:0;stroke-dasharray:190;stroke-dashoffset:190;animation:aam-draw 7s ease-in-out infinite}
@keyframes aam-draw{0%{stroke-dashoffset:190;opacity:0}12%{opacity:1}35%,75%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:-190;opacity:0}}
.aam-wrap{position:relative;width:54px;height:78px;transform-origin:50% 100%;animation:aam-sway 4s ease-in-out infinite}
.aam-wrap img,.aam-wrap svg{position:absolute;inset:0;width:100%;height:100%}
.aam-buddy:hover .aam-wrap,.aam-buddy:focus-visible .aam-wrap{animation:aam-wiggle .5s ease-in-out infinite}
@keyframes aam-sway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes aam-wiggle{0%,100%{transform:rotate(-9deg) translateY(0)}50%{transform:rotate(9deg) translateY(-6px)}}
.aam-eye{transform-box:fill-box;transform-origin:center;animation:aam-blink 4.5s infinite}
@keyframes aam-blink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
.aam-ping{position:absolute;top:8px;right:12px;width:13px;height:13px;border-radius:50%;background:#f59e0b;border:2px solid #fff}
.aam-ping:after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid #f59e0b;animation:aam-ping 1.8s ease-out infinite}
@keyframes aam-ping{from{opacity:.9;transform:scale(.6)}to{opacity:0;transform:scale(1.6)}}
.aam-back{position:fixed;inset:0;background:rgba(26,46,37,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:14px;z-index:60;animation:aam-fade .25s ease}
@keyframes aam-fade{from{opacity:0}to{opacity:1}}
.aam-modal{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;background:#fff;border-radius:24px;box-shadow:0 30px 60px -20px rgba(0,0,0,.45);animation:aam-up .35s cubic-bezier(.2,.9,.3,1.2)}
@keyframes aam-up{from{transform:translateY(24px) scale(.97);opacity:0}to{transform:none;opacity:1}}
.aam-opt{display:flex;gap:14px;align-items:center;text-align:left;width:100%;border:1.5px solid #ececdf;background:#fff;border-radius:16px;padding:14px 16px;cursor:pointer;transition:transform .18s, box-shadow .18s}
.aam-opt:hover{transform:translateY(-2px);box-shadow:0 12px 24px -14px rgba(46,82,68,.5)}
.aam-modal,.aam-modal *{box-sizing:border-box}
.aam-input{width:100%;border:1px solid ${C.sand};border-radius:12px;padding:10px 12px;font:inherit;font-size:13.5px;outline:none;background:#fff}
.aam-input:focus{border-color:${C.mint};box-shadow:0 0 0 3px #6dbd9633}
.aam-later{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:14px;background:#f6f6ef;border:1.5px solid #e4e4d4;color:#374151;font-size:14px;font-weight:700;border-radius:14px;padding:12px;cursor:pointer;transition:background .15s}
.aam-later:hover{background:#ededde}
.aam-later small{display:block;font-weight:500;font-size:11.5px;color:#6b7280}
.aam-conf{position:fixed;inset:0;pointer-events:none;z-index:70}
@media (max-width:640px){.aam-bubble{display:none}.aam-buddy{right:10px;bottom:10px}}
@media (prefers-reduced-motion:reduce){.aam-wrap,.aam-halo,.aam-bubble,.aam-eye,.aam-ping:after{animation:none}.aam-halo{stroke-dashoffset:0}.aam-bubble{opacity:1}}
`;

// ─── Hoja Garana con carita (también se usa en el encabezado del modal) ──
function HojaCarita({ conHalo = true }) {
  return (
    <div className="aam-leaf">
      {conHalo && (
        <svg className="aam-halo" viewBox="0 0 100 100" width="92" height="92" aria-hidden="true">
          <path d="M58 6 A 44 44 0 1 0 58 94" fill="none" stroke="#0f5e3e" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )}
      <div className="aam-wrap">
        <img src="/hoja-garana.png" alt="" draggable="false" />
        <svg viewBox="0 0 58 84" aria-hidden="true">
          <g className="aam-eye"><ellipse cx="22.5" cy="53" rx="3.6" ry="4.4" fill="#fff" /><circle cx="23.3" cy="54" r="1.9" fill="#1a2e25" /></g>
          <g className="aam-eye"><ellipse cx="35.5" cy="53" rx="3.6" ry="4.4" fill="#fff" /><circle cx="36.3" cy="54" r="1.9" fill="#1a2e25" /></g>
          <path d="M24.5 60 Q29 64 33.5 60" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="18" cy="59.5" r="2.2" fill="#f59e0b" opacity=".7" />
          <circle cx="40" cy="59.5" r="2.2" fill="#f59e0b" opacity=".7" />
        </svg>
      </div>
    </div>
  );
}

// ─── Íconos de los tipos (v2, 30-oct-2026) ───────────────────────────
// El ícono viene de reporte_tipo.icono (emoji, también se usa en el correo).
// '⛑️' se dibuja como casco de seguridad industrial (SST).
function CascoSST({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 31c0-9.4 7.2-17 16-17s16 7.6 16 17z" fill="#f59e0b" />
      <path d="M20 14.6V11a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3.6" fill="#fbbf24" />
      <rect x="21.5" y="9" width="5" height="22" rx="1.5" fill="#fbbf24" />
      <rect x="4" y="30" width="40" height="6" rx="3" fill="#d97706" />
      <path d="M14 20c1.5-2 3.5-3.4 6-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".6" />
    </svg>
  );
}
function IconoTipo({ icono, size }) {
  if (icono === '⛑️' || icono === '⛑') return <CascoSST size={size} />;
  return <>{icono}</>;
}
// Etiqueta (chip) cuando el nombre del tipo termina en "· SST" o "· BASC"
const ETIQUETAS = {
  SST:  { color: '#92400e', background: '#fef3c7', border: '#fcd34d' },
  BASC: { color: '#92400e', background: '#fef3c7', border: '#fcd34d' },   // mismo estilo que SST
};
function partirNombre(nombre = '') {
  const m = nombre.match(/^(.*?)\s*·\s*(SST|BASC)\s*$/i);
  return m ? { texto: m[1], sst: m[2].toUpperCase() } : { texto: nombre, sst: null };
}
function ChipSST({ tag = 'SST' }) {
  const e = ETIQUETAS[tag] || ETIQUETAS.SST;
  return (
    <span style={{ display: 'inline-block', marginLeft: 6, verticalAlign: 'middle', fontSize: 10.5, fontWeight: 800, letterSpacing: .5,
      color: e.color, background: e.background, border: `1px solid ${e.border}`, borderRadius: 20, padding: '1px 7px' }}>{tag}</span>
  );
}

function Header({ titulo, sub, icono, onClose }) {
  return (
    <div style={{ position: 'relative', background: `linear-gradient(135deg, ${C.green}, ${C.dark})`, color: 'white', padding: '20px 22px', overflow: 'hidden', borderRadius: '24px 24px 0 0' }}>
      <div style={{ position: 'absolute', right: -50, top: -60, width: 200, height: 200, borderRadius: '50%', background: C.mint, opacity: 0.18 }} />
      <button type="button" onClick={onClose} aria-label="Cerrar"
        style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.14)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 15, zIndex: 3 }}>✕</button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative', zIndex: 1, paddingRight: 28 }}>
        <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}><IconoTipo icono={icono} size={38} /></div>
        <div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, lineHeight: 1.25, margin: 0 }}>{titulo}</h2>
          <p style={{ fontSize: 13, color: '#dedecc', margin: '4px 0 0' }}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

function confeti(canvas) {
  if (!canvas || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const x = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const cols = [C.mint, C.green, '#f59e0b', C.olive, C.sand];
  const p = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2, y: canvas.height / 2, vx: (Math.random() - 0.5) * 12, vy: Math.random() * -12 - 4,
    r: Math.random() * 6 + 3, c: cols[(Math.random() * 5) | 0], a: Math.random() * 6,
  }));
  let f = 0;
  (function tick() {
    x.clearRect(0, 0, canvas.width, canvas.height);
    p.forEach((o) => { o.x += o.vx; o.y += o.vy; o.vy += 0.35; o.a += 0.2;
      x.save(); x.translate(o.x, o.y); x.rotate(o.a); x.fillStyle = o.c; x.fillRect(-o.r / 2, -o.r / 2, o.r, o.r * 0.6); x.restore(); });
    if (++f < 90) requestAnimationFrame(tick); else x.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

// ═══════════════════════════════════════════════════════════════════
export default function AyudanosAMejorar() {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso]       = useState('inicio');   // inicio | form | ok
  const [tipo, setTipo]       = useState(null);
  const [desc, setDesc]       = useState('');
  const [area, setArea]       = useState('');
  const [foto, setFoto]       = useState(null);
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]     = useState(null);
  const [resultado, setResultado] = useState(null);
  const confRef = useRef(null);
  const fileRef = useRef(null);
  const { tipos, areas, loading } = useReporteTipos(abierto);

  // ── Hoja movible (oct 2026): se arrastra a cualquier lugar y se puede achicar.
  //    La posición se recuerda en este navegador.
  const POS_KEY = 'aam-pos-v1';
  const leer = () => { try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch { return {}; } };
  const [pos, setPos]   = useState(() => leer().pos || null);   // {x,y} esquina sup. izq. · null = abajo a la derecha
  const [mini, setMini] = useState(() => !!leer().mini);
  const [arrastrando, setArrastrando] = useState(false);
  const buddyRef = useRef(null);
  const drag = useRef(null);
  const guardar = (p, m) => { try { localStorage.setItem(POS_KEY, JSON.stringify({ pos: p, mini: m })); } catch { /* sin almacenamiento */ } };
  const limitar = (x, y) => {
    const el = buddyRef.current; const w = el?.offsetWidth || 80; const h = el?.offsetHeight || 90;
    return { x: Math.min(Math.max(4, x), window.innerWidth - w - 4), y: Math.min(Math.max(4, y), window.innerHeight - h - 4) };
  };
  // (30-oct-2026) Rescate: la hoja nunca queda debajo del menú lateral.
  // Si cae encima del <aside> (al soltarla, al cargar o al cambiar el tamaño
  // de la ventana) se corre a la derecha del menú.
  const ajustar = (p) => {
    if (!p) return p;
    let { x, y } = limitar(p.x, p.y);
    const el = buddyRef.current; const w = el?.offsetWidth || 80;
    const r = document.querySelector('aside')?.getBoundingClientRect();
    if (r && r.width > 0 && r.right > 0 && r.left < window.innerWidth && x < r.right && x + w > r.left) {
      ({ x, y } = limitar(r.right + 12, y));
    }
    return { x, y };
  };
  useEffect(() => {
    // Al cargar: corrige una posición guardada que haya quedado escondida
    const t = setTimeout(() => setPos((p) => { const n = ajustar(p); if (n && (n.x !== p.x || n.y !== p.y)) guardar(n, mini); return n; }), 300);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onResize = () => setPos((p) => ajustar(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('.aam-tool')) return;
    const r = buddyRef.current.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, movido: false };
    buddyRef.current.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx; const dy = e.clientY - d.sy;
    if (!d.movido && Math.hypot(dx, dy) < 6) return;          // un toque no es arrastre
    if (!d.movido) { d.movido = true; setArrastrando(true); }
    setPos(limitar(d.ox + dx, d.oy + dy));
  };
  const onPointerUp = () => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (d.movido) { setArrastrando(false); setPos((p) => { const n = ajustar(p); guardar(n, mini); return n; }); }
    else setAbierto(true);                                       // fue un clic: abrir
  };
  const toggleMini = (e) => { e.stopPropagation(); const m = !mini; setMini(m); guardar(pos, m); };
  const volverEsquina = (e) => { e.stopPropagation(); setPos(null); guardar(null, mini); };

  const reset = () => {
    setPaso('inicio'); setTipo(null); setDesc(''); setArea(''); setFoto(null);
    setAnonimo(false); setError(null); setResultado(null); setEnviando(false);
  };
  const cerrar = () => { if (enviando) return; setAbierto(false); setTimeout(reset, 250); };

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, enviando]); // eslint-disable-line react-hooks/exhaustive-deps

  const fotoPreview = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => { if (fotoPreview) URL.revokeObjectURL(fotoPreview); }, [fotoPreview]);

  const elegirFoto = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('La foto debe ser una imagen'); return; }
    if (f.size > 15 * 1024 * 1024) { setError('La foto es muy pesada (máx. 15 MB)'); return; }
    setError(null); setFoto(f);
  };

  const enviar = async () => {
    if (desc.trim().length < 5) { setError('Escribe una breve descripción (mínimo 5 caracteres).'); return; }
    setEnviando(true); setError(null);
    try {
      const r = await crearReporte({ tipo: tipo.codigo, descripcion: desc.trim(), area, foto, anonimo });
      setResultado(r); setPaso('ok');
      setTimeout(() => confeti(confRef.current), 50);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>

      {/* ── Hoja flotante ── */}
      <div ref={buddyRef} role="button" tabIndex={0}
        className={`aam-buddy${mini ? ' aam-mini' : ''}${arrastrando ? ' aam-drag' : ''}`}
        style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; setArrastrando(false); }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setAbierto(true))}
        aria-label="Ayúdanos a mejorar: registrar sugerencia o reporte"
        title="Ayúdanos a mejorar · arrástrame para moverme">
        {/* La burbuja solo se muestra en la esquina original y en tamaño normal */}
        {!pos && !mini && <span className="aam-bubble">¡Ayúdanos a mejorar! 👋<small>Tu opinión nos importa</small></span>}
        <span style={{ position: 'relative', display: 'block' }}>
          <button type="button" className="aam-tool" onClick={toggleMini} onDoubleClick={volverEsquina}
            title={mini ? 'Agrandar (doble clic: volver a la esquina)' : 'Achicar (doble clic: volver a la esquina)'}
            aria-label={mini ? 'Agrandar' : 'Achicar'}>{mini ? '+' : '–'}</button>
          <span className="aam-ping" />
          <HojaCarita />
        </span>
      </div>

      {/* ── Modal ── */}
      {abierto && (
        <div className="aam-back" onClick={(e) => e.target === e.currentTarget && cerrar()} role="dialog" aria-modal="true">
          <div className="aam-modal">

            {paso === 'inicio' && (<>
              <Header titulo="Eres importante y tu opinión nos importa"
                sub="Cuéntanos qué podemos mejorar. Toma menos de un minuto." icono="🌿" onClose={cerrar} />
              <div style={{ padding: '18px 20px 20px' }}>
                {loading && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>Cargando…</p>}
                {!loading && tipos.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No hay tipos de reporte activos en este momento.</p>
                )}
                <div style={{ display: 'grid', gap: 10 }}>
                  {tipos.map((t) => (
                    <button key={t.codigo} type="button" className="aam-opt" style={{ borderColor: `${t.color}40` }}
                      onClick={() => { setTipo(t); setPaso('form'); }}>
                      <span style={{ width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, background: `${t.color}14` }}><IconoTipo icono={t.icono} size={28} /></span>
                      <span style={{ minWidth: 0 }}>
                        <b style={{ display: 'block', fontSize: 14.5, color: C.dark }}>
                          {partirNombre(t.nombre).texto}{partirNombre(t.nombre).sst && <ChipSST tag={partirNombre(t.nombre).sst} />}
                        </b>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{t.descripcion}</span>
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#c4c4b4', fontSize: 20 }}>›</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="aam-later" onClick={cerrar}>
                  <span style={{ fontSize: 18 }}>🕐</span>
                  <span style={{ textAlign: 'left' }}>
                    Ahora no, en otro momento
                    <small>Puedes reportar cuando quieras tocando la hoja 🌿</small>
                  </span>
                </button>
              </div>
            </>)}

            {paso === 'form' && tipo && (<>
              <Header titulo={<>{partirNombre(tipo.nombre).texto}{partirNombre(tipo.nombre).sst && <ChipSST tag={partirNombre(tipo.nombre).sst} />}</>} sub="Solo lo básico: el responsable completará el registro oficial." icono={tipo.icono} onClose={cerrar} />
              <div style={{ padding: '18px 20px 20px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 5 }}>Descripción *</label>
                <textarea className="aam-input" rows={4} autoFocus value={desc} maxLength={4000}
                  onChange={(e) => setDesc(e.target.value)} placeholder={tipo.placeholder || 'Cuéntanos…'} style={{ resize: 'vertical' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 5 }}>Área (opcional)</label>
                    <select className="aam-input" value={area} onChange={(e) => setArea(e.target.value)}>
                      <option value="">Selecciona…</option>
                      {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 5 }}>Foto (opcional)</label>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={elegirFoto} style={{ display: 'none' }} />
                    {!foto ? (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        style={{ width: '100%', border: '1.5px dashed #d6d6c6', borderRadius: 12, padding: '10px', background: 'white', fontSize: 12.5, color: '#6b7280', cursor: 'pointer' }}>
                        📷 Tomar o subir foto
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.sand}`, borderRadius: 12, padding: 6 }}>
                        <img src={fotoPreview} alt="Foto adjunta" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                        <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foto.name}</span>
                        <button type="button" onClick={() => setFoto(null)} aria-label="Quitar foto"
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 15 }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>

                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f6f6ef', borderRadius: 12, padding: '11px 12px', marginTop: 14, fontSize: 12.5, color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: C.green }} />
                  <span>
                    <b>Enviar de forma anónima</b>
                    <small style={{ display: 'block', color: '#6b7280', marginTop: 2 }}>No se guardará quién hizo el reporte. No podremos avisarte cuando se cierre.</small>
                  </span>
                </label>

                {error && (
                  <p style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, marginTop: 12 }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => { setPaso('inicio'); setError(null); }} disabled={enviando}
                    style={{ background: 'white', border: `1px solid ${C.sand}`, color: '#374151', borderRadius: 12, padding: '11px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                    ← Atrás
                  </button>
                  <button type="button" onClick={enviar} disabled={enviando}
                    style={{ flex: 1, background: C.green, color: 'white', border: 'none', borderRadius: 12, padding: 11, fontWeight: 700, fontSize: 13.5, cursor: enviando ? 'wait' : 'pointer', opacity: enviando ? 0.75 : 1 }}>
                    {enviando ? 'Enviando…' : 'Enviar reporte'}
                  </button>
                </div>
              </div>
            </>)}

            {paso === 'ok' && resultado && (<>
              <Header titulo="¡Gracias por ayudarnos a mejorar!" sub="Tu reporte ya está en manos del responsable." icono="🎉" onClose={cerrar} />
              <div style={{ padding: '18px 20px 22px', textAlign: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#e9f6ef', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h3 style={{ fontFamily: 'Georgia, serif', color: C.green, fontSize: 20, margin: 0 }}>Reporte enviado</h3>
                <div style={{ display: 'inline-block', marginTop: 12, fontFamily: 'ui-monospace, monospace', fontWeight: 800, fontSize: 18, color: C.green, background: '#f0f7f3', border: `1px dashed ${C.mint}`, borderRadius: 10, padding: '8px 16px', letterSpacing: 1 }}>
                  {resultado.consecutivo}
                </div>
                <p style={{ fontSize: 13, color: '#4b5563', marginTop: 10, lineHeight: 1.55 }}>
                  {resultado.responsables
                    ? <>Lo recibirá <b>{resultado.responsables}</b> por correo para darle gestión.<br /></>
                    : <>Quedó registrado para su gestión.<br /></>}
                  {anonimo
                    ? <>Lo enviaste de forma <b>anónima</b>: guarda este número como referencia.</>
                    : <>Guarda este número si quieres consultarlo con el responsable.</>}
                </p>
                <button type="button" onClick={cerrar}
                  style={{ width: '100%', marginTop: 16, background: C.green, color: 'white', border: 'none', borderRadius: 12, padding: 11, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                  Listo
                </button>
              </div>
            </>)}
          </div>
        </div>
      )}
      <canvas ref={confRef} className="aam-conf" aria-hidden="true" />
    </>
  );
}