// src/components/modules/MejoramientoContinuo/MejoramientoContinuo.jsx
// ✅ v2 (oct 2026) Reorganización por GRUPOS:
//    · Pantalla principal: submódulos directos + tarjetas de grupo
//      (Evaluaciones, Mantenimiento, Auditorías).
//    · Al entrar a un grupo se ven sus submódulos (mismas tarjetas).
//    · Submódulos nuevos con building: true → "En construcción" (no abren).
//    · Se eliminó la sección "Próximamente".
//    · Al volver de un submódulo se regresa al grupo del que se entró.
//    Para mover un submódulo de grupo: editar GROUPS / TOP_LEVEL.
// ✅ v4.1 El aviso "N nuevos" solo sale en cada tarjeta de registro, no en la tarjeta del grupo.
// ✅ v4 Registros Sugerencias (RE-GH-05) y Operación Inusual (RE-GF-10) habilitados con
//    RegistroReporteManager (genérico, igual que Actos Inseguros).
// ✅ v3 Mantenimiento dividido: Equipos · Maquinaria (en construcción) · Infraestructura (en construcción).
// ✅ (oct 2026) Mantenimiento de Equipos (RE-GR-11) migrado desde Planes y Programas → MantenimientoManager
// ✅ Matriz Legal (RE-DP-04) habilitada: requisitos_legales → MatrizLegalManager
// ✅ FIX: la tarjeta "Proveedores" solo se mostraba con el permiso
//    'proveedores:evaluacion:view', ignorando catalogo:view y seleccion:view.
//    Ahora usa 'permissions' (array) + hasAnyPermission, así que basta con
//    tener CUALQUIERA de los tres permisos de Proveedores para ver el módulo.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import ModuleHero from '@/components/ModuleHero';
import { useAuth } from '@/context/AuthContext';
import {
  FileText, CheckCircle2, AlertTriangle, ClipboardCheck,
  FileBarChart, TrendingUp, Scale, Search, Users,
  BarChart3, AlertCircle, Smile, Award, HelpCircle, Settings,
  Building2, Wrench, ArrowLeft, Construction, ClipboardList, ShieldCheck,
  HardHat, Lightbulb, Star, BadgeCheck, Layers, Monitor, Cog, Building,
} from 'lucide-react';

