import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Globe, Sun, Award,
  FileText,
  BarChart3,
  Shield,
  TrendingUp,
  ClipboardList,
  Star,
  Heart,
  Users,
} from 'lucide-react';

// Paleta Garana
const C = {
  green: '#2e5244',
  mint: '#6dbd96',
  olive: '#6f7b2c',
  sand: '#dedecc',
  dark: '#1a2e25',
  cream: '#faf9f5',
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatDate = () => {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
};

// Módulos del sistema
const ALL_MODULES = [
  { key: 'documentos',      label: 'Gestión Documental',    icon: FileText,     color: C.green,  desc: 'Procedimientos y guías' },
  { key: 'indicadores',     label: 'Indicadores CMI',       icon: BarChart3,    color: C.olive,  desc: 'Cuadro de mando integral' },
  { key: 'riesgos',         label: 'Matriz de Riesgos',     icon: Shield,       color: '#b45309', desc: 'Control de riesgos' },
  { key: 'acciones',        label: 'Acciones de Mejora',    icon: TrendingUp,   color: C.mint,   desc: 'Mejoramiento continuo' },
  { key: 'actas',           label: 'Actas de Reunión',      icon: ClipboardList,color: C.green,  desc: 'Registro de reuniones' },
  { key: 'satisfaccion',    label: 'Satisfacción Clientes', icon: Star,         color: '#d97706', desc: 'Encuestas y resultados' },
  { key: 'clima',           label: 'Clima Laboral',         icon: Heart,        color: '#be185d', desc: 'Bienestar del equipo' },
  { key: 'usuarios',        label: 'Gestión Usuarios',      icon: Users,        color: C.olive,  desc: 'Administración del sistema' },
];

const VALORES = [
  { label: 'Honestidad',       desc: 'Congruencia entre lo que pensamos y hacemos.',       icon: '🤝' },
  { label: 'Responsabilidad',  desc: 'Asumir las consecuencias de nuestros actos.',        icon: '✅' },
  { label: 'Respeto',          desc: 'Reconocer y valorar a los demás.',                   icon: '🌿' },
  { label: 'Amor',             desc: 'Buscar la felicidad y el bienestar de los demás.',   icon: '❤️' },
  { label: 'Lealtad',          desc: 'Fidelidad en las acciones y comportamientos.',       icon: '⭐' },
];

const IMPACTOS = [
  {
    icon: Globe,
    color: C.green,
    titulo: 'Impacto Social',
    items: [
      '50+ mujeres cabeza de hogar empleadas',
      'Jóvenes, víctimas del conflicto e indígenas',
      '"Navidad Garana" para niños vulnerables',
      'Campañas de mercados para familias',
    ]
  },
  {
    icon: Sun,
    color: C.olive,
    titulo: 'Impacto Ambiental',
    items: [
      'Planta 100% energía solar fotovoltaica',
      'Telas elaboradas con botellas PET recicladas',
      'Etiquetas biodegradables',
      'Residuos textiles aprovechados (CEMEX)',
    ]
  },
  {
    icon: Award,
    color: '#b45309',
    titulo: 'Certificaciones',
    items: [
      'ISO 9001 Sistema de Gestión de Calidad',
      'Sello Solar Premium Quality (SMARTSOLAR)',
      'Certificación RETIE Colombia',
      'Programa "Ella Exporta África" 2024',
    ]
  },
];

export default function Home({ onModuleChange }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const role = user?.role || 'usuario';
  const visibleModules = role === 'admin'
    ? ALL_MODULES
    : role === 'gerencia'
      ? ALL_MODULES.filter(m => m.key !== 'usuarios')
      : ALL_MODULES.filter(m => !['usuarios'].includes(m.key));

  return (
    <div
      className="min-h-screen"
      style={{
        background: C.cream,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* ─── HERO ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: C.dark,
          minHeight: 220,
        }}
      >
        {/* Fondo texturizado */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/nosotros.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
          }}
        />
        {/* Decoración onda SVG inferior */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          style={{ height: 48, display: 'block' }}
        >
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill={C.cream} />
        </svg>

        {/* Destellos decorativos */}
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full opacity-5"
          style={{ background: C.mint, filter: 'blur(40px)' }} />
        <div className="absolute bottom-8 left-12 w-20 h-20 rounded-full opacity-5"
          style={{ background: C.mint, filter: 'blur(30px)' }} />

        <div className="relative z-10 px-8 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              {/* Logo */}

              <p style={{ color: C.mint, fontSize: 13, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {getGreeting()},
              </p>
              <h1 style={{ color: 'white', fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 700, margin: 0 }}>
                {user?.name || 'Bienvenido'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
                {formatDate()}
              </p>
            </div>

            {/* Rol badge */}
            <div className="flex flex-col items-end gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: role === 'admin' ? '#b4530920' : role === 'gerencia' ? '#2e524420' : '#6dbd9620',
                  color: role === 'admin' ? '#f59e0b' : role === 'gerencia' ? C.mint : C.mint,
                  border: `1px solid ${role === 'admin' ? '#f59e0b40' : C.mint + '40'}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                Sistema Integrado de Gestión
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── NÚMEROS DE IMPACTO ──────────────────────────── */}
      <div
        className="mx-6 -mt-3 rounded-2xl p-1 mb-6"
        style={{ background: C.green, boxShadow: '0 8px 32px rgba(46,82,68,0.25)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            { num: '20', label: 'Años en el mercado', suffix: '' },
            { num: '60 ', label: 'Colaboradores', suffix: '+' },
            { num: '10K', label: 'Unidades / mes', suffix: '' },
            { num: '80', label: 'Clientes Mayoristas', suffix: '+' },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-4 px-2"
              style={{
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              }}
            >
              <span style={{ color: C.mint, fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1 }}>
                {s.num}<span style={{ fontSize: 16 }}>{s.suffix}</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, textAlign: 'center', letterSpacing: '0.03em' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6 pb-10">

        {/* ─── SISTEMA INTEGRADO DE GESTIÓN ────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: C.mint }} />
            <h2 style={{ color: C.dark, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Sistema Integrado de Gestión
            </h2>
          </div>

          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center p-6"
            style={{
              background: 'white',
              border: `1px solid ${C.sand}`,
              boxShadow: '0 2px 12px rgba(46,82,68,0.06)',
            }}
          >
            <img
              src="/Estructura_de_proceso.jpg"
              alt="Sistema Integrado de Gestión - Garana Art"
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </section>

        {/* ─── MISIÓN & VISIÓN ──────────────────────────── */}
       
       <section>
         <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: C.mint }} />
            <h2 style={{ color: C.dark, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Plataforma estratégica
            </h2>
          </div>

          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center p-6"
            style={{
              background: 'white',
              border: `1px solid ${C.sand}`,
              boxShadow: '0 2px 12px rgba(46,82,68,0.06)',
            }}
          >
            <img
              src="/mision_vision.jpg"
              alt="Mision Vision - Garana Art"
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </section>
     

        {/* ─── VALORES ──────────────────────────────────── */}
       <section>
         <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: C.mint }} />
            <h2 style={{ color: C.dark, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
             Nuestros valores
            </h2>
          </div>

          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center p-6"
            style={{
              background: 'white',
              border: `1px solid ${C.sand}`,
              boxShadow: '0 2px 12px rgba(46,82,68,0.06)',
            }}
          >
            <img
              src="/valores.jpg"
              alt="Valores- Garana Art"
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </section>
     

        {/* ─── IMPACTO SOCIAL / AMBIENTAL / CERTS ─────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: C.mint }} />
            <h2 style={{ color: C.dark, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Nuestro impacto
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {IMPACTOS.map((imp, i) => {
              const Icon = imp.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl p-5"
                  style={{
                    background: 'white',
                    border: `1px solid ${C.sand}`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: imp.color + '15' }}
                    >
                      <Icon size={20} style={{ color: imp.color }} />
                    </div>
                    <h3 style={{ color: imp.color, fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {imp.titulo}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {imp.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <div
                          className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: imp.color }}
                        />
                        <span style={{ color: '#4b5563', fontSize: 12, lineHeight: 1.5 }}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── FOOTER LEMA ──────────────────────────────── */}
        <div
          className="rounded-2xl p-6 text-center relative overflow-hidden"
          style={{ background: C.dark }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/imgfondo.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.06,
            }}
          />
          <div className="relative z-10">
            <img
              src="/garana1.png"
              alt="Garana Art"
              style={{ height: 28, filter: 'brightness(0) invert(1)', opacity: 0.7, margin: '0 auto 12px' }}
            />
            <p
              style={{
                color: C.mint,
                fontSize: 18,
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                margin: 0,
                letterSpacing: '0.02em',
              }}
            >
              "Tu belleza es nuestra inspiración"
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6 }}>
              Garantizando el realce natural de su belleza · Riosucio, Caldas · Desde 2006
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}