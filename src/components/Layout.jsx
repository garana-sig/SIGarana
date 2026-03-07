// src/components/layout/Layout.jsx - VERSIÓN CON :view AUTOMÁTICOS
// ✅ Sidebar colapsable solo con módulos
// ✅ Navbar con info de usuario + cerrar sesión
// ✅ Espacios optimizados
// ✅ CORREGIDO: Usa hasPermission() para permisos :view automáticos

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import NotificationBell from '../components/Layout/NotificationBell';
import { 
  FileText, 
  Target, 
  TrendingUp, 
  Shield, 
  Users, 
  Home,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Package,
  UserCircle
} from 'lucide-react';

// ✅ Módulos del sistema
const MODULES = [
  { 
    id: 'home', 
    name: 'Inicio', 
    icon: Home, 
    color: '#2e5244', 
    permission: null 
  },
  { 
    id: 'gestionDocumental', 
    name: 'Gestión Documental', 
    icon: FileText, 
    color: '#6dbd96', 
    permission: 'gestion_documental:view' 
  },
  { 
    id: 'planeacionEstrategica', 
    name: 'Planeación Estratégica', 
    icon: Target, 
    color: '#6f7b2c', 
    permission: 'cmi:view' 
  },
  { 
    id: 'mejoramientoContinuo', 
    name: 'Mejoramiento Continuo', 
    icon: TrendingUp, 
    color: '#2e5244', 
    permission: 'auditorias:view' 
  },
  { 
    id: 'segBienestar', 
    name: 'SST y Bienestar', 
    icon: Shield, 
    color: '#6dbd96', 
    permission: 'sst_bienestar:view' 
  },
 
];

export default function Layout({ children, currentModule, onModuleChange }) {
  // ✅ AGREGADO: hasPermission
  const { user, profile, permissions, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop
  // ✅ resetKey: clic en módulo activo → remount → vuelve al dashboard del módulo
  const [resetKey, setResetKey] = useState(0);

  const handleModuleClick = (moduleId) => {
    if (moduleId === currentModule) {
      setResetKey(k => k + 1);
    }
    onModuleChange(moduleId);
    setSidebarOpen(false);
  };

  // ✅ CORREGIDO: Usar hasPermission() para permisos :view automáticos
  const canAccessModule = (module) => {
    if (module.permission === null) return true;
    return hasPermission(module.permission);
  };

  // Verificar si es admin
  const isAdmin = profile?.role === 'admin';

  // Nombre corto para mostrar
  const displayName = profile?.full_name?.split(' ')[0] || 
                      user?.email?.split('@')[0] || 
                      'Usuario';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#dedecc' }}>
      {/* ============================================
          SIDEBAR - SOLO MÓDULOS
      ============================================ */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
        style={{ backgroundColor: '#2e5244' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div 
            className={`
              p-4 border-b flex items-center justify-between
              ${sidebarCollapsed ? 'lg:justify-center' : ''}
            `}
            style={{ borderColor: '#6dbd96' }}
          >
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#6dbd96' }}
                >
                  <span className="font-bold text-white text-base">SIG</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-white text-sm font-semibold">SIGarana</h2>
                  <p className="text-xs truncate" style={{ color: '#6dbd96' }}>
                    Sistema Integrado
                  </p>
                </div>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#6dbd96' }}
              >
                <span className="font-bold text-white text-base">SIG</span>
              </div>
            )}

            {/* Botón colapsar - Solo desktop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-white hover:bg-white/10 flex-shrink-0"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {MODULES.map((module) => {
              if (!canAccessModule(module)) return null;
              
              const Icon = module.icon;
              const isActive = currentModule === module.id;
              
              return (
                <button
                  key={module.id}
                  onClick={() => handleModuleClick(module.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                    transition-all group relative
                    ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}
                    ${sidebarCollapsed ? 'lg:justify-center' : ''}
                  `}
                  title={sidebarCollapsed ? module.name : ''}
                >
                  <Icon className="h-5 w-5 text-white flex-shrink-0" />
                  
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left text-white text-sm">
                        {module.name}
                      </span>
                      {isActive && <ChevronRight className="h-4 w-4 text-white" />}
                    </>
                  )}

                  {/* Tooltip cuando está colapsado */}
                  {sidebarCollapsed && (
                    <div className="
                      absolute left-full ml-2 px-3 py-1.5 
                      bg-gray-900 text-white text-sm rounded-lg 
                      whitespace-nowrap opacity-0 group-hover:opacity-100 
                      pointer-events-none transition-opacity z-50
                    ">
                      {module.name}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Gestión de Usuarios (solo admin) */}
            {isAdmin && (
              <button
                onClick={() => handleModuleClick('usuarios')}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                  transition-all group relative
                  ${currentModule === 'usuarios' ? 'bg-white/20' : 'hover:bg-white/10'}
                  ${sidebarCollapsed ? 'lg:justify-center' : ''}
                `}
                title={sidebarCollapsed ? 'Gestión de Usuarios' : ''}
              >
                <Users className="h-5 w-5 text-white flex-shrink-0" />
                
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left text-white text-sm">
                      Gestión de Usuarios
                    </span>
                    {currentModule === 'usuarios' && (
                      <ChevronRight className="h-4 w-4 text-white" />
                    )}
                  </>
                )}

                {/* Tooltip cuando está colapsado */}
                {sidebarCollapsed && (
                  <div className="
                    absolute left-full ml-2 px-3 py-1.5 
                    bg-gray-900 text-white text-sm rounded-lg 
                    whitespace-nowrap opacity-0 group-hover:opacity-100 
                    pointer-events-none transition-opacity z-50
                  ">
                    Gestión de Usuarios
                  </div>
                )}
              </button>
            )}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============================================
          MAIN CONTENT
      ============================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ============================================
            NAVBAR - INFO DE USUARIO
        ============================================ */}
        <header 
          className="bg-white shadow-sm border-b sticky top-0 z-30" 
          style={{ borderColor: '#6dbd96' }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            {/* Left: Menu mobile + Module name */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden flex-shrink-0"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate" style={{ color: '#2e5244' }}>
                  {MODULES.find(m => m.id === currentModule)?.name || 
                   (currentModule === 'usuarios' ? 'Gestión de Usuarios' : 'Inicio')}
                </h1>
                <p className="text-xs truncate" style={{ color: '#6f7b2c' }}>
                  {profile?.department?.name || 'Sistema Integrado de Gestión'}
                </p>
              </div>
            </div>
            
            {/* Right: Notificaciones + Usuario + Logout */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Campana de notificaciones */}
              <NotificationBell onNavigate={onModuleChange} />
              
              {/* Info de usuario */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                <UserCircle className="h-5 w-5" style={{ color: '#2e5244' }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#2e5244' }}>
                    Bienvenido, {displayName}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#6f7b2c' }}>
                    {profile?.role === 'admin' ? 'Administrador' : 
                     profile?.role === 'gerencia' ? 'Gerencia' : 'Usuario'}
                  </p>
                </div>
              </div>

              {/* Botón cerrar sesión */}
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </header>

        {/* ============================================
            CONTENT - PADDING REDUCIDO
        ============================================ */}
        <main key={`${currentModule}-${resetKey}`} className="flex-1 overflow-auto">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}