import ActasManager                   from './MejoramientoContinuo/Actas/ActasManager';
import AccionesMejoraManager          from './MejoramientoContinuo/AccionesMejora/AccionesMejoraManager';
import IndicadoresManager             from './MejoramientoContinuo/Indicadores/IndicadoresManager';
import RiskMatrixManager              from './MejoramientoContinuo/RiskMatrix/RiskMatrixManager';
import SatisfaccionClientesManager    from './MejoramientoContinuo/SatisfaccionClientes/SatisfaccionClientesManager';
import ClimaLaboralManager            from './MejoramientoContinuo/ClimaLaboral/ClimaLaboralManager';
import SurveyConfigModal              from './MejoramientoContinuo/SurveyConfigModal';
import ProductoNoConformeManager      from './MejoramientoContinuo/ProductoNoConforme/ProductoNoConformeManager';
import QRSFManager                    from './MejoramientoContinuo/QRSF/QRSFManager';
import RevisionDireccionManager       from './MejoramientoContinuo/RevisionDireccion/RevisionDireccionManager';
import EvaluacionCompetenciasManager  from './MejoramientoContinuo/EvaluacionCompetencias/EvaluacionCompetenciasManager';
import InformesManager                from './MejoramientoContinuo/Informes/InformesManager';
import ProveedoresManager             from './MejoramientoContinuo/Proveedores/ProveedoresManager';
import MatrizLegalManager             from './MejoramientoContinuo/MatrizLegal/MatrizLegalManager';
import MantenimientoManager           from '@/components/modules/MantenimientoManager';
import RegistroReporteManager         from './MejoramientoContinuo/Reportes/RegistroReporteManager';
import { REGISTROS }                  from './MejoramientoContinuo/Reportes/registros';

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
    id: 'satisfaccion_clientes', name: 'Evaluación Satisfacción Clientes',
    permission: 'auditorias:satisfaccion_clientes:view',
    description: 'Encuestas de satisfacción y seguimiento comercial',
    icon: Award, color: '#d97706',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    badge: 'Encuestas', enabled: true,
    hasConfig: true, surveyCode: 'customer_satisfaction', surveyName: 'Satisfacción del Cliente',
  },
  {
    id: 'clima_laboral', name: 'Evaluación Clima Laboral',
    permission: 'auditorias:clima_laboral:view',
    description: 'Evaluación de clima y satisfacción organizacional',
    icon: Smile, color: '#6f7b2c',
    gradient: 'linear-gradient(135deg, #6f7b2c 0%, #a3b347 100%)',
    badge: 'Bienestar', enabled: true,
    hasConfig: true, surveyCode: 'work_climate', surveyName: 'Clima Laboral',
  },
  {
    id: 'producto_no_conforme', name: 'Producto No Conforme',
    permission: 'auditorias:producto_no_conforme:view',
    description: 'Gestión de no conformidades productivas',
    icon: AlertTriangle, color: '#6f7b2c',
    gradient: 'linear-gradient(135deg, #6f7b2c 0%, #a3b347 100%)',
    badge: 'RE-GP-13', enabled: true,
  },
  {
    id: 'qrsf', name: 'QRSF',
    permission: 'auditorias:qrsf:view',
    description: 'Quejas, reclamos, sugerencias, felicitaciones y devoluciones',
    icon: HelpCircle, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)',
    badge: 'RE-GC-03', enabled: true,
  },
  {
    id: 'revision_direccion', name: 'Revisión por la Dirección',
    permission: 'auditorias:revision_direccion:view',
    description: 'Informe ejecutivo consolidado del sistema de gestión',
    icon: ClipboardCheck, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)',
    badge: 'ISO 9001', enabled: true,
  },
  {
    id: 'evaluacion_competencias', name: 'Evaluación Competencias',
    permission: 'auditorias:evaluacion_competencias:view',
    description: 'Evaluación de desempeño y competencias del personal',
    icon: Users, color: '#6dbd96',
    gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)',
    badge: 'Desempeño', enabled: true,
  },
  {
    id: 'informes', name: 'Informes',
    permission: 'auditorias:informes:view',
    description: 'Elaboración y seguimiento de informes de gestión por proceso',
    icon: FileBarChart, color: '#6dbd96',
    gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)',
    badge: 'Gestión', enabled: true,
  },
  // ── PROVEEDORES ─────────────────────────────────────────────────────────
  // FIX: antes usaba permission: 'proveedores:evaluacion:view' (un solo
  // permiso), por lo que un usuario con SOLO catalogo:view o seleccion:view
  // nunca veía la tarjeta. Ahora basta con cualquiera de los tres.
  {
    id: 'proveedores', name: 'Evaluación Proveedores',
    permissions: ['proveedores:catalogo:view', 'proveedores:evaluacion:view', 'proveedores:seleccion:view'],
    description: 'Evaluación, selección y catálogo de proveedores',
    icon: Building2, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)',
    badge: 'RE-GR-01 · RE-GR-05', enabled: true,
  },
  {
    id: 'requisitos_legales', name: 'Matriz Legal',
    permission: 'auditorias:requisitos_legales:view',
    description: 'Requisitos legales y normativos con verificación de cumplimiento',
    icon: Scale, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6f7b2c 100%)',
    badge: 'RE-DP-04', enabled: true,
  },
  // ── MANTENIMIENTO DE EQUIPOS (migrado desde Planes y Programas) ─────────
  // Basta con ver computadores O maquinaria para ver la tarjeta.
  // v3: dividido en Equipos (computadores) · Maquinaria · Infraestructura
  {
    id: 'mant_equipos', name: 'Mantenimiento de Equipos',
    permission: 'mantenimiento:computadores:view',
    description: 'Hoja de vida y registro de mantenimiento de equipos de cómputo',
    icon: Monitor, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)',
    badge: 'RE-GR-11', enabled: true,
  },
  {
    // Tablas y permisos listos (mant_equipo.tipo = 'maquinaria'); faltan sus campos técnicos
    id: 'mant_maquinaria', name: 'Mantenimiento de Maquinaria',
    permission: 'mantenimiento:maquinaria:view',
    description: 'Hoja de vida y registro de mantenimiento de la maquinaria de planta',
    icon: Cog, color: '#6f7b2c',
    gradient: 'linear-gradient(135deg, #6f7b2c 0%, #a3b347 100%)',
    badge: 'RE-GR-11', building: true,
  },
  {
    id: 'mant_infraestructura', name: 'Mantenimiento de Infraestructura',
    description: 'Mantenimiento de instalaciones, redes y espacios físicos',
    icon: Building, color: '#6dbd96',
    gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)',
    badge: 'Infraestructura', building: true,
  },
  // ── NUEVOS — En construcción (building: true → se ven, no abren) ─────
  { id: 'eval_proveedor_critico',  name: 'Evaluación Proveedor Crítico',      description: 'Evaluación de proveedores críticos para la operación', icon: Star,        color: '#2e5244', gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)', badge: 'Proveedores', building: true },
  { id: 'eval_requisitos_calidad', name: 'Evaluación Requisitos de Calidad',  description: 'Verificación de requisitos del sistema de calidad',     icon: BadgeCheck,  color: '#6dbd96', gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)', badge: 'ISO 9001',    building: true },
  { id: 'eval_requisitos_sst',     name: 'Evaluación Requisitos SST',         description: 'Verificación de requisitos de seguridad y salud',       icon: HardHat,     color: '#6f7b2c', gradient: 'linear-gradient(135deg, #6f7b2c 0%, #a3b347 100%)', badge: 'SG-SST',      building: true },
  { id: 'eval_requisitos_basc',    name: 'Evaluación Requisitos BASC',        description: 'Verificación de requisitos de seguridad BASC',          icon: ShieldCheck, color: '#2e5244', gradient: 'linear-gradient(135deg, #1a2e25 0%, #2e5244 100%)', badge: 'BASC',        building: true },
  { id: 'registro_sugerencias',    name: 'Registro Sugerencias',              description: 'Sugerencias del personal y su seguimiento',             icon: Lightbulb,   color: '#d97706', gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', badge: 'RE-GH-05',    reporteTipo: 'sugerencia', enabled: true },
  { id: 'registro_operacion_inusual', name: 'Registro Operación Inusual en Exportación', description: 'Operaciones sospechosas o inusuales en exportaciones', icon: ShieldCheck, color: '#1d4ed8', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2e5244 100%)', badge: 'RE-GF-10', reporteTipo: 'operacion_inusual', enabled: true },
  // Registros de "Ayúdanos a mejorar": acceso = responsables del tipo (+ admin/gerencia)
  { id: 'registro_actos_inseguros', name: 'Registro Actos Inseguros',         description: 'Bandeja de reportes y registro de actos y condiciones inseguras', icon: AlertCircle, color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)', badge: 'RE-GS-02', reporteTipo: 'acto_inseguro', enabled: true },
  { id: 'auditorias',              name: 'Auditorías Internas',               description: 'Plan, programa y hallazgos de auditoría',               icon: Search,      color: '#6dbd96', gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)', badge: 'Auditoría',   building: true },
  { id: 'evaluacion_auditores',    name: 'Evaluación Auditores',              description: 'Competencias de los auditores internos',                icon: Users,       color: '#6f7b2c', gradient: 'linear-gradient(135deg, #6f7b2c 0%, #a3b347 100%)', badge: 'Auditoría',   building: true },
];

