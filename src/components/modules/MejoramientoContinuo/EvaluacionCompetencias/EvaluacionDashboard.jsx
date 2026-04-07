// src/components/modules/MejoramientoContinuo/EvaluacionCompetencias/EvaluacionDashboard.jsx
import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { calcularNivel, COLOR_NIVEL, PUNTAJE_MAX } from '@/hooks/useEvaluacionCompetencias';
import { TrendingUp, Users, Award, Target, ChevronUp, ChevronDown, Minus, Info } from 'lucide-react';

// ─── Tema institucional ───────────────────────────────────────────────────────
const T = {
  bg:      'transparent',
  panel:   '#ffffff',
  panel2:  '#f4f7f5',
  border:  '#c8d9d1',
  menta:   '#6dbd96',
  verde:   '#2e5244',
  oliva:   '#6f7b2c',
  ambar:   '#d97706',
  rojo:    '#ef4444',
  text:    '#1a2e25',
  sub:     '#5a7a6a',
  grid:    '#e4ede8',
};

const COLORES_NIVEL = {
  'Sobresaliente':                  '#2e5244',
  'Mejora Expectativas':            '#6dbd96',
  'Alcanza Expectativas':           '#6f7b2c',
  'Debajo de las Expectativas':     '#d97706',
  'Muy debajo de las Expectativas': '#ef4444',
};

const NIVELES_ORDEN = [
  'Muy debajo de las Expectativas',
  'Debajo de las Expectativas',
  'Alcanza Expectativas',
  'Mejora Expectativas',
  'Sobresaliente',
];

const NIVEL_SHORT = {
  'Muy debajo de las Expectativas': 'Muy bajo',
  'Debajo de las Expectativas':     'Debajo',
  'Alcanza Expectativas':           'Alcanza',
  'Mejora Expectativas':            'Mejora',
  'Sobresaliente':                  'Sobresaliente',
};

// Metas por defecto (del Plan column del Excel original)
const METAS_DEFAULT = {
  'Sobresaliente':                  50,
  'Mejora Expectativas':            30,
  'Alcanza Expectativas':           10,
  'Debajo de las Expectativas':     5,
  'Muy debajo de las Expectativas': 5,
};

// ─── Gauge circular ───────────────────────────────────────────────────────────
function ScoreGauge({ puntaje, nivel }) {
  const pct   = Math.round((puntaje / PUNTAJE_MAX) * 100);
  const color = COLORES_NIVEL[nivel] || T.menta;
  const r = 52, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e4ede8" strokeWidth="12" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: 'stroke-dasharray 0.8s ease' }} />
        <circle cx={cx} cy={cy} r={r - 8} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.15" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
          style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace' }}>{puntaje}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={T.sub} style={{ fontSize: 11 }}>/ {PUNTAJE_MAX} pts</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill={color} style={{ fontSize: 9, fontWeight: 700 }}>{pct}%</text>
      </svg>
      <span className="text-xs font-bold text-center px-3 mt-1" style={{ color }}>{nivel}</span>
    </div>
  );
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{ background: T.panel, border: `1px solid ${T.border}` }}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium" style={{ color: T.sub }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight" style={{ color, fontFamily: 'monospace' }}>{value}</div>
      <span className="text-xs" style={{ color: T.sub }}>{sub}</span>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
