// src/hooks/useActasPermissions.js
// Hook ESPECÍFICO para validar permisos en módulo Actas

import { useAuth } from '@/context/AuthContext';

export const useActasPermissions = () => {
  const { user, profile, hasPermission } = useAuth();

  /**
   * Valida si el usuario puede EDITAR un acta
   * 
   * REGLAS:
   * - Admin/Gerencia: Pueden editar cualquier acta NO archivada
   * - Usuario con auditorias:actas:edit_all: Puede editar todas las actas NO archivadas
   * - Usuario con auditorias:actas:edit: Puede editar sus propias actas (cualquier estado excepto archivada)
   * - Actas archivadas NO se pueden editar
   */
  const canEditActa = (acta, userId, role) => {
    if (!acta || !userId) return false;
    
    // Actas archivadas NO se pueden editar
    if (acta.status === 'archived') return false;
    
    // Admin y Gerencia pueden editar cualquier acta no archivada
    if (role === 'admin' || role === 'gerencia') {
      return true;
    }
    
    // Usuario con permiso edit_all puede editar cualquier acta
    if (hasPermission('auditorias:actas:edit_all')) {
      return true;
    }
    
    // 🆕 Usuario con permiso edit puede editar SUS PROPIAS actas (no archivadas)
    if (hasPermission('auditorias:actas:edit') && 
        acta.created_by === userId) {
      return true;
    }
    
    return false;
  };

  /**
   * Valida si el usuario puede ARCHIVAR actas
   * 
   * REGLAS:
   * - Admin/Gerencia: Siempre pueden archivar
   * - Usuario con auditorias:actas:archive: Puede archivar
   */
  const canArchiveActa = (role) => {
    if (role === 'admin' || role === 'gerencia') {
      return true;
    }
    
    return hasPermission('auditorias:actas:archive');
  };

  /**
   * Valida si el usuario puede ELIMINAR actas permanentemente
   * 
   * REGLAS:
   * - Admin/Gerencia: Pueden eliminar cualquier acta
   * - Usuario con auditorias:actas:delete: Solo puede eliminar SUS PROPIAS actas
   *
   * 🆕 Uso: canDeleteActa(acta, userId, role)
   *    (Compatibilidad: si se llama como canDeleteActa(role), solo admin/gerencia)
   */
  const canDeleteActa = (acta, userId, role) => {
    // Compatibilidad con la llamada antigua canDeleteActa(role)
    if (typeof acta === 'string' || acta == null) {
      role = typeof acta === 'string' ? acta : role;
      acta = null;
    }

    if (role === 'admin' || role === 'gerencia') {
      return true;
    }

    if (!acta || !userId) return false;

    return hasPermission('auditorias:actas:delete') && acta.created_by === userId;
  };

  /**
   * Valida si el usuario puede DESCARGAR actas
   * 
   * REGLAS:
   * - Todos los usuarios autenticados con auditorias:actas:download
   * - Admin/Gerencia siempre pueden
   */
  const canDownloadActa = (role) => {
    if (role === 'admin' || role === 'gerencia') {
      return true;
    }
    
    return hasPermission('auditorias:actas:download');
  };

  /**
   * Valida si el usuario puede VER detalles del acta
   * 
   * REGLAS:
   * - Admin/Gerencia: Ven todas las actas
   * - Usuario con auditorias:actas:view_all: Ve todas las actas
   * - Usuario con auditorias:actas:view: Ve actas aprobadas + sus propias actas
   * - Creador: Siempre ve sus propias actas
   */
  const canViewActa = (acta, userId, role) => {
    if (!acta) return false;
    
    // Admin y Gerencia pueden ver todas
    if (role === 'admin' || role === 'gerencia') {
      return true;
    }
    
    // Usuario con view_all puede ver todas
    if (hasPermission('auditorias:actas:view_all')) {
      return true;
    }
    
    // Creador puede ver sus propias actas
    if (acta.created_by === userId) {
      return true;
    }
    
    // Usuario con view puede ver actas aprobadas
    if (hasPermission('auditorias:actas:view') && acta.status === 'approved') {
      return true;
    }
    
    return false;
  };

  /**
   * Valida si el usuario puede APROBAR actas
   * 
   * REGLAS:
   * - Admin/Gerencia: Siempre pueden aprobar
   * - Usuario con auditorias:actas:approve: Puede aprobar
   */
  const canApproveActa = (role) => {
    if (role === 'admin' || role === 'gerencia') {
      return true;
    }
    
    return hasPermission('auditorias:actas:approve');
  };

  return {
    canEditActa,
    canArchiveActa,
    canDeleteActa,
    canDownloadActa,
    canViewActa,
    canApproveActa,
    user,
    profile,
    role: profile?.role,
    userId: user?.id
  };
};