// ── GRUPOS ───────────────────────────────────────────────────────────────────
// children = ids de SUBMODULES, en el orden en que se muestran
const GROUPS = [
  {
    id: 'grp_evaluaciones', name: 'Evaluaciones',
    description: 'Satisfacción, clima, competencias, proveedores, indicadores, QRSF y requisitos',
    icon: ClipboardList, color: '#6dbd96',
    gradient: 'linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)',
    children: [
      'satisfaccion_clientes', 'clima_laboral', 'evaluacion_competencias', 'proveedores',
      'indicadores', 'qrsf', 'eval_proveedor_critico', 'eval_requisitos_calidad',
      'eval_requisitos_sst', 'eval_requisitos_basc', 'registro_sugerencias', 'registro_actos_inseguros',
      'registro_operacion_inusual',
    ],
  },
  {
    id: 'grp_mantenimiento', name: 'Mantenimiento',
    description: 'Equipos de cómputo, maquinaria e infraestructura',
    icon: Wrench, color: '#6f7b2c',
    gradient: 'linear-gradient(135deg, #6f7b2c 0%, #6dbd96 100%)',
    children: ['mant_equipos', 'mant_maquinaria', 'mant_infraestructura'],
  },
  {
    id: 'grp_auditorias', name: 'Auditorías',
    description: 'Auditorías internas y evaluación de auditores',
    icon: Search, color: '#2e5244',
    gradient: 'linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)',
    children: ['auditorias', 'evaluacion_auditores'],
  },
];

