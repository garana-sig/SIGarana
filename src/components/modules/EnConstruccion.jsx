// src/components/modules/EnConstruccion.jsx
// 🆕 Página placeholder reutilizable para módulos que aún no tienen contenido
// (por ahora: Manuales y Planes y Programas, enlazados desde Home.jsx)

import { Construction, ArrowLeft } from 'lucide-react';

const C = {
  green: '#2e5244',
  mint: '#6dbd96',
  olive: '#6f7b2c',
  sand: '#dedecc',
  dark: '#1a2e25',
  cream: '#faf9f5',
};

export default function EnConstruccion({
  title = 'Próximamente',
  subtitle = 'Estamos trabajando en esta sección.',
  onModuleChange,
}) {
  return (
    <div
      className="min-h-[70vh] rounded-2xl flex flex-col items-center justify-center text-center p-10"
      style={{ background: C.cream }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: `${C.mint}20`, border: `1px solid ${C.mint}40` }}
      >
        <Construction size={34} style={{ color: C.green }} />
      </div>

      <h1
        style={{
          color: C.green,
          fontFamily: 'Georgia, serif',
          fontSize: 24,
          fontWeight: 700,
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8, maxWidth: 420 }}>
        {subtitle}
      </p>

      {onModuleChange && (
        <button
          onClick={() => onModuleChange('home')}
          className="mt-7 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: C.green, color: 'white' }}
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </button>
      )}
    </div>
  );
}