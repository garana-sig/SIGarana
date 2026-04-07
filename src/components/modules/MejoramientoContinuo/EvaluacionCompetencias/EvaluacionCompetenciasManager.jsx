// src/components/modules/MejoramientoContinuo/EvaluacionCompetencias/EvaluacionCompetenciasManager.jsx
import { useState, useRef, useEffect } from 'react';
import {
  useEvaluacionCompetencias,
  calcularNivel, COLOR_NIVEL, BG_NIVEL,
  OPCIONES_RESPUESTA, DEPARTAMENTOS, PUNTAJE_MAX, FRECUENCIAS,
} from '@/hooks/useEvaluacionCompetencias';
import EvaluacionDashboard from './EvaluacionDashboard';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import {
  ArrowLeft, Plus, Search, UserPlus, Users, Settings,
  Eye, Trash2, Edit3, Save, X, AlertCircle, CheckCircle2,
  Award, TrendingUp, Star, BarChart3, BookOpen,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
  Clock, Calendar, AlertTriangle, CheckCircle,
} from 'lucide-react';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const P = {
  verde:  '#2e5244',
  menta:  '#6dbd96',
  oliva:  '#6f7b2c',
  arena:  '#dedecc',
  dark:   '#1a2e25',
  ambar:  '#d97706',
  rojo:   '#ef4444',
};

// ─── Combobox empleados ───────────────────────────────────────────────────────
function EmpleadoCombobox({ empleados, value, onChange, placeholder = 'Buscar por nombre o cédula…' }) {
  const [inputVal, setInputVal] = useState('');
  const [open,     setOpen]     = useState(false);
  const wrapRef                 = useRef(null);

  useEffect(() => { setInputVal(value ? value.nombre_completo : ''); }, [value]);
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = empleados.filter(e =>
    e.nombre_completo.toLowerCase().includes(inputVal.toLowerCase()) ||
    e.cedula.includes(inputVal)
  );

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-8 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: P.menta }}
          placeholder={placeholder}
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button onClick={e => { e.stopPropagation(); onChange(null); setInputVal(''); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto"
          style={{ borderColor: P.menta }}>
          {filtered.length === 0
            ? <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
            : filtered.map(emp => (
              <button key={emp.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                onClick={() => { onChange(emp); setInputVal(emp.nombre_completo); setOpen(false); }}>
                <span className="font-medium truncate" style={{ color: P.dark }}>{emp.nombre_completo}</span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">{emp.departamento} · {emp.cedula}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function NivelBadge({ nivel }) {
  if (!nivel) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: BG_NIVEL[nivel], color: COLOR_NIVEL[nivel] }}>
      {nivel}
    </span>
  );
}

function PuntajeBar({ puntaje }) {
  if (!puntaje && puntaje !== 0) return null;
  const nivel = calcularNivel(puntaje);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full" style={{ width: `${(puntaje/PUNTAJE_MAX)*100}%`, background: COLOR_NIVEL[nivel] }} />
      </div>
      <span className="text-xs font-bold w-7 text-right" style={{ color: COLOR_NIVEL[nivel] }}>{puntaje}</span>
    </div>
  );
}

function BadgeEstado({ evaluado }) {
  if (evaluado) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ background: '#6dbd9620', color: P.verde }}>
      <CheckCircle className="h-3 w-3" /> Evaluado
    </span>
  );
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ background: '#ef444420', color: P.rojo }}>
      <Clock className="h-3 w-3" /> Pendiente
    </span>
  );
}

function Modal({ title, onClose, children, size = 'md' }) {
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${w[size]} flex flex-col max-h-[92vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h3 className="text-base font-bold" style={{ color: P.dark }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Banner período activo ────────────────────────────────────────────────────
function BannerPeriodo({ periodoActivo, pendientes, total }) {
  if (!periodoActivo) return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: '#d9770615', border: `1px solid ${P.ambar}40` }}>
      <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: P.ambar }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: P.ambar }}>Sin período activo</p>
        <p className="text-xs text-gray-500">Ve a Configuración → Períodos y activa uno para comenzar a evaluar.</p>
      </div>
    </div>
  );

  const pct = total > 0 ? Math.round(((total - pendientes) / total) * 100) : 0;

  return (
    <div className="rounded-xl p-4 flex items-center gap-4"
      style={{ background: '#6dbd9615', border: `1px solid ${P.menta}50` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: P.menta + '30' }}>
        <Calendar className="h-5 w-5" style={{ color: P.verde }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: P.dark }}>Período activo: {periodoActivo.nombre}</span>
          <span className="text-xs px-2 py-0.5 rounded-full capitalize"
            style={{ background: P.verde + '20', color: P.verde }}>{periodoActivo.frecuencia}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 bg-white rounded-full h-2" style={{ border: `1px solid ${P.menta}40` }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: P.menta }} />
          </div>
          <span className="text-xs shrink-0" style={{ color: P.verde }}>
            <strong>{total - pendientes}</strong> / {total} evaluados ({pct}%)
          </span>
        </div>
      </div>
      {pendientes > 0 && (
        <div className="text-center px-3 py-1.5 rounded-lg shrink-0"
          style={{ background: '#ef444415', border: `1px solid ${P.rojo}30` }}>
          <div className="text-xl font-black" style={{ color: P.rojo }}>{pendientes}</div>
          <div className="text-xs" style={{ color: P.rojo }}>pendientes</div>
        </div>
      )}
      {pendientes === 0 && total > 0 && (
        <div className="text-center px-3 py-1.5 rounded-lg shrink-0"
          style={{ background: '#6dbd9620' }}>
          <CheckCircle2 className="h-6 w-6 mx-auto" style={{ color: P.verde }} />
          <div className="text-xs mt-0.5" style={{ color: P.verde }}>¡Completo!</div>
        </div>
      )}
    </div>
  );
}

