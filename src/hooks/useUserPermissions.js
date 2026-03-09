// src/hooks/useUserPermissions.js
// ✅ Usa funciones SECURITY DEFINER: assign_perms / revoke_perms
// ✅ Carga permisos con query directa (más simple y confiable)
// ✅ Expone permissionCodes para comparar

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserPermissions(userId) {
  const [permissions,     setPermissions]     = useState([]);
  const [permissionCodes, setPermissionCodes] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // ── Cargar permisos del usuario ────────────────────────────
  const loadPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions([]);
      setPermissionCodes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query directa: user_permission JOIN permission
      const { data, error: qErr } = await supabase
        .from('user_permission')
        .select(`
          id,
          is_active,
          granted_at,
          permission:permission_id (
            id,
            code,
            name,
            module:module_id (
              id,
              code,
              name,
              display_order
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (qErr) throw qErr;

      const perms = data || [];
      setPermissions(perms);

      const codes = perms
        .filter(p => p.is_active && p.permission?.code)
        .map(p => p.permission.code);
      setPermissionCodes(codes);

      console.log(`✅ Permisos cargados para ${userId}: ${codes.length}`);
    } catch (err) {
      console.error('❌ Error cargando permisos:', err);
      setError(err.message);
      setPermissions([]);
      setPermissionCodes([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // ── Asignar permisos — actualización OPTIMISTA (sin reset del modal) ──
  const assignPermissions = async (codes) => {
    if (!codes?.length) return { success: true };
    try {
      // 1. Actualizar estado local inmediatamente (sin loading)
      setPermissionCodes(prev => [...new Set([...prev, ...codes])]);

      // 2. Persistir en BD
      const { data, error: rpcErr } = await supabase
        .rpc('assign_perms', { p_user_id: userId, p_permission_codes: codes });

      if (rpcErr) throw rpcErr;
      if (data && !data.success) throw new Error(data.error || 'Error asignando permisos');

      return { success: true };
    } catch (err) {
      console.error('❌ Error asignando permisos:', err);
      // Revertir optimistic update
      setPermissionCodes(prev => prev.filter(c => !codes.includes(c)));
      return { success: false, error: err.message };
    }
  };

  // ── Revocar permisos — actualización OPTIMISTA (sin reset del modal) ──
  const revokePermissions = async (codes) => {
    if (!codes?.length) return { success: true };
    try {
      // 1. Actualizar estado local inmediatamente (sin loading)
      setPermissionCodes(prev => prev.filter(c => !codes.includes(c)));

      // 2. Persistir en BD
      const { data, error: rpcErr } = await supabase
        .rpc('revoke_perms', { p_user_id: userId, p_permission_codes: codes });

      if (rpcErr) throw rpcErr;
      if (data && !data.success) throw new Error(data.error || 'Error revocando permisos');

      return { success: true };
    } catch (err) {
      console.error('❌ Error revocando permisos:', err);
      // Revertir optimistic update
      setPermissionCodes(prev => [...new Set([...prev, ...codes])]);
      return { success: false, error: err.message };
    }
  };

  // ── Verificar permiso individual ────────────────────────────
  const hasPermission = (permissionCode) => {
    return permissionCodes.includes(permissionCode);
  };

  // ── Asignar TODOS los permisos :view (para usuarios nuevos) ─
  const assignDefaultViewPermissions = async () => {
    try {
      const { data: viewPerms, error: qErr } = await supabase
        .from('permission')
        .select('code')
        .like('code', '%:view');

      if (qErr) throw qErr;

      const codes = (viewPerms || []).map(p => p.code);
      if (codes.length === 0) return { success: true };

      return await assignPermissions(codes);
    } catch (err) {
      console.error('❌ Error asignando permisos por defecto:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    permissions,
    permissionCodes,
    loading,
    error,
    assignPermissions,
    revokePermissions,
    assignDefaultViewPermissions,
    hasPermission,
    refresh: loadPermissions,
  };
}