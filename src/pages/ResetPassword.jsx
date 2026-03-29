// src/pages/ResetPassword.jsx
// ═══════════════════════════════════════════════════════════════════════
// Página pública — Restablecimiento de contraseña
// URL: /reset-password (ruta pública en App.tsx)
// Supabase redirige aquí con el token en el hash de la URL
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', cream: '#faf9f5' };

function PasswordStrength({ password }) {
  const checks = [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Una letra mayúscula',    ok: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula',    ok: /[a-z]/.test(password) },
    { label: 'Un número',              ok: /\d/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#e5e7eb', '#dc2626', '#f59e0b', '#6dbd96', '#2e5244'];
  const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Fuerte'];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: i <= score ? colors[score] : '#e5e7eb',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      {password && (
        <p style={{ fontSize: 11, color: colors[score], fontWeight: 600, marginBottom: 8 }}>
          {labels[score]}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
              background: c.ok ? C.mint : '#e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {c.ok && <span style={{ color: '#fff', fontSize: 8, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 11, color: c.ok ? '#374151' : '#9ca3af' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [showPwd,  setShowPwd]    = useState(false);
  const [showCfm,  setShowCfm]    = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [done,     setDone]       = useState(false);
  const [error,    setError]      = useState('');
  const [validToken, setValidToken] = useState(false);
  const [checking,   setChecking]   = useState(true);

  // Verificar que el token del hash es válido
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setValidToken(!!session);
      setChecking(false);
    };

    // Supabase procesa el hash automáticamente con onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidToken(true);
        setChecking(false);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8)         { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirm)         { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true); setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        animation: 'fadeSlideUp 0.5s ease both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/garana1.png" alt="Garana Art" style={{ height: 44, objectFit: 'contain' }} />
          <p style={{ color: C.olive, fontSize: 12, marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Sistema Integrado de Gestión
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, #1a2e25 0%, ${C.green} 100%)`,
            padding: '24px 28px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShieldCheck size={22} color={C.mint} />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>
                Nueva contraseña
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
                Crea una contraseña segura para tu cuenta
              </p>
            </div>
          </div>

          <div style={{ padding: '28px 28px 24px' }}>
            {/* Estado: verificando token */}
            {checking && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Loader2 size={28} style={{ color: C.mint, animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#6b7280', fontSize: 14 }}>Verificando enlace...</p>
              </div>
            )}

            {/* Estado: token inválido */}
            {!checking && !validToken && (
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: '#fee2e2', margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertCircle size={26} color="#dc2626" />
                </div>
                <h3 style={{ color: '#dc2626', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                  Enlace inválido o expirado
                </h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                  Este enlace de recuperación ya fue usado o ha expirado.
                  Solicita uno nuevo desde la pantalla de inicio de sesión.
                </p>
                <Button onClick={() => window.location.href = '/'}
                  style={{ background: C.green, color: '#fff', borderRadius: 10, width: '100%' }}>
                  Volver al inicio de sesión
                </Button>
              </div>
            )}

            {/* Estado: formulario */}
            {!checking && validToken && !done && (
              <form onSubmit={handleSubmit}>
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

                {/* Nueva contraseña */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.green,
                    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                    Nueva contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: C.mint, pointerEvents: 'none' }} />
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      disabled={loading} required
                      style={{ paddingLeft: 36, paddingRight: 40, borderRadius: 10 }}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      style={{ position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {password && <PasswordStrength password={password} />}
                </div>

                {/* Confirmar */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.green,
                    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                    Confirmar contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: C.mint, pointerEvents: 'none' }} />
                    <Input
                      type={showCfm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(''); }}
                      disabled={loading} required
                      style={{
                        paddingLeft: 36, paddingRight: 40, borderRadius: 10,
                        borderColor: confirm && confirm !== password ? '#fca5a5' : undefined,
                      }}
                    />
                    <button type="button" onClick={() => setShowCfm(!showCfm)}
                      style={{ position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      {showCfm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Las contraseñas no coinciden</p>
                  )}
                </div>

                <Button type="submit" disabled={loading || password !== confirm || password.length < 8}
                  style={{ width: '100%', background: C.green, color: '#fff', borderRadius: 10, height: 44 }}>
                  {loading
                    ? <><Loader2 size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Guardando...</>
                    : 'Guardar nueva contraseña'}
                </Button>
              </form>
            )}

            {/* Estado: éxito */}
            {done && (
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `${C.mint}20`, margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={28} color={C.green} />
                </div>
                <h3 style={{ color: C.green, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                  ¡Contraseña actualizada!
                </h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
                  Tu contraseña fue cambiada exitosamente.
                  Serás redirigido al inicio de sesión en unos segundos...
                </p>
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}>
          © 2026 Garana Art · Sistema Integrado de Gestión
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}