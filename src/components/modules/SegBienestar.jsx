import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Shield,
  AlertTriangle,
  ClipboardCheck,
  Activity,
  Users,
  Plus,
  Eye,
  FileText,
  Heart,
  HardHat
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import ModuleHero from '@/components/ModuleHero';

const MOCK_INSPECCIONES = [
  { id: 1, type: 'Condiciones de Seguridad', area: 'Planta Producción', date: '2026-01-12', status: 'Completada', findings: 2, responsible: 'Coordinador SST' },
  { id: 2, type: 'EPP', area: 'Área de Corte', date: '2026-01-10', status: 'Completada', findings: 0, responsible: 'Coordinador SST' },
  { id: 3, type: 'Orden y Aseo', area: 'Bodega', date: '2026-01-15', status: 'Programada', findings: 0, responsible: 'Coordinador SST' },
];

const MOCK_INCIDENTES = [
  { id: 1, description: 'Corte menor en mano', severity: 'Leve', area: 'Producción', date: '2026-01-08', status: 'Cerrado' },
  { id: 2, description: 'Caída a nivel', severity: 'Moderado', area: 'Bodega', date: '2026-01-05', status: 'En Investigación' },
];

const MOCK_CAPACITACIONES = [
  { id: 1, topic: 'Manejo de Residuos', participants: 25, date: '2026-01-20', status: 'Programada', duration: '2 horas' },
  { id: 2, topic: 'Prevención de Riesgos', participants: 30, date: '2025-12-15', status: 'Realizada', duration: '3 horas' },
  { id: 3, topic: 'Primeros Auxilios', participants: 20, date: '2026-02-05', status: 'Programada', duration: '4 horas' },
];

const MOCK_PROFESIOGRAMAS = [
  { id: 1, cargo: 'Operaria de Confección', riesgos: ['Postural', 'Repetitivo', 'Ruido'], examenes: 3, vigencia: '2026-12-31' },
  { id: 2, cargo: 'Cortador', riesgos: ['Mecánico', 'Postural'], examenes: 4, vigencia: '2026-12-31' },
  { id: 3, cargo: 'Supervisor de Producción', riesgos: ['Estrés', 'Ruido'], examenes: 2, vigencia: '2026-12-31' },
];

