// src/components/modules/MejoramientoContinuo/Proveedores/EvaluacionProveedores/EvaluacionTab.jsx
// Evaluación de Proveedores RE-GR-01 — tabla + dashboard gráficas

import { useState, useMemo } from 'react';
import {
  Plus, Download, Search, X, Eye, Pencil, Trash2,
  Loader2, BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Badge }  from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useEvaluacionProveedores, confiabilidadColor, confiabilidadLabel } from '@/hooks/useEvaluacionProveedores';
import { useProveedores }   from '@/hooks/useProveedores';
import { useUsers }         from '@/hooks/useUsers';
import { useAuth }          from '@/context/AuthContext';
import EvaluacionModal      from './EvaluacionModal';
import { exportEvaluacion } from '@/utils/exportEvaluacion';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', amber: '#d97706' };

const STATUS_MAP = {
  draft:    { label: 'Borrador', bg: '#f3f4f6', color: '#6b7280' },
  approved: { label: 'Aprobada', bg: '#f0fdf4', color: '#16a34a' },
};

const CHART_COLORS = ['#2e5244', '#6dbd96', '#6f7b2c', '#d97706', '#3b82f6', '#8b5cf6', '#ec4899'];

function fmt(date) {
  if (!date) return '—';
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Dashboard de gráficas ─────────────────────────────────────────────────────
function EvaluacionDashboard({ evaluaciones }) {
  // Tomar la evaluación más reciente aprobada para las gráficas principales
  const latest = useMemo(() =>
    evaluaciones.find(e => e.status === 'approved') || evaluaciones[0],
  [evaluaciones]);

  const scores = latest?.scores || [];

  // 1. Radar — comparativo de criterios por proveedor (última evaluación)
  const radarData = useMemo(() => [
    { criterio: 'Calidad',  ...Object.fromEntries(scores.map(s => [s.supplier?.nombre || 'Prov', s.calidad?.resultado || 0])) },
    { criterio: 'Servicio', ...Object.fromEntries(scores.map(s => [s.supplier?.nombre || 'Prov', s.servicio?.resultado || 0])) },
    { criterio: 'Precio',   ...Object.fromEntries(scores.map(s => [s.supplier?.nombre || 'Prov', s.precio?.resultado || 0])) },
  ], [scores]);

  // 2. Bar — ranking de proveedores por puntaje total (última evaluación)
  const barData = useMemo(() =>
    [...scores]
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map(s => ({
        nombre: s.supplier?.nombre || 'Proveedor',
        puntaje: parseFloat((s.total_score || 0).toFixed(2)),
        confiabilidad: s.confiabilidad,
      })),
  [scores]);

  // 3. Donut — distribución de confiabilidad del período
  const donutData = useMemo(() => {
    const counts = { confiable: 0, aceptable: 0, deficiente: 0 };
    evaluaciones.forEach(e =>
      e.scores?.forEach(s => { if (s.confiabilidad) counts[s.confiabilidad]++; })
    );
    return [
      { name: 'Confiable',  value: counts.confiable,  color: '#16a34a' },
      { name: 'Aceptable',  value: counts.aceptable,  color: '#ca8a04' },
      { name: 'Deficiente', value: counts.deficiente, color: '#dc2626' },
    ].filter(d => d.value > 0);
  }, [evaluaciones]);

  // 4. Line — evolución histórica promedio por evaluación
  const lineData = useMemo(() =>
    [...evaluaciones]
      .filter(e => e.scores?.length > 0)
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
      .map(e => {
        const avg = e.scores.reduce((sum, s) => sum + (s.total_score || 0), 0) / e.scores.length;
        return {
          periodo:  e.consecutive || fmt(e.fecha_inicio),
          promedio: parseFloat(avg.toFixed(2)),
        };
      }),
  [evaluaciones]);

  if (evaluaciones.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" style={{ color: C.mint }} />
        <h3 className="font-semibold text-sm" style={{ color: C.green }}>
          Dashboard — Indicadores de Evaluación
        </h3>
        {latest && (
          <Badge className="text-xs" style={{ backgroundColor: `${C.mint}20`, color: C.green, border: 'none' }}>
            Última: {latest.consecutive || fmt(latest.fecha_inicio)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar — Comparativo criterios */}
        {scores.length > 0 && (
          <div className="rounded-xl border p-4 bg-white">
            <p className="text-xs font-semibold text-gray-500 mb-3">Comparativo por Criterio</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 11, fill: '#374151' }} />
                {scores.map((s, i) => (
                  <Radar
                    key={s.id}
                    name={s.supplier?.nombre || `Prov ${i + 1}`}
                    dataKey={s.supplier?.nombre || 'Prov'}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v.toFixed(2)} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar — Ranking puntaje total */}
        {barData.length > 0 && (
          <div className="rounded-xl border p-4 bg-white">
            <p className="text-xs font-semibold text-gray-500 mb-3">Ranking de Proveedores</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => [`${v.toFixed(2)} pts`, 'Puntaje']} />
                <Bar dataKey="puntaje" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => {
                    const colors = confiabilidadColor(entry.confiabilidad);
                    return <Cell key={i} fill={colors.color} />;
                  })}
                </Bar>
                {/* Líneas de referencia */}
                <CartesianGrid x={3} stroke="#16a34a" strokeDasharray="4 4" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-green-600" /> Confiable ≥ 4
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-yellow-600" /> Aceptable ≥ 3
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-red-600" /> Deficiente
              </span>
            </div>
          </div>
        )}

        {/* Donut — Distribución confiabilidad */}
        {donutData.length > 0 && (
          <div className="rounded-xl border p-4 bg-white">
            <p className="text-xs font-semibold text-gray-500 mb-3">Distribución de Confiabilidad (Todos los períodos)</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Line — Evolución histórica */}
        {lineData.length > 1 && (
          <div className="rounded-xl border p-4 bg-white">
            <p className="text-xs font-semibold text-gray-500 mb-3">Evolución Promedio por Período</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v.toFixed(2)} pts`, 'Promedio']} />
                <Line
                  type="monotone"
                  dataKey="promedio"
                  stroke={C.mint}
                  strokeWidth={2}
                  dot={{ fill: C.green, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal detalle (solo lectura) ──────────────────────────────────────────────
function EvaluacionDetailModal({ open, onClose, evaluacion }) {
  if (!evaluacion) return null;
  const scores = evaluacion.scores || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: C.green }}>
            {evaluacion.consecutive} — Detalle de Evaluación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Datos generales */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400 text-xs">Período</span>
              <p className="font-medium">{fmt(evaluacion.fecha_inicio)} → {fmt(evaluacion.fecha_fin)}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Fecha evaluación</span>
              <p className="font-medium">{fmt(evaluacion.fecha_evaluacion)}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Realizado por</span>
              <p className="font-medium">{evaluacion.realizado_por_profile?.full_name || '—'}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Aprobado por</span>
              <p className="font-medium">{evaluacion.aprobado_por_profile?.full_name || '—'}</p>
            </div>
          </div>

          {/* Scores por proveedor */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Resultados por Proveedor
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: C.green, color: '#fff' }}>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-center">Calidad</th>
                    <th className="px-3 py-2 text-center">Servicio</th>
                    <th className="px-3 py-2 text-center">Precio</th>
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-center">Confiabilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, idx) => {
                    const conf = confiabilidadColor(s.confiabilidad);
                    return (
                      <tr key={s.id} className="border-t" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafaf8' }}>
                        <td className="px-3 py-2 font-medium" style={{ color: C.green }}>
                          {s.supplier?.nombre || '—'}
                        </td>
                        <td className="px-3 py-2 text-center">{(s.calidad?.resultado || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{(s.servicio?.resultado || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{(s.precio?.resultado || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center font-bold">{(s.total_score || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            className="text-xs"
                            style={{ backgroundColor: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}
                          >
                            {confiabilidadLabel(s.confiabilidad)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusiones */}
          {evaluacion.conclusiones && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Conclusiones</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{evaluacion.conclusiones}</p>
            </div>
          )}
          {evaluacion.aspectos_por_mejorar && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Aspectos por Mejorar</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{evaluacion.aspectos_por_mejorar}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function ConfirmDeleteModal({ open, onClose, item, onConfirm, saving }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">Eliminar Evaluación</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-2">
          ¿Eliminar la evaluación <span className="font-semibold">{item?.consecutive}</span>? Esta acción no se puede deshacer.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function EvaluacionTab() {
  const { hasPermission, isAdmin, isGerencia } = useAuth();
  const {
    evaluaciones, loading, saving,
    createEvaluacion, updateEvaluacion, deleteEvaluacion,
  } = useEvaluacionProveedores();
  const { proveedores } = useProveedores();
  const { users }       = useUsers();

  const canCreate = isAdmin || isGerencia || hasPermission('proveedores:evaluacion:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('proveedores:evaluacion:edit');
  const canDelete = isAdmin || isGerencia || hasPermission('proveedores:evaluacion:delete');
  const canExport = isAdmin || isGerencia || hasPermission('proveedores:evaluacion:export');

  const [search,       setSearch]       = useState('');
  const [showCharts,   setShowCharts]   = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [detailItem,   setDetailItem]   = useState(null);
  const [deleteItem,   setDeleteItem]   = useState(null);
  const [exporting,    setExporting]    = useState(false);

  const filtered = evaluaciones.filter(e =>
    !search ||
    e.consecutive?.toLowerCase().includes(search.toLowerCase()) ||
    e.conclusiones?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => { setEditItem(null); setModalOpen(true); };
  const handleOpenEdit   = (e) => { setEditItem(e);   setModalOpen(true); };
  const handleClose      = () => { setModalOpen(false); setEditItem(null); };

  const handleSave = async (formData, scores) => {
    const result = editItem?.id
      ? await updateEvaluacion(editItem.id, formData, scores)
      : await createEvaluacion(formData, scores);
    if (result.success) handleClose();
  };

  const handleDelete = async () => {
    const result = await deleteEvaluacion(deleteItem.id);
    if (result.success) setDeleteItem(null);
  };

  const handleExport = async (evaluacion) => {
    setExporting(true);
    try {
      await exportEvaluacion(evaluacion);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.mint }} />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Dashboard gráficas */}
      {evaluaciones.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ color: C.green }}
            onClick={() => setShowCharts(v => !v)}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: C.mint }} />
              Dashboard de Indicadores
            </span>
            {showCharts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showCharts && (
            <div className="p-4 border-t bg-gray-50">
              <EvaluacionDashboard evaluaciones={evaluaciones} />
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar evaluaciones..."
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
            Nueva Evaluación
          </Button>
        )}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="h-12 w-12 mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No hay evaluaciones registradas</p>
          {canCreate && (
            <Button variant="ghost" className="mt-3 text-sm" style={{ color: C.green }} onClick={handleOpenCreate}>
              Crear la primera
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.green, color: '#fff' }}>
                <th className="px-4 py-3 text-left font-semibold">Consecutivo</th>
                <th className="px-4 py-3 text-left font-semibold">Período</th>
                <th className="px-4 py-3 text-center font-semibold">Proveedores</th>
                <th className="px-4 py-3 text-left font-semibold">Realizado por</th>
                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                <th className="px-4 py-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, idx) => {
                const status = STATUS_MAP[ev.status] || STATUS_MAP.draft;
                return (
                  <tr
                    key={ev.id}
                    className="border-t hover:bg-gray-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafaf8' }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: C.green }}>
                      {ev.consecutive}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmt(ev.fecha_inicio)} → {fmt(ev.fecha_fin)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge style={{ backgroundColor: `${C.mint}20`, color: C.green, border: 'none' }}>
                        {ev.scores?.length || 0} prov.
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ev.realizado_por_profile?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge style={{ backgroundColor: status.bg, color: status.color, border: 'none' }}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailItem(ev)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </button>
                        {canExport && (
                          <button
                            onClick={() => handleExport(ev)}
                            disabled={exporting}
                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                            title="Exportar RE-GR-01"
                          >
                            {exporting
                              ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              : <Download className="h-4 w-4" style={{ color: C.olive }} />
                            }
                          </button>
                        )}
                        {canEdit && ev.status === 'draft' && (
                          <button
                            onClick={() => handleOpenEdit(ev)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteItem(ev)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      <EvaluacionModal
        open={modalOpen}
        onClose={handleClose}
        initial={editItem}
        onSave={handleSave}
        saving={saving}
        proveedores={proveedores}
        users={users}
      />
      <EvaluacionDetailModal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        evaluacion={detailItem}
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