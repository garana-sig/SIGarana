// src/App.tsx
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/components/Login';
import Layout from '@/components/Layout';
import Home from '@/components/modules/Home';
import GestionDocumental from '@/components/modules/GestionDocumental';
import PlaneacionEstrategica from '@/components/modules/PlaneacionEstrategica';
import MejoramientoContinuo from '@/components/modules/MejoramientoContinuo';
import SegBienestar from '@/components/modules/SegBienestar';
import GestionUsuarios from '@/components/modules/GestionUsuarios';
import Manuales from '@/components/modules/Manuales';
import Politicas from '@/components/modules/Politicas';
import PlanesProgramas from '@/components/modules/PlanesProgramas';

// ── Páginas públicas ──────────────────────────────────────────────────────────
import HomePublico               from '../pages/HomePublico';
import EncuestaSatisfaccionCliente from '../pages/EncuestaSatisfaccionCliente';
import EncuestaClimaLaboral      from '../pages/EncuestaClimaLaboral';
import ResetPassword from '../pages/ResetPassword';

// ─── Rutas 100% públicas (nunca requieren login) ───────────────────────────────
// Lazy: no instanciar JSX hasta que se necesite (evita compartir estado entre rutas)
const PUBLIC_ROUTES: Record<string, () => JSX.Element> = {
  '/':                              () => <HomePublico />,
  '/encuesta/satisfaccion-cliente': () => <EncuestaSatisfaccionCliente />,
  '/encuesta/clima-laboral':        () => <EncuestaClimaLaboral />,
  '/reset-password': () => <ResetPassword />,
};

// ─── Contenido autenticado ────────────────────────────────────────────────────
// ─── Permiso de entrada de cada módulo (v3 permisos, oct 2026) ─────────────────
// El menú lateral ya los oculta; esto evita entrar por otro camino (notificaciones, enlaces).
const ENTRADA_MODULO: Record<string, string> = {
  gestionDocumental:     'gestion_documental:view',
  planeacionEstrategica: 'cmi:view',
  mejoramientoContinuo:  'auditorias:view',
  segBienestar:          'sst_bienestar:view',
};

function SinAcceso() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <p style={{ fontSize: 40, margin: 0 }}>🔒</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#2e5244' }}>Sin acceso a este módulo</p>
        <p style={{ fontSize: 13 }}>Pídele al administrador que te asigne el permiso.</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, hasPermission, isAdmin, isGerencia } = useAuth();
  const [currentModule, setCurrentModule] = useState('home');
  // Parámetros de navegación entre módulos (ej. Planes y Programas → SST › plan)
  const [navParams, setNavParams] = useState<Record<string, any> | null>(null);
  const navigate = (module: string, params: Record<string, any> | null = null) => {
    setNavParams(params);
    setCurrentModule(module);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ backgroundColor: '#1a2e25' }}
      >
        <img
          src="/garana1.png"
          alt="Garana Art"
          style={{
            height: 140,
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            opacity: 0.95,
          }}
        />
        <div
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            border: '3px solid rgba(109,189,150,0.2)',
            borderTopColor: '#6dbd96',
            animation: 'spin 0.9s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Sin sesión → Login
  if (!user) return <Login />;

  const renderModule = () => {
    const entrada = ENTRADA_MODULO[currentModule];
    if (entrada && !hasPermission(entrada)) return <SinAcceso />;
    if (currentModule === 'usuarios' && !(isAdmin || isGerencia)) return <SinAcceso />;
    switch (currentModule) {
      case 'home':                  return <Home onModuleChange={navigate} />;
      case 'gestionDocumental':     return <GestionDocumental />;
      case 'planeacionEstrategica': return <PlaneacionEstrategica />;
      case 'mejoramientoContinuo':  return <MejoramientoContinuo />;
      case 'segBienestar':          return <SegBienestar key={navParams?.plan || 'sst'} initialPlan={navParams?.plan} />;
      case 'usuarios':              return <GestionUsuarios />;
      // Accesos rápidos desde Home (solo consulta)
      case 'manuales':              return <Manuales />;
      case 'planesProgramas':       return <PlanesProgramas onNavigate={navigate} />;
      case 'politicas':             return <Politicas />;
      default:                      return <Home onModuleChange={navigate} />;
    }
  };

  return (
    <Layout currentModule={currentModule} onModuleChange={(m: string) => navigate(m)}>
      {renderModule()}
    </Layout>
  );
}

// ─── App raíz ─────────────────────────────────────────────────────────────────
export default function App() {
  const path = window.location.pathname;

  // 1. Ruta pública exacta → renderizar sin AuthProvider
  if (PUBLIC_ROUTES[path]) return PUBLIC_ROUTES[path]();

  // 2. /app o cualquier otra ruta → flujo autenticado
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}