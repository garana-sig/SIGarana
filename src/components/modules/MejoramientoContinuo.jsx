// src/components/modules/MejoramientoContinuo/MejoramientoContinuo.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import ModuleHero from '@/components/ModuleHero';
import { useAuth } from '@/context/AuthContext';
import {
  FileText, CheckCircle2, AlertTriangle, ClipboardCheck,
  FileBarChart, TrendingUp, Scale, Search, Users,
  BarChart3, AlertCircle, Smile, Award, HelpCircle, Settings,
} from 'lucide-react';

import ActasManager                from './MejoramientoContinuo/Actas/ActasManager';
import AccionesMejoraManager       from './MejoramientoContinuo/AccionesMejora/AccionesMejoraManager';
import IndicadoresManager          from './MejoramientoContinuo/Indicadores/IndicadoresManager';
import RiskMatrixManager           from './MejoramientoContinuo/RiskMatrix/RiskMatrixManager';
import SatisfaccionClientesManager from './MejoramientoContinuo/SatisfaccionClientes/SatisfaccionClientesManager';
import ClimaLaboralManager         from './MejoramientoContinuo/ClimaLaboral/ClimaLaboralManager';
import SurveyConfigModal           from './MejoramientoContinuo/SurveyConfigModal';

const SUBMODULES = [
  {
    id: 'actas', name: 'Actas',
    permission: 'auditorias:actas:view',
    description: 'Registro y seguimiento de actas de reunión',
    icon: FileText, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)',
    badge: 'Reuniones', enabled: true,
  },
  {
    id: 'acciones_mejora', name: 'Acciones de Mejora',
    permission: 'auditorias:acciones_mejora:view',
    description: 'Seguimiento de acciones correctivas y preventivas',
    icon: CheckCircle2, color: '#6dbd96',
    gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)',
    badge: 'Correctivas · Preventivas', enabled: true,
  },
  {
    id: 'indicadores', name: 'Indicadores',
    permission: 'cmi:indicadores:view',
    description: 'Matriz de indicadores de gestión y seguimiento',
    icon: TrendingUp, color: '#6f7b2c',
    gradient: 'linear-gradient(135deg, #6f7b2c 0%, #6dbd96 100%)',
    badge: 'CMI', enabled: true,
  },
  {
    id: 'matriz_riesgos', name: 'Matriz de Riesgos',
    permission: 'auditorias:riesgos:view',
    description: 'Identificación y valoración de riesgos de proceso',
    icon: BarChart3, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #1a2e25 0%, #2e5244 100%)',
    badge: 'ISO 31000', enabled: true,
  },
  {
    id: 'satisfaccion_clientes', name: 'Satisfacción Clientes',
    permission: 'auditorias:satisfaccion_clientes:view',
    description: 'Encuestas de satisfacción y seguimiento comercial',
    icon: Award, color: '#d97706',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    badge: 'Encuestas', enabled: true,
    hasConfig: true, surveyCode: 'customer_satisfaction', surveyName: 'Satisfacción del Cliente',
  },
  {
    id: 'clima_laboral', name: 'Clima Laboral',
    permission: 'auditorias:clima_laboral:view',
    description: 'Evaluación de clima y satisfacción organizacional',
    icon: Smile, color: '#6f7b2c',
    gradient: 'linear-gradient(135deg, #6f7b2c 0%, #a3b347 100%)',
    badge: 'Bienestar', enabled: true,
    hasConfig: true, surveyCode: 'work_climate', surveyName: 'Clima Laboral',
  },
  { id: 'producto_no_conforme', name: 'Producto No Conforme', permission: 'auditorias:producto_no_conforme:view', description: 'Gestión de no conformidades', icon: AlertTriangle, color: '#6f7b2c', enabled: false },
  { id: 'revision_direccion', name: 'Revisión por la Dirección', permission: 'auditorias:revision_direccion:view', description: 'Revisiones gerenciales periódicas', icon: ClipboardCheck, color: '#2e5244', enabled: false },
  { id: 'informes', name: 'Informes', permission: 'auditorias:informes:view', description: 'Informes y reportes de gestión', icon: FileBarChart, color: '#6dbd96', enabled: false },
  { id: 'requisitos_legales', name: 'Requisitos Legales', permission: 'auditorias:requisitos_legales:view', description: 'Matriz de requisitos normativos', icon: Scale, color: '#2e5244', enabled: false },
  { id: 'auditorias', name: 'Auditorías', permission: 'auditorias:auditorias_internas:view', description: 'Plan, programa y hallazgos', icon: Search, color: '#6dbd96', enabled: false },
  { id: 'evaluacion_auditores', name: 'Evaluación Auditores', permission: 'auditorias:evaluacion_auditores:view', description: 'Competencias de auditores', icon: Users, color: '#6f7b2c', enabled: false },
  { id: 'reporte_incidentes', name: 'Reporte de Incidentes', permission: 'auditorias:reporte_incidentes:view', description: 'Incidentes y eventos', icon: AlertCircle, color: '#6dbd96', enabled: false },
  { id: 'evaluacion_competencias', name: 'Evaluación Competencias', permission: 'auditorias:evaluacion_competencias:view', description: 'Competencias del personal', icon: Users, color: '#6dbd96', enabled: false },
  { id: 'qrsf', name: 'QRSF', permission: 'auditorias:qrsf:view', description: 'Quejas, reclamos, sugerencias', icon: HelpCircle, color: '#6f7b2c', enabled: false },
];

