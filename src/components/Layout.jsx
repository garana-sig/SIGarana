// src/components/layout/Layout.jsx
// ✅ Navbar con avatar real (foto o iniciales)
// ✅ Sidebar: Gestión de Usuarios visible para admin Y gerencia
// ✅ Modal cambio de contraseña obligatorio (must_change_password)

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import NotificationBell from '../components/Layout/NotificationBell';
import {
  FileText, Target, TrendingUp, Shield, Users, Home,
  LogOut, Menu, X, ChevronRight, ChevronLeft, Lock,
  Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react';

// ── Paleta ────────────────────────────────────────────────────────────
const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };

// ── Módulos ───────────────────────────────────────────────────────────
const MODULES = [
  { id: 'home',                name: 'Inicio',                  icon: Home,     permission: null },
  { id: 'gestionDocumental',   name: 'Gestión Documental',      icon: FileText, permission: 'gestion_documental:view' },
  { id: 'planeacionEstrategica', name: 'Planeación Estratégica', icon: Target,   permission: 'cmi:view' },
  { id: 'mejoramientoContinuo', name: 'Mejoramiento Continuo',  icon: TrendingUp, permission: 'auditorias:view' },
  { id: 'segBienestar',        name: 'SST y Bienestar',         icon: Shield,   permission: 'sst_bienestar:view' },
];

// ── Config de roles ───────────────────────────────────────────────────
const ROLES = {
  admin:    { label: 'Administrador', color: '#7c3aed', bg: '#f3e8ff' },
  gerencia: { label: 'Gerencia',      color: '#0369a1', bg: '#e0f2fe' },
  usuario:  { label: 'Usuario',       color: C.green,   bg: '#f0fdf4' },
};

