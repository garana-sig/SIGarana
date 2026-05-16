// src/components/modules/MejoramientoContinuo/Proveedores/EvaluacionProveedores/EvaluacionModal.jsx
// Modal crear / editar evaluación RE-GR-01 — hasta 7 proveedores con criterios ponderados

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Badge }  from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  calcularConfiabilidad,
  confiabilidadLabel,
  confiabilidadColor,
} from '@/hooks/useEvaluacionProveedores';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c' };

// ── Criterios del formato RE-GR-01 ───────────────────────────────────────────
const CRITERIOS = {
  calidad: {
    label: 'CALIDAD',
    color: '#dcfce7',
    headerColor: '#16a34a',
    peso: 0.40,
    subcategorias: [
      { key: 'no_conforme',   label: 'El insumo ha generado producto no conforme' },
      { key: 'devoluciones',  label: 'Se han realizado devoluciones por calidad' },
      { key: 'sst',           label: 'El proveedor tiene implementado el SST' },
    ],
  },
  servicio: {
    label: 'SERVICIO',
    color: '#dbeafe',
    headerColor: '#1d4ed8',
    peso: 0.35,
    subcategorias: [
      { key: 'cantidad',      label: 'Cantidad de entrega' },
      { key: 'oportunidad',   label: 'Oportunidad / Fecha' },
      { key: 'reclamos',      label: 'Atención de reclamos' },
      { key: 'documentacion', label: 'Documentación solicitada' },
    ],
  },
  precio: {
    label: 'PRECIO',
    color: '#fef9c3',
    headerColor: '#ca8a04',
    peso: 0.25,
    subcategorias: [
      { key: 'competitividad', label: 'Competitividad' },
      { key: 'forma_pago',     label: 'Forma de pago' },
      { key: 'descuentos',     label: 'Descuentos' },
    ],
  },
  contratista: {
    label: 'SOLO PARA CONTRATISTAS',
    color: '#fce7f3',
    headerColor: '#be185d',
    peso: 0.00,
    subcategorias: [
      { key: 'peligros', label: 'Grado de conocimiento de peligros y forma de controlarlos' },
    ],
  },
};

// ── Puntuaciones posibles ─────────────────────────────────────────────────────
const PUNTUACIONES = [
  { value: 5, label: '5 — Excelente' },
  { value: 4, label: '4 — Bueno' },
  { value: 3, label: '3 — Aceptable' },
  { value: 2, label: '2 — Deficiente' },
  { value: 1, label: '1 — Muy deficiente' },
  { value: 0, label: '0 — N/A' },
];

// ── Calcular resultado de un criterio ────────────────────────────────────────
function calcularResultadoCriterio(subcats, peso) {
  const scores = Object.values(subcats).filter(v => v > 0);
  if (scores.length === 0) return { promedio: 0, resultado: 0 };
  const promedio = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    promedio:  parseFloat(promedio.toFixed(2)),
    resultado: parseFloat((promedio * peso).toFixed(2)),
  };
}

// ── Score vacío por defecto ───────────────────────────────────────────────────
const emptyScore = () => ({
  supplier_id:      '',
  is_contractor:    false,
  aspectos_mejorar: '',
  calidad:     { subcats: {}, puntuacion: 0, resultado: 0, peso: CRITERIOS.calidad.peso },
  servicio:    { subcats: {}, puntuacion: 0, resultado: 0, peso: CRITERIOS.servicio.peso },
  precio:      { subcats: {}, puntuacion: 0, resultado: 0, peso: CRITERIOS.precio.peso },
  contratista: { subcats: {}, puntuacion: 0, resultado: 0, peso: 0 },
  total_score:   0,
  confiabilidad: null,
});

// ── Recalcular totales de un score ────────────────────────────────────────────
function recalcularScore(score) {
  const calidad    = calcularResultadoCriterio(score.calidad.subcats,    CRITERIOS.calidad.peso);
  const servicio   = calcularResultadoCriterio(score.servicio.subcats,   CRITERIOS.servicio.peso);
  const precio     = calcularResultadoCriterio(score.precio.subcats,     CRITERIOS.precio.peso);
  const contratista = score.is_contractor
    ? calcularResultadoCriterio(score.contratista.subcats, 1)
    : { promedio: 0, resultado: 0 };

  const total = parseFloat((
    calidad.resultado + servicio.resultado + precio.resultado +
    (score.is_contractor ? contratista.resultado * 0.10 : 0)
  ).toFixed(2));

  return {
    ...score,
    calidad:     { ...score.calidad,    puntuacion: calidad.promedio,    resultado: calidad.resultado    },
    servicio:    { ...score.servicio,   puntuacion: servicio.promedio,   resultado: servicio.resultado   },
    precio:      { ...score.precio,     puntuacion: precio.promedio,     resultado: precio.resultado     },
    contratista: { ...score.contratista,puntuacion: contratista.promedio,resultado: contratista.resultado},
    total_score:   total,
    confiabilidad: calcularConfiabilidad(total),
  };
}

