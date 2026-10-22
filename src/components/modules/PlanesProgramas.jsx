// src/components/modules/PlanesProgramas.jsx
// ═══════════════════════════════════════════════════════════════════
// Planes y Programas (acceso desde Home) — v4 (oct 2026)
// Mismo esquema que Manuales.jsx: SOLO CONSULTA de documentos originales.
//
// PLANES   → Gestión Documental, documentos tipo PL (Planes) con estado
//            'published' / 'approved'. Archivos en el bucket privado
//            `documents`. Visor: DocumentViewerModal.
//            Para agregar un plan: subirlo en Gestión Documental con tipo
//            "PL – Planes" y publicarlo. Aparece aquí automáticamente.
// PROGRAMAS → en definición (no tienen formato aún). Sección reservada.
//
// v4: se retiraron de aquí
//   · Planes de Mantenimiento → Mejoramiento Continuo › Mantenimiento de
//     Equipos (MantenimientoManager.jsx).
//   · Cronogramas SST y Bienestar → se consultan/editan en SST y Bienestar.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import ModuleHero from '@/components/ModuleHero';
import DocumentViewerModal from '@/components/modules/GestionDocumental/DocumentViewerModal';
import { supabase } from '@/lib/supabase';
import {
  ClipboardCheck, FileText, Search, Eye, Download, Loader2, AlertTriangle, Layers, ListChecks, Clock,
} from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function tipoArchivo(path = '') {
  const ext = path.split('.').pop().toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', color: '#b45309' };
  if (['doc', 'docx'].includes(ext)) return { label: 'WORD', color: '#1d4ed8' };
  if (['xls', 'xlsx'].includes(ext)) return { label: 'EXCEL', color: '#15803d' };
  return { label: ext.toUpperCase(), color: C.olive };
}

// Fecha del documento (change_date) tomada tal cual (YYYY-MM-DD) → sin desfase UTC-5.
function fmtFecha(s) {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : '';
}

function SectionTitle({ children, extra }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: C.mint }} />
        <h2 style={{ color: C.dark, fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {children}
        </h2>
      </div>
      {extra}
    </div>
  );
}

