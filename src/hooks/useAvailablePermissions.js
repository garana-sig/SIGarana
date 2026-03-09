// src/hooks/useAvailablePermissions.js
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para obtener todos los permisos disponibles en el sistema
 */
export function useAvailablePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [permissionsByModule, setPermissionsByModule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: permError } = await supabase
        .from('permission')
        .select(`
          *,
          module:module_id (
            id,
            code,
            name,
            display_order
          )
        `)
        .order('code');

      if (permError) throw permError;

      // Deduplicar por code — si la BD tiene filas repetidas, quedarse con la primera
      const seen = new Set();
      const deduped = (data || []).filter(perm => {
        if (seen.has(perm.code)) return false;
        seen.add(perm.code);
        return true;
      });

      setPermissions(deduped);

      const grouped = deduped.reduce((acc, perm) => {
        const moduleCode = perm.module?.code || 'other';
        if (!acc[moduleCode]) {
          acc[moduleCode] = {
            module: perm.module,
            permissions: []
          };
        }
        acc[moduleCode].permissions.push(perm);
        return acc;
      }, {});

      setPermissionsByModule(grouped);

    } catch (err) {
      console.error('❌ Error loading permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    permissions,
    permissionsByModule,
    loading,
    error,
    refresh: loadPermissions
  };
}