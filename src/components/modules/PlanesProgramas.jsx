// src/components/modules/PlanesProgramas.jsx
// ═══════════════════════════════════════════════════════════════════
// Planes y Programas — VISTA DE CONSULTA (acceso desde Home)
//   1. Catálogo de programas de gestión del SG-SST (Manual MC-DP-01 §6.2.2)
//   2. Planes de trabajo anuales en SOLO LECTURA, leídos de las mismas
//      tablas que usa SST y Bienestar (work_plan / training_plan).
// La edición sigue viviendo en el módulo SST y Bienestar.
// Si RLS no permite leer un plan al usuario, se muestra vacío (sin error).
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { useWorkPlan, MONTH_KEYS, parseMonthVal } from '@/hooks/useWorkPlan';
import { useCapacitaciones } from '@/hooks/useCapacitaciones';
import {
  ClipboardCheck, BookOpen, Shield, Heart, HardHat, Stethoscope, BarChart3,
  Loader2, Eye, Users, CalendarDays, CheckCircle2, Clock, XCircle, Info,
} from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25', cream: '#faf9f5' };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Programas del SG-SST (Manual Integrado de Gestión §6.2.2) ──────
const PROGRAMAS_SGSST = [
  { nombre: 'Prevención psicosocial', lema: 'No estrés mal', operador: 'Comité de Convivencia' },
  { nombre: 'Prevención de salud visual', lema: 'Te veo bien', operador: 'COPASST' },
  { nombre: 'Prevención de riesgo cardiovascular', lema: 'Corazón Garana', operador: 'COPASST' },
  { nombre: 'Prevención de desórdenes músculo-esqueléticos', lema: 'La Mueve', operador: null },
  { nombre: 'Salud pública', lema: 'Contágiate, pero de amor propio', operador: 'Comité de Convivencia' },
  { nombre: 'Gestión de riesgo biológico', lema: 'Que no te piquen', operador: 'COPASST' },
  { nombre: 'Gestión de riesgo mecánico', lema: null, operador: null },
  { nombre: 'Plan estratégico de seguridad vial', lema: 'Muévete seguro', operador: null },
  { nombre: 'Gestión de riesgo locativo', lema: 'Que nada te toque', operador: null },
  { nombre: 'Vigilancia epidemiológica — desórdenes músculo-esqueléticos', lema: null, operador: 'Comité de Bienestar Social' },
  { nombre: 'Vigilancia epidemiológica — riesgo psicosocial', lema: null, operador: 'Comité de Convivencia' },
];

// ─── Planes de trabajo (mismos 7 de SST y Bienestar) ────────────────
const PLANES = [
  { id: 'capacitacion', label: 'Capacitación', icon: BookOpen, color: C.green, desc: 'Cronograma anual de capacitaciones en SST.' },
  { id: 'convivencia', label: 'Comité de Convivencia', icon: Shield, color: '#1d4ed8', desc: 'Plan de trabajo del Comité de Convivencia Laboral.' },
  { id: 'copasst', label: 'COPASST', icon: Shield, color: '#15803d', desc: 'Plan del Comité Paritario de Seguridad y Salud en el Trabajo.' },
  { id: 'bienestar', label: 'Bienestar Social', icon: Heart, color: '#dc2626', desc: 'Actividades de bienestar para colaboradores.' },
  { id: 'sst', label: 'SST', icon: HardHat, color: '#7e22ce', desc: 'Plan de trabajo anual de Seguridad y Salud en el Trabajo.' },
  { id: 'promocion_prevencion', label: 'Promoción y Prevención', icon: Stethoscope, color: '#0891b2', desc: 'Plan anual de promoción y prevención en salud.' },
  { id: 'gerencia', label: 'Plan de Gerencia', icon: BarChart3, color: C.olive, desc: 'Plan de trabajo SST aprobado por gerencia.' },
];

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

