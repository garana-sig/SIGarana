// src/components/modules/MantenimientoManager.jsx
// ═══════════════════════════════════════════════════════════════════
// Mantenimiento de Equipos (RE-GR-11) — submódulo de Mejoramiento Continuo
// v1 (oct 2026): se migró desde Planes y Programas (Home). Es el REGISTRO
// (CRUD) del proceso; reutiliza MantenimientoEquipos.jsx sin cambios.
//   · Computadores → <MantenimientoEquipos tipo="computador" />
//   · Maquinaria   → aviso "campos por definir" (tablas y permisos listos)
// Permisos: mantenimiento:<computadores|maquinaria>:view/create/edit/delete/export
// v2 (oct 2026): prop `tipo` ('computadores' | 'maquinaria'). Con tipo se
//   muestra solo ese registro, sin selector (cada uno es su propia tarjeta
//   dentro del grupo Mantenimiento). Sin tipo funciona como antes.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { ArrowLeft, Monitor, Cog, Lock, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import MantenimientoEquipos from '@/components/modules/MantenimientoEquipos';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc' };

const TIPOS = [
  {
    id: 'computadores', tipo: 'computador', perm: 'mantenimiento:computadores',
    label: 'Computadores', icon: Monitor, color: C.green,
    desc: 'Hoja de vida y registro de mantenimiento de equipos de cómputo.',
  },
  {
    id: 'maquinaria', tipo: 'maquinaria', perm: 'mantenimiento:maquinaria',
    label: 'Maquinaria', icon: Cog, color: C.olive,
    desc: 'Hoja de vida y registro de mantenimiento de la maquinaria de planta.',
  },
];

export default function MantenimientoManager({ onBack, tipo }) {
  const { hasPermission } = useAuth();
  const tipos = TIPOS.map((t) => ({ ...t, acceso: hasPermission(`${t.perm}:view`) }));
  const [activo, setActivo] = useState(() => tipo || (tipos.find((t) => t.acceso) || tipos[0]).id);
  const cfg = tipos.find((t) => t.id === activo);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100" style={{ color: C.green }}>
          <ArrowLeft className="h-4 w-4" />
          {tipo ? 'Mantenimiento' : 'Mejoramiento Continuo'}
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold" style={{ color: C.green }}>
          {tipo === 'maquinaria' ? 'Mantenimiento de Maquinaria' : 'Mantenimiento de Equipos'}
        </h2>
        <p className="text-sm mt-1" style={{ color: C.olive }}>
          Hoja de vida de máquina RE-GR-11 · Mantenimiento preventivo y correctivo
        </p>
      </div>

      {/* ── Selector Computadores / Maquinaria (solo sin prop tipo) ── */}
      {!tipo && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tipos.map((t) => {
          const I = t.icon;
          const on = t.id === activo;
          return (
            <button key={t.id} type="button"
              onClick={() => t.acceso && setActivo(t.id)}
              disabled={!t.acceso}
              title={!t.acceso ? 'No tienes permiso para este registro' : ''}
              className="flex items-center gap-3"
              style={{
                background: on ? t.color : 'white', border: `2px solid ${on ? t.color : '#e5e7eb'}`,
                borderRadius: 16, padding: '14px 16px', cursor: t.acceso ? 'pointer' : 'not-allowed', textAlign: 'left',
                boxShadow: on ? `0 4px 16px ${t.color}30` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.15s',
                opacity: t.acceso ? 1 : 0.55,
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: on ? 'rgba(255,255,255,0.18)' : `${t.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t.acceso ? <I size={20} color={on ? 'white' : t.color} /> : <Lock size={18} color="#9ca3af" />}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: on ? 'white' : '#1f2937', margin: 0 }}>{t.label}</p>
                <p style={{ fontSize: 12, color: on ? 'rgba(255,255,255,0.85)' : '#6b7280', margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>}

      {/* ── Contenido ── */}
      {cfg.id === 'computadores' && cfg.acceso && <MantenimientoEquipos key="computador" tipo="computador" />}

      {cfg.id === 'maquinaria' && cfg.acceso && (
        <div className="flex items-start gap-2" style={{ background: '#fffbeb', border: '1px solid #d9770633', borderRadius: 12, padding: '14px 16px' }}>
          <Info size={15} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.55 }}>
            El registro de mantenimiento de <strong style={{ color: C.green }}>maquinaria</strong> se habilitará cuando se definan
            sus campos técnicos. Ya cuenta con tablas, permisos y formato RE-GR-11 listos.
          </p>
        </div>
      )}

      {!cfg.acceso && (
        <div className="text-center py-10" style={{ color: '#9ca3af', fontSize: 13 }}>
          <Lock size={26} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          No tienes permisos asignados para el registro de mantenimiento.
        </div>
      )}
    </div>
  );
}