// Orden de la pantalla principal: ids de submódulos o de grupos
const TOP_LEVEL = [
  'actas', 'acciones_mejora', 'grp_evaluaciones', 'matriz_riesgos', 'producto_no_conforme',
  'revision_direccion', 'informes', 'requisitos_legales', 'grp_mantenimiento', 'grp_auditorias',
];

const SUB_BY_ID   = Object.fromEntries(SUBMODULES.map(m => [m.id, m]));
const GROUP_BY_ID = Object.fromEntries(GROUPS.map(g => [g.id, g]));

// ── 🎨 Card Futurista ─────────────────────────────────────────────────────────
function FuturisticCard({ title, description, icon: Icon, color, gradient, badge, onClick, delay, hasConfig, onConfig, building, isGroup, count, alerta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={building ? undefined : { scale: 1.05, y: -5 }}
      whileTap={building ? undefined : { scale: 0.98 }}
      onClick={building ? undefined : onClick}
      className={building ? 'group' : 'cursor-pointer group'}
      style={building ? { opacity: 0.6, cursor: 'default', filter: 'grayscale(0.35)' } : undefined}
      title={building ? 'En construcción' : undefined}
    >
      <Card className="relative overflow-hidden border-0 shadow-xl h-full">
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: gradient }} />
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <pattern id={`pat-${title}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill={color} />
            </pattern>
            <rect width="100%" height="100%" fill={`url(#pat-${title})`} />
          </svg>
        </div>
        <motion.div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <CardContent className="relative p-4">
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
            {alerta > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5"
                style={{ background: '#dc2626', color: 'white', boxShadow: '0 0 0 3px #dc262622' }}
                title="Reportes nuevos sin gestionar">
                {alerta} nuevo{alerta === 1 ? '' : 's'}
              </span>
            )}
            {isGroup && (
              <span className="flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                <Layers size={11} /> {count}
              </span>
            )}
            {building && (
              <span className="flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5"
                style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #d9770633' }}>
                <Construction size={11} /> En construcción
              </span>
            )}
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
          <h3 className="text-base font-bold mb-1 group-hover:translate-x-1 transition-transform" style={{ color: '#2e5244' }}>
            {title}
          </h3>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">{description}</p>
          <Badge className="font-semibold text-xs" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
            {badge}
          </Badge>
          <motion.div
            className="absolute bottom-0 right-0 w-20 h-20 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(circle at bottom right, ${color}, transparent)` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </CardContent>
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
  const [activeGroup, setActiveGroup]         = useState(null);   // id de GROUPS
  const [configModal, setConfigModal]         = useState(null);
  // FIX: se agrega hasAnyPermission para módulos con más de un permiso de vista
  const { hasPermission, hasAnyPermission, isAdmin, isGerencia } = useAuth();

  // "Ayúdanos a mejorar": tipos de los que soy responsable + contador de nuevos
  const [misTiposReporte, setMisTiposReporte] = useState([]);
  const [nuevosPorTipo, setNuevosPorTipo]     = useState({});
  useEffect(() => {
    if (activeSubmodule) return;          // se refresca al volver a las tarjetas
    let vivo = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [t, c] = await Promise.all([
        supabase.from('reporte_tipo_responsable').select('tipo_codigo').eq('user_id', user?.id),
        supabase.rpc('reporte_contador_nuevos'),
      ]);
      if (!vivo) return;
      setMisTiposReporte((t.data || []).map((x) => x.tipo_codigo));
      setNuevosPorTipo(Object.fromEntries((c.data || []).map((x) => [x.tipo_codigo, x.nuevos])));
    })();
    return () => { vivo = false; };
  }, [activeSubmodule]);

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
  if (activeSubmodule === 'producto_no_conforme')
    return <ProductoNoConformeManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'qrsf')
    return <QRSFManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'revision_direccion')
    return <RevisionDireccionManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'evaluacion_competencias')
    return <EvaluacionCompetenciasManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'informes')
    return <InformesManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'proveedores')
    return <ProveedoresManager onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'requisitos_legales')
    return <MatrizLegalManager onBack={() => setActiveSubmodule(null)} />;
  // Registros de "Ayúdanos a mejorar" (RE-GS-02 · RE-GH-05 · RE-GF-10) → manager genérico
  if (REGISTROS[activeSubmodule])
    return <RegistroReporteManager key={activeSubmodule} config={REGISTROS[activeSubmodule]} onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'mant_equipos')
    return <MantenimientoManager tipo="computadores" onBack={() => setActiveSubmodule(null)} />;
  if (activeSubmodule === 'mant_maquinaria')
    return <MantenimientoManager tipo="maquinaria" onBack={() => setActiveSubmodule(null)} />;

  // FIX: soporta tanto mod.permission (string, la mayoría de módulos) como
  // mod.permissions (array, ej. Proveedores) usando hasAnyPermission.
  const canAccess = (mod) => {
    if (!mod || mod.building) return false;
    if (isAdmin || isGerencia) return true;
    if (mod.reporteTipo) return misTiposReporte.includes(mod.reporteTipo);
    if (mod.permissions) return hasAnyPermission(mod.permissions);
    return hasPermission(mod.permission);
  };
  // Se muestra si se puede abrir o si está en construcción (visible para todos)
  const isVisible = (mod) => !!mod && (mod.building || canAccess(mod));
  // Un grupo aparece si tiene al menos un submódulo visible
  const groupChildren = (g) => g.children.map(id => SUB_BY_ID[id]).filter(isVisible);

  const renderCard = (mod, i) => (
    <FuturisticCard
      key={mod.id}
      title={mod.name}
      description={mod.description}
      icon={mod.icon}
      color={mod.color}
      gradient={mod.gradient}
      badge={mod.badge}
      delay={i * 0.06}
      building={mod.building}
      alerta={mod.reporteTipo ? nuevosPorTipo[mod.reporteTipo] : 0}
      hasConfig={mod.hasConfig && hasPermission(String(mod.permission).replace(/:view$/, ':manage'))}
      onConfig={() => setConfigModal({ surveyCode: mod.surveyCode, surveyName: mod.surveyName })}
      onClick={() => setActiveSubmodule(mod.id)}
    />
  );

  const group = activeGroup ? GROUP_BY_ID[activeGroup] : null;

  // Tarjetas a mostrar: dentro de un grupo → sus hijos; si no → TOP_LEVEL
  const cards = group
    ? groupChildren(group).map(renderCard)
    : TOP_LEVEL.map((id, i) => {
        const g = GROUP_BY_ID[id];
        if (g) {
          const hijos = groupChildren(g);
          if (!hijos.length) return null;
          return (
            <FuturisticCard
              key={g.id}
              title={g.name}
              description={g.description}
              icon={g.icon}
              color={g.color}
              gradient={g.gradient}
              badge={`${hijos.length} submódulo${hijos.length === 1 ? '' : 's'}`}
              isGroup
              count={hijos.length}
              delay={i * 0.06}
              onClick={() => setActiveGroup(g.id)}
            />
          );
        }
        const mod = SUB_BY_ID[id];
        return isVisible(mod) ? renderCard(mod, i) : null;
      }).filter(Boolean);

  return (
    <div className="space-y-6">
      <ModuleHero
        title={group ? group.name : 'Mejoramiento Continuo'}
        subtitle={group ? `Mejoramiento Continuo · ${group.description}` : 'Gestión integral de calidad, indicadores y mejoramiento'}
        icon={group ? group.icon : TrendingUp}
        color="#6dbd96"
      />

      {group && (
        <button type="button" onClick={() => setActiveGroup(null)}
          className="flex items-center gap-2 text-sm font-medium rounded-md px-2 py-1 hover:bg-gray-100"
          style={{ color: '#2e5244', marginTop: -12, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft className="h-4 w-4" /> Mejoramiento Continuo
        </button>
      )}

      <div className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#6dbd96] rounded-full blur-3xl opacity-10" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#2e5244] rounded-full blur-3xl opacity-10" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#6f7b2c] rounded-full blur-3xl opacity-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards}
        </div>
      </div>

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