// ── 🎨 Card Futurista ─────────────────────────────────────────────────────────
function FuturisticCard({ title, description, icon: Icon, color, gradient, badge, count, onClick, delay, hasConfig, onConfig }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <Card className="relative overflow-hidden border-0 shadow-xl h-full">
        {/* Gradiente fondo */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: gradient }} />

        {/* Patrón puntos */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <pattern id={`pat-${title}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill={color} />
            </pattern>
            <rect width="100%" height="100%" fill={`url(#pat-${title})`} />
          </svg>
        </div>

        {/* Línea animada superior */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        <CardContent className="relative p-4">
          {/* Fila superior: ícono + acciones */}
          <div className="flex items-start justify-between mb-3">
            <div className="relative">
              <motion.div
                className="absolute inset-0 blur-xl opacity-50"
                style={{ backgroundColor: color }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Icon className="h-12 w-12 relative z-10" style={{ color }} />
            </div>

            {/* Config button (solo encuestas) */}
            {hasConfig && (
              <button
                title="Configurar períodos y preguntas"
                onClick={(e) => { e.stopPropagation(); onConfig?.(); }}
                className="rounded-md p-1 hover:bg-gray-100 transition-colors"
                style={{ color: '#aaa' }}
              >
                <Settings size={13} />
              </button>
            )}
          </div>

          {/* Título */}
          <h3 className="text-base font-bold mb-1 group-hover:translate-x-1 transition-transform" style={{ color: '#2e5244' }}>
            {title}
          </h3>

          {/* Descripción */}
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">{description}</p>

          {/* Badge tipo */}
          <Badge className="font-semibold text-xs" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
            {badge}
          </Badge>

          {/* Corner glow */}
          <motion.div
            className="absolute bottom-0 right-0 w-20 h-20 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(circle at bottom right, ${color}, transparent)` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </CardContent>

        {/* Borde hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ border: `2px solid ${color}`, opacity: 0, borderRadius: '0.5rem' }}
          whileHover={{ opacity: 0.5 }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MejoramientoContinuo() {
  const [activeSubmodule, setActiveSubmodule] = useState(null);
  const [configModal, setConfigModal]         = useState(null);
  const { hasPermission, isAdmin, isGerencia } = useAuth();

  if (activeSubmodule === 'actas')
    return <ActasManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'acciones_mejora')
    return <AccionesMejoraManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'indicadores')
    return <IndicadoresManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'matriz_riesgos')
    return <RiskMatrixManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'satisfaccion_clientes')
    return <SatisfaccionClientesManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'clima_laboral')
    return <ClimaLaboralManager onBack={() => setActiveSubmodule(null)} />;

  // Admin y gerencia ven TODOS los enabled; usuarios solo los que tienen permiso
  const canAccess = (mod) => {
    if (!mod.enabled) return false;
    if (isAdmin || isGerencia) return true;
    return hasPermission(mod.permission);
  };

  const enabledModules  = SUBMODULES.filter(canAccess);
  const disabledModules = SUBMODULES.filter(m => !m.enabled);

  return (
    <div className="space-y-6">

      <ModuleHero
        title="Mejoramiento Continuo"
        subtitle="Gestión integral de calidad, indicadores y mejoramiento"
        icon={TrendingUp}
        color="#6dbd96"
      />

      {/* ── Cards activas ── */}
      <div className="relative">
        {/* Blobs decorativos */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#6dbd96] rounded-full blur-3xl opacity-10" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#2e5244] rounded-full blur-3xl opacity-10" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#6f7b2c] rounded-full blur-3xl opacity-10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledModules.map((mod, i) => (
            <FuturisticCard
              key={mod.id}
              title={mod.name}
              description={mod.description}
              icon={mod.icon}
              color={mod.color}
              gradient={mod.gradient}
              badge={mod.badge}
              count={mod.count}
              delay={i * 0.08}
              hasConfig={mod.hasConfig}
              onConfig={() => setConfigModal({ surveyCode: mod.surveyCode, surveyName: mod.surveyName })}
              onClick={() => setActiveSubmodule(mod.id)}
            />
          ))}
        </div>
      </div>

      {/* ── En desarrollo ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="border border-dashed" style={{ borderColor: '#dedecc' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: '#6f7b2c' }}>
              Próximamente
            </CardTitle>
            <CardDescription className="text-xs">Módulos en desarrollo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {disabledModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg opacity-50"
                    style={{ background: '#f5f5ef' }}
                  >
                    <Icon size={13} color="#999" />
                    <span className="text-xs text-gray-400 truncate">{mod.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal config encuestas */}
      {configModal && (
        <SurveyConfigModal
          surveyTypeCode={configModal.surveyCode}
          surveyTypeName={configModal.surveyName}
          onClose={() => setConfigModal(null)}
        />
      )}

    </div>
  );
}