function Panel({ title, children, hint, span = 1 }) {
  const cols = { 1: '', 2: 'md:col-span-2', 3: 'md:col-span-3' };
  return (
    <div className={`rounded-xl overflow-hidden ${cols[span]}`}
      style={{ background: T.panel, border: `1px solid ${T.border}` }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
        <div className="w-1 h-4 rounded-full" style={{ background: T.menta }} />
        <span className="text-xs font-semibold uppercase tracking-widest flex-1" style={{ color: T.sub }}>{title}</span>
        {hint && (
          <div className="relative group">
            <Info className="h-3.5 w-3.5 cursor-help" style={{ color: T.sub }} />
            <div className="absolute right-0 top-5 w-56 p-2 rounded-lg text-xs z-10 hidden group-hover:block shadow-lg"
              style={{ background: T.verde, color: 'white' }}>{hint}</div>
          </div>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ background: 'white', border: `1px solid ${T.border}`, color: T.text }}>
      <p className="font-bold mb-1" style={{ color: T.verde }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: T.sub }}>{p.name}: </span>
          <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.name?.includes('%') || p.unit === '%' ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EvaluacionDashboard({ evaluaciones, categorias, metas: metasProp }) {
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [deptoFiltro,   setDeptoFiltro]   = useState('');
  const [catStats,      setCatStats]      = useState([]);
  const [loadingCats,   setLoadingCats]   = useState(false);

  // Metas: usar las props si existen, sino defaults del Excel
  const metas = metasProp || METAS_DEFAULT;

  // Cargar promedios por categoría desde BD (join detalle → pregunta → categoría)
  useEffect(() => {
    async function fetchCatStats() {
      setLoadingCats(true);
      try {
        const { data } = await supabase.rpc('ec_promedios_categoria');
        if (data) { setCatStats(data); return; }
      } catch (_) {}
      // Fallback: si no hay RPC, calcular desde detalles cargados
      // (no disponible en este scope, se mostrará vacío hasta tener RPC)
      setCatStats([]);
      setLoadingCats(false);
    }
    fetchCatStats();
    setLoadingCats(false);
  }, []);

  // ── Períodos disponibles ──────────────────────────────────────────────────
  const periodos = useMemo(() => {
    const getPNombre = (p) => typeof p === 'string' ? p : (p?.nombre || '');
    const set = new Set(evaluaciones.map(e => getPNombre(e.periodo)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [evaluaciones]);

  // ── Filtrar ───────────────────────────────────────────────────────────────
  const evsFilt = useMemo(() => evaluaciones.filter(e => {
    const epNom = typeof e.periodo === 'string' ? e.periodo : (e.periodo?.nombre || '');
    if (periodoFiltro && epNom !== periodoFiltro) return false;
    if (deptoFiltro   && e.empleado?.departamento !== deptoFiltro) return false;
    return true;
  }), [evaluaciones, periodoFiltro, deptoFiltro]);

  if (evaluaciones.length === 0) {
    return (
      <div className="rounded-xl p-16 text-center" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
        <p style={{ color: T.sub }}>Aún no hay evaluaciones para mostrar</p>
      </div>
    );
  }

  const n = evsFilt.length;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const promGeneral = n ? Math.round(evsFilt.reduce((s, e) => s + (e.puntaje_total||0), 0) / n) : 0;
  const nivelProm   = calcularNivel(promGeneral);
  const pctSobresal = n ? Math.round((evsFilt.filter(e => e.nivel_desempeno === 'Sobresaliente').length / n) * 100) : 0;
  const pctMeta     = n ? Math.round((evsFilt.filter(e => ['Sobresaliente','Mejora Expectativas'].includes(e.nivel_desempeno)).length / n) * 100) : 0;

  // ── Distribución real vs meta (del Excel Plan column) ────────────────────
  const dataNiveles = NIVELES_ORDEN.map(nivel => ({
    name:   NIVEL_SHORT[nivel],
    real:   n ? Math.round((evsFilt.filter(e => e.nivel_desempeno === nivel).length / n) * 100) : 0,
    meta:   metas[nivel] || 0,
    color:  COLORES_NIVEL[nivel],
    count:  evsFilt.filter(e => e.nivel_desempeno === nivel).length,
  }));

  // ── Por departamento: tabla de respuestas por nivel (igual al Excel) ──────
  const dataDepto = ['Operativo', 'Administrativo'].map(depto => {
    const evs  = evsFilt.filter(e => e.empleado?.departamento === depto);
    const avg  = evs.length ? Math.round(evs.reduce((s, e) => s + (e.puntaje_total||0), 0) / evs.length) : 0;
    const dist = NIVELES_ORDEN.reduce((acc, n) => {
      acc[NIVEL_SHORT[n]] = evs.filter(e => e.nivel_desempeno === n).length;
      return acc;
    }, {});
    const topEmp = [...evs].sort((a,b) => (b.puntaje_total||0) - (a.puntaje_total||0))[0];
    return { depto, count: evs.length, avg, nivel: calcularNivel(avg), topEmp, ...dist };
  });

  // ── Stacked bar por departamento ──────────────────────────────────────────
  const dataDeptoBar = ['Operativo', 'Administrativo'].map(depto => {
    const evs = evsFilt.filter(e => e.empleado?.departamento === depto);
    const obj = { depto };
    NIVELES_ORDEN.forEach(n => {
      obj[NIVEL_SHORT[n]] = evs.length
        ? Math.round((evs.filter(e => e.nivel_desempeno === n).length / evs.length) * 100)
        : 0;
    });
    return obj;
  });

  // ── Top / Bottom performers ───────────────────────────────────────────────
  const porEmpleado = Object.values(
    evsFilt.reduce((acc, ev) => {
      const id = ev.empleado_id;
      if (!acc[id]) acc[id] = { nombre: ev.empleado?.nombre_completo || '—', depto: ev.empleado?.departamento, evals: [] };
      acc[id].evals.push(ev.puntaje_total || 0);
      return acc;
    }, {})
  ).map(e => ({ ...e, promedio: Math.round(e.evals.reduce((s,v)=>s+v,0)/e.evals.length) }))
   .sort((a, b) => b.promedio - a.promedio);

  const top5    = porEmpleado.slice(0, 5);
  const bottom5 = [...porEmpleado].sort((a,b) => a.promedio - b.promedio).slice(0, 5);

  // ── Tendencia por período ─────────────────────────────────────────────────
  const tendencia = periodos.map(p => {
    const evs = evaluaciones.filter(e => {
      const n = typeof e.periodo === 'string' ? e.periodo : (e.periodo?.nombre || '');
      return n === p;
    });
    return {
      periodo: p,
      promedio: evs.length ? Math.round(evs.reduce((s,e)=>s+(e.puntaje_total||0),0)/evs.length) : 0,
      total: evs.length,
      sobresaliente: evs.length ? Math.round((evs.filter(e=>e.nivel_desempeno==='Sobresaliente').length/evs.length)*100) : 0,
    };
  }).sort((a,b) => String(a.periodo).localeCompare(String(b.periodo)));

  // ── Donut distribución ────────────────────────────────────────────────────
  const dataPie = NIVELES_ORDEN
    .map(n => ({ name: NIVEL_SHORT[n], value: evsFilt.filter(e=>e.nivel_desempeno===n).length, color: COLORES_NIVEL[n], full: n }))
    .filter(d => d.value > 0);

  // ── Categorías: promedio por pregunta (escala 1-5 → porcentaje) ───────────
  // Calculamos desde catStats (BD) o mostramos placeholder
  const dataCategorias = catStats.length > 0
    ? catStats.map(c => ({
        cat:     c.nombre.split(' ')[0],
        nombre:  c.nombre,
        avg:     parseFloat(c.promedio_respuesta),
        pct:     Math.round((parseFloat(c.promedio_respuesta) / 5) * 100),
        pregs:   c.num_preguntas,
        color:   T.menta,
      }))
    : categorias.map(c => {
        // Estimación visual desde el nivel general (sin detalles cargados)
        const n_pregs = c.preguntas?.filter(p=>p.is_active).length || 0;
        return { cat: c.nombre.split(' ')[0], nombre: c.nombre, avg: null, pct: null, pregs: n_pregs };
      });

  return (
    <div className="space-y-4 rounded-xl p-4" style={{ background: T.bg }}>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text }}
          value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value)}>
          <option value="">Todos los períodos</option>
          {periodos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text }}
          value={deptoFiltro} onChange={e => setDeptoFiltro(e.target.value)}>
          <option value="">Todos los departamentos</option>
          <option value="Operativo">Operativo</option>
          <option value="Administrativo">Administrativo</option>
        </select>
        <span className="text-xs ml-auto font-medium" style={{ color: T.sub }}>
          {n} evaluación{n !== 1 ? 'es' : ''} {periodoFiltro ? `· ${periodoFiltro}` : ''}
        </span>
      </div>

      {/* ── Fila 1: Gauge + KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="md:col-span-1 flex items-center justify-center rounded-xl"
          style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <ScoreGauge puntaje={promGeneral} nivel={nivelProm} />
        </div>
        <KpiTile label="Total Evaluaciones" value={n}                   sub="en este filtro"        color={T.verde}   icon={Users}     />
        <KpiTile label="Sobresaliente"       value={`${pctSobresal}%`}  sub="del total"             color={COLORES_NIVEL['Sobresaliente']} icon={Award} />
        <KpiTile label="Sobre Meta"          value={`${pctMeta}%`}      sub="Mejora + Sobresaliente" color={T.oliva}  icon={Target}    />
        <KpiTile label="Períodos Evaluados"  value={periodos.length}    sub="registrados"           color={T.ambar}   icon={TrendingUp} />
      </div>

      {/* ── Fila 2: Real vs Meta + Donut ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Panel title="Distribución Real vs Meta"
          hint="Las metas (barras grises) vienen del Plan definido en la configuración. Cada barra verde muestra el % real alcanzado."
          span={2}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dataNiveles} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: T.panel2 }} />
              <Legend wrapperStyle={{ color: T.sub, fontSize: 11 }} />
              <Bar dataKey="real" name="Real %" radius={[4,4,0,0]}>
                {dataNiveles.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
              <Bar dataKey="meta" name="Meta %" fill={T.border} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* Mini tabla de conteos — igual que el Dashboard-OLD del Excel */}
          <div className="mt-3 rounded-lg overflow-hidden border text-xs" style={{ borderColor: T.border }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: T.panel2, color: T.sub }}>
                  <th className="text-left px-3 py-1.5 font-medium">Nivel</th>
                  <th className="text-center px-3 py-1.5 font-medium"># Evals</th>
                  <th className="text-center px-3 py-1.5 font-medium">Real %</th>
                  <th className="text-center px-3 py-1.5 font-medium">Meta %</th>
                  <th className="text-center px-3 py-1.5 font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {[...dataNiveles].reverse().map((d, i) => {
                  const diff = d.real - d.meta;
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: T.border }}>
                      <td className="px-3 py-1.5 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span style={{ color: T.text }}>{d.name}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono font-bold" style={{ color: d.color }}>{d.count}</td>
                      <td className="px-3 py-1.5 text-center font-mono">{d.real}%</td>
                      <td className="px-3 py-1.5 text-center font-mono text-gray-400">{d.meta}%</td>
                      <td className="px-3 py-1.5 text-center font-mono font-bold"
                        style={{ color: diff >= 0 ? T.menta : T.rojo }}>
                        {diff >= 0 ? '+' : ''}{diff}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Distribución">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={dataPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                dataKey="value" paddingAngle={3}>
                {dataPie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {dataPie.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="flex-1 truncate" style={{ color: T.sub }}>{d.name}</span>
                <span className="font-bold font-mono" style={{ color: d.color }}>{d.value}</span>
                <span style={{ color: T.sub }}>({n ? Math.round((d.value/n)*100) : 0}%)</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Fila 3: Tabla por área (= Dashboard-OLD del Excel) ───────────── */}
      <Panel title="Resumen por Área — Conteo de Respuestas"
        hint="Muestra cuántas respuestas individuales (preguntas×evaluaciones) cayeron en cada nivel por área. Equivale a la tabla 'Areas' del Excel.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: T.panel2, color: T.sub }}>
                <th className="text-left px-4 py-2 font-medium">Área</th>
                <th className="text-center px-3 py-2 font-medium"># Evals</th>
                <th className="text-center px-3 py-2 font-medium" style={{ color: COLORES_NIVEL['Muy debajo de las Expectativas'] }}>Muy bajo</th>
                <th className="text-center px-3 py-2 font-medium" style={{ color: COLORES_NIVEL['Debajo de las Expectativas'] }}>Debajo</th>
                <th className="text-center px-3 py-2 font-medium" style={{ color: COLORES_NIVEL['Alcanza Expectativas'] }}>Alcanza</th>
                <th className="text-center px-3 py-2 font-medium" style={{ color: COLORES_NIVEL['Mejora Expectativas'] }}>Mejora</th>
                <th className="text-center px-3 py-2 font-medium" style={{ color: COLORES_NIVEL['Sobresaliente'] }}>Sobresaliente</th>
                <th className="text-center px-3 py-2 font-medium" style={{ color: T.verde }}>Puntaje Prom.</th>
                <th className="text-left px-3 py-2 font-medium">Mejor Desempeño</th>
              </tr>
            </thead>
            <tbody>
              {dataDepto.map((d, i) => (
                <tr key={i} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: d.depto==='Operativo'?T.menta+'20':T.oliva+'20',
                               color:      d.depto==='Operativo'?T.verde:T.oliva }}>
                      {d.depto}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold" style={{ color: T.text }}>{d.count}</td>
                  {['Muy bajo','Debajo','Alcanza','Mejora','Sobresaliente'].map(k => (
                    <td key={k} className="px-3 py-2.5 text-center font-mono"
                      style={{ color: d[k] > 0 ? COLORES_NIVEL[Object.keys(NIVEL_SHORT).find(n=>NIVEL_SHORT[n]===k)] : T.sub }}>
                      {d[k] > 0 ? d[k] : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-black font-mono text-sm" style={{ color: COLORES_NIVEL[d.nivel] }}>{d.avg}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: T.text }}>
                    {d.topEmp ? (
                      <div>
                        <div className="font-medium truncate max-w-36">{d.topEmp.empleado?.nombre_completo?.split(' ')[0]} {d.topEmp.empleado?.nombre_completo?.split(' ')[2]}</div>
                        <div style={{ color: T.menta }} className="font-mono font-bold">{d.topEmp.puntaje_total} pts</div>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Fila 4: Stacked bar depto + Tendencia ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Panel title="% por Nivel según Área" span={2}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dataDeptoBar} layout="vertical" barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0,100]} />
              <YAxis type="category" dataKey="depto" tick={{ fill: T.text, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: T.panel2 }} />
              {NIVELES_ORDEN.map(n => (
                <Bar key={n} dataKey={NIVEL_SHORT[n]} stackId="a" fill={COLORES_NIVEL[n]} name={NIVEL_SHORT[n]}
                  radius={n==='Sobresaliente'?[0,4,4,0]:n==='Muy debajo de las Expectativas'?[4,0,0,4]:[0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Tendencia por Período"
          hint="Promedio general de puntaje (eje izq.) y % de Sobresalientes (eje der.) por cada período evaluado.">
          {tendencia.length < 2 ? (
            <div className="flex items-center justify-center h-32 text-xs text-center" style={{ color: T.sub }}>
              Necesitas ≥ 2 períodos<br/>para ver la tendencia
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={tendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
                <XAxis dataKey="periodo" tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={[0,85]} tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fill: T.sub, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine yAxisId="left" y={69} stroke={T.menta} strokeDasharray="4 2" strokeOpacity={0.5} />
                <Line yAxisId="left" dataKey="promedio" name="Prom. puntaje" stroke={T.verde} strokeWidth={2.5}
                  dot={{ fill: T.verde, r: 4 }} />
                <Line yAxisId="right" dataKey="sobresaliente" name="% Sobresaliente" stroke={T.menta} strokeWidth={2}
                  strokeDasharray="5 3" dot={{ fill: T.menta, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* ── Fila 5: Promedio por categoría (del Tablero del Excel) ────────── */}
      <Panel title="Desempeño por Categoría"
        hint="Promedio de respuestas por categoría en escala 1–5. Calculado desde los detalles de cada evaluación vía la función ec_promedios_categoria.">
        {catStats.length === 0 ? (
          <div className="p-4 rounded-lg text-sm text-center" style={{ background: T.panel2 }}>
            <p style={{ color: T.sub }} className="mb-2">
              Para ver este gráfico, ejecuta este SQL en Supabase:
            </p>
            <pre className="text-left text-xs p-3 rounded-lg overflow-x-auto" style={{ background: T.verde, color: 'white' }}>{`CREATE OR REPLACE FUNCTION ec_promedios_categoria()
RETURNS TABLE(nombre TEXT, promedio_respuesta NUMERIC, num_preguntas BIGINT) AS $$
  SELECT c.nombre, ROUND(AVG(d.respuesta::numeric),2), COUNT(DISTINCT p.id)
  FROM ec_evaluacion_detalle d
  JOIN ec_pregunta p ON p.id = d.pregunta_id
  JOIN ec_categoria c ON c.id = p.categoria_id
  GROUP BY c.id, c.nombre, c.orden ORDER BY c.orden
$$ LANGUAGE SQL SECURITY DEFINER;`}</pre>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataCategorias} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={T.grid} horizontal={false} />
                <XAxis type="number" domain={[0,5]} tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}/5`} />
                <YAxis type="category" dataKey="cat" tick={{ fill: T.text, fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: T.panel2 }} />
                <ReferenceLine x={4} stroke={T.menta} strokeDasharray="4 2" strokeOpacity={0.6}
                  label={{ value: 'Meta', fill: T.menta, fontSize: 9, position: 'top' }} />
                <Bar dataKey="avg" name="Promedio (1-5)" fill={T.menta} radius={[0,4,4,0]} barSize={24}>
                  {dataCategorias.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 4 ? T.verde : d.avg >= 3 ? T.oliva : T.ambar} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Radar chart de categorías */}
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={dataCategorias}>
                <PolarGrid stroke={T.grid} />
                <PolarAngleAxis dataKey="cat" tick={{ fill: T.text, fontSize: 10 }} />
                <PolarRadiusAxis domain={[0,5]} tick={{ fill: T.sub, fontSize: 9 }} />
                <Radar name="Promedio" dataKey="avg" stroke={T.verde} fill={T.menta} fillOpacity={0.3}
                  strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* ── Fila 6: Top 5 / Bottom 5 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { title:'🏆 Top 5 — Mayor Desempeño', data: top5 },
          { title:'⚠️  Oportunidades de Mejora', data: bottom5 },
        ].map(({ title, data }) => (
          <Panel key={title} title={title}>
            <div className="space-y-2">
              {data.map((emp, i) => {
                const nivel = calcularNivel(emp.promedio);
                const color = COLORES_NIVEL[nivel];
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ background: T.panel2, border: `1px solid ${T.border}` }}>
                    <span className="text-xs font-black w-5 text-center" style={{ color: T.sub }}>{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: T.text }}>{emp.nombre}</div>
                      <div className="text-xs" style={{ color: T.sub }}>{emp.depto} · {emp.evals.length} eval.</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black font-mono" style={{ color }}>{emp.promedio}</div>
                      <div className="text-xs" style={{ color }}>{NIVEL_SHORT[nivel]}</div>
                    </div>
                    <div className="w-14 rounded-full h-1.5 shrink-0" style={{ background: '#e4ede8' }}>
                      <div className="h-1.5 rounded-full" style={{ width:`${(emp.promedio/85)*100}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

    </div>
  );
}