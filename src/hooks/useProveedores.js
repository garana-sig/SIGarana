// src/hooks/useProveedores.js
// CRUD catálogo de proveedores — Garana SIG

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useProveedores() {
  const { user } = useAuth();

  const [proveedores, setProveedores]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  // ── Cargar todos los proveedores activos ─────────────────────────────
  const loadProveedores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('supplier')
        .select('*')
        .is('deleted_at', null)
        .order('nombre', { ascending: true });

      if (err) throw err;
      setProveedores(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProveedores(); }, [loadProveedores]);

  // ── Crear proveedor ──────────────────────────────────────────────────
  const createProveedor = useCallback(async (formData) => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('supplier')
        .insert({
          nombre:     formData.nombre?.trim(),
          nit:        formData.nit?.trim()      || null,
          contacto:   formData.contacto?.trim() || null,
          telefono:   formData.telefono?.trim() || null,
          email:      formData.email?.trim()    || null,
          ciudad:     formData.ciudad?.trim()   || null,
          tipo:       formData.tipo             || 'insumo',
          is_active:  true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (err) throw err;
      await loadProveedores();
      return { success: true, data };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [user, loadProveedores]);

  // ── Editar proveedor ─────────────────────────────────────────────────
  const updateProveedor = useCallback(async (id, formData) => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('supplier')
        .update({
          nombre:   formData.nombre?.trim(),
          nit:      formData.nit?.trim()      || null,
          contacto: formData.contacto?.trim() || null,
          telefono: formData.telefono?.trim() || null,
          email:    formData.email?.trim()    || null,
          ciudad:   formData.ciudad?.trim()   || null,
          tipo:     formData.tipo             || 'insumo',
        })
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      await loadProveedores();
      return { success: true, data };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadProveedores]);

  // ── Soft delete proveedor ────────────────────────────────────────────
  const deleteProveedor = useCallback(async (id) => {
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('supplier')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (err) throw err;
      await loadProveedores();
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [loadProveedores]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const proveedoresByTipo = useCallback((tipo) =>
    proveedores.filter(p => p.tipo === tipo && p.is_active),
  [proveedores]);

  return {
    proveedores,
    loading,
    saving,
    error,
    loadProveedores,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    proveedoresByTipo,
  };
}