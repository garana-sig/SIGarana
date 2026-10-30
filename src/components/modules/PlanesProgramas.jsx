// src/components/modules/PlanesProgramas.jsx
// ═══════════════════════════════════════════════════════════════════
// Planes y Programas (acceso desde Home) — v5 (oct 2026)
// Mismo esquema de tarjetas que Manuales.jsx.
//
// 1. PLANES DE TRABAJO SST Y BIENESTAR (7 planes)
//    · Datos: RPC sst_planes_resumen() y sst_plan_items(plan, año)
//      (SECURITY DEFINER, solo lectura, todos los autenticados — PP_01).
//    · "Ver plan": PDF generado en el momento (utils/pdfPlanSST.js) con las
//      3 primeras columnas de la tabla del plan → siempre actualizado.
//    · "Diligenciar": solo con permiso create/edit del plan → navega a
//      SST y Bienestar › Planes › ese plan (prop onNavigate desde App.tsx).
// 2. PLANES DOCUMENTADOS → Gestión Documental tipo PL (igual que v4).
// 3. PROGRAMAS → en definición.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generarPdfPlanSST } from '@/utils/pdfPlanSST';
import {
  ClipboardCheck, FileText, Search, Eye, Download, Loader2, AlertTriangle, Layers,
  ListChecks, Clock, CalendarDays, PenLine, Lock, X, ExternalLink,
} from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };

// ─── Planes SST (mismos ids que SegBienestar › Planes) ──────────────
// perm = prefijo de permisos para "Diligenciar" (:create / :edit)
const PLANES_SST = [
  { id: 'capacitacion', label: 'Capacitación', color: '#2e5244', code: 'PLAN SST', perm: 'sst_bienestar:capacitaciones',
    desc: 'Cronograma anual de capacitaciones del Sistema Integrado de Gestión (SST, BASC, emergencias).',
    cols: ['Capacitación', 'Objetivo', 'Instructor'], unidad: 'capacitaciones' },
  { id: 'convivencia', label: 'Comité de Convivencia', color: '#1d4ed8', code: 'RE-GS-32', perm: 'sst_bienestar:convivencia',
    desc: 'Plan de trabajo anual del Comité de Convivencia Laboral.',
    cols: ['Actividad', 'Responsable', 'Recursos'], unidad: 'actividades' },
  { id: 'copasst', label: 'COPASST', color: '#15803d', code: 'RE-GS-32', perm: 'sst_bienestar:copasst',
    desc: 'Plan del Comité Paritario de Seguridad y Salud en el Trabajo.',
    cols: ['Actividad', 'Responsable', 'Recursos'], unidad: 'actividades' },
  { id: 'bienestar', label: 'Bienestar Social', color: '#dc2626', code: 'RE-GS-32', perm: 'sst_bienestar:bienestar',
    desc: 'Actividades de bienestar para los colaboradores y sus familias.',
    cols: ['Actividad', 'Responsable', 'Recursos'], unidad: 'actividades' },
  { id: 'sst', label: 'SST', color: '#7e22ce', code: 'RE-GS-32', perm: 'sst_bienestar:sst',
    desc: 'Plan de trabajo anual de Seguridad y Salud en el Trabajo.',
    cols: ['Actividad', 'Responsable', 'Recursos'], unidad: 'actividades' },
  { id: 'promocion_prevencion', label: 'Promoción y Prevención', color: '#0891b2', code: 'RE-GS-32', perm: 'sst_bienestar:promocion_prevencion',
    desc: 'Plan anual de promoción de la salud y prevención de la enfermedad.',
    cols: ['Actividad', 'Responsable', 'Recursos'], unidad: 'actividades' },
  { id: 'gerencia', label: 'Plan de Gerencia', color: '#6f7b2c', code: 'RE-DP-06', perm: 'sst_bienestar:gerencia',
    desc: 'Plan de trabajo anual de gerencia.',
    cols: ['Actividad', 'Presupuesto', 'Cronograma'], unidad: 'actividades' },
];

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function tipoArchivo(path = '') {
  const ext = path.split('.').pop().toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', color: '#b45309' };
  if (['doc', 'docx'].includes(ext)) return { label: 'WORD', color: '#1d4ed8' };
  if (['xls', 'xlsx'].includes(ext)) return { label: 'EXCEL', color: '#15803d' };
  return { label: ext.toUpperCase(), color: C.olive };
}

function fmtFecha(s) {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : '';
}

const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

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

