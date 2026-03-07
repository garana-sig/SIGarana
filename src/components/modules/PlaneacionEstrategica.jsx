import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import ModuleHero from '@/components/ModuleHero';
import { 
  Target, 
  TrendingUp,
  Map,
  FileText,
  BarChart3,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

const MOCK_OBJECTIVES = [
  { id: 1, name: 'Incrementar participación de mercado', area: 'Comercial', progress: 75, status: 'En Progreso', responsible: 'Área Comercial', deadline: '2026-06-30' },
  { id: 2, name: 'Reducir tiempos de producción', area: 'Operaciones', progress: 60, status: 'En Progreso', responsible: 'Área Producción', deadline: '2026-03-31' },
  { id: 3, name: 'Mejorar satisfacción del cliente', area: 'Calidad', progress: 85, status: 'En Progreso', responsible: 'Área Calidad', deadline: '2026-12-31' },
  { id: 4, name: 'Optimizar gestión de inventarios', area: 'Logística', progress: 40, status: 'Atrasado', responsible: 'Área Logística', deadline: '2026-04-30' },
];

const PERSPECTIVES = [
  { name: 'Financiera', objectives: 3, color: '#2e5244' },
  { name: 'Clientes', objectives: 4, color: '#6dbd96' },
  { name: 'Procesos', objectives: 5, color: '#6f7b2c' },
  { name: 'Aprendizaje', objectives: 2, color: '#2e5244' },
];

const POLICIES = [
  { id: 1, name: 'Política de Calidad', version: '2.0', status: 'Vigente', date: '2026-01-01' },
  { id: 2, name: 'Política Ambiental', version: '1.5', status: 'Vigente', date: '2025-12-15' },
  { id: 3, name: 'Política de SST', version: '3.0', status: 'Vigente', date: '2026-01-10' },
];

export default function PlaneacionEstrategica() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('planeacionEstrategica', 'write');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completado':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'En Progreso':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Atrasado':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        title="Planeación Estratégica"
        subtitle="Gestión de objetivos, políticas y cuadro de mando integral"
        icon={Target}
        color="#6f7b2c"
      />
      <div className="px-2">
      {/* Perspectives Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PERSPECTIVES.map((perspective, index) => (
          <Card key={index} className="border-2" style={{ borderColor: perspective.color }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Target className="h-5 w-5" style={{ color: perspective.color }} />
                <Badge variant="secondary">{perspective.objectives}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm" style={{ color: perspective.color }}>{perspective.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="objectives" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="objectives">Objetivos</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="bsc">Cuadro de Mando</TabsTrigger>
        </TabsList>

        {/* Strategic Objectives */}
        <TabsContent value="objectives" className="space-y-4">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Objetivos Estratégicos</CardTitle>
              <CardDescription>Seguimiento y control de objetivos institucionales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MOCK_OBJECTIVES.map((objective) => (
                <div 
                  key={objective.id}
                  className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow"
                  style={{ borderColor: '#dedecc' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 style={{ color: '#2e5244' }}>{objective.name}</h4>
                        {getStatusIcon(objective.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {objective.responsible} • Plazo: {objective.deadline}
                      </p>
                    </div>
                    <Badge style={{ backgroundColor: '#6dbd96' }} className="text-white">
                      {objective.area}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: '#6f7b2c' }}>Progreso</span>
                      <span style={{ color: '#2e5244' }}>{objective.progress}%</span>
                    </div>
                    <Progress value={objective.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <Button size="sm" variant="outline" style={{ borderColor: '#6dbd96' }}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalle
                    </Button>
                    {canWrite && (
                      <Button size="sm" style={{ backgroundColor: '#2e5244' }} className="text-white">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Actualizar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Políticas Organizacionales</CardTitle>
              <CardDescription>Políticas y directrices institucionales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {POLICIES.map((policy) => (
                  <div 
                    key={policy.id}
                    className="flex items-center justify-between p-4 border-2 rounded-lg"
                    style={{ borderColor: '#dedecc' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#6dbd9620' }}
                      >
                        <FileText className="h-5 w-5" style={{ color: '#6dbd96' }} />
                      </div>
                      <div>
                        <h4 style={{ color: '#2e5244' }}>{policy.name}</h4>
                        <p className="text-sm text-gray-600">
                          Versión {policy.version} • {policy.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge style={{ backgroundColor: '#6dbd96' }} className="text-white">
                        {policy.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balanced Scorecard */}
        <TabsContent value="bsc">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Cuadro de Mando Integral</CardTitle>
              <CardDescription>Balanced Scorecard - Indicadores por perspectiva</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PERSPECTIVES.map((perspective, index) => (
                  <div 
                    key={index}
                    className="p-6 border-2 rounded-lg"
                    style={{ borderColor: perspective.color }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${perspective.color}20` }}
                      >
                        <BarChart3 className="h-6 w-6" style={{ color: perspective.color }} />
                      </div>
                      <div>
                        <h4 style={{ color: perspective.color }}>{perspective.name}</h4>
                        <p className="text-sm text-gray-600">{perspective.objectives} objetivos</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cumplimiento</span>
                        <span style={{ color: perspective.color }}>
                          {Math.floor(Math.random() * 30 + 60)}%
                        </span>
                      </div>
                      <Progress value={Math.floor(Math.random() * 30 + 60)} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div> {/* /px-2 */}
    </div>
  );
}