// ─── Celda de mes (solo lectura) ────────────────────────────────────
function MonthDot({ value, accent }) {
  const p = parseMonthVal(value);
  if (p.s === 'empty') return <span style={{ color: '#e5e7eb' }}>·</span>;
  const meta = {
    programada: { bg: accent, sym: '●', tip: 'Programada' },
    ejecutada: { bg: '#16a34a', sym: '✓', tip: `Ejecutada${p.date ? ` (${p.date})` : ''}` },
    no_ejecutada: { bg: '#d97706', sym: '✗', tip: 'Sin ejecutar' },
  }[p.s];
  return (
    <span
      title={`${meta.tip}${p.text && p.text !== 'x' ? ` — ${p.text}` : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: 6, background: meta.bg, color: 'white', fontSize: 10, fontWeight: 800,
      }}
    >{meta.sym}</span>
  );
}

// ─── Tabla de plan en solo lectura (común a work_plan y training_plan) ──
function PlanReadOnly({ hook, cfg, titleField, respField }) {
  const { plans, items, activePlan, setActivePlan, loading, error } = hook;

  // Trazabilidad simple
  const vals = items.flatMap((it) => MONTH_KEYS.map((k) => parseMonthVal(it[k])));
  const programadas = vals.filter((v) => v.s !== 'empty').length;
  const ejecutadas = vals.filter((v) => v.s === 'ejecutada').length;
  const noEjec = vals.filter((v) => v.s === 'no_ejecutada').length;
  const pct = programadas ? Math.round((ejecutadas / programadas) * 100) : 0;

  if (loading && !items.length) {
    return (
      <div className="flex items-center justify-center gap-2 py-10" style={{ color: '#9ca3af', fontSize: 13 }}>
        <Loader2 size={16} className="animate-spin" style={{ color: C.mint }} /> Cargando plan…
      </div>
    );
  }

  if (error || !plans.length) {
    return (
      <div className="text-center py-10" style={{ color: '#9ca3af', fontSize: 13 }}>
        <CalendarDays size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
        Aún no hay un plan de trabajo publicado para <strong style={{ color: C.green }}>{cfg.label}</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selector de año + indicadores */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlan(p)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${activePlan?.id === p.id ? cfg.color : C.sand}`,
                background: activePlan?.id === p.id ? cfg.color : 'white',
                color: activePlan?.id === p.id ? 'white' : '#4b5563',
              }}
            >{p.year}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap ml-auto">
          {[
            { icon: Users, label: 'Actividades', v: items.length, c: C.green },
            { icon: Clock, label: 'Programadas', v: programadas, c: cfg.color },
            { icon: CheckCircle2, label: 'Ejecutadas', v: ejecutadas, c: '#16a34a' },
            { icon: XCircle, label: 'Sin ejecutar', v: noEjec, c: '#d97706' },
          ].map(({ icon: I, label, v, c }) => (
            <span key={label} className="flex items-center gap-1.5" style={{ fontSize: 12, background: 'white', border: `1px solid ${C.sand}`, borderRadius: 10, padding: '5px 10px', color: '#4b5563' }}>
              <I size={13} style={{ color: c }} /> {label}: <strong style={{ color: C.dark }}>{v}</strong>
            </span>
          ))}
          <span style={{ fontSize: 12, fontWeight: 800, color: 'white', background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626', borderRadius: 10, padding: '5px 10px' }}>
            {pct}% cumplimiento
          </span>
        </div>
      </div>

      {/* Cronograma */}
      <div style={{ overflowX: 'auto', border: `1px solid ${C.sand}`, borderRadius: 12, background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 820 }}>
          <thead>
            <tr style={{ background: cfg.color }}>
              <th style={{ padding: '8px 10px', color: 'white', textAlign: 'center', width: 34 }}>#</th>
              <th style={{ padding: '8px 10px', color: 'white', textAlign: 'left' }}>Actividad</th>
              <th style={{ padding: '8px 10px', color: 'white', textAlign: 'left', width: 150 }}>Responsable</th>
              {MONTHS.map((m) => (
                <th key={m} style={{ padding: '8px 4px', color: 'white', textAlign: 'center', width: 36, fontSize: 10.5 }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={15} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Este plan aún no tiene actividades.</td></tr>
            )}
            {items.map((it, i) => (
              <tr key={it.id} style={{ borderTop: `1px solid ${C.sand}`, background: i % 2 ? '#fafaf6' : 'white' }}>
                <td style={{ padding: '7px 10px', textAlign: 'center', color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ padding: '7px 10px', color: C.dark, fontWeight: 600, lineHeight: 1.4 }}>{it[titleField]}</td>
                <td style={{ padding: '7px 10px', color: '#4b5563' }}>{it[respField] || '—'}</td>
                {MONTH_KEYS.map((k) => (
                  <td key={k} style={{ padding: '6px 2px', textAlign: 'center' }}>
                    <MonthDot value={it[k]} accent={cfg.color} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3" style={{ fontSize: 11, color: '#6b7280' }}>
        <span className="flex items-center gap-1"><MonthDot value="x" accent={cfg.color} /> Programada</span>
        <span className="flex items-center gap-1"><MonthDot value="EJEC||" accent={cfg.color} /> Ejecutada</span>
        <span className="flex items-center gap-1"><MonthDot value="NO|" accent={cfg.color} /> Sin ejecutar</span>
      </div>
    </div>
  );
}

function WorkPlanView({ cfg }) {
  const hook = useWorkPlan(cfg.id);
  return <PlanReadOnly hook={hook} cfg={cfg} titleField="activity" respField="responsible" />;
}

function CapacitacionView({ cfg }) {
  const hook = useCapacitaciones();
  return <PlanReadOnly hook={hook} cfg={cfg} titleField="title" respField="instructor" />;
}

// ═══════════════════════════════════════════════════════════════════
export default function PlanesProgramas() {
  const [planId, setPlanId] = useState('capacitacion');
  const cfg = PLANES.find((p) => p.id === planId);

  return (
    <div className="p-3 space-y-5">
      <ModuleHero
        title="Planes y Programas"
        subtitle="Consulta de programas del SG-SST y planes de trabajo anuales · INDECON S.A.S."
        icon={ClipboardCheck}
        color={C.olive}
      />

      <div className="flex items-start gap-2" style={{ background: '#f7f8f0', border: `1px solid ${C.olive}30`, borderRadius: 12, padding: '10px 14px' }}>
        <Eye size={15} style={{ color: C.olive, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12.5, color: '#4b5563', margin: 0, lineHeight: 1.55 }}>
          Vista de consulta. Los planes se actualizan desde el módulo <strong style={{ color: C.green }}>SST y Bienestar</strong> y aquí se ven en tiempo real.
        </p>
      </div>

      {/* ─── 1. Programas del SG-SST ─── */}
      <section className="space-y-3">
        <SectionTitle extra={<span style={{ fontSize: 11, color: '#9ca3af' }}>Manual Integrado de Gestión · §6.2.2</span>}>
          Programas de gestión del SG-SST
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {PROGRAMAS_SGSST.map((p, i) => (
            <div key={i} className="flex gap-3 items-start" style={{ background: 'white', border: `1px solid ${C.sand}`, borderRadius: 14, padding: '12px 14px' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, background: `${C.mint}22`, color: C.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, margin: 0, lineHeight: 1.35 }}>{p.nombre}</p>
                {p.lema && (
                  <p style={{ fontSize: 12.5, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: C.olive, margin: '3px 0 0' }}>“{p.lema}”</p>
                )}
                <span style={{
                  display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px',
                  color: p.operador ? C.green : '#9ca3af', background: p.operador ? `${C.mint}1f` : '#f3f4f6',
                }}>
                  {p.operador || 'Operador por definir'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 2. Planes de trabajo ─── */}
      <section className="space-y-3">
        <SectionTitle>Planes de trabajo anuales</SectionTitle>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {PLANES.map((p) => {
            const I = p.icon;
            const on = p.id === planId;
            return (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                style={{
                  background: on ? p.color : 'white', border: `2px solid ${on ? p.color : '#e5e7eb'}`,
                  borderRadius: 14, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  boxShadow: on ? `0 4px 16px ${p.color}30` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.15s',
                }}
              >
                <I size={17} color={on ? 'white' : p.color} style={{ marginBottom: 6 }} />
                <p style={{ fontSize: 12.5, fontWeight: 700, color: on ? 'white' : '#1f2937', lineHeight: 1.3, margin: 0 }}>{p.label}</p>
              </button>
            );
          })}
        </div>

        <div style={{ background: 'white', border: `1px solid ${C.sand}`, borderRadius: 16, padding: '16px 18px' }} className="space-y-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <cfg.icon size={18} style={{ color: cfg.color }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.dark, margin: 0 }}>{cfg.label}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{cfg.desc}</p>
            </div>
          </div>

          {cfg.id === 'capacitacion' && <CapacitacionView key={cfg.id} cfg={cfg} />}
          {cfg.id === 'gerencia' && (
            <div className="flex items-start gap-2 py-6 justify-center" style={{ color: '#9ca3af', fontSize: 13 }}>
              <Info size={15} style={{ marginTop: 2 }} /> El Plan de Gerencia aún está en construcción en SST y Bienestar.
            </div>
          )}
          {!['capacitacion', 'gerencia'].includes(cfg.id) && <WorkPlanView key={cfg.id} cfg={cfg} />}
        </div>
      </section>
    </div>
  );
}
