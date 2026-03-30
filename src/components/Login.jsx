import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Lock, Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const C = {
  green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c',
  sand: '#dedecc', dark: '#1a2e25', cream: '#faf9f5',
};

function BgDecor() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 800"
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="420" cy="680" r="220" fill={C.mint} fillOpacity="0.08" />
      <circle cx="60"  cy="100" r="120" fill={C.mint} fillOpacity="0.07" />
      <line x1="0" y1="300" x2="500" y2="500" stroke={C.mint} strokeOpacity="0.07" strokeWidth="1.5" />
      <line x1="0" y1="400" x2="500" y2="600" stroke={C.mint} strokeOpacity="0.05" strokeWidth="1" />
      <polygon points="430,140 460,170 430,200 400,170" fill="none"
        stroke={C.mint} strokeOpacity="0.18" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Modal Olvidé mi contraseña ───────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return; }
    setLoading(true); setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'https://garanasig.vercel.app/reset-password' }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError('Ocurrió un error al enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Overlay
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        animation: 'fadeSlideUp 0.3s ease both',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${C.dark} 0%, ${C.green} 100%)`,
          borderRadius: '20px 20px 0 0', padding: '24px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={18} color={C.mint} />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>
                Restablecer contraseña
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
                Te enviaremos un enlace a tu correo
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 28px 24px' }}>
          {sent ? (
            // Estado: correo enviado
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `${C.mint}20`, margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={28} color={C.green} />
              </div>
              <h3 style={{ color: C.green, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                ¡Correo enviado!
              </h3>
              <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Revisa tu bandeja de entrada en <strong>{email}</strong>.
                El enlace expira en <strong>1 hora</strong>.
              </p>
              <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 20 }}>
                Si no lo ves, revisa la carpeta de spam o correo no deseado.
              </p>
              <Button
                onClick={onClose}
                style={{ background: C.green, color: '#fff', width: '100%', borderRadius: 10 }}
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            // Estado: formulario
            <form onSubmit={handleSubmit}>
              <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Ingresa el correo electrónico asociado a tu cuenta y te enviaremos
                las instrucciones para crear una nueva contraseña.
              </p>

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 16, fontSize: 13, color: '#dc2626',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: C.green,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  display: 'block', marginBottom: 6,
                }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: C.mint, pointerEvents: 'none',
                  }} />
                  <Input
                    type="email"
                    placeholder="usuario@garana.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    disabled={loading}
                    required
                    style={{ paddingLeft: 36, borderRadius: 10 }}
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  type="button" variant="outline" onClick={onClose}
                  disabled={loading}
                  style={{ flex: 1, borderRadius: 10, borderColor: C.sand }}
                >
                  <ArrowLeft size={14} style={{ marginRight: 6 }} />
                  Volver
                </Button>
                <Button
                  type="submit" disabled={loading}
                  style={{ flex: 1, background: C.green, color: '#fff', borderRadius: 10 }}
                >
                  {loading
                    ? <><Loader2 size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Enviando...</>
                    : 'Enviar enlace'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal Login ───────────────────────────────────────────────
export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showForgot, setShowForgot] = useState(false);
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

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: C.dark }}>
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/imgfondo.webp)', opacity: 0.06 }} />
        <BgDecor />
        <div className="relative z-10 flex flex-col items-center text-center px-12 space-y-8">
          <div style={{ animation: 'fadeSlideUp 0.9s ease both' }}>
            <img src="/garana1.png" alt="Garana Art" className="w-96 object-contain drop-shadow-2xl"
              style={{ filter: 'brightness(0) invert(1) opacity(0.95)' }} />
          </div>
          <div className="w-16 h-0.5 rounded-full" style={{
            backgroundColor: C.mint,
            animation: 'scaleIn 0.6s 0.4s ease both',
            transform: 'scaleX(0)', animationFillMode: 'forwards',
          }} />
          <div style={{ animation: 'fadeSlideUp 0.9s 0.3s ease both', opacity: 0, animationFillMode: 'forwards' }}>
            <p className="text-xl tracking-widest uppercase font-light"
              style={{ color: C.sand, letterSpacing: '0.25em', fontSize: '0.8rem' }}>
              Sistema Integrado de Gestión
            </p>
            <p className="mt-3 text-sm font-light leading-relaxed" style={{ color: C.mint, opacity: 0.8 }}>
              "Garantizando el realce natural de su belleza"
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-xs"
            style={{ animation: 'fadeSlideUp 0.9s 0.55s ease both', opacity: 0, animationFillMode: 'forwards' }}>
            {[{ value: '20', label: 'años' }, { value: '80+', label: 'empleados' }, { value: '3', label: 'países' }]
              .map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold" style={{ color: C.mint }}>{value}</p>
                  <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: C.sand, opacity: 0.5 }}>{label}</p>
                </div>
              ))}
          </div>
        </div>
        <p className="absolute bottom-6 text-xs" style={{ color: C.sand, opacity: 0.3 }}>
          © 2026 Garana Art · Todos los derechos reservados
        </p>
      </div>

      {/* Panel derecho — Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12"
        style={{ backgroundColor: C.cream }}>
        <div className="w-full max-w-sm"
          style={{ animation: 'fadeSlideUp 0.7s 0.15s ease both', opacity: 0, animationFillMode: 'forwards' }}>

          <div className="flex justify-center mb-8 lg:hidden">
            <img src="/garana1.png" alt="Garana Art" className="h-12 object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight"
              style={{ color: C.green, fontFamily: "'Georgia', serif" }}>Bienvenido</h1>
            <p className="mt-1.5 text-sm" style={{ color: C.olive, fontFamily: 'system-ui, sans-serif' }}>
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert className="border-red-200 bg-red-50 rounded-xl"
                style={{ fontFamily: 'system-ui, sans-serif' }}>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: C.green, fontFamily: 'system-ui, sans-serif' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: C.mint }} />
                <Input id="email" type="email" placeholder="usuario@garana.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-0 transition-colors"
                  style={{ borderColor: '#d4d4c8', backgroundColor: '#fff', fontFamily: 'system-ui, sans-serif' }}
                  onFocus={(e) => { e.target.style.borderColor = C.mint; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d4d4c8'; }}
                  required disabled={loading} autoComplete="email" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: C.green, fontFamily: 'system-ui, sans-serif' }}>
                  Contraseña
                </label>
                {/* ← NUEVO: link olvidé contraseña */}
                <button type="button" onClick={() => setShowForgot(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: C.mint, fontFamily: 'system-ui, sans-serif',
                    textDecoration: 'underline', padding: 0,
                  }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: C.mint }} />
                <Input id="password" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-xl border-2 focus-visible:ring-0 transition-colors"
                  style={{ borderColor: '#d4d4c8', backgroundColor: '#fff', fontFamily: 'system-ui, sans-serif' }}
                  onFocus={(e) => { e.target.style.borderColor = C.mint; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d4d4c8'; }}
                  required disabled={loading} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: 0, display: 'flex',
                  }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-white font-semibold tracking-wide text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: C.green, fontFamily: 'system-ui, sans-serif', boxShadow: `0 4px 24px ${C.green}40` }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />Verificando...
                </span>
              ) : 'Ingresar al sistema'}
            </Button>
          </form>
        </div>
      </div>

      {/* Modal olvidé contraseña */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}