export default function PlanesProgramas() {
  const [planes, setPlanes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [query, setQuery]     = useState('');
  const [proceso, setProceso] = useState('todos');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: e } = await supabase
          .from('document')
          .select(`
            id, code, name, objective, version, status, file_path, file_name, file_size, change_date,
            document_type:document_type_id!inner ( code, name ),
            process:process_id ( name )
          `)
          .eq('document_type.code', 'PL')
          .in('status', ['published', 'approved'])
          .not('file_path', 'is', null);
        if (e) throw e;
        setPlanes((data || []).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true })));
      } catch (e) {
        setError(e.message || 'No se pudieron cargar los planes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const procesos = useMemo(
    () => [...new Set(planes.map((p) => p.process?.name).filter(Boolean))],
    [planes]
  );

  const q = norm(query.trim());
  const lista = planes.filter((p) =>
    (proceso === 'todos' || p.process?.name === proceso) &&
    (!q || norm(`${p.code} ${p.name} ${p.objective || ''} ${p.process?.name || ''}`).includes(q))
  );

  const descargar = async (p) => {
    const { data, error: e } = await supabase.storage.from('documents').download(p.file_path);
    if (e) { alert('No se pudo descargar: ' + e.message); return; }
    const url = URL.createObjectURL(data);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = p.file_name || p.file_path.split('/').pop();
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 space-y-5">
      <ModuleHero
        title="Planes y Programas"
        subtitle="Planes y programas del Sistema Integrado de Gestión · INDECON S.A.S."
        icon={ClipboardCheck}
        color={C.olive}
      />

      {/* ═══════════════ PLANES ═══════════════ */}
      <section className="space-y-3">
        <SectionTitle extra={!loading && planes.length > 0 && (
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{planes.length} plan{planes.length === 1 ? '' : 'es'} publicado{planes.length === 1 ? '' : 's'}</span>
        )}>
          Planes
        </SectionTitle>

        {/* Filtros */}
        {planes.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1" style={{ minWidth: 220 }}>
              <Search size={15} className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar plan por nombre o código…"
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, fontSize: 13, border: `1px solid ${C.sand}`, background: 'white', outline: 'none' }}
              />
            </div>
            {procesos.length > 1 && ['todos', ...procesos].map((p) => (
              <button key={p} onClick={() => setProceso(p)}
                style={{
                  padding: '7px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  border: `1px solid ${proceso === p ? C.green : C.sand}`,
                  background: proceso === p ? C.green : 'white', color: proceso === p ? 'white' : '#4b5563',
                }}>
                {p === 'todos' ? 'Todos' : p}
              </button>
            ))}
          </div>
        )}

        {/* Estados */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-14" style={{ color: '#9ca3af', fontSize: 13 }}>
            <Loader2 size={18} className="animate-spin" style={{ color: C.mint }} /> Cargando planes…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2" style={{ background: '#fef3e2', border: '1px solid #f3c98b', color: '#854f0b', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}
        {!loading && !error && lista.length === 0 && (
          <div className="text-center py-12" style={{ color: '#9ca3af', fontSize: 13, background: 'white', border: `1px dashed ${C.sand}`, borderRadius: 16 }}>
            <ClipboardCheck size={30} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            {planes.length === 0
              ? <>Aún no hay planes publicados. Se cargan en <strong style={{ color: C.green }}>Gestión Documental</strong> con el tipo <strong>PL – Planes</strong>.</>
              : 'Sin resultados para la búsqueda.'}
          </div>
        )}

        {/* Tarjetas (mismo diseño que Manuales) */}
        {!loading && lista.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lista.map((p) => {
              const t = tipoArchivo(p.file_path);
              return (
                <div key={p.id} className="rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
                  style={{ background: 'white', border: `1px solid ${C.sand}`, display: 'flex', flexDirection: 'column' }}>
                  {/* Cabecera */}
                  <button type="button" onClick={() => setAbierto(p)} className="relative text-left"
                    style={{ background: C.green, padding: '18px 18px 16px', cursor: 'pointer', border: 'none' }}>
                    <div className="absolute" style={{ top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: C.mint, opacity: 0.12 }} />
                    <div className="flex items-center justify-between relative">
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: C.mint, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                        {p.code}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.65)' }}>
                        Versión {String(p.version ?? 1).padStart(2, '0')}{p.change_date ? ` · ${fmtFecha(p.change_date)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-3 relative">
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${C.mint}25`, border: `1px solid ${C.mint}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={19} style={{ color: C.mint }} />
                      </div>
                      <h3 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 16.5, fontWeight: 700, margin: 0, lineHeight: 1.25 }}>{p.name}</h3>
                    </div>
                  </button>

                  {/* Cuerpo */}
                  <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {p.objective && (
                      <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.6, margin: 0 }} className="line-clamp-3">{p.objective}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {p.process?.name && (
                        <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: C.green, background: `${C.mint}1f`, borderRadius: 20, padding: '2px 9px' }}>
                          <Layers size={11} />{p.process.name}
                        </span>
                      )}
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: t.color, border: `1px solid ${t.color}55`, borderRadius: 6, padding: '1px 7px' }}>{t.label}</span>
                    </div>
                    <div className="flex gap-2 mt-auto pt-1">
                      <button type="button" onClick={() => setAbierto(p)}
                        className="flex-1 flex items-center justify-center gap-1.5"
                        style={{ background: C.green, color: 'white', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        <Eye size={15} /> Ver plan
                      </button>
                      <button type="button" onClick={() => descargar(p)} title="Descargar"
                        className="flex items-center justify-center"
                        style={{ background: 'white', color: C.olive, border: `1px solid ${C.olive}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════ PROGRAMAS (en definición) ═══════════════ */}
      <section className="space-y-3">
        <SectionTitle>Programas</SectionTitle>
        <div className="flex items-start gap-3" style={{ background: 'white', border: `1px dashed ${C.sand}`, borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.olive}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ListChecks size={19} style={{ color: C.olive }} />
          </div>
          <div>
            <p className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 800, color: C.dark, margin: 0 }}>
              Programas del SIG
              <span className="flex items-center gap-1" style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #d9770633', borderRadius: 20, padding: '1px 8px' }}>
                <Clock size={10} /> En definición
              </span>
            </p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.55 }}>
              Aquí se publicarán las fichas de los programas (objetivo, alcance, responsable y dónde se ejecutan) cuando se defina su estructura.
            </p>
          </div>
        </div>
      </section>

      <DocumentViewerModal document={abierto} isOpen={!!abierto} onClose={() => setAbierto(null)} />
    </div>
  );
}