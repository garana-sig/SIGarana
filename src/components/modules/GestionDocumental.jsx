// src/components/modules/GestionDocumental.jsx
// ✅ VERSIÓN FINAL - Dashboard futurista + todos los submódulos

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { motion } from 'framer-motion';
import ModuleHero from '@/components/ModuleHero';
import ListadoMaestro from './GestionDocumental/ListadoMaestro';
import FormularioCreacion from './GestionDocumental/FormularioCreacion';
import PorArea from './GestionDocumental/PorArea';
import Procedimientos from './GestionDocumental/Procedimientos';
import Formatos from './GestionDocumental/Formatos';
import { 
  FileText, 
  FolderOpen,
  Building2,
  FileStack,
  ArrowLeft,
  Plus,
  CheckSquare,
  ClipboardList,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function GestionDocumental() {
  const { hasPermission, isAdmin, isGerencia } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [lastCreatedDocument, setLastCreatedDocument] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoadingData(true);
      
      const { data: types, error: typesError } = await supabase
        .from('document_type')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (typesError) throw typesError;
      setDocumentTypes(types || []);

      const { data: procs, error: procsError } = await supabase
        .from('process')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (procsError) throw procsError;
      setProcesses(procs || []);

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // ── Permisos ─────────────────────────────────────────────────────
  const canView         = isAdmin || isGerencia || hasPermission('gestion_documental:view');
  const canCreate       = isAdmin || isGerencia || hasPermission('gestion_documental:formatos:create');
  const canViewListado  = isAdmin || isGerencia || hasPermission('gestion_documental:listado_maestro:view');
  const canViewAreas    = isAdmin || isGerencia || hasPermission('gestion_documental:areas:view');
  const canViewFormatos = isAdmin || isGerencia || hasPermission('gestion_documental:formatos:view');
  const canViewProcs    = isAdmin || isGerencia || hasPermission('gestion_documental:procedimientos:view');

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-2 border-red-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium mb-2">Acceso Denegado</h3>
            <p className="text-sm text-gray-600">
              No tienes permisos para acceder a la Gestión Documental.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCardClick = (view) => {
    setActiveView(view);
  };

  const handleBack = () => {
    setShowSuccessMessage(false);
    setLastCreatedDocument(null);
    setActiveView('dashboard');
  };

  const handleCreateSuccess = (document) => {
    setLastCreatedDocument(document);
    setShowSuccessMessage(true);
    
    setTimeout(() => {
      setShowSuccessMessage(false);
      setActiveView('listado');
    }, 3000);
  };

  const handleCreateCancel = () => {
    setActiveView('dashboard');
  };

  // 🎨 Card Futurista
  const FuturisticCard = ({ title, description, icon: Icon, color, gradient, badge, onClick, delay }) => {
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
          {/* Gradiente de fondo */}
          <div 
            className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
            style={{ background: gradient }}
          />
          
          {/* Patrón decorativo */}
          <div className="absolute inset-0 opacity-5">
            <svg width="100%" height="100%">
              <pattern id={`pattern-${title}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill={color} />
              </pattern>
              <rect width="100%" height="100%" fill={`url(#pattern-${title})`} />
            </svg>
          </div>

          {/* Líneas decorativas animadas */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <CardContent className="relative p-4">{/* Icono con efecto glow */}
            <div className="relative mb-4">
              <motion.div
                className="absolute inset-0 blur-xl opacity-50"
                style={{ backgroundColor: color }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Icon 
                className="h-14 w-14 relative z-10"
                style={{ color }}
              />
            </div>

            {/* Título */}
            <h3 
              className="text-xl font-bold mb-2 group-hover:translate-x-1 transition-transform"
              style={{ color: '#2e5244' }}
            >
              {title}
            </h3>

            {/* Descripción */}
            <p className="text-sm text-gray-600 mb-4">
              {description}
            </p>

            {/* Badge */}
            <Badge 
              className="font-semibold text-xs"
              style={{ 
                backgroundColor: `${color}20`,
                color: color,
                border: `1px solid ${color}40`
              }}
            >
              {badge}
            </Badge>

            {/* Corner decoration */}
            <motion.div
              className="absolute bottom-0 right-0 w-20 h-20 opacity-10"
              style={{ 
                background: `radial-gradient(circle at bottom right, ${color}, transparent)`,
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </CardContent>

          {/* Borde brillante en hover */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ 
              border: `2px solid ${color}`,
              opacity: 0,
              borderRadius: '0.5rem',
            }}
            whileHover={{ opacity: 0.5 }}
            transition={{ duration: 0.3 }}
          />
        </Card>
      </motion.div>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="relative">
            {/* Background decorativo */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute top-20 left-10 w-72 h-72 bg-[#6dbd96] rounded-full blur-3xl opacity-10" />
              <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#2e5244] rounded-full blur-3xl opacity-10" />
              <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#6f7b2c] rounded-full blur-3xl opacity-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FuturisticCard
                title="Formatos"
                description="Plantillas y formatos del sistema organizados"
                icon={ClipboardList}
                color="#6dbd96"
                gradient="linear-gradient(135deg, #6dbd96 0%, #2e5244 100%)"
                badge="FO - GU - RE"
                onClick={() => handleCardClick('formatos')}
                delay={0}
              />

              {canViewListado && (
                <FuturisticCard
                  title="Listado Maestro"
                  description="Control total de documentos del sistema"
                  icon={FileStack}
                  color="#2e5244"
                  gradient="linear-gradient(135deg, #2e5244 0%, #6dbd96 100%)"
                  badge="Todos los documentos"
                  onClick={() => handleCardClick('listado')}
                  delay={0.1}
                />
              )}

              {canViewAreas && (
                <FuturisticCard
                  title="Por Área"
                  description="Navegación por procesos y departamentos"
                  icon={Building2}
                  color="#6f7b2c"
                  gradient="linear-gradient(135deg, #6f7b2c 0%, #6dbd96 100%)"
                  badge="7 Procesos activos"
                  onClick={() => handleCardClick('areas')}
                  delay={0.2}
                />
              )}

              <FuturisticCard
                title="Procedimientos"
                description="Procedimientos operativos organizados"
                icon={BookOpen}
                color="#d97706"
                gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
                badge="Tipo PR"
                onClick={() => handleCardClick('procedimientos')}
                delay={0.3}
              />

              {canCreate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="md:col-span-2 lg:col-span-1"
                >
                  <Card 
                    className="relative overflow-hidden border-2 border-dashed cursor-pointer hover:shadow-2xl transition-all group h-full"
                    style={{ borderColor: '#6dbd96' }}
                    onClick={() => handleCardClick('create')}
                  >
                    {/* Efecto de partículas */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 rounded-full"
                          style={{
                            backgroundColor: '#6dbd96',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>

                    <CardContent className="relative flex flex-col items-center justify-center p-6 h-full">
                      <motion.div
                        className="mb-4"
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      >
                        <div className="relative">
                          <motion.div
                            className="absolute inset-0 blur-2xl"
                            style={{ backgroundColor: '#6dbd96' }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                            }}
                          />
                          <Plus className="h-16 w-16 relative z-10" style={{ color: '#6dbd96' }} />
                        </div>
                      </motion.div>

                      <h3 className="text-2xl font-bold mb-2" style={{ color: '#2e5244' }}>
                        Crear Nuevo
                      </h3>
                      <p className="text-sm text-gray-600 text-center mb-3">
                        Agregar documento al sistema
                      </p>
                      <Badge style={{ backgroundColor: '#6dbd96', color: 'white' }}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Nuevo
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        );
      
      case 'formatos':
        return <Formatos />;
      
      case 'create':
        return (
          <div className="space-y-6">
            {showSuccessMessage && lastCreatedDocument && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-2" style={{ borderColor: '#6dbd96', backgroundColor: '#f0fdf4' }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckSquare className="h-6 w-6 flex-shrink-0" style={{ color: '#6dbd96' }} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-800 mb-1">
                          ¡Documento creado exitosamente!
                        </h4>
                        <p className="text-sm text-green-700">
                          <span className="font-medium">{lastCreatedDocument.name}</span> ha sido agregado al sistema.
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          Código generado: <span className="font-mono font-bold">{lastCreatedDocument.code}</span>
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          Redirigiendo al listado maestro...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            <FormularioCreacion 
              documentTypes={documentTypes}
              processes={processes}
              onSuccess={handleCreateSuccess}
              onCancel={handleCreateCancel}
            />
          </div>
        );
      
      case 'listado':
        return (
          <ListadoMaestro 
            onCreateNew={canCreate ? () => setActiveView('create') : null}
            onEdit={() => {}}
            onView={() => {}}
          />
        );
      
      case 'areas':
        return <PorArea />;
      
      case 'procedimientos':
        return <Procedimientos />;
      
      default:
        return null;
    }
  };

return (
  <div className="p-3 space-y-3">
    {/* Header: hero en dashboard, botón volver en subvistas */}
    {activeView !== 'dashboard' ? (
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-1"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Volver</span>
        </Button>
      </div>
    ) : (
      <ModuleHero
        title="Gestión Documental"
        subtitle="Sistema de control y gestión de documentos"
        icon={FileText}
        color="#6dbd96"
      />
    )}

    {/* Contenido dinámico */}
    {renderActiveView()}
  </div>
);
}