// ─── Visor del PDF generado ─────────────────────────────────────────
function VisorPdf({ visor, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const descargar = () => {
    const a = window.document.createElement('a');
    a.href = visor.url;
    a.download = visor.fileName;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(26,46,37,0.6)' }}
      onClick={onClose}>
      <div className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: 'white', height: '92vh' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 flex-wrap" style={{ background: C.green, padding: '12px 16px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${visor.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={18} color="white" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, margin: 0 }} className="truncate">{visor.title}</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, margin: 0 }}>Generado ahora desde SST y Bienestar</p>
          </div>
          <button type="button" onClick={() => window.open(visor.url, '_blank')} title="Abrir en otra pestaña"
            className="flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '7px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            <ExternalLink size={14} /> <span className="hidden sm:inline">Abrir</span>
          </button>
          <button type="button" onClick={descargar} title="Descargar PDF"
            className="flex items-center gap-1.5" style={{ background: 'white', color: C.green, border: 'none', borderRadius: 10, padding: '7px 11px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> <span className="hidden sm:inline">Descargar</span>
          </button>
          <button type="button" onClick={onClose} title="Cerrar"
            style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <iframe title={visor.title} src={visor.url} style={{ flex: 1, width: '100%', border: 'none', background: '#525659' }} />
      </div>
    </div>
  );
}

// ─── Tarjeta de plan SST (mismo diseño que Manuales) ────────────────
function PlanCard({ plan, years, totalPorAnio, onVer, onDescargar, onDiligenciar, puedeDiligenciar, generando }) {
  const [year, setYear] = useState(years[0]);
  useEffect(() => { if (!years.includes(year)) setYear(years[0]); }, [years]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = totalPorAnio[year] ?? 0;
  const sinPlan = !years.length;
  const disabled = plan.soon || sinPlan;

  return (
    <div className="rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
      style={{ background: 'white', border: `1px solid ${C.sand}`, display: 'flex', flexDirection: 'column', opacity: plan.soon ? 0.8 : 1 }}>
      {/* Cabecera */}
      <button type="button" onClick={() => !disabled && onVer(plan, year)} className="relative text-left"
        style={{ background: C.green, padding: '18px 18px 16px', cursor: disabled ? 'default' : 'pointer', border: 'none', overflow: 'hidden' }}>
        <div className="absolute" style={{ left: 0, top: 0, bottom: 0, width: 5, background: plan.color }} />
        <div className="absolute" style={{ top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: plan.color, opacity: 0.22 }} />
        <div className="flex items-center justify-between relative">
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: C.mint, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px' }}>
            {plan.code}
          </span>
          {plan.soon ? (
            <span className="flex items-center gap-1" style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706', background: '#fffbeb', borderRadius: 20, padding: '1px 8px' }}>
              <Clock size={10} /> En construcción
            </span>
          ) : (
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.65)' }}>
              {sinPlan ? 'Sin plan registrado' : `Vigencia ${year}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3 relative">
          <div style={{ width: 40, height: 40, borderRadius: 11, background: `${plan.color}66`, border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={19} color="white" />
          </div>
          <h3 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 16.5, fontWeight: 700, margin: 0, lineHeight: 1.25 }}>{plan.label}</h3>
        </div>
      </button>

      {/* Cuerpo */}
      <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.6, margin: 0 }} className="line-clamp-3">{plan.desc}</p>

        <div className="flex flex-wrap gap-1.5 items-center">
          {!plan.soon && !sinPlan && (
            <span style={{ fontSize: 11, fontWeight: 700, color: plan.color, background: `${plan.color}14`, borderRadius: 20, padding: '2px 9px' }}>
              {total} {plan.unidad}
            </span>
          )}
          <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: C.green, background: `${C.mint}1f`, borderRadius: 20, padding: '2px 9px' }}>
            <Layers size={11} /> SST y Bienestar
          </span>
          {!disabled && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#b45309', border: '1px solid #b4530955', borderRadius: 6, padding: '1px 7px' }}>PDF</span>}
          {years.length > 1 && (
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: C.green, border: `1px solid ${C.sand}`, borderRadius: 8, padding: '2px 6px', background: 'white', cursor: 'pointer' }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>

        {plan.soon && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Aparecerá aquí cuando se configure en SST y Bienestar.</p>
        )}

        {!plan.soon && (
          <div className="flex gap-2 mt-auto pt-1">
            <button type="button" onClick={() => onVer(plan, year)} disabled={disabled || generando}
              className="flex-1 flex items-center justify-center gap-1.5"
              style={{ background: C.green, color: 'white', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontWeight: 600, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
              {generando ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Ver plan
            </button>
            <button type="button" onClick={() => puedeDiligenciar && onDiligenciar(plan)} disabled={!puedeDiligenciar}
              title={puedeDiligenciar ? 'Ir a SST y Bienestar para diligenciar' : 'No tienes permiso para diligenciar este plan'}
              className="flex-1 flex items-center justify-center gap-1.5"
              style={{
                background: puedeDiligenciar ? 'white' : '#fafafa', color: puedeDiligenciar ? C.olive : '#9ca3af',
                border: `1px solid ${puedeDiligenciar ? C.olive : '#e5e7eb'}`, borderRadius: 10, padding: '8px 10px',
                fontSize: 13, fontWeight: 600, cursor: puedeDiligenciar ? 'pointer' : 'not-allowed',
              }}>
              {puedeDiligenciar ? <PenLine size={15} /> : <Lock size={14} />} Diligenciar
            </button>
            <button type="button" onClick={() => onDescargar(plan, year)} disabled={disabled || generando} title="Descargar PDF"
              className="flex items-center justify-center"
              style={{ background: 'white', color: C.olive, border: `1px solid ${C.olive}`, borderRadius: 10, padding: '8px 12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
              <Download size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function PlanesProgramas({ onNavigate }) {
  const { isAdmin, isGerencia, hasPermission } = useAuth();

  // ── Planes SST ──
  const [resumen, setResumen]       = useState([]);
  const [loadingSst, setLoadingSst] = useState(true);
  const [errorSst, setErrorSst]     = useState(null);
  const [generando, setGenerando]   = useState(null);   // id del plan en generación
  const [visor, setVisor]           = useState(null);   // { url, title, fileName, color }

  useEffect(() => {
    (async () => {
      setLoadingSst(true);
      const { data, error: e } = await supabase.rpc('sst_planes_resumen');
      if (e) setErrorSst(e.message || 'No se pudieron cargar los planes SST.');
      else setResumen(data || []);
      setLoadingSst(false);
    })();
  }, []);

  // Liberar la URL del PDF al cerrar el visor
  useEffect(() => () => { if (visor?.url) URL.revokeObjectURL(visor.url); }, [visor]);

  // { plan_type: { years: [desc], total: {year: n} } }
  const porPlan = useMemo(() => {
    const m = {};
    resumen.forEach(({ plan_type, year, total }) => {
      m[plan_type] ??= { years: [], total: {} };
      if (!m[plan_type].years.includes(year)) m[plan_type].years.push(year);
      m[plan_type].total[year] = (m[plan_type].total[year] || 0) + total;
    });
    Object.values(m).forEach((v) => v.years.sort((a, b) => b - a));
    return m;
  }, [resumen]);

  const puedeDiligenciar = (plan) => {
    if (!plan.perm) return false;
    if (isAdmin) return true;
    return hasPermission('sst_bienestar:view') &&
      (hasPermission(`${plan.perm}:create`) || hasPermission(`${plan.perm}:edit`));
  };

  const generar = async (plan, year) => {
    setGenerando(plan.id);
    try {
      const { data, error: e } = await supabase.rpc('sst_plan_items', { p_plan_type: plan.id, p_year: year });
      if (e) throw e;
      const blob = await generarPdfPlanSST({ plan, year, items: data || [] });
      return { url: URL.createObjectURL(blob), fileName: `PLAN_${slug(plan.label).toUpperCase()}_${year}.pdf` };
    } finally {
      setGenerando(null);
    }
  };

  const verPlan = async (plan, year) => {
    try {
      const { url, fileName } = await generar(plan, year);
      setVisor({ url, fileName, title: `${plan.label} · ${year}`, color: plan.color });
    } catch (e) {
      alert('No se pudo generar el PDF: ' + (e.message || e));
    }
  };

  const descargarPlan = async (plan, year) => {
    try {
      const { url, fileName } = await generar(plan, year);
      const a = window.document.createElement('a');
      a.href = url; a.download = fileName;
      window.document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      alert('No se pudo generar el PDF: ' + (e.message || e));
    }
  };

  const diligenciar = (plan) => onNavigate?.('segBienestar', { plan: plan.id });

  return (
    <div className="p-3 space-y-6">
      <ModuleHero
        title="Planes y Programas"
        subtitle="Planes y programas del Sistema Integrado de Gestión · INDECON S.A.S."
        icon={ClipboardCheck}
        color={C.olive}
      />

      {/* ═══════════════ PLANES SST Y BIENESTAR ═══════════════ */}
      <section className="space-y-3">
        <SectionTitle extra={<span style={{ fontSize: 11, color: '#9ca3af' }}>Se actualizan desde SST y Bienestar</span>}>
          Planes de trabajo SST y Bienestar
        </SectionTitle>

        {loadingSst && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color: '#9ca3af', fontSize: 13 }}>
            <Loader2 size={18} className="animate-spin" style={{ color: C.mint }} /> Cargando planes…
          </div>
        )}
        {errorSst && (
          <div className="flex items-center gap-2" style={{ background: '#fef3e2', border: '1px solid #f3c98b', color: '#854f0b', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
            <AlertTriangle size={15} /> {errorSst}
          </div>
        )}
        {!loadingSst && !errorSst && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PLANES_SST.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                years={porPlan[plan.id]?.years || []}
                totalPorAnio={porPlan[plan.id]?.total || {}}
                onVer={verPlan}
                onDescargar={descargarPlan}
                onDiligenciar={diligenciar}
                puedeDiligenciar={puedeDiligenciar(plan)}
                generando={generando === plan.id}
              />
            ))}
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
              Aquí se publicarán las fichas de los programas cuando se defina su estructura.
            </p>
          </div>
        </div>
      </section>

      {visor && <VisorPdf visor={visor} onClose={() => setVisor(null)} />}
    </div>
  );
}