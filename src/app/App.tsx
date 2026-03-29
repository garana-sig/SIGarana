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
function AppContent() {
  const { user, loading } = useAuth();
  const [currentModule, setCurrentModule] = useState('home');

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
    switch (currentModule) {
      case 'home':                  return <Home />;
      case 'gestionDocumental':     return <GestionDocumental />;
      case 'planeacionEstrategica': return <PlaneacionEstrategica />;
      case 'mejoramientoContinuo':  return <MejoramientoContinuo />;
      case 'segBienestar':          return <SegBienestar />;
      case 'usuarios':              return <GestionUsuarios />;
      default:                      return <Home />;
    }
  };

  return (
    <Layout currentModule={currentModule} onModuleChange={setCurrentModule}>
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