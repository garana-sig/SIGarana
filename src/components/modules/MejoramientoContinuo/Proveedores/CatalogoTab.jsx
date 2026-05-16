// src/components/modules/MejoramientoContinuo/Proveedores/CatalogoTab.jsx
// Catálogo de proveedores — CRUD completo

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Building2, Loader2, X, Check } from 'lucide-react';
import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Badge }    from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { useProveedores } from '@/hooks/useProveedores';
import { useAuth }        from '@/context/AuthContext';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c' };

const TIPO_LABELS = {
  insumo:      { label: 'Insumo',      bg: '#f0f7f4', color: '#2e5244' },
  contratista: { label: 'Contratista', bg: '#fef3c7', color: '#92400e' },
  servicio:    { label: 'Servicio',    bg: '#eff6ff', color: '#1d4ed8' },
};

const EMPTY_FORM = {
  nombre:   '',
  nit:      '',
  contacto: '',
  telefono: '',
  email:    '',
  ciudad:   '',
  tipo:     'insumo',
};

// ── Modal crear / editar ──────────────────────────────────────────────────────
function ProveedorModal({ open, onClose, initial, onSave, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.nombre?.trim()) return;
    onSave(form);
  };

  // Resetear form cuando cambia initial
  useState(() => { setForm(initial || EMPTY_FORM); }, [initial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ color: C.green }}>
            {initial?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Nombre / Razón Social <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Textiles del Norte S.A.S."
            />
          </div>

          {/* NIT + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">NIT</label>
              <Input
                value={form.nit}
                onChange={e => set('nit', e.target.value)}
                placeholder="900.123.456-7"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => set('tipo', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="insumo">Insumo</option>
                <option value="contratista">Contratista</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
          </div>

          {/* Contacto + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Contacto</label>
              <Input
                value={form.contacto}
                onChange={e => set('contacto', e.target.value)}
                placeholder="Nombre del contacto"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Teléfono</label>
              <Input
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="300 000 0000"
              />
            </div>
          </div>

          {/* Email + Ciudad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
              <Input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="contacto@proveedor.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ciudad</label>
              <Input
                value={form.ciudad}
                onChange={e => set('ciudad', e.target.value)}
                placeholder="Medellín"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.nombre?.trim()}
            style={{ backgroundColor: C.green, color: '#fff' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            {initial?.id ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function ConfirmDeleteModal({ open, onClose, proveedor, onConfirm, saving }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">Eliminar Proveedor</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-2">
          ¿Estás seguro que deseas eliminar a{' '}
          <span className="font-semibold">{proveedor?.nombre}</span>?
          Esta acción no se puede deshacer.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CatalogoTab() {
  const { hasPermission, isAdmin, isGerencia } = useAuth();
  const {
    proveedores, loading, saving,
    createProveedor, updateProveedor, deleteProveedor,
  } = useProveedores();

  const canCreate = isAdmin || isGerencia || hasPermission('proveedores:catalogo:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('proveedores:catalogo:edit');
  const canDelete = isAdmin || isGerencia || hasPermission('proveedores:catalogo:delete');

  const [search,      setSearch]      = useState('');
  const [filterTipo,  setFilterTipo]  = useState('todos');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [deleteItem,  setDeleteItem]  = useState(null);

  // ── Filtros ───────────────────────────────────────────────────────────
  const filtered = proveedores.filter(p => {
    const matchSearch = !search ||
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.nit?.toLowerCase().includes(search.toLowerCase()) ||
      p.ciudad?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || p.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => { setEditItem(null); setModalOpen(true); };
  const handleOpenEdit   = (p) => { setEditItem(p);   setModalOpen(true); };
  const handleClose      = () => { setModalOpen(false); setEditItem(null); };

  const handleSave = async (form) => {
    const result = editItem?.id
      ? await updateProveedor(editItem.id, form)
      : await createProveedor(form);
    if (result.success) handleClose();
  };

  const handleDelete = async () => {
    const result = await deleteProveedor(deleteItem.id);
    if (result.success) setDeleteItem(null);
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.mint }} />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, NIT o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filtro tipo */}
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos los tipos</option>
          <option value="insumo">Insumo</option>
          <option value="contratista">Contratista</option>
          <option value="servicio">Servicio</option>
        </select>

        {canCreate && (
          <Button
            onClick={handleOpenCreate}
            style={{ backgroundColor: C.green, color: '#fff' }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      {/* Contador */}
      <p className="text-xs text-gray-400">
        {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No hay proveedores registrados</p>
          {canCreate && (
            <Button
              variant="ghost"
              className="mt-3 text-sm"
              style={{ color: C.green }}
              onClick={handleOpenCreate}
            >
              Crear el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.green, color: '#fff' }}>
                <th className="px-4 py-3 text-left font-semibold">Nombre / Razón Social</th>
                <th className="px-4 py-3 text-left font-semibold">NIT</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Contacto</th>
                <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                <th className="px-4 py-3 text-left font-semibold">Ciudad</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const tipo = TIPO_LABELS[p.tipo] || TIPO_LABELS.insumo;
                return (
                  <tr
                    key={p.id}
                    className="border-t transition-colors hover:bg-gray-50"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafaf8' }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: C.green }}>
                      {p.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.nit || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className="text-xs font-semibold"
                        style={{ backgroundColor: tipo.bg, color: tipo.color, border: 'none' }}
                      >
                        {tipo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.contacto || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.telefono || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.ciudad   || '—'}</td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteItem(p)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      <ProveedorModal
        open={modalOpen}
        onClose={handleClose}
        initial={editItem}
        onSave={handleSave}
        saving={saving}
      />
      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        proveedor={deleteItem}
        onConfirm={handleDelete}
        saving={saving}
      />
    </div>
  );
}