// ─── Formulario empleado ──────────────────────────────────────────────────────
function EmpleadoForm({ inicial, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    cedula:          inicial?.cedula          || '',
    nombre_completo: inicial?.nombre_completo || '',
    cargo:           inicial?.cargo           || '',
    departamento:    inicial?.departamento    || 'Operativo',
    fecha_ingreso:   inicial?.fecha_ingreso   || '',
    is_active:       inicial?.is_active       ?? true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Cédula *</label>
          <Input value={form.cedula} onChange={e => set('cedula', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Departamento *</label>
          <select className="w-full px-3 py-2 border rounded-md text-sm"
            value={form.departamento} onChange={e => set('departamento', e.target.value)}>
            {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre Completo *</label>
        <Input value={form.nombre_completo}
          onChange={e => set('nombre_completo', e.target.value.toUpperCase())} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Cargo</label>
          <Input value={form.cargo} onChange={e => set('cargo', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha de Ingreso</label>
          <Input type="date" value={form.fecha_ingreso}
            onChange={e => set('fecha_ingreso', e.target.value)} />
        </div>
      </div>
      {inicial && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)} />
          Empleado activo
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={() => onSave(form)}
          disabled={loading || !form.cedula || !form.nombre_completo}
          style={{ background: P.verde, color: 'white' }}>
          {loading ? 'Guardando…' : inicial ? 'Actualizar' : 'Agregar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Formulario evaluación — Matriz estilo Excel ────────────────────────────
function FormularioEvaluacion({
  empleadoInicial, empleadosPermitidos, categorias,
  periodos, periodoActivo,
  onGuardar, onClose, saving,
}) {
  const [empleado,   setEmpleado]   = useState(empleadoInicial || null);
  const [periodoId,  setPeriodoId]  = useState(periodoActivo?.id || '');
  const [respuestas, setRespuestas] = useState({});
  const [notas,      setNotas]      = useState('');
  const [err,        setErr]        = useState('');

  const pregActivas    = categorias.flatMap(c => c.preguntas.filter(p => p.is_active));
  const totalPreguntas = pregActivas.length;
  const respondidas    = Object.keys(respuestas).length;
  const puntaje        = Object.values(respuestas).reduce((s, v) => s + v, 0);
  const nivel          = respondidas > 0 ? calcularNivel(puntaje) : null;
  const completo       = empleado && respondidas === totalPreguntas && periodoId;

  async function guardar() {
    if (!empleado)  return setErr('Selecciona un empleado.');
    if (!periodoId) return setErr('Selecciona un período.');
    if (respondidas < totalPreguntas)
      return setErr(`Faltan ${totalPreguntas - respondidas} pregunta(s) por responder.`);
    setErr('');
    await onGuardar({ empleadoId: empleado.id, periodoId, notas, respuestas });
  }

  return (
    <div className="space-y-4">

      {/* Empleado + Período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl"
        style={{ background: '#f8faf8', border: `1px solid ${P.menta}30` }}>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Empleado *</label>
          <EmpleadoCombobox empleados={empleadosPermitidos} value={empleado} onChange={setEmpleado} />
          {empleado && (
            <p className="text-xs mt-1" style={{ color: P.oliva }}>
              {empleado.departamento} · {empleado.cargo || 'Sin cargo'} · C.C. {empleado.cedula}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Período *</label>
          <select className="w-full px-3 py-2 border rounded-md text-sm"
            style={{ borderColor: P.menta }}
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}{p.is_active ? ' (activo)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl border"
        style={{ borderColor: P.menta + '40' }}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">{respondidas} / {totalPreguntas} preguntas respondidas</span>
            {nivel && <NivelBadge nivel={nivel} />}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all"
              style={{ width: `${(puntaje / PUNTAJE_MAX) * 100}%`, background: nivel ? COLOR_NIVEL[nivel] : '#e5e7eb' }} />
          </div>
        </div>
        <div className="text-center w-16 shrink-0">
          <div className="text-2xl font-black" style={{ color: nivel ? COLOR_NIVEL[nivel] : '#d1d5db', fontFamily: 'monospace' }}>{puntaje}</div>
          <div className="text-xs text-gray-400">/ {PUNTAJE_MAX}</div>
        </div>
      </div>

      {/* ── Matriz de evaluación ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: P.verde + '30' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: P.verde }}>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-white w-28">Categoría</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-white">Pregunta</th>
              {OPCIONES_RESPUESTA.map(o => (
                <th key={o.value} className="text-center px-2 py-2.5 text-xs font-semibold w-20"
                  style={{ color: 'white' }}>
                  <span className="block leading-tight">{o.full.split(' ')[0]}</span>
                  <span className="block leading-tight opacity-80 text-xs">
                    {o.full.split(' ').slice(1).join(' ')}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat) => {
              const pregs = cat.preguntas.filter(p => p.is_active);
              if (!pregs.length) return null;
              return pregs.map((preg, idx) => {
                const selVal = respuestas[preg.id];
                const isFirst = idx === 0;
                return (
                  <tr key={preg.id}
                    className="border-b"
                    style={{
                      background: selVal ? COLOR_NIVEL[calcularNivel(selVal * (PUNTAJE_MAX / totalPreguntas))] + '08' : (idx % 2 === 0 ? 'white' : '#fafaf8'),
                      borderColor: '#e5e7eb',
                    }}>
                    {/* Celda de categoría — solo en la primera fila */}
                    {isFirst ? (
                      <td
                        rowSpan={pregs.length}
                        className="px-3 py-2 text-xs font-bold align-top border-r"
                        style={{
                          color: P.verde,
                          borderColor: P.verde + '20',
                          background: P.verde + '08',
                          verticalAlign: 'top',
                          paddingTop: 12,
                        }}>
                        <div style={{ writingMode: 'horizontal-tb' }}>
                          {cat.nombre}
                        </div>
                      </td>
                    ) : null}

                    {/* Pregunta */}
                    <td className="px-3 py-2.5 border-r" style={{ borderColor: '#e5e7eb', color: P.dark }}>
                      {preg.texto}
                    </td>

                    {/* Celdas de respuesta */}
                    {OPCIONES_RESPUESTA.map(o => {
                      const marcado = selVal === o.value;
                      return (
                        <td key={o.value}
                          className="text-center border-r cursor-pointer transition-all"
                          style={{
                            borderColor: '#e5e7eb',
                            background: marcado ? o.color + '18' : 'transparent',
                          }}
                          onClick={() => setRespuestas(r => ({ ...r, [preg.id]: o.value }))}>
                          <div className="flex items-center justify-center py-2.5 px-2">
                            {marcado ? (
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-sm font-bold"
                                style={{ background: o.color }}>
                                ✓
                              </div>
                            ) : (
                              <div
                                className="w-6 h-6 rounded border-2"
                                style={{ borderColor: '#d1d5db' }}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Tabla de ajustes — igual que en el Excel */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: P.verde + '20' }}>
        <div className="px-4 py-2 text-xs font-semibold text-center"
          style={{ background: P.verde, color: 'white' }}>
          Tabla de Ajustes
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ background: '#f8faf8' }}>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Puntos Totales</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Desempeño</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Valor por pregunta</th>
            </tr>
          </thead>
          <tbody>
            {[
              { puntos: '0 – 17',  nivel: 'Muy debajo de las Expectativas', valor: 1 },
              { puntos: '18 – 34', nivel: 'Debajo de las Expectativas',     valor: 2 },
              { puntos: '35 – 51', nivel: 'Alcanza Expectativas',           valor: 3 },
              { puntos: '52 – 68', nivel: 'Mejora Expectativas',            valor: 4 },
              { puntos: '69 – 85', nivel: 'Sobresaliente',                  valor: 5 },
            ].map(({ puntos, nivel: niv, valor }) => (
              <tr key={valor} className="border-b last:border-b-0"
                style={{ background: puntaje >= (valor-1)*17+1 && puntaje <= valor*17 ? COLOR_NIVEL[niv]+'15' : 'white' }}>
                <td className="text-center px-3 py-2 font-mono" style={{ color: P.dark }}>{puntos}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: COLOR_NIVEL[niv]+'20', color: COLOR_NIVEL[niv] }}>
                    {niv}
                  </span>
                </td>
                <td className="text-center px-3 py-2 font-bold font-mono" style={{ color: COLOR_NIVEL[niv] }}>{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notas */}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
          Aspectos a Mejorar / Aspectos Relevantes
        </label>
        <textarea
          className="w-full px-3 py-2 border rounded-md text-sm resize-none"
          style={{ borderColor: P.menta, minHeight: 80 }}
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="MEJORAR: … / ASPECTO RELEVANTE: …" />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-lg"
          style={{ background: '#fef2f2', color: P.rojo }}>
          <AlertCircle className="h-4 w-4 shrink-0" />{err}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={guardar} disabled={!completo || saving}
          style={{ background: completo ? P.verde : '#9ca3af', color: 'white' }}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando…' : 'Guardar Evaluación'}
        </Button>
      </div>
    </div>
  );
}


// ─── Perfil del empleado ──────────────────────────────────────────────────────
function PerfilEmpleado({
  empleado, evaluaciones, evalPorEmpleado, categorias,
  empleadosPermitidos, periodos, periodoActivo, evaluadosEnPeriodoActivo,
  canEvaluar, onBack, onNuevaEval, loadDetalles, deleteEvaluacion, isAdminOrGerencia,
}) {
  const info    = evalPorEmpleado[empleado.id] || { count: 0, ultima: null };
  const evals   = evaluaciones.filter(e => e.empleado_id === empleado.id);
  const yaEval  = evaluadosEnPeriodoActivo.has(empleado.id);
  const [detModal, setDetModal] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loadingDet, setLoadingDet] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function verDetalle(ev) {
    setLoadingDet(true); setDetModal(ev);
    try { const d = await loadDetalles(ev.id); setDetalles(d); }
    finally { setLoadingDet(false); }
  }
  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta evaluación?')) return;
    setDeleting(id);
    try { await deleteEvaluacion(id); } finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: P.dark }}>{empleado.nombre_completo}</h2>
            <BadgeEstado evaluado={yaEval} />
          </div>
          <p className="text-sm text-gray-500">
            {empleado.cargo || 'Sin cargo'} · {empleado.departamento} · C.C. {empleado.cedula}
          </p>
        </div>
        {canEvaluar(empleado.departamento) && (
          <Button onClick={onNuevaEval} style={{ background: P.verde, color: 'white' }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Evaluación
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Evaluaciones',  value: info.count,                     icon: Award,     color: P.verde },
          { label: 'Último Puntaje',value: info.ultima?.puntaje_total ?? '—', icon: Star,   color: P.menta },
          { label: 'Último Nivel',  value: info.ultima?.nivel_desempeno?.split(' ')[0] ?? '—', icon: TrendingUp, color: P.oliva },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl border text-center" style={{ borderColor: color + '40' }}>
            <Icon className="h-5 w-5 mx-auto mb-1" style={{ color }} />
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Historial */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: P.verde + '20' }}>
        <div className="px-4 py-3 font-semibold text-sm" style={{ background: P.verde, color: 'white' }}>
          Historial de Evaluaciones
        </div>
        {evals.length === 0
          ? <div className="p-8 text-center text-gray-400 text-sm">Sin evaluaciones registradas</div>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b" style={{ background: '#f8faf8' }}>
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Fecha</th>
                  <th className="text-left px-4 py-2">Período</th>
                  <th className="text-left px-4 py-2">Evaluador</th>
                  <th className="text-center px-4 py-2">Puntaje</th>
                  <th className="text-left px-4 py-2">Nivel</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {evals.map((ev, i) => (
                  <tr key={ev.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">{new Date(ev.fecha_evaluacion).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: P.verde + '15', color: P.verde }}>
                        {ev.periodo?.nombre || ev.periodo || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{ev.evaluador?.full_name || '—'}</td>
                    <td className="px-4 py-2 w-28"><PuntajeBar puntaje={ev.puntaje_total} /></td>
                    <td className="px-4 py-2"><NivelBadge nivel={ev.nivel_desempeno} /></td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => verDetalle(ev)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500">
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdminOrGerencia && (
                          <button onClick={() => eliminar(ev.id)} disabled={deleting === ev.id}
                            className="p-1 rounded hover:bg-red-50 text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Modal detalle */}
      {detModal && (
        <Modal title={`Evaluación — ${new Date(detModal.fecha_evaluacion).toLocaleDateString('es-CO')}`}
          onClose={() => setDetModal(null)} size="lg">
          {loadingDet ? <div className="text-center py-8 text-gray-400">Cargando…</div> : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg"
                style={{ background: BG_NIVEL[detModal.nivel_desempeno] }}>
                <div className="text-3xl font-bold" style={{ color: COLOR_NIVEL[detModal.nivel_desempeno], fontFamily: 'monospace' }}>
                  {detModal.puntaje_total}
                </div>
                <div>
                  <NivelBadge nivel={detModal.nivel_desempeno} />
                  <p className="text-xs text-gray-500 mt-1">
                    Evaluado por: {detModal.evaluador?.full_name} ·
                    Período: {detModal.periodo?.nombre || detModal.periodo || '—'}
                  </p>
                </div>
              </div>
              {categorias.map(cat => {
                const dets = detalles.filter(d => d.pregunta?.categoria_id === cat.id);
                if (!dets.length) return null;
                return (
                  <div key={cat.id}>
                    <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: P.verde }}>
                      {cat.nombre}
                    </h4>
                    {dets.map(d => {
                      const op = OPCIONES_RESPUESTA.find(o => o.value === d.respuesta);
                      return (
                        <div key={d.id}
                          className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-sm">
                          <span className="text-gray-700 flex-1 pr-4">{d.pregunta?.texto}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: op?.color + '20', color: op?.color }}>{op?.short}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {detModal.notas && (
                <div className="p-3 rounded-lg text-sm text-gray-700" style={{ background: '#f8faf8' }}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Notas</p>
                  {detModal.notas}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Tab Config: Evaluadores ──────────────────────────────────────────────────
function ConfigEvaluadores({ configuracion, usuarios, addEvaluador, removeEvaluador }) {
  const [saving, setSaving] = useState(null); // null | 'Operativo' | 'Administrativo'
  const [error,  setError]  = useState(null);

  // Reemplaza evaluador: borra el anterior e inserta el nuevo automáticamente
  async function handleSelect(depto, userId) {
    if (!userId || saving) return;
    setSaving(depto);
    setError(null);
    try {
      await addEvaluador(depto, userId); // addEvaluador ya hace delete+insert
    } catch (e) {
      setError(`Error al asignar: ${e.message}`);
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(id, depto) {
    setSaving(depto);
    setError(null);
    try {
      await removeEvaluador(id);
    } catch (e) {
      setError(`Error al quitar: ${e.message}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">

      {/* Info de flujo */}
      <div className="p-4 rounded-xl space-y-3" style={{ background: P.menta + '12', border: `1px solid ${P.menta}40` }}>
        <p className="text-sm font-semibold" style={{ color: P.verde }}>¿Cómo funciona?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="flex gap-2">
            <span className="font-bold text-base leading-none" style={{ color: P.menta }}>1</span>
            <div>
              <p className="font-medium text-gray-700">Un evaluador por departamento</p>
              <p>Al seleccionar uno nuevo, el anterior queda reemplazado automáticamente.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-base leading-none" style={{ color: P.menta }}>2</span>
            <div>
              <p className="font-medium text-gray-700">Dar permisos en Gestión de Usuarios</p>
              <p>El evaluador también necesita <strong>ver</strong> y <strong>crear</strong> en Evaluación de Competencias.</p>
            </div>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <span className="font-bold text-base leading-none" style={{ color: '#d97706' }}>!</span>
            <div>
              <p className="font-medium text-gray-700">Al cambiar evaluador</p>
              <p>Quitar al anterior aquí <strong>Y</strong> revocar sus permisos en Gestión de Usuarios. Sin asignación aquí, no ve ningún empleado aunque tenga permisos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg text-xs flex items-center gap-2"
          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Un bloque por departamento */}
      {DEPARTAMENTOS.map(depto => {
        const actual   = configuracion.find(c => c.departamento === depto) || null;
        const isSaving = saving === depto;

        // Usuarios disponibles: todos excepto el ya asignado
        const disponibles = usuarios.filter(u =>
          !actual || actual.evaluador_user_id !== u.id
        );

        return (
          <div key={depto} className="rounded-xl border overflow-hidden"
            style={{ borderColor: actual ? P.menta + '60' : '#e5e7eb' }}>

            {/* Header */}
            <div className="px-4 py-3 font-semibold text-sm flex items-center gap-2"
              style={{ background: actual ? P.menta + '15' : '#f9f9f9', color: P.verde }}>
              <Users className="h-4 w-4" />
              Evaluadores — {depto}
              {isSaving && <span className="text-xs opacity-60 ml-auto font-normal">Guardando…</span>}
            </div>

            <div className="p-4 space-y-3">

              {/* Evaluador actual */}
              {actual ? (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: P.verde + '10', border: `1px solid ${P.verde}30` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: P.verde }}>
                      {(actual.evaluador?.full_name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: P.dark }}>
                        {actual.evaluador?.full_name || actual.evaluador?.email || '—'}
                      </p>
                      <p className="text-xs text-gray-400">Evaluador asignado</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(actual.id, depto)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    style={{ color: '#dc2626' }}
                    title="Quitar evaluador">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin evaluador asignado</p>
              )}

              {/* Selector — siempre visible para cambiar o asignar */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {actual ? 'Cambiar por:' : 'Asignar evaluador:'}
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm transition-colors"
                  style={{
                    borderColor: P.menta,
                    opacity: isSaving ? 0.6 : 1,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                  }}
                  value=""
                  disabled={isSaving}
                  onChange={e => handleSelect(depto, e.target.value)}>
                  <option value="">
                    {isSaving ? 'Guardando…' : actual ? '— Seleccionar reemplazo —' : '— Seleccionar usuario —'}
                  </option>
                  {disponibles.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}


// ─── Tab Config: Períodos ─────────────────────────────────────────────────────
function ConfigPeriodos({ periodos, createPeriodo, togglePeriodo, deletePeriodo }) {
  const [nuevo,  setNuevo]  = useState({ nombre: '', frecuencia: 'anual', fecha_inicio: '', fecha_fin: '' });
  const [saving, setSaving] = useState(false);

  async function crear() {
    if (!nuevo.nombre.trim()) return;
    setSaving(true);
    try {
      await createPeriodo(nuevo);
      setNuevo({ nombre: '', frecuencia: 'anual', fecha_inicio: '', fecha_fin: '' });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">

      {/* Lista */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: P.verde + '20' }}>
        <div className="px-4 py-3 text-sm font-semibold" style={{ background: P.verde, color: 'white' }}>
          Períodos registrados
        </div>
        {periodos.length === 0
          ? <div className="p-6 text-center text-gray-400 text-sm">Sin períodos creados</div>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b" style={{ background: '#f8faf8' }}>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-left px-4 py-2">Frecuencia</th>
                  <th className="text-left px-4 py-2">Fechas</th>
                  <th className="text-center px-4 py-2">Estado</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium" style={{ color: P.dark }}>{p.nombre}</td>
                    <td className="px-4 py-2.5 capitalize text-gray-500 text-xs">{p.frecuencia}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {p.fecha_inicio && p.fecha_fin
                        ? `${p.fecha_inicio} → ${p.fecha_fin}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.is_active
                        ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: P.menta + '20', color: P.verde }}>● Activo</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full text-gray-400"
                            style={{ background: '#f0f0f0' }}>○ Inactivo</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        {/* Activar / Desactivar */}
                        <button
                          onClick={() => togglePeriodo(p.id, !p.is_active)}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{
                            background: p.is_active ? '#fef2f2' : P.menta + '20',
                            color:      p.is_active ? '#dc2626'  : P.verde,
                          }}
                          title={p.is_active ? 'Desactivar' : 'Activar'}>
                          {p.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        {/* Eliminar solo si está inactivo */}
                        {!p.is_active && (
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Eliminar el período "${p.nombre}"? Las evaluaciones asociadas perderán el vínculo.`))
                                deletePeriodo(p.id);
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-400"
                            title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Crear nuevo período */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: P.menta }}>
        <p className="text-xs font-semibold" style={{ color: P.verde }}>Crear nuevo período</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
            <Input placeholder="Ej: 2025-II"
              value={nuevo.nombre}
              onChange={e => setNuevo(s => ({ ...s, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Frecuencia</label>
            <select className="w-full px-3 py-2 border rounded-md text-sm"
              value={nuevo.frecuencia}
              onChange={e => setNuevo(s => ({ ...s, frecuencia: e.target.value }))}>
              {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
            <Input type="date" value={nuevo.fecha_inicio}
              onChange={e => setNuevo(s => ({ ...s, fecha_inicio: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
            <Input type="date" value={nuevo.fecha_fin}
              onChange={e => setNuevo(s => ({ ...s, fecha_fin: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={crear} disabled={saving || !nuevo.nombre.trim()}
            style={{ background: P.verde, color: 'white' }}>
            <Plus className="h-4 w-4 mr-1" />
            {saving ? 'Creando…' : 'Crear Período'}
          </Button>
        </div>
      </div>
    </div>
  );
}


// ─── Tab Config: Cuestionario ─────────────────────────────────────────────────
function ConfigCuestionario({ categorias, createCategoria, toggleCategoria, createPregunta, togglePregunta, updatePregunta }) {
  const [expandidos, setExpandidos] = useState({});
  const [nuevaCat,   setNuevaCat]   = useState('');
  const [nuevaPreg,  setNuevaPreg]  = useState({});
  const [editPreg,   setEditPreg]   = useState(null);
  const [saving,     setSaving]     = useState(false);

  async function agregarCat() {
    if (!nuevaCat.trim()) return;
    setSaving(true);
    try { await createCategoria(nuevaCat.trim()); setNuevaCat(''); }
    finally { setSaving(false); }
  }

  async function agregarPreg(catId) {
    const texto = (nuevaPreg[catId] || '').trim();
    if (!texto) return;
    setSaving(true);
    try { await createPregunta(catId, texto); setNuevaPreg(s => ({ ...s, [catId]: '' })); }
    finally { setSaving(false); }
  }

  async function guardarEdit() {
    if (!editPreg?.texto.trim()) return;
    setSaving(true);
    try { await updatePregunta(editPreg.id, { texto: editPreg.texto }); setEditPreg(null); }
    finally { setSaving(false); }
  }

  const totalActivas = categorias.reduce((s, c) => s + c.preguntas.filter(p => p.is_active).length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg"
        style={{ background: '#f8faf8', border: `1px solid ${P.menta}30` }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: P.verde }}>
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">{categorias.length} categorías · {totalActivas} preguntas activas</span>
        </div>
        <span className="text-xs text-gray-400">Puntaje máximo: {totalActivas * 5}</span>
      </div>

      {categorias.map(cat => (
        <div key={cat.id} className="rounded-xl border overflow-hidden"
          style={{ borderColor: cat.is_active ? P.verde + '30' : '#e5e7eb' }}>
          <div className="flex items-center gap-2 px-4 py-3"
            style={{ background: cat.is_active ? P.verde + '08' : '#f9f9f9' }}>
            <button onClick={() => setExpandidos(s => ({ ...s, [cat.id]: !s[cat.id] }))}
              className="text-gray-400">
              {expandidos[cat.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span className="flex-1 font-semibold text-sm"
              style={{ color: cat.is_active ? P.dark : '#9ca3af' }}>
              {cat.nombre}
            </span>
            <span className="text-xs text-gray-400">
              {cat.preguntas.filter(p => p.is_active).length} / {cat.preguntas.length}
            </span>
            <button onClick={() => toggleCategoria(cat.id, !cat.is_active)}
              style={{ color: cat.is_active ? P.menta : '#9ca3af' }}>
              {cat.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
          </div>

          {expandidos[cat.id] && (
            <div className="border-t">
              {cat.preguntas.map((preg, idx) => (
                <div key={preg.id}
                  className="flex items-center gap-2 px-4 py-2 border-b last:border-b-0 text-sm"
                  style={{ background: idx % 2 === 0 ? 'white' : '#fcfcf9', opacity: preg.is_active ? 1 : 0.5 }}>
                  {editPreg?.id === preg.id ? (
                    <>
                      <input className="flex-1 px-2 py-1 border rounded text-sm"
                        style={{ borderColor: P.menta }}
                        value={editPreg.texto}
                        onChange={e => setEditPreg(s => ({ ...s, texto: e.target.value }))} />
                      <button onClick={guardarEdit} disabled={saving}
                        className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Save className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditPreg(null)}
                        className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                      <span className="flex-1" style={{ color: preg.is_active ? P.dark : '#9ca3af' }}>
                        {preg.texto}
                      </span>
                      <button onClick={() => setEditPreg({ id: preg.id, texto: preg.texto })}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded shrink-0">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => togglePregunta(preg.id, !preg.is_active)}
                        className="p-1 rounded shrink-0"
                        style={{ color: preg.is_active ? P.menta : '#9ca3af' }}>
                        {preg.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                </div>
              ))}

              {cat.is_active && (
                <div className="flex gap-2 p-3" style={{ background: '#f8faf8' }}>
                  <input className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                    style={{ borderColor: P.menta }}
                    placeholder="Nueva pregunta…"
                    value={nuevaPreg[cat.id] || ''}
                    onChange={e => setNuevaPreg(s => ({ ...s, [cat.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && agregarPreg(cat.id)} />
                  <Button onClick={() => agregarPreg(cat.id)}
                    disabled={saving || !(nuevaPreg[cat.id] || '').trim()}
                    style={{ background: P.verde, color: 'white' }} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Nueva categoría */}
      <div className="rounded-xl border border-dashed p-4" style={{ borderColor: P.menta }}>
        <p className="text-xs font-semibold text-gray-500 mb-2">Nueva Categoría</p>
        <div className="flex gap-2">
          <Input placeholder="Nombre de la categoría…"
            value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarCat()} />
          <Button onClick={agregarCat} disabled={saving || !nuevaCat.trim()}
            style={{ background: P.menta, color: 'white' }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabla de empleados (reutilizable para Lista y Pendientes) ────────────────
function TablaEmpleados({
  empleados, evalPorEmpleado, evaluadosEnPeriodoActivo,
  canEvaluar, isAdminOrGerencia, periodoActivo,
  onVerPerfil, onEvaluar, onEditarEmpleado,
  mostrarEstado = true,
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: P.verde + '20' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b" style={{ background: '#f8faf8' }}>
            <th className="text-left px-4 py-3">Empleado</th>
            <th className="text-left px-4 py-3">Dpto.</th>
            <th className="text-center px-4 py-3">Evals.</th>
            <th className="text-center px-4 py-3">Último puntaje</th>
            <th className="text-left px-4 py-3">Nivel</th>
            {mostrarEstado && periodoActivo && (
              <th className="text-center px-4 py-3">Estado {periodoActivo.nombre}</th>
            )}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {empleados.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Sin empleados</td></tr>
          )}
          {empleados.map(emp => {
            const info   = evalPorEmpleado[emp.id] || { count: 0, ultima: null };
            const yaEval = evaluadosEnPeriodoActivo.has(emp.id);
            const puedo  = canEvaluar(emp.departamento);
            return (
              <tr key={emp.id} className="border-b hover:bg-gray-50"
                style={{ opacity: emp.is_active ? 1 : 0.5 }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: P.dark }}>{emp.nombre_completo}</div>
                  <div className="text-xs text-gray-400">{emp.cargo || '—'} · {emp.cedula}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: emp.departamento === 'Operativo' ? P.menta + '20' : P.oliva + '20',
                      color:      emp.departamento === 'Operativo' ? P.verde       : P.oliva,
                    }}>
                    {emp.departamento}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{info.count}</td>
                <td className="px-4 py-3 w-28">
                  {info.ultima ? <PuntajeBar puntaje={info.ultima.puntaje_total} />
                    : <span className="text-gray-200 text-xs">—</span>}
                </td>
                <td className="px-4 py-3"><NivelBadge nivel={info.ultima?.nivel_desempeno} /></td>
                {mostrarEstado && periodoActivo && (
                  <td className="px-4 py-3 text-center">
                    <BadgeEstado evaluado={yaEval} />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => onVerPerfil(emp)}
                      className="text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-100"
                      style={{ color: P.verde }}>
                      <Eye className="h-3.5 w-3.5" /> Perfil
                    </button>
                    {puedo && (
                      <button onClick={() => onEvaluar(emp)}
                        className="text-xs px-2 py-1 rounded flex items-center gap-1"
                        style={{ background: P.menta + '20', color: P.verde }}>
                        <Plus className="h-3.5 w-3.5" /> Evaluar
                      </button>
                    )}
                    {isAdminOrGerencia && (
                      <button onClick={() => onEditarEmpleado(emp)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400">
                        <Edit3 className="h-3.5 w-3.5" />
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
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function EvaluacionCompetenciasManager({ onBack }) {
  const {
    empleados, empleadosPermitidos, empleadosPendientes,
    categorias, evaluaciones, evalPorEmpleado,
    periodos, periodoActivo, periodosActivos,
    evaluadosEnPeriodoActivo, getEvaluadosEnPeriodo,
    configuracion, usuarios,
    loading, isAdminOrGerencia, canEvaluar,
    createEmpleado, updateEmpleado,
    createEvaluacion, deleteEvaluacion,
    addEvaluador, removeEvaluador, loadDetalles,
    createPeriodo, activarPeriodo, togglePeriodo, deletePeriodo,
    createCategoria, toggleCategoria,
    createPregunta, togglePregunta, updatePregunta,
  } = useEvaluacionCompetencias();

  const [view,         setView]        = useState('lista');
  const [periodoFiltroId, setPeriodoFiltroId] = useState(null);
  const [deptoFiltroPend,  setDeptoFiltroPend]  = useState('');
  const [tab,          setTab]         = useState('dashboard');
  const [configTab,    setConfigTab]   = useState('evaluadores');
  const [selEmpleado,  setSelEmpleado] = useState(null);
  const [empFormModal, setEmpFormModal]= useState(null);
  const [formTarget,   setFormTarget]  = useState(null);
  const [search,       setSearch]      = useState('');
  const [filterDepto,  setFilterDepto] = useState('');
  const [saving,       setSaving]      = useState(false);
  const [toast,        setToast]       = useState(null);

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleGuardarEmpleado(data) {
    setSaving(true);
    try {
      if (empFormModal === 'new') await createEmpleado(data);
      else await updateEmpleado(empFormModal.id, data);
      setEmpFormModal(null);
      showToast(empFormModal === 'new' ? 'Empleado agregado' : 'Empleado actualizado');
    } catch (e) { showToast('Error: ' + e.message, 'err'); }
    finally { setSaving(false); }
  }

  async function handleGuardarEvaluacion(datos) {
    setSaving(true);
    try {
      await createEvaluacion(datos);
      setView('lista'); setFormTarget(null);
      showToast('Evaluación guardada exitosamente');
    } catch (e) { showToast('Error: ' + e.message, 'err'); }
    finally { setSaving(false); }
  }

  // Empleados filtrados para el tab "Todos"
  const empleadosFiltrados = empleadosPermitidos.filter(e => {
    const matchS = !search ||
      e.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      e.cedula.includes(search);
    const matchD = !filterDepto || e.departamento === filterDepto;
    return matchS && matchD;
  });

  // ── Vista formulario ──────────────────────────────────────────────────────
  if (view === 'formulario') {
    return (
      <Modal title="Nueva Evaluación de Desempeño"
        onClose={() => { setView('lista'); setFormTarget(null); }} size="xl">
        <FormularioEvaluacion
          empleadoInicial={formTarget}
          empleadosPermitidos={empleadosPermitidos}
          categorias={categorias}
          periodos={periodos}
          periodoActivo={periodoActivo}
          onGuardar={handleGuardarEvaluacion}
          onClose={() => { setView('lista'); setFormTarget(null); }}
          saving={saving}
        />
      </Modal>
    );
  }

  // ── Vista perfil ──────────────────────────────────────────────────────────
  if (view === 'perfil' && selEmpleado) {
    return (
      <PerfilEmpleado
        empleado={selEmpleado}
        evaluaciones={evaluaciones}
        evalPorEmpleado={evalPorEmpleado}
        categorias={categorias}
        empleadosPermitidos={empleadosPermitidos}
        periodos={periodos}
        periodoActivo={periodoActivo}
        evaluadosEnPeriodoActivo={evaluadosEnPeriodoActivo}
        canEvaluar={canEvaluar}
        onBack={() => setView('lista')}
        onNuevaEval={() => { setFormTarget(selEmpleado); setView('formulario'); }}
        loadDetalles={loadDetalles}
        deleteEvaluacion={deleteEvaluacion}
        isAdminOrGerencia={isAdminOrGerencia}
      />
    );
  }

  // ── Tabs disponibles ──────────────────────────────────────────────────────
  const TABS = [
    { id: 'dashboard',  label: 'Dashboard',  icon: BarChart3 },
    { id: 'empleados',  label: 'Todos',      icon: Users     },
    { id: 'pendientes', label: `Pendientes${periodoActivo ? ` (${empleadosPendientes.length})` : ''}`, icon: Clock },
    ...(isAdminOrGerencia ? [{ id: 'config', label: 'Configuración', icon: Settings }] : []),
  ];

  const CONFIG_TABS = [
    { id: 'evaluadores',  label: 'Evaluadores' },
    { id: 'periodos',     label: 'Períodos'    },
    { id: 'cuestionario', label: 'Cuestionario'},
  ];

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2"
          style={{ background: toast.type === 'ok' ? P.verde : P.rojo, color: 'white' }}>
          {toast.type === 'ok'
            ? <CheckCircle2 className="h-4 w-4" />
            : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: P.dark }}>Evaluación de Competencias</h2>
          <p className="text-xs text-gray-500">
            {empleadosPermitidos.length} empleados · {evaluaciones.length} evaluaciones
          </p>
        </div>
        <Button onClick={() => { setFormTarget(null); setView('formulario'); }}
          style={{ background: P.menta, color: 'white' }}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Evaluación
        </Button>
        {isAdminOrGerencia && (
          <Button variant="outline" onClick={() => setEmpFormModal('new')}
            style={{ borderColor: P.verde, color: P.verde }}>
            <UserPlus className="h-4 w-4 mr-1" /> Agregar Empleado
          </Button>
        )}
      </div>

      {/* Banner período(s) activo(s) */}
      {periodosActivos.length === 0 ? (
        <BannerPeriodo periodoActivo={null} pendientes={0} total={0} />
      ) : periodosActivos.length === 1 ? (
        <BannerPeriodo
          periodoActivo={periodoActivo}
          pendientes={empleadosPendientes.length}
          total={empleadosPermitidos.length}
        />
      ) : (
        <div className="rounded-xl p-3 flex items-center gap-3 flex-wrap"
          style={{ background: P.menta + '15', border: `1px solid ${P.menta}50` }}>
          <Calendar className="h-4 w-4 shrink-0" style={{ color: P.verde }} />
          <span className="text-sm font-semibold" style={{ color: P.dark }}>
            {periodosActivos.length} períodos activos:
          </span>
          {periodosActivos.map(p => (
            <span key={p.id} className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ background: P.verde + '20', color: P.verde }}>
              {p.nombre} · {p.frecuencia}
            </span>
          ))}
          <span className="text-xs text-gray-500 ml-auto">
            Selecciona el período en el tab Pendientes
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#e5e7eb' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: tab === t.id ? P.verde : 'transparent',
                color:       tab === t.id ? P.verde : '#6b7280',
              }}>
              <Icon className="h-4 w-4" />
              {t.label}
              {t.id === 'pendientes' && empleadosPendientes.length > 0 && tab !== 'pendientes' && (
                <span className="ml-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ background: P.rojo, color: 'white' }}>
                  {empleadosPendientes.length > 9 ? '9+' : empleadosPendientes.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Todos los empleados ──────────────────────────────────────── */}
      {tab === 'empleados' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-9" placeholder="Buscar por nombre o cédula…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="px-3 py-2 border rounded-md text-sm"
              value={filterDepto} onChange={e => setFilterDepto(e.target.value)}>
              <option value="">Todos los departamentos</option>
              {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando…</div>
          ) : (
            <TablaEmpleados
              empleados={empleadosFiltrados}
              evalPorEmpleado={evalPorEmpleado}
              evaluadosEnPeriodoActivo={evaluadosEnPeriodoActivo}
              canEvaluar={canEvaluar}
              isAdminOrGerencia={isAdminOrGerencia}
              periodoActivo={periodoActivo}
              onVerPerfil={emp => { setSelEmpleado(emp); setView('perfil'); }}
              onEvaluar={emp => { setFormTarget(emp); setView('formulario'); }}
              onEditarEmpleado={emp => setEmpFormModal(emp)}
            />
          )}
        </div>
      )}

      {/* ── Tab: Pendientes ───────────────────────────────────────────────── */}
      {tab === 'pendientes' && (() => {
        const pidActivo = periodoFiltroId || periodoActivo?.id || null;
        const periodoSel = periodos.find(p => p.id === pidActivo) || periodoActivo;
        const evaluadosSel = getEvaluadosEnPeriodo(pidActivo);
        const pendientesBase = empleadosPermitidos.filter(e => !evaluadosSel.has(e.id));
        const pendientesSel  = deptoFiltroPend
          ? pendientesBase.filter(e => e.departamento === deptoFiltroPend)
          : pendientesBase;
        return (
          <div className="space-y-4">
            {/* Selector de período */}
            {periodosActivos.length > 0 ? (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium shrink-0" style={{ color: P.dark }}>
                  Ver pendientes del período:
                </label>
                <select
                  className="px-3 py-1.5 border rounded-md text-sm flex-1"
                  style={{ borderColor: P.menta }}
                  value={pidActivo || ''}
                  onChange={e => setPeriodoFiltroId(e.target.value || null)}>
                  {periodos.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.frecuencia})</option>
                  ))}
                  {periodos.filter(p => !p.is_active).length > 0 && (
                    <optgroup label="Períodos inactivos">
                      {periodos.filter(p => !p.is_active).map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.frecuencia})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <label className="text-sm font-medium shrink-0" style={{ color: P.dark }}>Área:</label>
                <select className="px-3 py-1.5 border rounded-md text-sm"
                  style={{ borderColor: P.menta }}
                  value={deptoFiltroPend}
                  onChange={e => setDeptoFiltroPend(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="Operativo">Operativo</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: P.ambar }} />
                <p>No hay períodos activos. Activa uno en Configuración → Períodos.</p>
              </div>
            )}

            {pidActivo && (pendientesSel.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: P.menta }} />
                <p className="font-semibold" style={{ color: P.verde }}>
                  ¡Todos evaluados en {periodoSel?.nombre}!
                </p>
                <p className="text-xs text-gray-400 mt-1">No hay empleados pendientes en este período.</p>
              </div>
            ) : (
              <>
                <p className="text-sm" style={{ color: P.dark }}>
                  <strong>{pendientesSel.length}</strong> empleados sin evaluación en{' '}
                  <strong>{periodoSel?.nombre}</strong>:
                </p>
                <TablaEmpleados
                  empleados={pendientesSel}
                  evalPorEmpleado={evalPorEmpleado}
                  evaluadosEnPeriodoActivo={evaluadosSel}
                  canEvaluar={canEvaluar}
                  isAdminOrGerencia={isAdminOrGerencia}
                  periodoActivo={periodoSel}
                  mostrarEstado={false}
                  onVerPerfil={emp => { setSelEmpleado(emp); setView('perfil'); }}
                  onEvaluar={emp => { setFormTarget(emp); setView('formulario'); }}
                  onEditarEmpleado={emp => setEmpFormModal(emp)}
                />
              </>
            ))}
          </div>
        );
      })()}

      {/* ── Tab: Dashboard ────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <EvaluacionDashboard evaluaciones={evaluaciones} categorias={categorias} />
      )}

      {/* ── Tab: Configuración ────────────────────────────────────────────── */}
      {tab === 'config' && isAdminOrGerencia && (
        <div className="space-y-4">
          {/* Sub-tabs configuración */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f4f7f5' }}>
            {CONFIG_TABS.map(ct => (
              <button key={ct.id} onClick={() => setConfigTab(ct.id)}
                className="flex-1 py-2 text-xs font-medium rounded-md transition-colors"
                style={{
                  background: configTab === ct.id ? 'white'  : 'transparent',
                  color:      configTab === ct.id ? P.verde  : '#6b7280',
                  boxShadow:  configTab === ct.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                {ct.label}
              </button>
            ))}
          </div>

          {configTab === 'evaluadores' && (
            <ConfigEvaluadores
              configuracion={configuracion} usuarios={usuarios}
              addEvaluador={addEvaluador} removeEvaluador={removeEvaluador}
            />
          )}
          {configTab === 'periodos' && (
            <ConfigPeriodos
              periodos={periodos}
              createPeriodo={createPeriodo}
              togglePeriodo={togglePeriodo}
              deletePeriodo={deletePeriodo}
            />
          )}
          {configTab === 'cuestionario' && (
            <ConfigCuestionario
              categorias={categorias}
              createCategoria={createCategoria} toggleCategoria={toggleCategoria}
              createPregunta={createPregunta} togglePregunta={togglePregunta}
              updatePregunta={updatePregunta}
            />
          )}
        </div>
      )}

      {/* Modal empleado */}
      {empFormModal && (
        <Modal title={empFormModal === 'new' ? 'Agregar Empleado' : 'Editar Empleado'}
          onClose={() => setEmpFormModal(null)}>
          <EmpleadoForm
            inicial={empFormModal === 'new' ? null : empFormModal}
            onSave={handleGuardarEmpleado}
            onClose={() => setEmpFormModal(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}