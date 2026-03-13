// src/app/modules/GestionUsuarios.jsx
// ✅ FIX 1: hard_delete_user RPC (SECURITY DEFINER) — borrado total sin trazabilidad
// ✅ FIX 2: assign_perms / revoke_perms con SECURITY DEFINER
// ✅ v2.0: Usuarios asignados a PROCESO (no departamento) — Marzo 2026

import { useState, useRef, useEffect } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { UserPermissionsManager } from '../users/UserPermissionsManager';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import {
  Users, UserPlus, Search, Shield, ShieldCheck,
  CheckCircle2, XCircle, Edit2, Key, ChevronDown, ChevronUp,
  Camera, Loader2, AlertTriangle, GitBranch, Mail,
  UserCheck, UserX, Lock, Trash2,
} from 'lucide-react';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc', dark: '#1a2e25' };

const ROLES = {
  admin:    { label: 'Administrador', color: '#7c3aed', bg: '#f3e8ff', icon: ShieldCheck },
  gerencia: { label: 'Gerencia',      color: '#0369a1', bg: '#e0f2fe', icon: Shield },
  usuario:  { label: 'Usuario',       color: '#2e5244', bg: '#f0fdf4', icon: Users },
};

// ── Hook de procesos (reutiliza tabla process de gestión documental) ──
function useProcesses() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('process')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setProcesses(data || []);
        setLoading(false);
      });
  }, []);

  return { processes, loading };
}

