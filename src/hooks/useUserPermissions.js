// src/hooks/useUserPermissions.js
// ✅ Sin optimistic update — siempre refleja el estado real de BD
// ✅ Refresh automático tras assign/revoke
// ✅ Expone `saving` para mostrar spinner en el botón que se está guardando

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserPermissions(userId) {
  const [permissions,     setPermissions]     = useState([]);
  const [permissionCodes, setPermissionCodes] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState(null);

  // ── Cargar permisos del usuario desde BD ─────────────────────────
  // silent=true → no muestra spinner (usado tras assign/revoke para no desmontar el panel)
  const loadPermissions = useCallback(async (silent = false) => {
    if (!userId) {
      setPermissions([]);
      setPermissionCodes([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

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
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // ── Asignar — persiste en BD, luego recarga para confirmar ────────
  const assignPermissions = async (codes) => {
    if (!codes?.length) return { success: true };
    setSaving(true);
    try {
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('assign_perms', {
          p_user_id:          userId,
          p_permission_codes: codes,
        });

      if (rpcErr) throw rpcErr;
      if (rpcData?.success === false) throw new Error(rpcData.error || 'Error al asignar permisos');

      await loadPermissions(true); // silent=true → no desmonta el panel
      return { success: true };
    } catch (err) {
      console.error('❌ Error asignando permisos:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  // ── Revocar — persiste en BD, luego recarga para confirmar ────────
  const revokePermissions = async (codes) => {
    if (!codes?.length) return { success: true };
    setSaving(true);
    try {
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('revoke_perms', {
          p_user_id:          userId,
          p_permission_codes: codes,
        });

      if (rpcErr) throw rpcErr;
      if (rpcData?.success === false) throw new Error(rpcData.error || 'Error al revocar permisos');

      await loadPermissions(true); // silent=true → no desmonta el panel
      return { success: true };
    } catch (err) {
      console.error('❌ Error revocando permisos:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const hasPermission = (permissionCode) => permissionCodes.includes(permissionCode);

  const assignDefaultViewPermissions = async () => {
    try {
      const { data: viewPerms, error: qErr } = await supabase
        .from('permission').select('code').like('code', '%:view');
      if (qErr) throw qErr;
      const codes = (viewPerms || []).map(p => p.code);
      if (!codes.length) return { success: true };
      return await assignPermissions(codes);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    permissions,
    permissionCodes,
    loading,
    saving,   // true mientras el RPC está en vuelo
    error,
    assignPermissions,
    revokePermissions,
    assignDefaultViewPermissions,
    hasPermission,
    refresh: loadPermissions,
  };
}