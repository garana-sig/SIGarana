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
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  ScrollText,
  X,
  ExternalLink,
  Loader2,
  Inbox,
  ListChecks,
  Send,
  ClipboardCheck as CheckIcon,
  Wrench,
} from 'lucide-react';
import { CARACTERIZACION_PROCESOS, DOC_TYPE_LABELS } from '@/data/caracterizacionProcesos';
import { useDocuments, useProcesses } from '@/hooks/useDocuments';
import DocumentViewerModal from './GestionDocumental/DocumentViewerModal';

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

// 🆕 Accesos rápidos que reemplazan la fila de "Números de Impacto"
const ACCESOS_RAPIDOS = [
  {
    key: 'manuales',
    label: 'Manuales',
    desc: 'Manuales de calidad, funciones y procesos',
    icon: BookOpen,
    color: C.green,
  },
  {
    key: 'planesProgramas',
    label: 'Planes y Programas',
    desc: 'Documentos de consulta institucional',
    icon: ClipboardCheck,
    color: C.olive,
  },
  {
    key: 'politicas',
    label: 'Políticas',
    desc: 'Políticas institucionales del SIG',
    icon: ScrollText,
    color: '#b45309',
  },
];

// 🆕 Posición (en % del contenedor) de cada proceso sobre
// Estructura_de_proceso.jpg — coordenadas tomadas directamente de la imagen.
const PROCESO_HOTSPOTS = [
  { code: 'DP', left: 51,   top: 27.3, w: 19, h: 14.3, shape: 'diamond' },
  { code: 'GS', left: 76,   top: 27.3, w: 19, h: 14.3, shape: 'diamond' },
  { code: 'GC', left: 64,   top: 39.3, w: 13, h: 10,   shape: 'circle' },
  { code: 'GR', left: 54.5, top: 56,   w: 19, h: 14.5, shape: 'circle' },
  { code: 'GP', left: 75.5, top: 55,   w: 13, h: 10,   shape: 'circle' },
  { code: 'GH', left: 51,   top: 75.8, w: 19, h: 14.3, shape: 'diamond' },
  { code: 'GF', left: 77,   top: 75.8, w: 19, h: 14.3, shape: 'diamond' },
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

// ─────────────────────────────────────────────────────────────────
// 🆕 Bloque de una sección de la caracterización, en formato "celda de tabla"
function CelTabla({ titulo, icon: Icon, items, vacio = 'No aplica / no definido.' }) {
  return (
    <div style={{ padding: 14, borderRight: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}` }}>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={13} style={{ color: C.mint }} />}
        <p style={{ fontSize: 10.5, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          {titulo}
        </p>
      </div>
      {items && items.length ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <div className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: C.mint }} />
              <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 11.5, color: '#b0b0a5', fontStyle: 'italic', margin: 0 }}>{vacio}</p>
      )}
    </div>
  );
}

// 🆕 Modal de Caracterización de Proceso — versión completa (todo el contenido del
// documento oficial, en formato tabla) + documentos asociados EN VIVO desde
// Gestión Documental (Supabase), agrupados por tipo y clicables.
function CaracterizacionModal({ code, onClose }) {
  const p = CARACTERIZACION_PROCESOS[code];
  const { processes } = useProcesses();
  const processRow = processes.find((pr) => pr.code === code);
  const { documents, loading: loadingDocs } = useDocuments({ processId: processRow?.id });
  const [docViewer, setDocViewer] = useState(null);

  if (!p) return null;

  // Solo documentos publicados (vigentes) del proceso, agrupados por tipo
  const publicados = (documents || []).filter((d) => d.status === 'published');
  const porTipo = {};
  publicados.forEach((d) => {
    const tCode = d.document_type?.code;
    if (!tCode) return;
    if (!porTipo[tCode]) porTipo[tCode] = [];
    porTipo[tCode].push(d);
  });
  const tiposConDocs = Object.keys(porTipo).filter((t) => DOC_TYPE_LABELS[t]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        style={{ background: 'rgba(20,28,24,0.6)' }}
        onClick={onClose}
      >
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: 'white',
            maxWidth: 980,
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-5" style={{ background: C.green, flexShrink: 0 }}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              <X size={16} />
            </button>
            <p style={{ color: C.mint, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {p.area} · Código {code}
            </p>
            <h3 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, margin: '4px 0 0' }}>
              {p.nombre}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '4px 0 0' }}>
              Responsable: {p.responsable}
            </p>
          </div>

          {/* Cuerpo scrolleable */}
          <div className="overflow-y-auto" style={{ flex: 1 }}>
            {/* Objetivo / Alcance */}
            <div className="p-5" style={{ borderBottom: `1px solid ${C.sand}`, background: '#faf9f5' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                    Objetivo
                  </p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>{p.objetivo}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                    Alcance
                  </p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>{p.alcance}</p>
                </div>
              </div>
            </div>

            {/* Tabla 1: Entradas | Actividades PHVA | Salidas */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3"
              style={{ borderTop: `1px solid ${C.sand}` }}
            >
              <CelTabla titulo="Entradas" icon={Inbox} items={p.entradas} />

              {/* Columna de actividades: 4 sub-bloques PHVA */}
              <div style={{ borderRight: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}` }}>
                <div className="flex items-center gap-1.5 px-3.5 pt-3.5 mb-1">
                  <ListChecks size={13} style={{ color: C.mint }} />
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Actividades (PHVA)
                  </p>
                </div>
                {[
                  ['Planear', p.actividades?.planear],
                  ['Hacer', p.actividades?.hacer],
                  ['Verificar', p.actividades?.verificar],
                  ['Actuar', p.actividades?.actuar],
                ].map(([label, items]) => (
                  <div key={label} className="px-3.5 pb-2.5">
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: C.olive, margin: '6px 0 4px' }}>{label}</p>
                    {items && items.length ? (
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <div className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: C.mint }} />
                            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: 11.5, color: '#b0b0a5', fontStyle: 'italic', margin: 0 }}>No definido.</p>
                    )}
                  </div>
                ))}
              </div>

              <CelTabla titulo="Salidas" icon={Send} items={p.salidas} />
            </div>

            {/* Tabla 2: Requisitos | Seguimiento y Medición | Recursos */}
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <CelTabla titulo="Requisitos" icon={CheckIcon} items={p.requisitos} />
              <CelTabla
                titulo="Seguimiento y Medición"
                icon={BarChart3}
                items={p.seguimientoMedicion}
                vacio="El documento oficial no define indicadores para este proceso."
              />
              <CelTabla titulo="Recursos" icon={Wrench} items={p.recursos} />
            </div>

            {/* Documentos asociados — EN VIVO desde Gestión Documental */}
            <div className="p-5" style={{ borderTop: `1px solid ${C.sand}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                Documentos asociados (Gestión Documental)
              </p>

              {loadingDocs && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: C.mint }} />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Cargando documentos vigentes…</span>
                </div>
              )}

              {!loadingDocs && tiposConDocs.length === 0 && (
                <p style={{ fontSize: 12, color: '#b0b0a5', fontStyle: 'italic', margin: 0 }}>
                  Aún no hay documentos publicados en Gestión Documental para este proceso.
                </p>
              )}

              {!loadingDocs && tiposConDocs.length > 0 && (
                <div className="space-y-3">
                  {tiposConDocs.map((tCode) => (
                    <div key={tCode}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: C.green, margin: '0 0 6px' }}>
                        {DOC_TYPE_LABELS[tCode].emoji} {DOC_TYPE_LABELS[tCode].label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {porTipo[tCode].map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => setDocViewer(doc)}
                            className="flex items-center gap-1.5 transition-colors"
                            style={{
                              fontSize: 11.5, fontWeight: 500, padding: '5px 10px', borderRadius: 8,
                              background: '#f2f1e9', border: `1px solid ${C.sand}`, color: '#374151',
                              cursor: 'pointer',
                            }}
                            title={doc.name}
                          >
                            <span style={{ color: C.green, fontWeight: 700 }}>{doc.code}</span>
                            <span>{doc.name}</span>
                            <ExternalLink size={11} style={{ color: C.mint }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-3 border-t" style={{ borderColor: C.sand, flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
              📄 Contenido tomado de "Caracterización de Procesos 2026". Los documentos se sincronizan en vivo con Gestión Documental.
            </p>
          </div>
        </div>
      </div>

      <DocumentViewerModal
        document={docViewer}
        isOpen={!!docViewer}
        onClose={() => setDocViewer(null)}
      />
    </>
  );
}

export default function Home({ onModuleChange }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  // 🆕 Caracterización de proceso: qué proceso está abierto en el modal
  const [procesoActivo, setProcesoActivo] = useState(null);

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

      {/* ─── ACCESOS RÁPIDOS (antes: Números de Impacto) ─── */}
      <div className="mx-6 -mt-3 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACCESOS_RAPIDOS.map((acceso) => {
          const Icon = acceso.icon;
          return (
            <button
              key={acceso.key}
              onClick={() => onModuleChange && onModuleChange(acceso.key)}
              className="group flex items-center gap-4 rounded-2xl p-4 text-left transition-transform"
              style={{
                background: C.green,
                boxShadow: '0 8px 32px rgba(46,82,68,0.25)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${acceso.color}30`, border: `1px solid ${C.mint}40` }}
              >
                <Icon size={22} style={{ color: C.mint }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: 'white', fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 700 }}>
                  {acceso.label}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 2 }}>
                  {acceso.desc}
                </p>
              </div>
              <ArrowRight
                size={18}
                className="flex-shrink-0 transition-transform group-hover:translate-x-1"
                style={{ color: C.mint }}
              />
            </button>
          );
        })}
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
            className="rounded-2xl overflow-hidden p-6"
            style={{
              background: 'white',
              border: `1px solid ${C.sand}`,
              boxShadow: '0 2px 12px rgba(46,82,68,0.06)',
            }}
          >
            {/* 🆕 Imagen original + zonas clicables por proceso (sin modificar la imagen) */}
            <div style={{ position: 'relative', width: '100%' }}>
              <img
                src="/Estructura_de_proceso.jpg"
                alt="Sistema Integrado de Gestión - Garana Art"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              {PROCESO_HOTSPOTS.map((h) => (
                <button
                  key={h.code}
                  onClick={() => setProcesoActivo(h.code)}
                  aria-label={`Ver caracterización de ${CARACTERIZACION_PROCESOS[h.code]?.nombre || h.code}`}
                  title={`Ver caracterización de ${CARACTERIZACION_PROCESOS[h.code]?.nombre || h.code}`}
                  style={{
                    position: 'absolute',
                    left: `${h.left}%`,
                    top: `${h.top}%`,
                    width: `${h.w}%`,
                    height: `${h.h}%`,
                    transform: 'translate(-50%, -50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    borderRadius: h.shape === 'circle' ? '50%' : 16,
                  }}
                  className="group"
                >
                  <span
                    className="block w-full h-full transition-all"
                    style={{
                      borderRadius: h.shape === 'circle' ? '50%' : 16,
                      transform: h.shape === 'diamond' ? 'rotate(45deg)' : 'none',
                    }}
                  />
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      borderRadius: h.shape === 'circle' ? '50%' : 16,
                      transform: h.shape === 'diamond' ? 'rotate(45deg)' : 'none',
                      boxShadow: `0 0 0 3px rgba(255,255,255,0.85), 0 0 0 6px ${C.mint}55`,
                    }}
                  />
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>
              Haz clic sobre cualquier proceso del diagrama para ver su caracterización.
            </p>
          </div>
        </section>

        {/* 🆕 Modal de Caracterización de Proceso (completo, tipo tabla, con documentos en vivo) */}
        {procesoActivo && CARACTERIZACION_PROCESOS[procesoActivo] && (
          <CaracterizacionModal code={procesoActivo} onClose={() => setProcesoActivo(null)} />
        )}

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