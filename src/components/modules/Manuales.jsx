// src/components/modules/Manuales.jsx
// ═══════════════════════════════════════════════════════════════════
// Biblioteca de Manuales del SIG (acceso desde Home → "Manuales")
//   • Vista biblioteca: tarjetas de todos los manuales registrados en
//     src/data/manuales.js (escalable: agregar un manual = 1 archivo)
//   • Vista lector: índice lateral con seguimiento de sección, búsqueda
//     dentro del manual con resaltado y bloques con estilo Garana.
// Solo lectura: contenido estático (no toca Supabase).
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useRef } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { MANUALES, getCategorias } from '@/data/manuales';
import {
  BookOpen, Search, ArrowLeft, ArrowRight, FileText, Calendar,
  User, Layers, Quote, Info, X, ChevronRight, Printer, Plus,
} from 'lucide-react';

const C = {
  green: '#2e5244',
  mint: '#6dbd96',
  olive: '#6f7b2c',
  sand: '#dedecc',
  dark: '#1a2e25',
  cream: '#faf9f5',
};

// ─── Utilidades de búsqueda ─────────────────────────────────────────
const norm = (s = '') =>
  s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Todo el texto "buscable" de un bloque
const blockText = (b) => {
  switch (b.type) {
    case 'list': return b.items.join(' ');
    case 'table': return [...b.headers, ...b.rows.flat()].join(' ');
    case 'timeline': return b.items.map((i) => `${i.year} ${i.text}`).join(' ');
    case 'cards': return b.items.map((i) => `${i.title} ${i.text}`).join(' ');
    case 'image': return `${b.alt || ''} ${b.caption || ''}`;
    case 'quote': return `${b.text} ${b.author || ''}`;
    default: return b.text || '';
  }
};

const sectionMatches = (sec, q) =>
  !q || norm(sec.title).includes(q) || sec.blocks.some((b) => norm(blockText(b)).includes(q));

