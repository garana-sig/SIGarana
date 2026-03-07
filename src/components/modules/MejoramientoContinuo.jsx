// src/components/modules/MejoramientoContinuo/MejoramientoContinuo.jsx
import { useState } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  FileBarChart,
  TrendingUp,
  Scale,
  Search,
  Users,
  BarChart3,
  AlertCircle,
  Smile,
  Award,
  HelpCircle,
  Settings,
} from 'lucide-react';

// ── Submódulos implementados ──────────────────────────────────────────────────
import ActasManager                from './MejoramientoContinuo/Actas/ActasManager';
import AccionesMejoraManager       from './MejoramientoContinuo/AccionesMejora/AccionesMejoraManager';
import IndicadoresManager          from './MejoramientoContinuo/Indicadores/IndicadoresManager';
import RiskMatrixManager           from './MejoramientoContinuo/RiskMatrix/RiskMatrixManager';
import SatisfaccionClientesManager from './MejoramientoContinuo/SatisfaccionClientes/SatisfaccionClientesManager';
import ClimaLaboralManager         from './MejoramientoContinuo/ClimaLaboral/ClimaLaboralManager';
import SurveyConfigModal           from './MejoramientoContinuo/SurveyConfigModal';

// ── Definición de submódulos ──────────────────────────────────────────────────
const SUBMODULES = [
  {
    id: 'actas',
    name: 'Actas',
    description: 'Actas de reunión',
    icon: FileText,
    color: '#2e5244',
    count: 12,
    enabled: true,
  },
  {
    id: 'acciones_mejora',
    name: 'Acciones de Mejora',
    description: 'Seguimiento de acciones correctivas',
    icon: CheckCircle2,
    color: '#6dbd96',
    count: 23,
    enabled: true,
  },
  {
    id: 'indicadores',
    name: 'Indicadores',
    description: 'Matriz de indicadores',
    icon: TrendingUp,
    color: '#6f7b2c',
    count: 15,
    enabled: true,
  },
  {
    id: 'matriz_riesgos',
    name: 'Matriz de Riesgos',
    description: 'Riesgos de procesos',
    icon: BarChart3,
    color: '#2e5244',
    count: 18,
    enabled: true,
  },
  {
    id: 'satisfaccion_clientes',
    name: 'Satisfacción de Clientes',
    description: 'Encuestas y seguimiento',
    icon: Award,
    color: '#2e5244',
    count: 34,
    enabled: true,
    hasConfig: true,
    surveyCode: 'customer_satisfaction',
    surveyName: 'Satisfacción del Cliente',
  },
  {
    id: 'clima_laboral',
    name: 'Clima Laboral',
    description: 'Evaluación de clima organizacional',
    icon: Smile,
    color: '#6f7b2c',
    count: 1,
    enabled: true,
    hasConfig: true,
    surveyCode: 'work_climate',
    surveyName: 'Clima Laboral',
  },
  {
    id: 'producto_no_conforme',
    name: 'Producto No Conforme',
    description: 'Gestión de no conformidades',
    icon: AlertTriangle,
    color: '#6f7b2c',
    count: 5,
    enabled: false,
  },
  {
    id: 'revision_direccion',
    name: 'Revisión por la Dirección',
    description: 'Revisiones gerenciales',
    icon: ClipboardCheck,
    color: '#2e5244',
    count: 3,
    enabled: false,
  },
  {
    id: 'informes',
    name: 'Informes',
    description: 'Informes y reportes',
    icon: FileBarChart,
    color: '#6dbd96',
    count: 8,
    enabled: false,
  },
  {
    id: 'requisitos_legales',
    name: 'Requisitos Legales',
    description: 'Matriz de requisitos',
    icon: Scale,
    color: '#2e5244',
    count: 27,
    enabled: false,
  },
  {
    id: 'auditorias',
    name: 'Auditorías',
    description: 'Plan, programa y hallazgos',
    icon: Search,
    color: '#6dbd96',
    count: 6,
    enabled: false,
  },
  {
    id: 'evaluacion_auditores',
    name: 'Evaluación de Auditores',
    description: 'Competencias de auditores',
    icon: Users,
    color: '#6f7b2c',
    count: 4,
    enabled: false,
  },
  {
    id: 'reporte_incidentes',
    name: 'Reporte de Incidentes',
    description: 'Incidentes y eventos',
    icon: AlertCircle,
    color: '#6dbd96',
    count: 9,
    enabled: false,
  },
  {
    id: 'evaluacion_competencias',
    name: 'Evaluación de Competencias',
    description: 'Competencias del personal',
    icon: Users,
    color: '#6dbd96',
    count: 28,
    enabled: false,
  },
  {
    id: 'qrsf',
    name: 'QRSF',
    description: 'Quejas, reclamos, sugerencias',
    icon: HelpCircle,
    color: '#6f7b2c',
    count: 7,
    enabled: false,
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function MejoramientoContinuo() {
  const [activeSubmodule, setActiveSubmodule] = useState(null);
  const [configModal, setConfigModal]         = useState(null);

  // ── Submódulo activo ──────────────────────────────────────────────────────
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

  // ── Dashboard principal ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      <ModuleHero
        title="Mejoramiento Continuo"
        subtitle="Gestión integral de mejoramiento y calidad"
        icon={TrendingUp}
        color="#6dbd96"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SUBMODULES.map((submodule) => {
          const Icon = submodule.icon;
          return (
            <Card
              key={submodule.id}
              className={`border-2 transition-all ${
                submodule.enabled
                  ? 'hover:shadow-lg hover:scale-105 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ borderColor: submodule.enabled ? submodule.color : '#ccc' }}
              onClick={() => { if (submodule.enabled) setActiveSubmodule(submodule.id); }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: submodule.enabled ? `${submodule.color}20` : '#f0f0f0' }}
                  >
                    <Icon
                      className="h-6 w-6"
                      style={{ color: submodule.enabled ? submodule.color : '#999' }}
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {submodule.enabled && submodule.hasConfig && (
                      <button
                        title="Configurar períodos y preguntas"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 4, borderRadius: 6, color: '#aaa',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfigModal({
                            surveyCode: submodule.surveyCode,
                            surveyName: submodule.surveyName,
                          });
                        }}
                      >
                        <Settings size={14} />
                      </button>
                    )}
                    {submodule.enabled ? (
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: `${submodule.color}20`, color: submodule.color }}
                      >
                        {submodule.count}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Próximamente</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <h3 className="font-semibold text-sm mb-1"
                  style={{ color: submodule.enabled ? submodule.color : '#999' }}>
                  {submodule.name}
                </h3>
                <p className="text-xs text-gray-500">{submodule.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estadísticas rápidas */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader>
          <CardTitle style={{ color: '#2e5244' }}>Resumen General</CardTitle>
          <CardDescription>Estadísticas del módulo de mejoramiento continuo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#2e524410' }}>
              <div className="text-2xl font-bold" style={{ color: '#2e5244' }}>
                {SUBMODULES.reduce((sum, m) => sum + m.count, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Registros</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#6dbd9610' }}>
              <div className="text-2xl font-bold" style={{ color: '#6dbd96' }}>
                {SUBMODULES.filter(m => m.enabled).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Submódulos Activos</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#6f7b2c10' }}>
              <div className="text-2xl font-bold" style={{ color: '#6f7b2c' }}>
                {SUBMODULES.filter(m => !m.enabled).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">En Desarrollo</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#2e524410' }}>
              <div className="text-2xl font-bold" style={{ color: '#2e5244' }}>85%</div>
              <div className="text-xs text-gray-600 mt-1">Cumplimiento</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal configuración encuestas */}
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