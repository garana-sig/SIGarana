// src/components/modules/PlanesProgramas.jsx
// ═══════════════════════════════════════════════════════════════════
// Planes y Programas (acceso desde Home)
//   1. Planes SST y Bienestar — SOLO LECTURA, leídos de las mismas tablas
//      que usa SST y Bienestar (work_plan / training_plan). La edición
//      sigue viviendo en ese módulo. Si RLS no permite leer, se ve vacío.
//   2. Planes de Mantenimiento — Computadores y Maquinaria (EDITABLE aquí).
//      Componente: MantenimientoEquipos.jsx · Hook: useMantenimiento.js
//      Permisos: mantenimiento:<computadores|maquinaria>:view/create/edit/delete/export
//      La pestaña solo aparece si el usuario ve al menos uno de los dos.
// v2 (oct 2026): se retiró el catálogo "Programas de gestión del SG-SST".
// v3 (oct 2026): Computadores conectado (Supabase mant_equipo / mant_registro).
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import ModuleHero from '@/components/ModuleHero';
import MantenimientoEquipos from '@/components/modules/MantenimientoEquipos';
import { useAuth } from '@/context/AuthContext';
import { useWorkPlan, MONTH_KEYS, parseMonthVal } from '@/hooks/useWorkPlan';
import { useCapacitaciones } from '@/hooks/useCapacitaciones';
import {
  ClipboardCheck, BookOpen, Shield, Heart, HardHat, Stethoscope, BarChart3,
  Loader2, Eye, Users, CalendarDays, CheckCircle2, Clock, XCircle, Info,
  Monitor, Cog, Wrench, Lock,
} from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25', cream: '#faf9f5' };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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

// ─── Planes de Mantenimiento (se editan en este módulo) ─────────────
// tipo = mant_equipo.tipo · perm = prefijo de permisos
const PLANES_MANT = [
  {
    id: 'computadores', tipo: 'computador', perm: 'mantenimiento:computadores',
    label: 'Computadores', icon: Monitor, color: C.green,
    desc: 'Hoja de vida (RE-GR-11) y registro de mantenimiento de equipos de cómputo.',
  },
  {
    id: 'maquinaria', tipo: 'maquinaria', perm: 'mantenimiento:maquinaria',
    label: 'Maquinaria', icon: Cog, color: C.olive,
    desc: 'Hoja de vida (RE-GR-11) y registro de mantenimiento de la maquinaria de planta.',
  },
];

const GRUPOS = [
  { id: 'sst',  label: 'Planes SST y Bienestar',   icon: HardHat },
  { id: 'mant', label: 'Planes de Mantenimiento', icon: Wrench },
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

// ─── Bloque de mantenimiento ────────────────────────────────────────
function MantenimientoView() {
  const { hasPermission } = useAuth();
  const visibles = PLANES_MANT.map((p) => ({ ...p, acceso: hasPermission(`${p.perm}:view`) }));
  const [mantId, setMantId] = useState(() => (visibles.find((p) => p.acceso) || visibles[0]).id);
  const cfg = visibles.find((p) => p.id === mantId);

  return (
    <section className="space-y-3">
      <SectionTitle extra={<span style={{ fontSize: 11, color: '#9ca3af' }}>Formato RE-GR-11 · Preventivo y correctivo</span>}>
        Planes de mantenimiento
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibles.map((p) => {
          const I = p.icon;
          const on = p.id === mantId;
          return (
            <button
              key={p.id}
              onClick={() => p.acceso && setMantId(p.id)}
              disabled={!p.acceso}
              title={!p.acceso ? 'No tienes permiso para este plan' : ''}
              className="flex items-center gap-3"
              style={{
                background: on ? p.color : 'white', border: `2px solid ${on ? p.color : '#e5e7eb'}`,
                borderRadius: 16, padding: '14px 16px', cursor: p.acceso ? 'pointer' : 'not-allowed', textAlign: 'left',
                boxShadow: on ? `0 4px 16px ${p.color}30` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.15s',
                opacity: p.acceso ? 1 : 0.55,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: on ? 'rgba(255,255,255,0.18)' : `${p.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.acceso ? <I size={20} color={on ? 'white' : p.color} /> : <Lock size={18} color="#9ca3af" />}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: on ? 'white' : '#1f2937', margin: 0 }}>{p.label}</p>
                <p style={{ fontSize: 12, color: on ? 'rgba(255,255,255,0.85)' : '#6b7280', margin: 0, lineHeight: 1.4 }}>{p.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {cfg.id === 'computadores' && cfg.acceso && <MantenimientoEquipos key="computador" tipo="computador" />}

      {cfg.id === 'maquinaria' && cfg.acceso && (
        <div className="flex items-start gap-2" style={{ background: '#fffbeb', border: '1px solid #d9770633', borderRadius: 12, padding: '14px 16px' }}>
          <Info size={15} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.55 }}>
            El plan de mantenimiento de <strong style={{ color: C.green }}>maquinaria</strong> se habilitará cuando se definan
            sus campos técnicos. Ya cuenta con tablas, permisos y formato RE-GR-11 listos.
          </p>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function PlanesProgramas() {
  const { hasPermission } = useAuth();
  const verMant = PLANES_MANT.some((p) => hasPermission(`${p.perm}:view`));
  const grupos = GRUPOS.filter((g) => g.id !== 'mant' || verMant);
  const [grupo, setGrupo] = useState('sst');
  const [planId, setPlanId] = useState('capacitacion');
  const cfg = PLANES.find((p) => p.id === planId);

  return (
    <div className="p-3 space-y-5">
      <ModuleHero
        title="Planes y Programas"
        subtitle="Planes SST, Bienestar y Mantenimiento · INDECON S.A.S."
        icon={ClipboardCheck}
        color={C.olive}
      />

      {/* Selector de grupo */}
      <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: C.sand }}>
        {grupos.map(({ id, label, icon: I }) => {
          const on = grupo === id;
          return (
            <button key={id} onClick={() => setGrupo(id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: on ? C.green : 'transparent', color: on ? '#fff' : '#374151' }}>
              <I size={15} />{label}
            </button>
          );
        })}
      </div>

      {grupo === 'mant' && verMant && <MantenimientoView />}

      {grupo === 'sst' && (<>
      <div className="flex items-start gap-2" style={{ background: '#f7f8f0', border: `1px solid ${C.olive}30`, borderRadius: 12, padding: '10px 14px' }}>
        <Eye size={15} style={{ color: C.olive, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12.5, color: '#4b5563', margin: 0, lineHeight: 1.55 }}>
          Vista de consulta. Estos planes se actualizan desde el módulo <strong style={{ color: C.green }}>SST y Bienestar</strong> y aquí se ven en tiempo real.
        </p>
      </div>

      {/* ─── Planes de trabajo SST y Bienestar (solo lectura) ─── */}
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
      </>)}
    </div>
  );
}