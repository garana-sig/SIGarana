// src/components/modules/Politicas.jsx
// ═══════════════════════════════════════════════════════════════════
// Políticas institucionales del SIG (acceso desde Home → "Políticas")
// Datos: src/data/politicas.js (misma fuente que Planeación Estratégica)
// Solo lectura.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { POLITICAS, CODIGO_ETICA, POLITICAS_META } from '@/data/politicas';
import { ScrollText, ChevronDown, Quote, BookMarked, CalendarCheck, PenLine } from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25', cream: '#faf9f5' };

function PoliticaCard({ pol, open, onToggle }) {
  const Icon = pol.icon;
  const tieneDetalle = !!(pol.declaracion || pol.compromisos?.length);

  return (
    <div style={{
      background: 'white', borderRadius: 16, border: `1px solid ${C.sand}`,
      borderTop: `4px solid ${pol.color}`, overflow: 'hidden',
      boxShadow: open ? '0 8px 24px rgba(46,82,68,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ padding: '18px 20px' }}>
        <div className="flex items-start gap-3 mb-3">
          <div style={{
            width: 40, height: 40, borderRadius: 11, background: `${pol.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={19} style={{ color: pol.color }} />
          </div>
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color: C.dark, lineHeight: 1.35, margin: 0 }}>{pol.title}</h3>
        </div>

        <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, margin: 0 }}>{pol.text}</p>

        {pol.normas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {pol.normas.map((n) => (
              <span key={n} style={{ fontSize: 10.5, fontWeight: 700, color: pol.color, background: `${pol.color}12`, borderRadius: 20, padding: '2px 9px' }}>{n}</span>
            ))}
          </div>
        )}

        {tieneDetalle && (
          <button
            onClick={onToggle}
            className="flex items-center gap-1 mt-3"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.green }}
          >
            {open ? 'Ocultar declaración completa' : 'Ver declaración completa'}
            <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {open && tieneDetalle && (
        <div style={{ background: C.cream, borderTop: `1px solid ${C.sand}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pol.declaracion && (
            <figure style={{ margin: 0, position: 'relative', paddingLeft: 14, borderLeft: `3px solid ${pol.color}` }}>
              <Quote size={16} style={{ color: `${pol.color}66`, marginBottom: 4 }} />
              <blockquote style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.7, color: C.dark }}>
                “{pol.declaracion}”
              </blockquote>
            </figure>
          )}
          {pol.compromisos?.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pol.compromisos.map((c, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: pol.color, marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.6 }}>{c}</span>
                </li>
              ))}
            </ul>
          )}
          {(pol.firma || pol.fuente) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: 11.5, color: '#6b7280' }}>
              {pol.firma && <span className="flex items-center gap-1"><PenLine size={12} /> {pol.firma}</span>}
              {pol.fuente && <span className="flex items-center gap-1"><BookMarked size={12} /> {pol.fuente}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Politicas() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="p-3 space-y-4">
      <ModuleHero
        title="Políticas"
        subtitle="Políticas institucionales del Sistema Integrado de Gestión · INDECON S.A.S."
        icon={ScrollText}
        color="#d97706"
      />

      {/* Metadatos de la revisión */}
      <div className="rounded-2xl flex flex-wrap items-center justify-between gap-3" style={{ background: C.green, padding: '16px 20px' }}>
        <div>
          <p style={{ color: C.mint, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            {POLITICAS_META.revision}
          </p>
          <p style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, margin: '2px 0 0' }}>
            {POLITICAS.length} políticas + código de ética
          </p>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }} className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5"><CalendarCheck size={13} style={{ color: C.mint }} /> Revisadas el {POLITICAS_META.fecha}</span>
          <span className="flex items-center gap-1.5"><PenLine size={13} style={{ color: C.mint }} /> Aprobó: {POLITICAS_META.aprobadoPor}</span>
        </div>
      </div>

      {/* Tarjetas de políticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {POLITICAS.map((pol) => (
          <PoliticaCard
            key={pol.id}
            pol={pol}
            open={openId === pol.id}
            onToggle={() => setOpenId(openId === pol.id ? null : pol.id)}
          />
        ))}
      </div>

      {/* Código de ética */}
      <div style={{ background: `${C.mint}14`, borderRadius: 16, padding: '18px 20px', borderLeft: `5px solid ${C.mint}` }}>
        <p style={{ fontSize: 14.5, fontWeight: 800, color: C.green, margin: '0 0 6px' }}>{CODIGO_ETICA.title}</p>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>{CODIGO_ETICA.text}</p>
      </div>

      <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
        📄 Fuente: Planeación Estratégica 2026 y Manual Integrado de Gestión MC-DP-01. Las políticas se revisan anualmente en la planeación estratégica.
      </p>
    </div>
  );
}
