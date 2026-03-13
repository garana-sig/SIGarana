// ModuleHero.jsx — Banner reutilizable para todos los módulos
// Colócalo como PRIMER elemento del return de cada módulo principal.
// Los márgenes negativos cancelan el p-4 del Layout para ir de borde a borde.
//
// Uso:
//   <ModuleHero
//     title="Gestión Documental"
//     subtitle="Sistema de control y gestión de documentos"
//     icon={FileText}
//     color="#6dbd96"
//   />

const C = { dark: '#1a2e25', mint: '#6dbd96', sand: '#dedecc' };

export default function ModuleHero({ title, subtitle, icon: Icon, color }) {
  const accent = color || C.mint;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', background: C.dark,
      minHeight: 110,
      marginLeft: '-1rem', marginRight: '-1rem', marginTop: '-1rem', marginBottom: '1.5rem',
    }}>
      {/* Fondo imagen sutil */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/nosotros.png)', backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.07,
      }} />
      {/* Destello */}
      <div style={{
        position: 'absolute', top: -20, right: 60, width: 200, height: 200,
        borderRadius: '50%', background: accent, opacity: 0.05, filter: 'blur(60px)',
      }} />
      {/* Onda inferior */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 32, display: 'block' }}
        viewBox="0 0 1440 32" preserveAspectRatio="none">
        <path d="M0,16 C360,32 1080,0 1440,16 L1440,32 L0,32 Z" fill={C.sand} />
      </svg>
      {/* Contenido */}
      <div style={{ position: 'relative', zIndex: 10, padding: '22px 28px 42px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {Icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: accent + '22', border: `1.5px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color={accent} />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 18, height: 2, borderRadius: 2, background: accent }} />
            <span style={{ color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Garana SIG
            </span>
          </div>
          <h1 style={{ color: 'white', fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}