// ── Sección de criterio por proveedor ────────────────────────────────────────
function CriterioSection({ criterioKey, criterio, subcats, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-colors hover:opacity-90"
        style={{ backgroundColor: criterio.color, color: criterio.headerColor }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{criterio.label} — Peso: {(criterio.peso * 100).toFixed(0)}%</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-white">
          {criterio.subcategorias.map(sub => (
            <div key={sub.key} className="flex items-center gap-3">
              <label className="text-xs text-gray-600 flex-1 leading-tight">{sub.label}</label>
              <select
                value={subcats[sub.key] || 0}
                onChange={e => onChange(sub.key, Number(e.target.value))}
                disabled={disabled}
                className="h-7 rounded border border-input bg-background px-2 text-xs w-40"
              >
                {PUNTUACIONES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card por proveedor ────────────────────────────────────────────────────────
function ProveedorCard({ index, score, proveedores, onChange, onRemove, canRemove }) {
  const conf = confiabilidadColor(score.confiabilidad);

  const handleCriterioChange = (criterioKey, subKey, value) => {
    const updated = {
      ...score,
      [criterioKey]: {
        ...score[criterioKey],
        subcats: { ...score[criterioKey].subcats, [subKey]: value },
      },
    };
    onChange(recalcularScore(updated));
  };

  return (
    <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: `${C.mint}50` }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.green }}>
          Proveedor {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {score.confiabilidad && (
            <Badge
              className="text-xs"
              style={{ backgroundColor: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}
            >
              {confiabilidadLabel(score.confiabilidad)} — {score.total_score.toFixed(2)} pts
            </Badge>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Selector proveedor */}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Proveedor <span className="text-red-500">*</span></label>
        <select
          value={score.supplier_id}
          onChange={e => onChange({ ...score, supplier_id: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Seleccionar proveedor...</option>
          {proveedores.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} {p.nit ? `(${p.nit})` : ''}</option>
          ))}
        </select>
      </div>

      {/* ¿Es contratista? */}
      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={score.is_contractor}
          onChange={e => onChange(recalcularScore({ ...score, is_contractor: e.target.checked }))}
          className="rounded"
        />
        Es contratista (activa criterio SST adicional)
      </label>

      {/* Criterios */}
      <div className="space-y-2">
        {Object.entries(CRITERIOS).map(([key, criterio]) => {
          if (key === 'contratista' && !score.is_contractor) return null;
          return (
            <CriterioSection
              key={key}
              criterioKey={key}
              criterio={criterio}
              subcats={score[key]?.subcats || {}}
              onChange={(subKey, value) => handleCriterioChange(key, subKey, value)}
            />
          );
        })}
      </div>

      {/* Resumen criterios */}
      {score.total_score > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          {['calidad', 'servicio', 'precio'].map(k => (
            <div key={k} className="text-center">
              <p className="text-xs text-gray-400 capitalize">{k}</p>
              <p className="text-sm font-bold" style={{ color: C.green }}>
                {(score[k]?.resultado || 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Aspectos por mejorar */}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Aspectos por mejorar</label>
        <textarea
          value={score.aspectos_mejorar}
          onChange={e => onChange({ ...score, aspectos_mejorar: e.target.value })}
          rows={2}
          placeholder="Observaciones específicas para este proveedor..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  fecha_inicio:         '',
  fecha_fin:            '',
  fecha_evaluacion:     '',
  conclusiones:         '',
  aspectos_por_mejorar: '',
  realizado_por:        '',
  aprobado_por:         '',
};

export default function EvaluacionModal({ open, onClose, initial, onSave, saving, proveedores, users }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [scores, setScores] = useState([emptyScore()]);

  // Cargar datos al editar
  useEffect(() => {
    if (initial) {
      setForm({
        fecha_inicio:         initial.fecha_inicio         || '',
        fecha_fin:            initial.fecha_fin             || '',
        fecha_evaluacion:     initial.fecha_evaluacion      || '',
        conclusiones:         initial.conclusiones          || '',
        aspectos_por_mejorar: initial.aspectos_por_mejorar || '',
        realizado_por:        initial.realizado_por         || '',
        aprobado_por:         initial.aprobado_por          || '',
      });
      if (initial.scores?.length > 0) {
        setScores(initial.scores.map(s => ({
          supplier_id:      s.supplier_id      || '',
          is_contractor:    s.is_contractor     || false,
          aspectos_mejorar: s.aspectos_mejorar  || '',
          calidad:     { subcats: s.calidad?.subcats     || {}, puntuacion: s.calidad?.puntuacion     || 0, resultado: s.calidad?.resultado     || 0, peso: CRITERIOS.calidad.peso },
          servicio:    { subcats: s.servicio?.subcats    || {}, puntuacion: s.servicio?.puntuacion    || 0, resultado: s.servicio?.resultado    || 0, peso: CRITERIOS.servicio.peso },
          precio:      { subcats: s.precio?.subcats      || {}, puntuacion: s.precio?.puntuacion      || 0, resultado: s.precio?.resultado      || 0, peso: CRITERIOS.precio.peso },
          contratista: { subcats: s.contratista?.subcats || {}, puntuacion: s.contratista?.puntuacion || 0, resultado: s.contratista?.resultado || 0, peso: 0 },
          total_score:   s.total_score   || 0,
          confiabilidad: s.confiabilidad || null,
        })));
      }
    } else {
      setForm(EMPTY_FORM);
      setScores([emptyScore()]);
    }
  }, [initial, open]);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addProveedor = () => {
    if (scores.length >= 7) return;
    setScores(prev => [...prev, emptyScore()]);
  };

  const removeProveedor = (idx) => {
    setScores(prev => prev.filter((_, i) => i !== idx));
  };

  const updateScore = (idx, updated) => {
    setScores(prev => prev.map((s, i) => i === idx ? updated : s));
  };

  const isValid = form.fecha_inicio && form.fecha_fin &&
    scores.every(s => s.supplier_id);

  const handleSave = () => {
    if (!isValid) return;
    onSave(form, scores);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: C.green }}>
            {initial?.id ? `Editar ${initial.consecutive}` : 'Nueva Evaluación de Proveedores'}
          </DialogTitle>
          <p className="text-xs text-gray-400">RE-GR-01 · Escala: 5 Excelente · 4 Bueno · 3 Aceptable · 2 Deficiente · 1 Muy deficiente</p>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Datos generales */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Datos Generales</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Fecha inicio período <span className="text-red-500">*</span>
                </label>
                <Input type="date" value={form.fecha_inicio} onChange={e => setF('fecha_inicio', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Fecha fin período <span className="text-red-500">*</span>
                </label>
                <Input type="date" value={form.fecha_fin} onChange={e => setF('fecha_fin', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha de evaluación</label>
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setF('fecha_evaluacion', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>
          </div>

          {/* Proveedores a evaluar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Proveedores a Evaluar ({scores.length}/7)
              </p>
              {scores.length < 7 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addProveedor}
                  className="text-xs flex items-center gap-1"
                  style={{ color: C.green }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar proveedor
                </Button>
              )}
            </div>

            {scores.map((score, idx) => (
              <ProveedorCard
                key={idx}
                index={idx}
                score={score}
                proveedores={proveedores}
                onChange={(updated) => updateScore(idx, updated)}
                onRemove={() => removeProveedor(idx)}
                canRemove={scores.length > 1}
              />
            ))}
          </div>

          {/* Conclusiones */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Análisis y Conclusiones</p>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Conclusiones generales</label>
              <textarea
                value={form.conclusiones}
                onChange={e => setF('conclusiones', e.target.value)}
                rows={3}
                placeholder="Conclusiones del período evaluado..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Aspectos por mejorar (general)</label>
              <textarea
                value={form.aspectos_por_mejorar}
                onChange={e => setF('aspectos_por_mejorar', e.target.value)}
                rows={2}
                placeholder="Aspectos generales del período..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
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
            {initial?.id ? 'Guardar cambios' : 'Crear evaluación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}