// ── Avatar mini para navbar ───────────────────────────────────────────
function NavAvatar({ profile }) {
  const role     = ROLES[profile?.role] || ROLES.usuario;
  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
      style={{
        backgroundColor: profile?.avatar_url ? 'transparent' : role.bg,
        color:           role.color,
        border:          `2px solid ${role.color}40`,
      }}
    >
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
        : initials
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MODAL CAMBIO DE CONTRASEÑA OBLIGATORIO
// ══════════════════════════════════════════════════════════════════════
function ChangePasswordModal({ onSuccess }) {
  const [form,     setForm]     = useState({ password: '', confirm: '' });
  const [showPwd,  setShowPwd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const rules = [
    { label: 'Mínimo 8 caracteres',     ok: form.password.length >= 8 },
    { label: 'Al menos una mayúscula',   ok: /[A-Z]/.test(form.password) },
    { label: 'Al menos un número',       ok: /[0-9]/.test(form.password) },
    { label: 'Las contraseñas coinciden', ok: form.password === form.confirm && form.confirm.length > 0 },
  ];
  const allOk = rules.every(r => r.ok);

  const handleSubmit = async () => {
    if (!allOk) return;
    setSaving(true);
    setError('');
    try {
      // 1. Actualizar contraseña en Supabase Auth
      const { error: pwdErr } = await supabase.auth.updateUser({ password: form.password });
      if (pwdErr) throw pwdErr;

      // 2. Marcar must_change_password = false
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('profile')
        .update({ must_change_password: false })
        .eq('id', user.id);

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent
        className="max-w-sm"
        // Sin onOpenChange → no se puede cerrar
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: C.green }}>
            <Lock className="h-5 w-5" style={{ color: C.mint }} />
            Cambia tu contraseña
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ backgroundColor: '#fffbeb', color: '#92400e' }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Tu cuenta tiene una contraseña temporal. Debes cambiarla antes de continuar.</span>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nueva contraseña</label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Confirmar contraseña</label>
            <Input
              type="password"
              placeholder="Repite la contraseña"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          {/* Reglas */}
          <div className="space-y-1.5">
            {rules.map(r => (
              <div key={r.label} className="flex items-center gap-2 text-xs">
                <CheckCircle2
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: r.ok ? '#16a34a' : '#d1d5db' }}
                />
                <span style={{ color: r.ok ? '#16a34a' : '#9ca3af' }}>{r.label}</span>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!allOk || saving}
          className="w-full flex items-center justify-center gap-2"
          style={{ backgroundColor: C.green, color: 'white' }}
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            : <><Lock className="h-4 w-4" /> Cambiar contraseña</>
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export default function Layout({ children, currentModule, onModuleChange }) {
  const { user, profile, logout, hasPermission, refreshProfile } = useAuth();
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resetKey,         setResetKey]         = useState(0);

  // ── must_change_password ─────────────────────────────────────────────
  const mustChangePassword = profile?.must_change_password === true;
  const handlePasswordChanged = async () => {
    // Refresca el profile para que must_change_password = false
    if (refreshProfile) await refreshProfile();
  };

  const handleModuleClick = (moduleId) => {
    if (moduleId === currentModule) setResetKey(k => k + 1);
    onModuleChange(moduleId);
    setSidebarOpen(false);
  };

  const canAccessModule = (module) => {
    if (module.permission === null) return true;
    return hasPermission(module.permission);
  };

  const isAdmin    = profile?.role === 'admin';
  const isGerencia = profile?.role === 'gerencia';
  const role       = ROLES[profile?.role] || ROLES.usuario;
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario';

  const moduleName = MODULES.find(m => m.id === currentModule)?.name
    || (currentModule === 'usuarios' ? 'Gestión de Usuarios' : 'Inicio');

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.sand }}>

      {/* ── Modal cambio de contraseña obligatorio ───────────────── */}
      {mustChangePassword && (
        <ChangePasswordModal onSuccess={handlePasswordChanged} />
      )}

      {/* ════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════ */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
        style={{ backgroundColor: C.green }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className={`p-4 border-b flex items-center justify-between ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
            style={{ borderColor: C.mint }}
          >
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: C.mint }}>
                  <span className="font-bold text-white text-base">SIG</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-white text-sm font-semibold">SIGarana</h2>
                  <p className="text-xs truncate" style={{ color: C.mint }}>Sistema Integrado</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: C.mint }}>
                <span className="font-bold text-white text-base">SIG</span>
              </div>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-white hover:bg-white/10 flex-shrink-0"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {MODULES.map(module => {
              if (!canAccessModule(module)) return null;
              const Icon     = module.icon;
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
                      <span className="flex-1 text-left text-white text-sm">{module.name}</span>
                      {isActive && <ChevronRight className="h-4 w-4 text-white" />}
                    </>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {module.name}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Gestión de Usuarios — admin Y gerencia */}
            {(isAdmin || isGerencia) && (
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
                    <span className="flex-1 text-left text-white text-sm">Gestión de Usuarios</span>
                    {currentModule === 'usuarios' && <ChevronRight className="h-4 w-4 text-white" />}
                  </>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    Gestión de Usuarios
                  </div>
                )}
              </button>
            )}
          </nav>

          {/* Usuario en sidebar (solo cuando está expandido) */}
          {!sidebarCollapsed && (
            <div
              className="p-3 border-t"
              style={{ borderColor: `${C.mint}40` }}
            >
              <div className="flex items-center gap-3 px-2 py-2">
                <NavAvatar profile={profile} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.full_name || displayName}</p>
                  <p className="text-xs truncate" style={{ color: C.mint }}>{role.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════════════════════════════════════════════════
          MAIN
      ════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Navbar ────────────────────────────────────── */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30" style={{ borderColor: C.mint }}>
          <div className="px-4 py-3 flex items-center justify-between gap-4">

            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden flex-shrink-0">
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate" style={{ color: C.green }}>{moduleName}</h1>
                <p className="text-xs truncate" style={{ color: C.olive }}>
                  {profile?.department?.name || 'Sistema Integrado de Gestión'}
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Notificaciones */}
              <NotificationBell onNavigate={onModuleChange} />

              {/* Avatar + info usuario */}
              <div
                className="hidden sm:flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl cursor-default"
                style={{ backgroundColor: '#f8faf9', border: `1px solid ${C.mint}30` }}
              >
                <NavAvatar profile={profile} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.green }}>
                    {profile?.full_name || displayName}
                  </p>
                  <p className="text-xs truncate" style={{ color: role.color }}>
                    {role.label}
                  </p>
                </div>
              </div>

              {/* Cerrar sesión */}
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline text-sm">Salir</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main key={`${currentModule}-${resetKey}`} className="flex-1 overflow-auto">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}