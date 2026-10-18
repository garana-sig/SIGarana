// src/components/modules/MejoramientoContinuo/MatrizLegal/RequisitoModal.jsx
// Crear / editar / ver una norma de la Matriz Legal (RE-DP-04)
// Responsables: varios, de 4 tipos (proceso · usuario · cargo · comité)
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { X, Save, Loader2, Plus, Scale, Users } from 'lucide-react';
import {
  MATRICES, TIPOS_NORMA, TIPOS_RESPONSABLE, nombreResponsable,
} from '@/hooks/useMatrizLegal';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc' };

const VACIO = {
  matriz: 'general', anio_emision: '', fecha_emision: '', tipo_norma: '', numero: '',
  norma: '', ente_emisor: '', asunto: '', articulo: '', requisito: '', evidencia: '',
  is_digital: false, aplica_todos_procesos: false, vigencia: 'vigente',
  motivo_derogacion: '', fecha_derogacion: '', frecuencia_meses: 12,
};

const inputCls = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-600';
const inputSty = { borderColor: '#d1d5db', '--tw-ring-color': C.mint };

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold mb-1" style={{ color: C.green }}>
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: C.sand }}>
      <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.olive }}>{title}</h4>
      {children}
    </div>
  );
}

export default function RequisitoModal({
  isOpen, mode, requisito, matrizInicial, procesos, usuarios, comitesSugeridos, cargosSugeridos,
  onClose, onSave,
}) {
  const ver = mode === 'view';
  const [f, setF] = useState(VACIO);
  const [resp, setResp] = useState([]);
  const [nuevo, setNuevo] = useState({ tipo: 'proceso', valor: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (requisito) {
      const base = { ...VACIO };
      Object.keys(VACIO).forEach((k) => { if (requisito[k] != null) base[k] = requisito[k]; });
      setF(base);
      setResp((requisito.responsables || []).map((r) => ({
        tipo: r.tipo, process_id: r.process_id, user_id: r.user_id, nombre: r.nombre,
        process: r.process, user: r.user,
      })));
    } else {
      setF({ ...VACIO, matriz: matrizInicial || 'general' });
      setResp([]);
    }
    setNuevo({ tipo: 'proceso', valor: '' });
    setErr('');
  }, [isOpen, requisito, matrizInicial]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // Sugerencia de nombre de la norma: "Ley 2365 de 2024"
  const sugerida = useMemo(() => {
    if (!f.tipo_norma) return '';
    return [f.tipo_norma, f.numero, f.anio_emision ? `de ${f.anio_emision}` : ''].filter(Boolean).join(' ');
  }, [f.tipo_norma, f.numero, f.anio_emision]);

  const agregarResp = () => {
    const { tipo, valor } = nuevo;
    if (!valor?.trim()) return;
    let item;
    if (tipo === 'proceso') {
      if (resp.some((r) => r.tipo === 'proceso' && r.process_id === valor)) return;
      item = { tipo, process_id: valor, process: procesos.find((p) => p.id === valor) };
    } else if (tipo === 'usuario') {
      if (resp.some((r) => r.tipo === 'usuario' && r.user_id === valor)) return;
      item = { tipo, user_id: valor, user: usuarios.find((u) => u.id === valor) };
    } else {
      const n = valor.trim();
      if (resp.some((r) => r.tipo === tipo && r.nombre?.toLowerCase() === n.toLowerCase())) return;
      item = { tipo, nombre: n };
    }
    setResp((p) => [...p, item]);
    setNuevo((p) => ({ ...p, valor: '' }));
  };

  const guardar = async () => {
    setErr('');
    const norma = (f.norma || '').trim() || sugerida;
    if (!norma) return setErr('Indica la norma (o el tipo y número).');
    if (f.vigencia === 'derogada' && !String(f.motivo_derogacion || '').trim())
      return setErr('Indica el motivo de la derogación.');
    setSaving(true);
    const res = await onSave({ ...f, norma }, resp);
    setSaving(false);
    if (!res?.success) setErr(res?.error || 'No se pudo guardar.');
  };

  if (!isOpen) return null;

  const titulo = mode === 'create' ? 'Nueva norma' : mode === 'edit' ? 'Editar norma' : 'Detalle de la norma';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 rounded-t-xl"
          style={{ background: `linear-gradient(135deg, ${C.green} 0%, ${C.mint} 100%)` }}>
          <div className="flex items-center gap-2 text-white">
            <Scale className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold leading-tight">{titulo}</h2>
              <p className="text-xs opacity-90">Matriz Legal · RE-DP-04</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Section title="Identificación">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Matriz" required>
                <select className={inputCls} style={inputSty} disabled={ver} value={f.matriz} onChange={(e) => set('matriz', e.target.value)}>
                  {MATRICES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Tipo de norma">
                <input list="ml-tipos" className={inputCls} style={inputSty} disabled={ver}
                  value={f.tipo_norma || ''} onChange={(e) => set('tipo_norma', e.target.value)} />
                <datalist id="ml-tipos">{TIPOS_NORMA.map((t) => <option key={t} value={t} />)}</datalist>
              </Field>
              <Field label="Número">
                <input className={inputCls} style={inputSty} disabled={ver} value={f.numero || ''} onChange={(e) => set('numero', e.target.value)} />
              </Field>
              <Field label="Año de emisión">
                <input type="number" min="1800" max="2100" className={inputCls} style={inputSty} disabled={ver}
                  value={f.anio_emision || ''} onChange={(e) => set('anio_emision', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Norma (nombre completo)" required className="md:col-span-2">
                <input className={inputCls} style={inputSty} disabled={ver} placeholder={sugerida || 'Ej. Ley 2365 de 2024'}
                  value={f.norma || ''} onChange={(e) => set('norma', e.target.value)} />
              </Field>
              <Field label="Ente emisor">
                <input className={inputCls} style={inputSty} disabled={ver} value={f.ente_emisor || ''} onChange={(e) => set('ente_emisor', e.target.value)} />
              </Field>
            </div>
            <Field label="Disposición / asunto que regula">
              <textarea rows={2} className={inputCls} style={inputSty} disabled={ver} value={f.asunto || ''} onChange={(e) => set('asunto', e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Artículo aplicado">
                <input className={inputCls} style={inputSty} disabled={ver} value={f.articulo || ''} onChange={(e) => set('articulo', e.target.value)} />
              </Field>
              <Field label="Descripción del requisito / parámetro normativo" className="md:col-span-3">
                <textarea rows={ver ? 6 : 4} className={inputCls} style={inputSty} disabled={ver} value={f.requisito || ''} onChange={(e) => set('requisito', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Cumplimiento">
            <Field label="Evidencia de cumplimiento esperada">
              <textarea rows={2} className={inputCls} style={inputSty} disabled={ver} value={f.evidencia || ''} onChange={(e) => set('evidencia', e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-5 items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={ver} checked={!!f.is_digital} onChange={(e) => set('is_digital', e.target.checked)} />
                Evidencia en digital
              </label>
              <Field label="Verificar cada (meses)">
                <input type="number" min="1" max="60" className={`${inputCls} w-28`} style={inputSty} disabled={ver}
                  value={f.frecuencia_meses || 12} onChange={(e) => set('frecuencia_meses', e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Responsables */}
          <Section title="Responsables">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={ver} checked={!!f.aplica_todos_procesos} onChange={(e) => set('aplica_todos_procesos', e.target.checked)} />
              <Users className="h-4 w-4" style={{ color: C.olive }} />
              Aplica a todos los procesos (líderes de cada proceso)
            </label>

            <div className="flex flex-wrap gap-2 min-h-[28px]">
              {resp.length === 0 && !f.aplica_todos_procesos && (
                <span className="text-xs text-gray-400 italic">Sin responsables asignados</span>
              )}
              {resp.map((r, i) => {
                const t = TIPOS_RESPONSABLE[r.tipo];
                return (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: t.bg, color: t.color }}>
                    <span className="opacity-70">{t.label}:</span> {nombreResponsable(r)}
                    {!ver && (
                      <button className="ml-1 hover:opacity-70" onClick={() => setResp((p) => p.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            {!ver && (
              <div className="flex flex-wrap gap-2 items-end">
                <Field label="Tipo">
                  <select className={inputCls} style={inputSty} value={nuevo.tipo} onChange={(e) => setNuevo({ tipo: e.target.value, valor: '' })}>
                    {Object.entries(TIPOS_RESPONSABLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
                <Field label={TIPOS_RESPONSABLE[nuevo.tipo].label} className="flex-1 min-w-[220px]">
                  {nuevo.tipo === 'proceso' && (
                    <select className={inputCls} style={inputSty} value={nuevo.valor} onChange={(e) => setNuevo((p) => ({ ...p, valor: e.target.value }))}>
                      <option value="">Selecciona…</option>
                      {procesos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  {nuevo.tipo === 'usuario' && (
                    <select className={inputCls} style={inputSty} value={nuevo.valor} onChange={(e) => setNuevo((p) => ({ ...p, valor: e.target.value }))}>
                      <option value="">Selecciona…</option>
                      {usuarios.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  )}
                  {['cargo', 'comite'].includes(nuevo.tipo) && (
                    <>
                      <input list={`ml-${nuevo.tipo}`} className={inputCls} style={inputSty}
                        placeholder={nuevo.tipo === 'cargo' ? 'Ej. Gerencia, Contador' : 'Ej. Comité de Convivencia Laboral'}
                        value={nuevo.valor} onChange={(e) => setNuevo((p) => ({ ...p, valor: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarResp(); } }} />
                      <datalist id={`ml-${nuevo.tipo}`}>
                        {(nuevo.tipo === 'cargo' ? cargosSugeridos : comitesSugeridos).map((n) => <option key={n} value={n} />)}
                      </datalist>
                    </>
                  )}
                </Field>
                <Button type="button" variant="outline" onClick={agregarResp} disabled={!nuevo.valor}>
                  <Plus className="h-4 w-4 mr-1" />Agregar
                </Button>
              </div>
            )}
          </Section>

          <Section title="Vigencia">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Estado">
                <select className={inputCls} style={inputSty} disabled={ver} value={f.vigencia} onChange={(e) => set('vigencia', e.target.value)}>
                  <option value="vigente">Vigente</option>
                  <option value="derogada">Derogada</option>
                </select>
              </Field>
              {f.vigencia === 'derogada' && (
                <>
                  <Field label="Motivo / norma que la deroga" required className="md:col-span-2">
                    <input className={inputCls} style={inputSty} disabled={ver} placeholder="Ej. Derogada por Resolución 3461 de 2025"
                      value={f.motivo_derogacion || ''} onChange={(e) => set('motivo_derogacion', e.target.value)} />
                  </Field>
                  <Field label="Fecha de derogación">
                    <input type="date" className={inputCls} style={inputSty} disabled={ver}
                      value={f.fecha_derogacion ? String(f.fecha_derogacion).slice(0, 10) : ''} onChange={(e) => set('fecha_derogacion', e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </Section>

          {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: C.sand }}>
          <Button variant="outline" onClick={onClose}>{ver ? 'Cerrar' : 'Cancelar'}</Button>
          {!ver && (
            <Button onClick={guardar} disabled={saving} style={{ background: C.green, color: 'white' }}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}