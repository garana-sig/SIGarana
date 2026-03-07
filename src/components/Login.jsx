import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

// ─── Paleta del sistema ───────────────────────────────────────────────────────
const C = {
  green:  '#2e5244',
  mint:   '#6dbd96',
  olive:  '#6f7b2c',
  sand:   '#dedecc',
  dark:   '#1a2e25',
  cream:  '#faf9f5',
};

// ─── Decoraciones SVG panel izquierdo ────────────────────────────────────────
function BgDecor() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 500 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* círculo grande inferior derecho */}
      <circle cx="420" cy="680" r="220" fill={C.mint} fillOpacity="0.08" />
      {/* círculo pequeño superior izquierdo */}
      <circle cx="60"  cy="100" r="120" fill={C.mint} fillOpacity="0.07" />
      {/* líneas diagonales sutiles */}
      <line x1="0" y1="300" x2="500" y2="500" stroke={C.mint} strokeOpacity="0.07" strokeWidth="1.5" />
      <line x1="0" y1="400" x2="500" y2="600" stroke={C.mint} strokeOpacity="0.05" strokeWidth="1"   />
      {/* rombo decorativo */}
      <polygon
        points="430,140 460,170 430,200 400,170"
        fill="none"
        stroke={C.mint}
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) setError(result.error);
    } catch {
      setError('Error inesperado al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {/* ════════════════════════════════════════════════
          PANEL IZQUIERDO — Marca
      ════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: C.dark }}
      >
        {/* fondo textura imagen */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/imgfondo.webp)',
            opacity: 0.06,
          }}
        />
        <BgDecor />

        {/* contenido central */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 space-y-8">
          {/* logo */}
          <div
            className="relative"
            style={{
              animation: 'fadeSlideUp 0.9s ease both',
            }}
          >
            <img
              src="/garana1.png"
              alt="Garana Art"
              className="w-96 object-contain drop-shadow-2xl"
              style={{ filter: 'brightness(0) invert(1) opacity(0.95)' }}
            />
          </div>

          {/* divisor menta */}
          <div
            className="w-16 h-0.5 rounded-full"
            style={{
              backgroundColor: C.mint,
              animation: 'scaleIn 0.6s 0.4s ease both',
              transform: 'scaleX(0)',
              animationFillMode: 'forwards',
            }}
          />

          {/* tagline */}
          <div
            style={{
              animation: 'fadeSlideUp 0.9s 0.3s ease both',
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          >
            <p
              className="text-xl tracking-widest uppercase font-light"
              style={{ color: C.sand, letterSpacing: '0.25em', fontSize: '0.8rem' }}
            >
              Sistema Integrado de Gestión
            </p>
            <p
              className="mt-3 text-sm font-light leading-relaxed"
              style={{ color: C.mint, opacity: 0.8 }}
            >
              "Garantizando el realce natural de su belleza"
            </p>
          </div>

          {/* stats decorativos */}
          <div
            className="grid grid-cols-3 gap-6 mt-8 w-full max-w-xs"
            style={{
              animation: 'fadeSlideUp 0.9s 0.55s ease both',
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          >
            {[
              { value: '19+', label: 'años' },
              { value: '80+', label: 'empleados' },
              { value: '3',   label: 'países' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: C.mint }}>{value}</p>
                <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: C.sand, opacity: 0.5 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* footer izquierdo */}
        <p
          className="absolute bottom-6 text-xs"
          style={{ color: C.sand, opacity: 0.3 }}
        >
          © 2026 Garana Art · Todos los derechos reservados
        </p>
      </div>

      {/* ════════════════════════════════════════════════
          PANEL DERECHO — Formulario
      ════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 py-12"
        style={{ backgroundColor: C.cream }}
      >
        <div
          className="w-full max-w-sm"
          style={{
            animation: 'fadeSlideUp 0.7s 0.15s ease both',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          {/* logo mobile (solo visible < lg) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src="/garana1.png" alt="Garana Art" className="h-12 object-contain" />
          </div>

          {/* encabezado */}
          <div className="mb-8">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: C.green, fontFamily: "'Georgia', serif" }}
            >
              Bienvenido
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: C.olive, fontFamily: 'system-ui, sans-serif' }}>
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* ── Formulario ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert
                className="border-red-200 bg-red-50 rounded-xl"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: C.green, fontFamily: 'system-ui, sans-serif' }}
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: C.mint }}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@garana.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-0 transition-colors"
                  style={{
                    borderColor: '#d4d4c8',
                    backgroundColor: '#fff',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = C.mint; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d4d4c8'; }}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: C.green, fontFamily: 'system-ui, sans-serif' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: C.mint }}
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-0 transition-colors"
                  style={{
                    borderColor: '#d4d4c8',
                    backgroundColor: '#fff',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = C.mint; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d4d4c8'; }}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* botón ingresar */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-semibold tracking-wide text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                backgroundColor: C.green,
                fontFamily: 'system-ui, sans-serif',
                boxShadow: `0 4px 24px ${C.green}40`,
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </span>
              ) : (
                'Ingresar al sistema'
              )}
            </Button>
          </form>


        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Animaciones CSS globales (inyectadas inline)
      ═══════════════════════════════════════════════ */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes scaleIn {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}