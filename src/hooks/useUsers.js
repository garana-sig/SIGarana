// src/hooks/useUsers.js — v3.0 DEFINITIVO
// Consulta directa a profile + process (sin RPC)
// Razón: la RPC get_users_list puede tener firma desactualizada en BD.
// Esta versión funciona independientemente del estado de las funciones en Supabase.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUsers(filters = {}) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const {
    includeInactive = false,
    processId       = null,
    role            = null,
    searchTerm      = '',
  } = filters;

  useEffect(() => {
    loadUsers();
  }, [includeInactive, processId, role, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // ── Consulta directa: profile JOIN process (sin RPC) ──────────────────
      let query = supabase
        .from('profile')
        .select(`
          id,
          email,
          full_name,
          username,
          role,
          phone,
          avatar_url,
          is_active,
          process_id,
          department_id,
          created_at,
          updated_at,
          process:process_id (
            name,
            code
          )
        `)
        .order('full_name');

      // Filtros
      if (!includeInactive)              query = query.eq('is_active', true);
      if (role)                          query = query.eq('role', role);
      if (processId)                     query = query.eq('process_id', processId);
      if (searchTerm && searchTerm.trim().length > 0) {
        query = query.or(
          `full_name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`
        );
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      // Aplanar el objeto process anidado al mismo nivel
      // para que el componente use user.process_name igual que antes
      const flat = (data || []).map(u => ({
        ...u,
        process_name: u.process?.name || null,
        process_code: u.process?.code || null,
        process: undefined,   // limpiar objeto anidado
      }));

      setUsers(flat);
    } catch (err) {
      console.error('❌ Error loading users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refresh: loadUsers };
}