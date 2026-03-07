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
import HomePublico               from '@/pages/HomePublico';
import EncuestaSatisfaccionCliente from '@/pages/EncuestaSatisfaccionCliente';
import EncuestaClimaLaboral      from '@/pages/EncuestaClimaLaboral';

// ─── Rutas 100% públicas (nunca requieren login) ───────────────────────────────
// Lazy: no instanciar JSX hasta que se necesite (evita compartir estado entre rutas)
const PUBLIC_ROUTES: Record<string, () => JSX.Element> = {
  '/':                              () => <HomePublico />,
  '/encuesta/satisfaccion-cliente': () => <EncuestaSatisfaccionCliente />,
  '/encuesta/clima-laboral':        () => <EncuestaClimaLaboral />,
};

// ─── Contenido autenticado ────────────────────────────────────────────────────
function AppContent() {
  const { user, loading } = useAuth();
  const [currentModule, setCurrentModule] = useState('home');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#dedecc' }}>
        <div className="text-center">
          <img src="/garana1.png" alt="Garana Art"
            style={{ height: 72, objectFit: 'contain', marginBottom: 16 }} />
          <p style={{ color: '#2e5244', fontSize: 14 }}>Cargando...</p>
        </div>
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