// Resalta coincidencias (insensible a tildes y mayúsculas)
function Hl({ text = '', q }) {
  if (!q) return text;
  const n = norm(text);
  const parts = [];
  let i = 0;
  let idx = n.indexOf(q, i);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} style={{ background: `${C.mint}55`, color: 'inherit', borderRadius: 3, padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
    idx = n.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

// ─── Renderizado de bloques ─────────────────────────────────────────
function Block({ b, q }) {
  const pStyle = { fontSize: 13.5, color: '#374151', lineHeight: 1.75, margin: 0 };

  switch (b.type) {
    case 'subtitle':
      return (
        <h4 style={{ fontSize: 14, fontWeight: 700, color: C.olive, margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronRight size={14} style={{ color: C.mint }} />
          <Hl text={b.text} q={q} />
        </h4>
      );

    case 'p':
      return <p style={pStyle}><Hl text={b.text} q={q} /></p>;

    case 'list':
      return (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {b.items.map((it, i) => (
            <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.mint, marginTop: 8, flexShrink: 0 }} />
              <span style={{ ...pStyle, fontSize: 13 }}><Hl text={it} q={q} /></span>
            </li>
          ))}
        </ul>
      );

    case 'quote':
      return (
        <figure style={{
          margin: 0, background: `${C.green}08`, borderLeft: `4px solid ${C.green}`,
          borderRadius: '0 14px 14px 0', padding: '18px 22px', position: 'relative',
        }}>
          <Quote size={22} style={{ color: `${C.mint}88`, position: 'absolute', top: 12, right: 14 }} />
          <blockquote style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: C.dark }}>
            “<Hl text={b.text} q={q} />”
          </blockquote>
          {b.author && (
            <figcaption style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {b.author}
            </figcaption>
          )}
        </figure>
      );

    case 'callout':
      return (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f7f8f0',
          border: `1px solid ${C.olive}30`, borderRadius: 12, padding: '10px 14px',
        }}>
          <Info size={15} style={{ color: C.olive, marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.6, margin: 0 }}><Hl text={b.text} q={q} /></p>
        </div>
      );

    case 'table':
      return (
        <div style={{ overflowX: 'auto', border: `1px solid ${C.sand}`, borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: C.green }}>
                {b.headers.map((h) => (
                  <th key={h} style={{
                    padding: '9px 12px', textAlign: 'left', color: 'white', fontSize: 11,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? '#fafaf6' : 'white', borderTop: `1px solid ${C.sand}` }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: '8px 12px', color: j === 0 ? C.dark : '#4b5563',
                      fontWeight: j === 0 ? 600 : 400, lineHeight: 1.5, verticalAlign: 'top',
                      fontFamily: /^[A-Z]{2}-[A-Z]{2}-\d{2}$/.test(cell) ? 'ui-monospace, monospace' : undefined,
                    }}>
                      <Hl text={cell} q={q} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'image':
      return (
        <figure style={{ margin: 0, background: 'white', border: `1px solid ${C.sand}`, borderRadius: 14, padding: 16, textAlign: 'center' }}>
          <img src={b.src} alt={b.alt} style={{ maxWidth: '100%', maxHeight: 520, height: 'auto', display: 'inline-block' }} />
          {b.caption && <figcaption style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 8 }}>{b.caption}</figcaption>}
        </figure>
      );

    case 'timeline':
      return (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 25, top: 6, bottom: 6, width: 2, background: `${C.mint}55` }} />
          {b.items.map((it, i) => (
            <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative', paddingBottom: 12 }}>
              <span style={{
                flexShrink: 0, width: 52, textAlign: 'center', fontSize: 11.5, fontWeight: 800,
                color: 'white', background: C.green, borderRadius: 20, padding: '3px 0', zIndex: 1,
              }}>{it.year}</span>
              <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}><Hl text={it.text} q={q} /></span>
            </li>
          ))}
        </ol>
      );

    case 'cards':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {b.items.map((it, i) => (
            <div key={i} style={{
              background: 'white', border: `1px solid ${C.sand}`, borderTop: `3px solid ${[C.green, C.mint, C.olive][i % 3]}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 13.5, fontWeight: 800, color: C.green, margin: '0 0 6px' }}><Hl text={it.title} q={q} /></p>
              <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.65, margin: 0 }}><Hl text={it.text} q={q} /></p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

// ─── Lector de un manual ────────────────────────────────────────────
function ManualViewer({ manual, onBack }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(manual.sections[0]?.id);
  const refs = useRef({});
  const q = norm(query.trim());

  const visibles = useMemo(
    () => manual.sections.filter((s) => sectionMatches(s, q)),
    [manual, q]
  );

  // Scroll-spy: marca en el índice la sección visible
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.dataset.id);
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [visibles]);

  const goTo = (id) => {
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado del documento */}
      <div className="rounded-2xl relative overflow-hidden" style={{ background: C.green, padding: '22px 24px' }}>
        <div className="absolute" style={{ top: -40, right: -20, width: 180, height: 180, borderRadius: '50%', background: C.mint, opacity: 0.08, filter: 'blur(30px)' }} />
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 mb-3"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Todos los manuales
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4 relative">
          <div style={{ minWidth: 0 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: C.mint, fontWeight: 700, letterSpacing: '0.06em' }}>
              {manual.code} · Versión {manual.version}
            </span>
            <h2 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, margin: '4px 0 6px' }}>
              {manual.title}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, margin: 0, maxWidth: 620 }}>{manual.shortDesc}</p>
          </div>
          <div className="flex flex-col gap-1.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            <span className="flex items-center gap-1.5"><Calendar size={13} style={{ color: C.mint }} /> {manual.date}</span>
            <span className="flex items-center gap-1.5"><User size={13} style={{ color: C.mint }} /> {manual.owner}</span>
            <span className="flex items-center gap-1.5"><Layers size={13} style={{ color: C.mint }} /> {manual.process}</span>
          </div>
        </div>
        {manual.normas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 relative">
            {manual.normas.map((n) => (
              <span key={n} style={{ fontSize: 10.5, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px' }}>{n}</span>
            ))}
          </div>
        )}
      </div>

      {/* Barra de búsqueda + índice móvil */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <Search size={15} className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dentro del manual (ej. COPASST, auditoría, PR-GC-01)…"
            style={{
              width: '100%', padding: '9px 34px 9px 34px', borderRadius: 12, fontSize: 13,
              border: `1px solid ${C.sand}`, background: 'white', outline: 'none',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute" style={{ right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={15} />
            </button>
          )}
        </div>
        <select
          className="lg:hidden"
          value={active}
          onChange={(e) => goTo(e.target.value)}
          style={{ padding: '9px 10px', borderRadius: 12, fontSize: 13, border: `1px solid ${C.sand}`, background: 'white', maxWidth: '100%' }}
        >
          {visibles.map((s) => <option key={s.id} value={s.id}>{s.num ? `${s.num}. ` : ''}{s.title}</option>)}
        </select>
        <button
          onClick={() => window.print()}
          className="hidden sm:inline-flex items-center gap-1.5"
          style={{ padding: '9px 12px', borderRadius: 12, fontSize: 12.5, border: `1px solid ${C.sand}`, background: 'white', color: C.green, cursor: 'pointer', fontWeight: 600 }}
        >
          <Printer size={14} /> Imprimir
        </button>
      </div>
      {q && (
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
          {visibles.length === 0
            ? 'Sin resultados en este manual.'
            : `${visibles.length} ${visibles.length === 1 ? 'capítulo contiene' : 'capítulos contienen'} “${query.trim()}”.`}
        </p>
      )}

      <div className="flex gap-5 items-start">
        {/* Índice lateral */}
        <aside className="hidden lg:block flex-shrink-0" style={{ width: 250, position: 'sticky', top: 12 }}>
          <div style={{ background: 'white', border: `1px solid ${C.sand}`, borderRadius: 14, padding: 10, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 8px 8px' }}>
              Contenido
            </p>
            {visibles.map((s) => {
              const on = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  className="w-full text-left flex items-start gap-2 transition-colors"
                  style={{
                    padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: on ? `${C.mint}22` : 'transparent',
                    borderLeft: `3px solid ${on ? C.green : 'transparent'}`,
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: on ? C.green : C.mint, minWidth: 18 }}>{s.num || '•'}</span>
                  <span style={{ fontSize: 12.5, color: on ? C.dark : '#4b5563', fontWeight: on ? 700 : 500, lineHeight: 1.35 }}>{s.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Contenido */}
        <div className="flex-1 min-w-0 space-y-4">
          {visibles.map((s) => (
            <section
              key={s.id}
              data-id={s.id}
              ref={(el) => { refs.current[s.id] = el; }}
              style={{ background: 'white', border: `1px solid ${C.sand}`, borderRadius: 16, overflow: 'hidden', scrollMarginTop: 12 }}
            >
              <div className="flex items-center gap-3" style={{ padding: '14px 20px', borderBottom: `1px solid ${C.sand}`, background: C.cream }}>
                {s.num && (
                  <span style={{
                    width: 32, height: 32, borderRadius: 10, background: C.green, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0,
                  }}>{s.num}</span>
                )}
                <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: C.dark }}>
                  <Hl text={s.title} q={q} />
                </h3>
              </div>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s.blocks.map((b, i) => <Block key={i} b={b} q={q} />)}
              </div>
            </section>
          ))}

          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>
            📄 Documento controlado {manual.code} — versión {manual.version} ({manual.date}). La copia vigente es la publicada en el SIG.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Biblioteca ─────────────────────────────────────────────────────
export default function Manuales() {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('todas');
  const categorias = getCategorias();
  const q = norm(query.trim());

  const lista = MANUALES.filter((m) =>
    (cat === 'todas' || m.category === cat) &&
    (!q || norm(`${m.code} ${m.title} ${m.shortDesc} ${m.process}`).includes(q) || m.sections.some((s) => sectionMatches(s, q)))
  );

  const manual = MANUALES.find((m) => m.id === openId);

  return (
    <div className="p-3 space-y-4">
      <ModuleHero
        title="Manuales"
        subtitle="Manuales de calidad, funciones y procesos · INDECON S.A.S."
        icon={BookOpen}
        color={C.mint}
      />

      {manual ? (
        <ManualViewer manual={manual} onBack={() => setOpenId(null)} />
      ) : (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1" style={{ minWidth: 220 }}>
              <Search size={15} className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar manual por nombre, código o contenido…"
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, fontSize: 13, border: `1px solid ${C.sand}`, background: 'white', outline: 'none' }}
              />
            </div>
            {categorias.length > 1 && ['todas', ...categorias].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: '7px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${cat === c ? C.green : C.sand}`,
                  background: cat === c ? C.green : 'white', color: cat === c ? 'white' : '#4b5563', fontWeight: 600,
                }}
              >
                {c === 'todas' ? 'Todas' : c}
              </button>
            ))}
          </div>

          {/* Tarjetas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lista.map((m) => (
              <button
                key={m.id}
                onClick={() => setOpenId(m.id)}
                className="group text-left rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
                style={{ background: 'white', border: `1px solid ${C.sand}`, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              >
                <div className="relative" style={{ background: C.green, padding: '18px 18px 16px' }}>
                  <div className="absolute" style={{ top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: C.mint, opacity: 0.12 }} />
                  <div className="flex items-center justify-between relative">
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: C.mint, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                      {m.code}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>v{m.version} · {m.date}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 relative">
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: `${C.mint}25`, border: `1px solid ${C.mint}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={19} style={{ color: C.mint }} />
                    </div>
                    <h3 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.25 }}>{m.title}</h3>
                  </div>
                </div>
                <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{m.shortDesc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(m.normas || []).map((n) => (
                      <span key={n} style={{ fontSize: 10.5, fontWeight: 700, color: C.green, background: `${C.mint}1f`, borderRadius: 20, padding: '2px 9px' }}>{n}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: `1px solid ${C.sand}` }}>
                    <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{m.sections.length} capítulos · {m.process}</span>
                    <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                      Abrir <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {/* Espacio para próximos manuales */}
            {!q && cat === 'todas' && (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center"
                style={{ border: `2px dashed ${C.sand}`, padding: 24, minHeight: 200, background: `${C.cream}` }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.mint}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Plus size={20} style={{ color: C.mint }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: 0 }}>Próximos manuales</p>
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '4px 0 0', maxWidth: 220 }}>
                  Manual de funciones, manual BASC y demás manuales del SIG se agregarán aquí.
                </p>
              </div>
            )}
          </div>

          {lista.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 24 }}>
              No se encontraron manuales con “{query}”.
            </p>
          )}
        </>
      )}
    </div>
  );
}
