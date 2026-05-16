// src/components/modules/MejoramientoContinuo/Proveedores/SeleccionProveedores/SeleccionModal.jsx
// Modal crear / editar selección RE-GR-05 — puntajes ponderados por proveedor

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Check, Star } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Badge }  from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { calcularPuntajeSeleccion, PESOS_SELECCION } from '@/hooks/useSeleccionProveedores';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c' };

// ── Criterios con sus pesos ───────────────────────────────────────────────────
const CRITERIOS = [
  { key: 'precio_score',        label: 'Precio',                peso: PESOS_SELECCION.precio,        color: '#dcfce7' },
  { key: 'entrega_score',       label: 'Tiempo de entrega',     peso: PESOS_SELECCION.entrega,        color: '#dbeafe' },
  { key: 'descuento_vol_score', label: 'Descuento por volumen', peso: PESOS_SELECCION.descuento_vol,  color: '#fef9c3' },
  { key: 'descuento_pp_score',  label: 'Descuento pronto pago', peso: PESOS_SELECCION.descuento_pp,   color: '#fef9c3' },
  { key: 'sgsst_score',         label: 'Cumplimiento SGSST',    peso: PESOS_SELECCION.sgsst,          color: '#fce7f3' },
  { key: 'rendimiento_score',   label: 'Rendimiento',           peso: PESOS_SELECCION.rendimiento,    color: '#ede9fe' },
  { key: 'composicion_score',   label: 'Composición',           peso: 0,                              color: '#f0f9ff' },
];

const PUNTUACIONES = [0, 1, 2, 3, 4, 5];

// ── Opción vacía ──────────────────────────────────────────────────────────────
const emptyOpcion = () => ({
  supplier_id:          '',
  proveedor_nombre:     '',
  precio_score:         0,
  entrega_score:        0,
  descuento_vol_score:  0,
  descuento_pp_score:   0,
  sgsst_score:          0,
  rendimiento_score:    0,
  composicion_score:    0,
  puntaje_total:        0,
  es_seleccionado:      false,
});