export default function SegBienestar() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('segBienestar', 'write');

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Alto':
      case 'Grave':
        return '#d4183d';
      case 'Moderado':
        return '#6f7b2c';
      default:
        return '#6dbd96';
    }
  };

  return (
    <div className="space-y-0">
      {/* ── Hero del módulo ── */}
      <ModuleHero
        title="SST y Bienestar"
        subtitle="Gestión de Seguridad, Salud en el Trabajo e inspecciones"
        icon={Shield}
        color="#6dbd96"
      />

      <div className="space-y-6">
      {/* Botón acción */}
      {canWrite && (
        <div className="flex justify-end">
          <Button style={{ backgroundColor: '#2e5244' }} className="text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Inspección
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Inspecciones Mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl" style={{ color: '#2e5244' }}>18</p>
              <ClipboardCheck className="h-8 w-8" style={{ color: '#6dbd96' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#6f7b2c' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Incidentes Año</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl" style={{ color: '#2e5244' }}>5</p>
              <AlertTriangle className="h-8 w-8" style={{ color: '#6f7b2c' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#2e5244' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Capacitaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl" style={{ color: '#2e5244' }}>12</p>
              <Users className="h-8 w-8" style={{ color: '#2e5244' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Días sin Accidentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl" style={{ color: '#2e5244' }}>127</p>
              <Shield className="h-8 w-8" style={{ color: '#6dbd96' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inspecciones" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-4">
          <TabsTrigger value="inspecciones">Inspecciones</TabsTrigger>
          <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
          <TabsTrigger value="capacitaciones">Capacitaciones</TabsTrigger>
          <TabsTrigger value="profesiogramas">Profesiogramas</TabsTrigger>
        </TabsList>

        {/* Inspecciones */}
        <TabsContent value="inspecciones">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Inspecciones SST</CardTitle>
              <CardDescription>Registro y seguimiento de inspecciones de seguridad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_INSPECCIONES.map((insp) => (
                <div 
                  key={insp.id}
                  className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow"
                  style={{ borderColor: '#dedecc' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#6dbd9620' }}
                      >
                        <HardHat className="h-6 w-6" style={{ color: '#6dbd96' }} />
                      </div>
                      <div>
                        <h4 style={{ color: '#2e5244' }}>{insp.type}</h4>
                        <p className="text-sm text-gray-600">
                          {insp.area} • {insp.responsible}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      style={{ 
                        backgroundColor: insp.status === 'Completada' ? '#6dbd96' : '#6f7b2c' 
                      }} 
                      className="text-white"
                    >
                      {insp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">Fecha: {insp.date}</span>
                      {insp.findings > 0 && (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          {insp.findings} hallazgos
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidentes */}
        <TabsContent value="incidentes">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Incidentes y Accidentes</CardTitle>
              <CardDescription>Registro e investigación de incidentes laborales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: '#dedecc' }}>
                      <th className="text-left p-3 text-sm" style={{ color: '#2e5244' }}>Descripción</th>
                      <th className="text-left p-3 text-sm" style={{ color: '#2e5244' }}>Severidad</th>
                      <th className="text-left p-3 text-sm" style={{ color: '#2e5244' }}>Área</th>
                      <th className="text-left p-3 text-sm" style={{ color: '#2e5244' }}>Fecha</th>
                      <th className="text-left p-3 text-sm" style={{ color: '#2e5244' }}>Estado</th>
                      <th className="text-right p-3 text-sm" style={{ color: '#2e5244' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_INCIDENTES.map((inc) => (
                      <tr key={inc.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#dedecc' }}>
                        <td className="p-3">
                          <span className="text-sm" style={{ color: '#2e5244' }}>{inc.description}</span>
                        </td>
                        <td className="p-3">
                          <Badge style={{ backgroundColor: getSeverityColor(inc.severity) }} className="text-white">
                            {inc.severity}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600">{inc.area}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600">{inc.date}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{inc.status}</Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacitaciones */}
        <TabsContent value="capacitaciones">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Capacitaciones</CardTitle>
              <CardDescription>Programación y registro de capacitaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_CAPACITACIONES.map((cap) => (
                <div 
                  key={cap.id}
                  className="flex items-center justify-between p-4 border-2 rounded-lg"
                  style={{ borderColor: '#dedecc' }}
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#6dbd9620' }}
                    >
                      <Activity className="h-6 w-6" style={{ color: '#6dbd96' }} />
                    </div>
                    <div>
                      <h4 style={{ color: '#2e5244' }}>{cap.topic}</h4>
                      <p className="text-sm text-gray-600">
                        {cap.participants} participantes • {cap.duration} • {cap.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      style={{ 
                        backgroundColor: cap.status === 'Realizada' ? '#6dbd96' : '#6f7b2c' 
                      }} 
                      className="text-white"
                    >
                      {cap.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profesiogramas */}
        <TabsContent value="profesiogramas">
          <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
            <CardHeader>
              <CardTitle style={{ color: '#2e5244' }}>Profesiogramas</CardTitle>
              <CardDescription>Matriz de riesgos por cargo y exámenes médicos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_PROFESIOGRAMAS.map((prof) => (
                <div 
                  key={prof.id}
                  className="p-4 border-2 rounded-lg"
                  style={{ borderColor: '#dedecc' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#6dbd9620' }}
                      >
                        <Heart className="h-6 w-6" style={{ color: '#6dbd96' }} />
                      </div>
                      <div>
                        <h4 style={{ color: '#2e5244' }}>{prof.cargo}</h4>
                        <p className="text-sm text-gray-600">
                          {prof.examenes} exámenes requeridos • Vigencia: {prof.vigencia}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#dedecc', color: '#2e5244' }}>
                      Riesgos:
                    </span>
                    {prof.riesgos.map((riesgo, index) => (
                      <Badge key={index} variant="outline" style={{ borderColor: '#6dbd96', color: '#2e5244' }}>
                        {riesgo}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div> {/* cierra p-6 */}
    </div>   
  );
}