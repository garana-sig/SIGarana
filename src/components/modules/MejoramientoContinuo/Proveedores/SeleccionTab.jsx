// src/components/modules/MejoramientoContinuo/Proveedores/SeleccionProveedores/SeleccionTab.jsx
// Selección de Proveedores RE-GR-05 — agrupado por insumo + ranking por puntaje

import { useState, useMemo } from 'react';
import {
  Plus, Search, X, Pencil, Trash2, Loader2, GitCompare,
  ChevronDown, ChevronUp, Download, Trophy, Medal,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Badge }  from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { useSeleccionProveedores, calcularPuntajeSeleccion } from '@/hooks/useSeleccionProveedores';
import { useProveedores }  from '@/hooks/useProveedores';
import { useUsers }        from '@/hooks/useUsers';
import { useAuth }         from '@/context/AuthContext';
import SeleccionModal      from './SeleccionModal';
import { exportSeleccion } from '@/utils/exportSeleccion';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c' };

function fmt(date) {
  if (!date) return '—';
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Icono por posición en ranking ────────────────────────────────────────────
function RankIcon({ pos }) {
  if (pos === 1) return <Trophy className="h-4 w-4" style={{ color: '#f59e0b' }} />;
  if (pos === 2) return <Medal  className="h-4 w-4" style={{ color: '#94a3b8' }} />;
  if (pos === 3) return <Medal  className="h-4 w-4" style={{ color: '#b45309' }} />;
  return <span className="text-xs font-bold text-gray-400 w-4 text-center">{pos}°</span>;
}

// ── Tabla de ranking de una selección ────────────────────────────────────────
function RankingTable({ seleccion }) {
  const opciones = useMemo(() =>
    [...(seleccion.opciones || [])]
      .map(o => ({ ...o, puntaje_calc: calcularPuntajeSeleccion(o) }))
      .sort((a, b) => b.puntaje_calc - a.puntaje_calc),
  [seleccion]);

  if (opciones.length === 0) return (
    <p className="text-xs text-gray-400 py-3 text-center">Sin proveedores registrados</p>
  );

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: `${C.green}cc`, color: '#fff' }}>
            <th className="px-3 py-2 text-center w-8">#</th>
            <th className="px-3 py-2 text-left">Proveedor</th>
            <th className="px-3 py-2 text-center">Precio<br/><span className="font-normal opacity-70">50%</span></th>
            <th className="px-3 py-2 text-center">Entrega<br/><span className="font-normal opacity-70">25%</span></th>
            <th className="px-3 py-2 text-center">Dto. Vol<br/><span className="font-normal opacity-70">6.25%</span></th>
            <th className="px-3 py-2 text-center">Dto. PP<br/><span className="font-normal opacity-70">6.25%</span></th>
            <th className="px-3 py-2 text-center">SGSST<br/><span className="font-normal opacity-70">6.25%</span></th>
            <th className="px-3 py-2 text-center">Rendto.<br/><span className="font-normal opacity-70">6.25%</span></th>
            <th className="px-3 py-2 text-center">Composic.</th>
            <th className="px-3 py-2 text-center font-bold">Puntaje</th>
            <th className="px-3 py-2 text-center">Estado</th>
          </tr>
        </thead>
        <tbody>
          {opciones.map((o, idx) => {
            const isWinner = idx === 0;
            return (
              <tr
                key={o.id || idx}
                className="border-t transition-colors"
                style={{
                  backgroundColor: isWinner ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#fafaf8',
                }}
              >
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center"><RankIcon pos={idx + 1} /></div>
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: C.green }}>
                  {o.supplier?.nombre || o.proveedor_nombre || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{o.precio_score || 0}</span>
                    <span className="text-gray-400">{((o.precio_score || 0) * 0.5).toFixed(3)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{o.entrega_score || 0}</span>
                    <span className="text-gray-400">{((o.entrega_score || 0) * 0.25).toFixed(3)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{o.descuento_vol_score || 0}</span>
                    <span className="text-gray-400">{((o.descuento_vol_score || 0) * 0.0625).toFixed(4)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{o.descuento_pp_score || 0}</span>
                    <span className="text-gray-400">{((o.descuento_pp_score || 0) * 0.0625).toFixed(4)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{o.sgsst_score || 0}</span>
                    <span className="text-gray-400">{((o.sgsst_score || 0) * 0.0625).toFixed(4)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{o.rendimiento_score || 0}</span>
                    <span className="text-gray-400">{((o.rendimiento_score || 0) * 0.0625).toFixed(4)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-gray-500">
                  {o.composicion_score || 0}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className="font-bold text-sm px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isWinner ? '#dcfce7' : '#f3f4f6',
                      color: isWinner ? '#16a34a' : C.green,
                    }}
                  >
                    {o.puntaje_calc.toFixed(3)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {o.es_seleccionado ? (
                    <Badge style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '10px' }}>
                      ✓ Elegido
                    </Badge>
                  ) : isWinner ? (
                    <Badge style={{ backgroundColor: '#fefce8', color: '#ca8a04', border: '1px solid #fde68a', fontSize: '10px' }}>
                      Mayor puntaje
                    </Badge>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Fila expandible por selección ─────────────────────────────────────────────
function SeleccionRow({ seleccion, canEdit, canDelete, canExport, onEdit, onDelete, onExport, exporting }) {
  const [expanded, setExpanded] = useState(false);

  const winner = useMemo(() => {
    if (!seleccion.opciones?.length) return null;
    return [...seleccion.opciones]
      .sort((a, b) => calcularPuntajeSeleccion(b) - calcularPuntajeSeleccion(a))[0];
  }, [seleccion]);

  const winnerName = winner?.supplier?.nombre || winner?.proveedor_nombre || null;

  return (
    <>
      <tr
        className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Insumo + proveedor elegido */}
        <td className="px-4 py-3">
          <p className="font-semibold text-sm" style={{ color: C.green }}>
            {seleccion.insumo_nombre}
          </p>
          {winnerName && (
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#16a34a' }}>
              <Trophy className="h-3 w-3 flex-shrink-0" style={{ color: '#f59e0b' }} />
              {winnerName}
            </p>
          )}
        </td>

        {/* N° opciones */}
        <td className="px-4 py-3 text-center">
          <Badge style={{ backgroundColor: `${C.mint}20`, color: C.green, border: 'none', fontSize: '10px' }}>
            {seleccion.opciones?.length || 0} prov.
          </Badge>
        </td>

        {/* Fecha */}
        <td className="px-4 py-3 text-gray-500 text-xs">{fmt(seleccion.fecha_realizacion)}</td>

        {/* Realizado por */}
        <td className="px-4 py-3 text-gray-500 text-xs">
          {seleccion.realizado_por_profile?.full_name || '—'}
        </td>

        {/* Acciones */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
            {canExport && (
              <button
                onClick={() => onExport(seleccion)}
                disabled={exporting}
                className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                title="Exportar RE-GR-05"
              >
                {exporting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                  : <Download className="h-3.5 w-3.5" style={{ color: C.olive }} />
                }
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(seleccion)}
                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5 text-blue-500" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(seleccion)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
            <span className="ml-1">
              {expanded
                ? <ChevronUp   className="h-3.5 w-3.5 text-gray-400" />
                : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              }
            </span>
          </div>
        </td>
      </tr>

      {/* Ranking expandido */}
      {expanded && (
        <tr className="border-t">
          <td colSpan={5} className="px-4 py-3" style={{ backgroundColor: '#f8faf8' }}>
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Score por criterio (número grande) · Ponderado = score × peso (número pequeño en gris)
                {seleccion.observaciones && ` · ${seleccion.observaciones}`}
              </p>
              <RankingTable seleccion={seleccion} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Grupo por insumo ──────────────────────────────────────────────────────────
function InsumoGroup({ insumo, selecciones, canEdit, canDelete, canExport, onEdit, onDelete, onExport, exporting }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 transition-opacity hover:opacity-90 text-left"
        style={{ backgroundColor: C.green, color: '#fff' }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-wide">{insumo}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {selecciones.length} {selecciones.length === 1 ? 'selección' : 'selecciones'}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4 opacity-70" />
          : <ChevronUp   className="h-4 w-4 opacity-70" />
        }
      </button>

      {!collapsed && (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#f0f7f4' }}>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Insumo / Proveedor elegido</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Opciones</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Realizado por</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {selecciones.map(sel => (
              <SeleccionRow
                key={sel.id}
                seleccion={sel}
                canEdit={canEdit}
                canDelete={canDelete}
                canExport={canExport}
                onEdit={onEdit}
                onDelete={onDelete}
                onExport={onExport}
                exporting={exporting}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function ConfirmDeleteModal({ open, onClose, item, onConfirm, saving }) {
  const ganadorNombre = item?.opciones?.length
    ? ([...item.opciones]
        .sort((a, b) => calcularPuntajeSeleccion(b) - calcularPuntajeSeleccion(a))[0]
        ?.supplier?.nombre ||
       [...item.opciones]
        .sort((a, b) => calcularPuntajeSeleccion(b) - calcularPuntajeSeleccion(a))[0]
        ?.proveedor_nombre ||
       null)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">Eliminar Selección</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1">
          <p className="text-sm text-gray-700">
            ¿Eliminar la selección del insumo{' '}
            <span className="font-semibold" style={{ color: C.green }}>
              {item?.insumo_nombre}
            </span>?
          </p>
          {ganadorNombre && (
            <p className="text-xs text-gray-500">
              Proveedor registrado:{' '}
              <span className="font-semibold">{ganadorNombre}</span>
            </p>
          )}
          <p className="text-xs text-gray-400 pt-1">Esta acción no se puede deshacer.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Trash2 className="h-4 w-4 mr-2" />
            }
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SeleccionTab() {
  const { hasPermission, isAdmin, isGerencia } = useAuth();
  const {
    selecciones, loading, saving,
    createSeleccion, updateSeleccion, deleteSeleccion,
  } = useSeleccionProveedores();
  const { proveedores } = useProveedores();
  const { users }       = useUsers();

  const canCreate = isAdmin || isGerencia || hasPermission('proveedores:seleccion:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('proveedores:seleccion:edit');
  const canDelete = isAdmin || isGerencia || hasPermission('proveedores:seleccion:delete');
  const canExport = isAdmin || isGerencia || hasPermission('proveedores:seleccion:export');

  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [exporting,  setExporting]  = useState(false);

  // Filtrar y agrupar por insumo
  const grouped = useMemo(() => {
    const filtered = selecciones.filter(s =>
      !search ||
      s.insumo_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      s.consecutive?.toLowerCase().includes(search.toLowerCase())
    );
    const groups = {};
    filtered.forEach(s => {
      const key = s.insumo_nombre || 'SIN INSUMO';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [selecciones, search]);

  const handleOpenCreate = () => { setEditItem(null); setModalOpen(true); };
  const handleOpenEdit   = (s) => { setEditItem(s);   setModalOpen(true); };
  const handleClose      = () => { setModalOpen(false); setEditItem(null); };

  const handleSave = async (formData, opciones) => {
    const result = editItem?.id
      ? await updateSeleccion(editItem.id, formData, opciones)
      : await createSeleccion(formData, opciones);
    if (result.success) handleClose();
  };

  const handleDelete = async () => {
    const result = await deleteSeleccion(deleteItem.id);
    if (result.success) setDeleteItem(null);
  };

  const handleExport = async (seleccion) => {
    setExporting(true);
    try { await exportSeleccion(seleccion); }
    finally { setExporting(false); }
  };

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
            placeholder="Buscar por insumo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>
        {canCreate && (
          <Button
            onClick={handleOpenCreate}
            style={{ backgroundColor: C.green, color: '#fff' }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Selección
          </Button>
        )}
      </div>

      {/* Contador */}
      {grouped.length > 0 && (
        <p className="text-xs text-gray-400">
          {grouped.length} insumo{grouped.length !== 1 ? 's' : ''} ·{' '}
          {selecciones.length} selección{selecciones.length !== 1 ? 'es' : ''} en total
        </p>
      )}

      {/* Grupos por insumo */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GitCompare className="h-12 w-12 mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No hay selecciones registradas</p>
          {canCreate && (
            <Button variant="ghost" className="mt-3 text-sm" style={{ color: C.green }} onClick={handleOpenCreate}>
              Crear la primera
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([insumo, sels]) => (
            <InsumoGroup
              key={insumo}
              insumo={insumo}
              selecciones={sels}
              canEdit={canEdit}
              canDelete={canDelete}
              canExport={canExport}
              onEdit={handleOpenEdit}
              onDelete={setDeleteItem}
              onExport={handleExport}
              exporting={exporting}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      <SeleccionModal
        open={modalOpen}
        onClose={handleClose}
        initial={editItem}
        onSave={handleSave}
        saving={saving}
        proveedores={proveedores}
        users={users}
      />
      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        item={deleteItem}
        onConfirm={handleDelete}
        saving={saving}
      />
    </div>
  );
}