// src/app/modules/GestionUsuarios.jsx
import { useState, useEffect } from 'react';
import ModuleHero from '@/components/ModuleHero';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { 
  Users,
  UserPlus,
  Search,
  Shield,
  Eye,
  Mail,
  Briefcase,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { UserPermissionsManager } from '../users/UserPermissionsManager';
import { CreateUserForm } from '../users/CreateUserForm';
import { supabase } from '@/lib/supabase';

export default function GestionUsuarios() {
  const { user: currentUser, profile } = useAuth();
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Estados de diálogos
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Estados de estadísticas
  const [stats, setStats] = useState(null);

  // Hooks
  const { departments } = useDepartments();
  const { users, loading, error, refresh } = useUsers({
    searchTerm,
    departmentId: selectedDepartment === 'all' ? null : selectedDepartment,
    role: selectedRole === 'all' ? null : selectedRole,
    includeInactive
  });

  // Log para debugging
  useEffect(() => {
    console.log('📊 Users updated:', users.length, 'usuarios');
  }, [users]);

  // Cargar estadísticas
  useEffect(() => {
    loadStats();
  }, [users]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_stats');
      if (!error && data && data.length > 0) {
        setStats(data[0]);
      } else {
        // Calcular estadísticas localmente
        const totalUsers = users.length;
        const admins = users.filter(u => u.role === 'admin').length;
        const regulares = users.filter(u => u.role !== 'admin').length;
        setStats({
          total_users: totalUsers,
          admin_users: admins,
          regular_users: regulares
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      // Fallback a cálculo local
      const totalUsers = users.length;
      const admins = users.filter(u => u.role === 'admin').length;
      const regulares = users.filter(u => u.role !== 'admin').length;
      setStats({
        total_users: totalUsers,
        admin_users: admins,
        regular_users: regulares
      });
    }
  };

  // Handlers
  const handleViewPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const handleDeactivateUser = async (userId, userName) => {
    if (!confirm(`¿Estás seguro de desactivar a ${userName}?`)) return;

    try {
      const { error } = await supabase.rpc('deactivate_user', {
        p_user_id: userId
      });

      if (error) throw error;

      alert('✅ Usuario desactivado exitosamente');
      console.log('🔄 Refreshing users after deactivate...');
      await refresh();
    } catch (err) {
      console.error('Error deactivating user:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleReactivateUser = async (userId, userName) => {
    if (!confirm(`¿Deseas reactivar a ${userName}?`)) return;

    try {
      const { error } = await supabase.rpc('reactivate_user', {
        p_user_id: userId
      });

      if (error) throw error;

      alert('✅ Usuario reactivado exitosamente');
      console.log('🔄 Refreshing users after reactivate...');
      await refresh();
    } catch (err) {
      console.error('Error reactivating user:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleCreateSuccess = async (data) => {
    console.log('✅ Usuario creado exitosamente:', data);
    console.log('🔄 Cerrando diálogo y refrescando lista...');
    
    // Cerrar el diálogo
    setShowCreateDialog(false);
    
    // Mostrar alerta al usuario sobre el logout
    alert('⚠️ Usuario creado exitosamente.\n\nPor favor, vuelve a iniciar sesión con tu cuenta de administrador.');
    
    // El signOut ya se hizo en CreateUserForm
    // El usuario será redirigido al login automáticamente por el AuthContext
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered...');
    await refresh();
    console.log('✅ Manual refresh completed');
  };

  // Verificar permisos de admin
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-2 border-red-200">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Acceso Denegado</h3>
            <p className="text-sm text-gray-600">
              No tienes permisos para acceder a la gestión de usuarios.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Hero del módulo ── */}
      <ModuleHero
        title="Gestión de Usuarios"
        subtitle="Administración de usuarios y permisos del sistema"
        icon={Users}
        color="#6dbd96"
      />

      <div className="space-y-6">
      {/* Alerta Informativa */}
      <div 
        className="p-4 rounded-lg border-2 flex items-start gap-3"
        style={{ borderColor: '#6dbd96', backgroundColor: '#f0f9f4' }}
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#2e5244' }} />
        <div>
          <h4 className="font-medium mb-1" style={{ color: '#2e5244' }}>
            Nota sobre creación de usuarios
          </h4>
          <p className="text-sm text-gray-700">
            Al crear un usuario nuevo, serás desconectado temporalmente. Por favor, vuelve a iniciar sesión con tu cuenta de administrador después de crear el usuario.
          </p>
        </div>
      </div>

      {/* Botón nuevo usuario */}
      <div className="flex justify-end">
        <Button 
          style={{ backgroundColor: '#2e5244' }} 
          className="text-white hover:opacity-90"
          onClick={() => setShowCreateDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Total Usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold" style={{ color: '#2e5244' }}>
                {stats?.total_users || 0}
              </p>
              <Users className="h-8 w-8" style={{ color: '#6dbd96' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#6f7b2c' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Administradores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold" style={{ color: '#2e5244' }}>
                {stats?.admin_users || 0}
              </p>
              <Shield className="h-8 w-8" style={{ color: '#6f7b2c' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#2e5244' }}>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Usuarios Regulares</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold" style={{ color: '#2e5244' }}>
                {stats?.regular_users || 0}
              </p>
              <Users className="h-8 w-8" style={{ color: '#2e5244' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & List */}
      <Card className="border-2" style={{ borderColor: '#6dbd96' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#2e5244' }}>Usuarios del Sistema</CardTitle>
              <CardDescription>Lista de usuarios y sus permisos</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              style={{ borderColor: '#6dbd96' }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: '#6f7b2c' }} />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gerencia">Gerencia</SelectItem>
                <SelectItem value="usuario">Usuario</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeInactive"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeInactive" className="text-sm cursor-pointer">
                Incluir inactivos
              </Label>
            </div>
          </div>

          {/* Lista de usuarios */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
                   style={{ borderColor: '#2e5244' }}></div>
              <p style={{ color: '#6f7b2c' }}>Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error: {error}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#dedecc' }} />
              <p className="text-gray-500">No se encontraron usuarios</p>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {users.map((user) => (
                <div 
                  key={user.id}
                  className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow"
                  style={{ borderColor: '#dedecc', opacity: user.is_active ? 1 : 0.6 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#6dbd96' }}
                      >
                        <span className="text-white font-medium text-lg">
                          {user.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium" style={{ color: '#2e5244' }}>
                            {user.full_name}
                          </h4>
                          {user.role === 'admin' && (
                            <Badge style={{ backgroundColor: '#6f7b2c' }} className="text-white">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {user.role === 'gerencia' && (
                            <Badge style={{ backgroundColor: '#2e5244' }} className="text-white">
                              Gerencia
                            </Badge>
                          )}
                          {!user.is_active && (
                            <Badge variant="outline" className="border-red-500 text-red-500">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Briefcase className="h-3 w-3" />
                            <span>{user.department_name || 'Sin departamento'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: '#6dbd96', color: '#2e5244' }}
                          >
                            {user.active_permissions_count || 0} permisos activos
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewPermissions(user)}
                        title="Ver permisos"
                        style={{ borderColor: '#6dbd96' }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {user.is_active ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeactivateUser(user.id, user.full_name)}
                          title="Desactivar usuario"
                          className="border-red-200 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4 text-red-500" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReactivateUser(user.id, user.full_name)}
                          title="Reactivar usuario"
                          className="border-green-200 hover:bg-green-50"
                        >
                          <UserCheck className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Permisos */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#2e5244' }}>
              Gestionar Permisos
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <UserPermissionsManager
              userId={selectedUser.id}
              userName={selectedUser.full_name}
              userRole={selectedUser.role}
              onSuccess={async () => {
                console.log('🔄 Permission changed, refreshing...');
                await refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Creación */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#2e5244' }}>
              Crear Nuevo Usuario
            </DialogTitle>
            <DialogDescription>
              Complete el formulario para crear un nuevo usuario en el sistema
            </DialogDescription>
          </DialogHeader>

          <CreateUserForm 
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
      </div> {/* cierra p-6 */}
    </div>   
  );
}