// ── Card por opción de proveedor ──────────────────────────────────────────────
function OpcionCard({ index, opcion, proveedores, onChange, onRemove, onSelect, canRemove, isWinner }) {
  const puntaje = calcularPuntajeSeleccion(opcion);

  const handleScore = (key, value) => {
    const updated = { ...opcion, [key]: Number(value) };
    updated.puntaje_total = calcularPuntajeSeleccion(updated);
    onChange(updated);
  };

  return (
    <div
      className="rounded-xl border-2 p-4 space-y-3 transition-all"
      style={{
        borderColor: opcion.es_seleccionado ? '#16a34a' : `${C.mint}50`,
        backgroundColor: opcion.es_seleccionado ? '#f0fdf4' : '#fff',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.green }}>
            Opción {index + 1}
          </span>
          {isWinner && (
            <Badge style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              Mayor puntaje
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {puntaje > 0 && (
            <span className="text-sm font-bold" style={{ color: C.green }}>
              {puntaje.toFixed(3)} pts
            </span>
          )}
          <button
            type="button"
            onClick={onSelect}
            title={opcion.es_seleccionado ? 'Proveedor seleccionado' : 'Marcar como seleccionado'}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: opcion.es_seleccionado ? '#dcfce7' : '#f9fafb',
              color: opcion.es_seleccionado ? '#16a34a' : '#9ca3af',
            }}
          >
            <Star className="h-4 w-4" fill={opcion.es_seleccionado ? '#16a34a' : 'none'} />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Selector proveedor */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            Proveedor del catálogo
          </label>
          <select
            value={opcion.supplier_id}
            onChange={e => onChange({ ...opcion, supplier_id: e.target.value, proveedor_nombre: '' })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleccionar...</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            O nombre libre
          </label>
          <Input
            value={opcion.proveedor_nombre}
            onChange={e => onChange({ ...opcion, proveedor_nombre: e.target.value, supplier_id: '' })}
            placeholder="Si no está en catálogo..."
            disabled={!!opcion.supplier_id}
          />
        </div>
      </div>

      {/* Criterios — tabla compacta */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: C.green, color: '#fff' }}>
              <th className="px-3 py-2 text-left">Criterio</th>
              <th className="px-3 py-2 text-center">Peso</th>
              <th className="px-3 py-2 text-center">Score (0-5)</th>
              <th className="px-3 py-2 text-center">Ponderado</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIOS.map((criterio, idx) => {
              const score      = opcion[criterio.key] || 0;
              const ponderado  = criterio.peso > 0 ? (score * criterio.peso).toFixed(3) : '—';
              return (
                <tr
                  key={criterio.key}
                  className="border-t"
                  style={{ backgroundColor: idx % 2 === 0 ? '#fff' : criterio.color + '40' }}
                >
                  <td className="px-3 py-2 text-gray-700">{criterio.label}</td>
                  <td className="px-3 py-2 text-center text-gray-400">
                    {criterio.peso > 0 ? `${(criterio.peso * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={score}
                      onChange={e => handleScore(criterio.key, e.target.value)}
                      className="h-7 rounded border border-input bg-background px-2 text-xs w-16"
                    >
                      {PUNTUACIONES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center font-semibold" style={{ color: C.green }}>
                    {ponderado}
                  </td>
                </tr>
              );
            })}
            {/* Total */}
            <tr className="border-t" style={{ backgroundColor: `${C.mint}15` }}>
              <td colSpan={3} className="px-3 py-2 font-bold text-right" style={{ color: C.green }}>
                Puntaje Total
              </td>
              <td className="px-3 py-2 text-center font-bold text-base" style={{ color: C.green }}>
                {puntaje.toFixed(3)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  insumo_nombre:     '',
  fecha_realizacion: '',
  observaciones:     '',
  realizado_por:     '',
  aprobado_por:      '',
};

export default function SeleccionModal({ open, onClose, initial, onSave, saving, proveedores, users }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [opciones, setOpciones] = useState([emptyOpcion(), emptyOpcion()]);

  // Cargar datos al editar
  useEffect(() => {
    if (initial) {
      setForm({
        insumo_nombre:     initial.insumo_nombre     || '',
        fecha_realizacion: initial.fecha_realizacion || '',
        observaciones:     initial.observaciones     || '',
        realizado_por:     initial.realizado_por     || '',
        aprobado_por:      initial.aprobado_por      || '',
      });
      if (initial.opciones?.length > 0) {
        setOpciones(initial.opciones.map(o => ({
          supplier_id:          o.supplier_id          || '',
          proveedor_nombre:     o.proveedor_nombre     || '',
          precio_score:         o.precio_score         || 0,
          entrega_score:        o.entrega_score        || 0,
          descuento_vol_score:  o.descuento_vol_score  || 0,
          descuento_pp_score:   o.descuento_pp_score   || 0,
          sgsst_score:          o.sgsst_score          || 0,
          rendimiento_score:    o.rendimiento_score    || 0,
          composicion_score:    o.composicion_score    || 0,
          puntaje_total:        o.puntaje_total        || 0,
          es_seleccionado:      o.es_seleccionado      || false,
        })));
      }
    } else {
      setForm(EMPTY_FORM);
      setOpciones([emptyOpcion(), emptyOpcion()]);
    }
  }, [initial, open]);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addOpcion = () => {
    if (opciones.length >= 10) return;
    setOpciones(prev => [...prev, emptyOpcion()]);
  };

  const removeOpcion = (idx) => {
    setOpciones(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOpcion = (idx, updated) => {
    setOpciones(prev => prev.map((o, i) => i === idx ? updated : o));
  };

  // Solo una opción puede estar seleccionada
  const handleSelect = (idx) => {
    setOpciones(prev => prev.map((o, i) => ({
      ...o,
      es_seleccionado: i === idx ? !o.es_seleccionado : false,
    })));
  };

  // Detectar ganador (mayor puntaje)
  const maxPuntaje = Math.max(...opciones.map(o => calcularPuntajeSeleccion(o)));

  const isValid = form.insumo_nombre?.trim() && form.fecha_realizacion &&
    opciones.some(o => o.supplier_id || o.proveedor_nombre?.trim());

  const handleSave = () => {
    if (!isValid) return;
    const opcionesConPuntaje = opciones.map(o => ({
      ...o,
      puntaje_total: calcularPuntajeSeleccion(o),
    }));
    onSave(form, opcionesConPuntaje);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: C.green }}>
            {initial?.id ? `Editar ${initial.consecutive}` : 'Nueva Selección de Proveedor'}
          </DialogTitle>
          <p className="text-xs text-gray-400">RE-GR-05 · Comparativo de proveedores potenciales por insumo</p>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Datos generales */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Datos Generales</p>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Insumo / Contratista <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.insumo_nombre}
                onChange={e => setF('insumo_nombre', e.target.value)}
                placeholder="Ej: Forro, Licra Pacific, Servicios de mantenimiento..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Fecha de realización <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.fecha_realizacion}
                  onChange={e => setF('fecha_realizacion', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Realizado por</label>
                <select
                  value={form.realizado_por}
                  onChange={e => setF('realizado_por', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {users?.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Aprobado por</label>
                <select
                  value={form.aprobado_por}
                  onChange={e => setF('aprobado_por', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {users?.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Observaciones</label>
                <Input
                  value={form.observaciones}
                  onChange={e => setF('observaciones', e.target.value)}
                  placeholder="Observaciones generales..."
                />
              </div>
            </div>
          </div>

          {/* Opciones de proveedores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Proveedores Potenciales ({opciones.length})
              </p>
              {opciones.length < 10 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOpcion}
                  className="text-xs flex items-center gap-1"
                  style={{ color: C.green }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar opción
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Usa la estrella ⭐ para marcar el proveedor seleccionado.
              El sistema calcula automáticamente el puntaje ponderado.
            </p>

            {opciones.map((opcion, idx) => (
              <OpcionCard
                key={idx}
                index={idx}
                opcion={opcion}
                proveedores={proveedores}
                onChange={(updated) => updateOpcion(idx, updated)}
                onRemove={() => removeOpcion(idx)}
                onSelect={() => handleSelect(idx)}
                canRemove={opciones.length > 1}
                isWinner={maxPuntaje > 0 && calcularPuntajeSeleccion(opcion) === maxPuntaje}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isValid}
            style={{ backgroundColor: C.green, color: '#fff' }}
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Check className="h-4 w-4 mr-2" />
            }
            {initial?.id ? 'Guardar cambios' : 'Crear selección'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}