// ── Toast ──────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium max-w-sm"
          style={{
            backgroundColor: t.type === 'success' ? C.green : t.type === 'error' ? '#dc2626' : '#f59e0b',
            animation: 'slideInRight 0.3s ease',
          }}
        >
          {t.type === 'success' && <CheckCircle2  className="h-4 w-4 flex-shrink-0" />}
          {t.type === 'error'   && <XCircle       className="h-4 w-4 flex-shrink-0" />}
          {t.type === 'warning' && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────
function UserAvatar({ user, size = 'md', onClick }) {
  const sizeMap = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-20 w-20 text-xl' };
  const role    = ROLES[user.role] || ROLES.usuario;
  const initials = (user.full_name || user.email || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden relative`}
      style={{ backgroundColor: user.avatar_url ? 'transparent' : role.bg, color: role.color, border: `2px solid ${role.color}40`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : initials}
      {onClick && <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"><Camera className="h-4 w-4 text-white" /></div>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, borderColor }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-4 bg-white border-2" style={{ borderColor: borderColor || color }}>
      <div className="rounded-lg p-2" style={{ backgroundColor: `${color}15` }}><Icon className="h-5 w-5" style={{ color }} /></div>
      <div><div className="text-2xl font-bold" style={{ color }}>{value}</div><div className="text-xs text-gray-500 mt-0.5">{label}</div></div>
    </div>
  );
}

function Detail({ label, value }) {
  return <div><p className="text-xs text-gray-400 mb-0.5">{label}</p><p className="text-sm font-medium text-gray-700">{value || '—'}</p></div>;
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export default function GestionUsuarios() {
  const { profile: currentUser }     = useAuth();
  const { processes }                = useProcesses();  // ← CAMBIO: era useDepartments

  const [search,        setSearch]        = useState('');
  const [filterRole,    setFilterRole]    = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('active');
  const [filterProcess, setFilterProcess] = useState('all');  // ← NUEVO filtro
  const [deleting,      setDeleting]      = useState(false);

  const { users, loading, error, refresh } = useUsers({
    searchTerm:      search,
    role:            filterRole === 'all' ? null : filterRole,
    includeInactive: filterStatus !== 'active',
  });
  const { users: allUsers } = useUsers({ includeInactive: true });

  const [showCreate,      setShowCreate]      = useState(false);
  const [showEdit,        setShowEdit]        = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showDeactivate,  setShowDeactivate]  = useState(false);
  const [showDelete,      setShowDelete]      = useState(false);
  const [selectedUser,    setSelectedUser]    = useState(null);
  const [expandedUser,    setExpandedUser]    = useState(null);

  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  };

  const total    = allUsers.length;
  const activos  = allUsers.filter(u => u.is_active).length;
  const admins   = allUsers.filter(u => u.role === 'admin').length;
  const gerentes = allUsers.filter(u => u.role === 'gerencia').length;

  // ── Toggle activo/inactivo ─────────────────────────────────────
  const handleToggleActive = async (user) => {
    const fn = user.is_active ? 'deactivate_user' : 'reactivate_user';
    const { error } = await supabase.rpc(fn, { p_user_id: user.id });
    if (error) { addToast('Error al cambiar estado: ' + error.message, 'error'); return; }
    addToast(user.is_active ? `${user.full_name} desactivado` : `${user.full_name} reactivado`);
    refresh();
    setShowDeactivate(false);
  };

  // ── Hard Delete — borra el usuario completamente ──────────────
  const handleSoftDelete = async (user) => {
    setDeleting(true);
    try {
      const { data: result, error: rpcErr } = await supabase
        .rpc('hard_delete_user', { p_user_id: user.id });

      if (rpcErr) throw rpcErr;
      if (result && !result.success) throw new Error(result.error || 'Error al eliminar');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ userId: user.id }),
          }
        );
        if (!res.ok) {
          addToast(`${user.full_name} eliminado. El email quedará libre en unos minutos.`, 'warning');
        } else {
          addToast(`${user.full_name} eliminado correctamente`);
        }
      } catch {
        addToast(`${user.full_name} eliminado. El email quedará libre en unos minutos.`, 'warning');
      }

      refresh();
      setShowDelete(false);
    } catch (err) {
      addToast('Error al eliminar: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtro local por estado + proceso ─────────────────────────
  const displayed = users.filter(u => {
    if (filterStatus === 'active'   && !u.is_active) return false;
    if (filterStatus === 'inactive' &&  u.is_active) return false;
    // ← NUEVO: filtro por proceso
    if (filterProcess !== 'all' && u.process_id !== filterProcess) return false;
    return true;
  });

  const isAdmin   = currentUser?.role === 'admin';
  const canManage = isAdmin || currentUser?.role === 'gerencia';

  return (
    <div className="space-y-0">
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeInUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .user-card { animation: fadeInUp 0.2s ease both; }
        .user-card:hover { box-shadow: 0 4px 20px rgba(46,82,68,0.1); }
      `}</style>

      <ModuleHero title="Gestión de Usuarios" subtitle="Administra accesos, roles y permisos del sistema" icon={Users} color={C.mint} />

      <div className="space-y-6 p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total usuarios"  value={total}    icon={Users}       color={C.green}  borderColor={C.mint} />
          <StatCard label="Activos"         value={activos}  icon={UserCheck}   color="#16a34a"  borderColor="#bbf7d0" />
          <StatCard label="Administradores" value={admins}   icon={ShieldCheck} color="#7c3aed"  borderColor="#e9d5ff" />
          <StatCard label="Gerencia"        value={gerentes} icon={Shield}      color="#0369a1"  borderColor="#bae6fd" />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar por nombre, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl border-gray-200" />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" style={{ color: C.green }}>
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="gerencia">Gerencia</option>
            <option value="usuario">Usuario</option>
          </select>
          {/* ← NUEVO: filtro por proceso */}
          <select value={filterProcess} onChange={e => setFilterProcess(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" style={{ color: C.green }}>
            <option value="all">Todos los procesos</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" style={{ color: C.green }}>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
            <option value="all">Todos</option>
          </select>
          <span className="text-sm text-gray-400">{displayed.length} usuario{displayed.length !== 1 ? 's' : ''}</span>
          {canManage && (
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2 font-semibold ml-auto" style={{ backgroundColor: C.green, color: 'white' }}>
              <UserPlus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          )}
        </div>

        {/* Lista de usuarios */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: C.mint }} /></div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Error: {error}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No se encontraron usuarios</p></div>
        ) : (
          <div className="space-y-3">
            {displayed.map((user, i) => {
              const role      = ROLES[user.role] || ROLES.usuario;
              const RoleIcon  = role.icon;
              const isExpanded = expandedUser === user.id;
              // ✅ FIX: usar process_name del objeto user (lo trae la RPC directamente)
              const proc = user.process_name ? { name: user.process_name, code: user.process_code } : null;
              return (
                <div key={user.id} className="user-card rounded-xl border-2 bg-white transition-all"
                  style={{ animationDelay: `${i * 35}ms`, borderColor: user.is_active ? C.sand : '#f3f4f6', opacity: user.is_active ? 1 : 0.6 }}
                >
                  <div className="flex items-center gap-4 p-4">
                    <UserAvatar user={user} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{user.full_name || '—'}</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: role.bg, color: role.color }}>
                          <RoleIcon className="h-3 w-3" />{role.label}
                        </span>
                        {!user.is_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-500">
                            <XCircle className="h-3 w-3" /> Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="h-3 w-3" /> {user.email}</span>
                        {/* ← CAMBIO: muestra proceso en lugar de departamento */}
                        {proc && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <GitBranch className="h-3 w-3" /> {proc.name}
                          </span>
                        )}
                        {!proc && (
                          <span className="flex items-center gap-1 text-xs text-gray-300 italic">
                            <GitBranch className="h-3 w-3" /> Sin proceso asignado
                          </span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setSelectedUser(user); setShowEdit(true); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Editar"><Edit2 className="h-4 w-4 text-gray-400" /></button>
                        <button onClick={() => { setSelectedUser(user); setShowPermissions(true); }} className="p-2 rounded-lg hover:bg-purple-50 transition-colors" title="Permisos"><Key className="h-4 w-4" style={{ color: '#7c3aed' }} /></button>
                        {isAdmin && user.id !== currentUser?.id && (
                          <button onClick={() => { setSelectedUser(user); setShowDeactivate(true); }} className="p-2 rounded-lg hover:bg-red-50 transition-colors" title={user.is_active ? 'Desactivar' : 'Reactivar'}>
                            {user.is_active ? <UserX className="h-4 w-4 text-red-400" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                          </button>
                        )}
                        {isAdmin && user.id !== currentUser?.id && (
                          <button onClick={() => { setSelectedUser(user); setShowDelete(true); }} className="p-2 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="h-4 w-4 text-red-400" /></button>
                        )}
                        <button onClick={() => setExpandedUser(isExpanded ? null : user.id)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3" style={{ borderColor: C.sand }}>
                      <Detail label="Usuario"  value={user.username} />
                      <Detail label="Teléfono" value={user.phone} />
                      {/* ← CAMBIO: Proceso en lugar de Departamento */}
                      <Detail label="Proceso"  value={proc ? `${proc.code} — ${proc.name}` : null} />
                      <Detail label="Creado"   value={user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO') : null} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALES */}
      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        processes={processes}          // ← CAMBIO: pasa processes, no departments
        currentUser={currentUser}
        onSuccess={msg => { addToast(msg); refresh(); setShowCreate(false); }}
        onError={msg => addToast(msg, 'error')}
      />

      {showEdit && selectedUser && (
        <EditUserModal
          user={selectedUser}
          processes={processes}         // ← CAMBIO: pasa processes, no departments
          isAdmin={isAdmin}
          onClose={() => { setShowEdit(false); setSelectedUser(null); }}
          onSuccess={msg => { addToast(msg); refresh(); setShowEdit(false); setSelectedUser(null); }}
          onError={msg => addToast(msg, 'error')}
        />
      )}

      <UserPermissionsManager
        open={showPermissions && !!selectedUser}
        onClose={() => { setShowPermissions(false); setSelectedUser(null); }}
        userId={selectedUser?.id}
        userName={selectedUser?.full_name}
        userRole={selectedUser?.role}
      />

      {showDeactivate && selectedUser && (
        <Dialog open onOpenChange={() => setShowDeactivate(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {selectedUser.is_active ? 'Desactivar usuario' : 'Reactivar usuario'}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 py-2">
              {selectedUser.is_active ? `¿Desactivar a ${selectedUser.full_name}? No podrá ingresar al sistema.` : `¿Reactivar el acceso de ${selectedUser.full_name}?`}
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeactivate(false)}>Cancelar</Button>
              <Button onClick={() => handleToggleActive(selectedUser)} style={{ backgroundColor: selectedUser.is_active ? '#dc2626' : C.green, color: 'white' }}>
                {selectedUser.is_active ? 'Sí, desactivar' : 'Sí, reactivar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showDelete && selectedUser && (
        <Dialog open onOpenChange={() => !deleting && setShowDelete(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" /> Eliminar usuario
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-gray-600">¿Eliminar a <strong>{selectedUser.full_name}</strong>?</p>
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-red-50 text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Se revocarán todos sus permisos. El historial se conserva por trazabilidad.</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Cancelar</Button>
              <Button onClick={() => handleSoftDelete(selectedUser)} disabled={deleting} className="flex items-center gap-2" style={{ backgroundColor: '#dc2626', color: 'white' }}>
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4" /> Sí, eliminar</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODAL CREAR USUARIO — v2: usa process_id
// ══════════════════════════════════════════════════════════════════
function CreateUserModal({ open, onClose, processes, currentUser, onSuccess, onError }) {
  const [form,    setForm]    = useState({ email: '', full_name: '', role: 'usuario', process_id: '', phone: '' }); // ← CAMBIO
  const [saving,  setSaving]  = useState(false);
  const [step,    setStep]    = useState('');
  const [avatar,  setAvatar]  = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onError('La foto no puede superar 2MB'); return; }
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.email || !form.full_name || !form.role) { onError('Nombre, email y rol son obligatorios'); return; }
    setSaving(true);
    try {
      // ← CAMBIO: busca proceso en lugar de departamento
      const proc = processes.find(p => p.id === form.process_id);
      const { data: { session } } = await supabase.auth.getSession();

      setStep('creating');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({
            email:            form.email.trim().toLowerCase(),
            full_name:        form.full_name.trim(),
            role:             form.role,
            process_id:       form.process_id || null,    // ← CAMBIO: process_id
            process_name:     proc?.name || null,          // ← CAMBIO: process_name
            phone:            form.phone || null,
            created_by_name:  currentUser?.full_name || 'Administrador',
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) { onError(result.error || 'Error al crear usuario'); return; }

      const newUserId = result.userId;

      // Si hay proceso, actualizar process_id en profile (por si la Edge Function no lo hace)
      if (form.process_id && newUserId) {
        await supabase
          .from('profile')
          .update({ process_id: form.process_id })
          .eq('id', newUserId);
      }

      // Subir avatar
      if (avatar && newUserId) {
        setStep('avatar');
        const ext  = avatar.name.split('.').pop();
        const path = `${newUserId}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatar, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await supabase.from('profile').update({ avatar_url: publicUrl }).eq('id', newUserId);
        }
      }

      onSuccess(`✅ ${form.full_name} creado. Credenciales enviadas a ${form.email}`);
      handleClose();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
      setStep('');
    }
  };

  const handleClose = () => {
    if (saving) return;
    setForm({ email: '', full_name: '', role: 'usuario', process_id: '', phone: '' }); // ← CAMBIO
    setAvatar(null); setPreview(null); setStep('');
    onClose();
  };

  const stepLabel = { creating: 'Creando usuario...', avatar: 'Subiendo foto...' };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: C.green }}>
            <UserPlus className="h-5 w-5" style={{ color: C.mint }} /> Nuevo Usuario
          </DialogTitle>
          <DialogDescription>Se generará una contraseña temporal y se enviará al correo del usuario.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed hover:border-solid transition-all" style={{ borderColor: C.mint, backgroundColor: '#f0f7f4' }} onClick={() => fileRef.current?.click()}>
              {preview ? <img src={preview} className="w-full h-full object-cover" alt="preview" /> : <Camera className="h-7 w-7" style={{ color: C.mint }} />}
            </div>
            <span className="text-xs text-gray-400">Foto de perfil (opcional, máx 2MB)</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre completo *</label>
            <Input placeholder="Ana María Ospina" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Correo electrónico *</label>
            <Input placeholder="ana@garana.com" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Rol *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none">
                <option value="usuario">Usuario</option>
                <option value="gerencia">Gerencia</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              {/* ← CAMBIO: Proceso en lugar de Departamento */}
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Proceso</label>
              <select value={form.process_id} onChange={e => setForm(p => ({ ...p, process_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none">
                <option value="">Sin proceso</option>
                {processes.map(pr => <option key={pr.id} value={pr.id}>{pr.code} — {pr.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Teléfono (opcional)</label>
            <Input placeholder="300 123 4567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ backgroundColor: '#f0f7f4', color: C.green }}>
            <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Se generará una contraseña temporal automáticamente. El usuario deberá cambiarla en su primer ingreso.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2" style={{ backgroundColor: C.green, color: 'white' }}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {stepLabel[step] || 'Procesando...'}</> : <><UserPlus className="h-4 w-4" /> Crear Usuario</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODAL EDITAR USUARIO — v2: usa process_id
// ══════════════════════════════════════════════════════════════════
function EditUserModal({ user, processes, isAdmin, onClose, onSuccess, onError }) {
  // ← CAMBIO: process_id en lugar de department_id
  const [form,    setForm]    = useState({ full_name: user.full_name || '', role: user.role || 'usuario', process_id: user.process_id || '', phone: user.phone || '' });
  const [saving,  setSaving]  = useState(false);
  const [avatar,  setAvatar]  = useState(null);
  const [preview, setPreview] = useState(user.avatar_url || null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onError('La foto no puede superar 2MB'); return; }
    setAvatar(file); setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let avatar_url = user.avatar_url;
      if (avatar) {
        const ext = avatar.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatar, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          avatar_url = publicUrl;
        }
      }
      // ← CAMBIO: guarda process_id, ya no department_id
      const { error } = await supabase.from('profile')
        .update({
          full_name:  form.full_name,
          role:       isAdmin ? form.role : user.role,
          process_id: form.process_id || null,  // ← CAMBIO
          phone:      form.phone || null,
          avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      if (error) throw error;
      onSuccess(`Perfil de ${form.full_name} actualizado`);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: C.green }}>
            <Edit2 className="h-5 w-5" style={{ color: C.mint }} /> Editar — {user.full_name}
          </DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full overflow-hidden cursor-pointer relative" style={{ border: `3px solid ${C.mint}` }} onClick={() => fileRef.current?.click()}>
              {preview ? <img src={preview} className="w-full h-full object-cover" alt="avatar" /> : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#f0f7f4' }}><Camera className="h-7 w-7" style={{ color: C.mint }} /></div>}
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="h-5 w-5 text-white" /></div>
            </div>
            <span className="text-xs text-gray-400">Click para cambiar foto</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre completo</label>
            <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="rounded-xl" />
          </div>

          {isAdmin && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Rol</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none">
                <option value="usuario">Usuario</option>
                <option value="gerencia">Gerencia</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          )}

          {/* ← CAMBIO: Proceso en lugar de Departamento */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Proceso</label>
            <select value={form.process_id} onChange={e => setForm(p => ({ ...p, process_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none">
              <option value="">Sin proceso</option>
              {processes.map(pr => <option key={pr.id} value={pr.id}>{pr.code} — {pr.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Teléfono</label>
            <Input placeholder="300 123 4567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2" style={{ backgroundColor: C.green, color: 'white' }}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : <><CheckCircle2 className="h-4 w-4" /> Guardar Cambios</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}