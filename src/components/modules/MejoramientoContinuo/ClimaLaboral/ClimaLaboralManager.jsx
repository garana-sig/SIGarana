// src/components/modules/MejoramientoContinuo/ClimaLaboral/ClimaLaboralManager.jsx

import { useState } from 'react';
import {
  ArrowLeft, Smile, Users, TrendingUp, BarChart3,
  RefreshCw, Download, ArrowUpRight, ArrowDownRight, Minus, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { useSurveyResponses, useAllPeriodsStats } from '@/hooks/useSurveys';
import { exportClimaLaboral } from '@/utils/exportSurveyExcel';
import SurveyConfigModal from '../SurveyConfigModal';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', bg: '#dedecc' };
const STATUS_COLORS = { good: '#22c55e', warning: '#eab308', critical: '#ef4444', no_data: '#aaa' };
const STATUS_LABELS = { good: 'Bueno', warning: 'Regular', critical: 'Crítico', no_data: 'Sin datos' };
const SCALE_COLORS  = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };

const CATEGORY_COLORS = {
  'Desarrollo y Crecimiento':          '#2e5244',
  'Condiciones Laborales':             '#6f7b2c',
  'Condiciones en Puesto de Trabajo':  '#3d6b59',
  'Comunicación y Liderazgo':          '#4a7c3f',
  'Reconocimiento y Motivación':       '#6dbd96',
};

// Líneas en gráfica de tendencia por categoría
const CAT_LINE_COLORS = ['#2e5244', '#6f7b2c', '#3d6b59', '#4a7c3f', '#6dbd96'];

const META = 4.0;

export default function ClimaLaboralManager({ onBack }) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedArea, setSelectedArea]         = useState('all');
  const [activeTab, setActiveTab]               = useState('overview');
  const [downloading, setDownloading]           = useState(false);
  const [showConfig, setShowConfig]             = useState(false); // ← NUEVO

  const {
    responses, answers, questions, periods, loading, error, reload,
    overallAverage, satisfactionRate, statsByQuestion, statsByCategory,
    getStatus,
  } = useSurveyResponses('work_climate', selectedPeriodId);

  const { data: allPeriodsData, loading: trendLoading } = useAllPeriodsStats('work_climate');

  const activePeriod  = periods.find(p => p.is_active);
  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || activePeriod;

  // ── Filtrar por área ─────────────────────────────────────────────────────────
  const filteredResponses   = selectedArea === 'all' ? responses : responses.filter(r => r.work_area === selectedArea);
  const filteredResponseIds = new Set(filteredResponses.map(r => r.id));
  const filteredAnswers     = answers.filter(a => filteredResponseIds.has(a.response_id));
  const scaleQuestions      = questions.filter(q => q.question_type === 'scale');

  // Stats recalculadas con filtro
  const filteredStatsByQ = (() => {
    const stats = {};
    scaleQuestions.forEach(q => {
      const qAns = filteredAnswers.filter(a => a.question_id === q.id && a.value_number !== null);
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      qAns.forEach(a => { dist[a.value_number] = (dist[a.value_number] || 0) + 1; });
      const sum = qAns.reduce((acc, a) => acc + a.value_number, 0);
      stats[q.id] = { avg: qAns.length ? (sum / qAns.length).toFixed(2) : null, count: qAns.length, distribution: dist };
    });
    return stats;
  })();

  const filteredAvg = (() => {
    const all = filteredAnswers.filter(a => a.value_number !== null);
    return all.length ? (all.reduce((s, a) => s + a.value_number, 0) / all.length).toFixed(2) : 0;
  })();

  const filteredSatisfactionRate = (() => {
    const all = filteredAnswers.filter(a => a.value_number !== null);
    return all.length ? Math.round((all.filter(a => a.value_number >= 4).length / all.length) * 100) : 0;
  })();

  // ── Delta vs período anterior ─────────────────────────────────────────────────
  const currentTrendIdx = allPeriodsData.findIndex(d => d.periodId === currentPeriod?.id);
  const prevTrendData   = currentTrendIdx > 0 ? allPeriodsData[currentTrendIdx - 1] : null;
  const delta           = prevTrendData && filteredAvg
    ? parseFloat((parseFloat(filteredAvg) - prevTrendData.avg).toFixed(2))
    : null;

  // ── Datos gráficas ────────────────────────────────────────────────────────────
  const radarData = (() => {
    const cats = {};
    scaleQuestions.filter(q => q.category).forEach(q => {
      if (!cats[q.category]) cats[q.category] = { sum: 0, count: 0 };
      const qAns = filteredAnswers.filter(a => a.question_id === q.id && a.value_number !== null);
      qAns.forEach(a => { cats[q.category].sum += a.value_number; cats[q.category].count++; });
    });
    return Object.entries(cats).map(([cat, d]) => ({
      category: cat.length > 22 ? cat.substring(0, 20) + '…' : cat,
      fullName: cat,
      avg:      d.count ? parseFloat((d.sum / d.count).toFixed(2)) : 0,
    }));
  })();

  const avgChartData = scaleQuestions.map((q, idx) => ({
    name:   `P${idx + 1}`,
    label:  q.question_text,
    avg:    parseFloat(filteredStatsByQ[q.id]?.avg || 0),
    status: getStatus(filteredStatsByQ[q.id]?.avg),
  })).sort((a, b) => a.avg - b.avg);

  const distChartData = scaleQuestions.map((q, idx) => {
    const dist = filteredStatsByQ[q.id]?.distribution || {};
    return { name: `P${idx + 1}`, label: q.question_text, '1': dist[1]||0, '2': dist[2]||0, '3': dist[3]||0, '4': dist[4]||0, '5': dist[5]||0 };
  });

  const comparisonData = (() => {
    const areas = ['Administrativo', 'Operativo'];
    const areaAns = {};
    areas.forEach(area => {
      const ids = new Set(responses.filter(r => r.work_area === area).map(r => r.id));
      areaAns[area] = answers.filter(a => ids.has(a.response_id));
    });
    return scaleQuestions.map((q, idx) => {
      const row = { name: `P${idx + 1}`, label: q.question_text };
      areas.forEach(area => {
        const qAns = areaAns[area].filter(a => a.question_id === q.id && a.value_number !== null);
        row[area] = qAns.length ? parseFloat((qAns.reduce((s, a) => s + a.value_number, 0) / qAns.length).toFixed(2)) : 0;
      });
      return row;
    });
  })();

  // Top3 / Bottom3
  const ranked = [...avgChartData].filter(d => d.avg > 0).sort((a, b) => b.avg - a.avg);
  const top3   = ranked.slice(0, 3);
  const bot3   = [...ranked].reverse().slice(0, 3);

  // Tendencia por categoría (para LineChart multicategoría)
  const allCategories = [...new Set(scaleQuestions.map(q => q.category).filter(Boolean))];
  const trendByCatData = allPeriodsData.map(p => {
    const row = { semLabel: p.semLabel, isActive: p.isActive, avg: p.avg };
    allCategories.forEach(cat => {
      row[cat] = p.categoryAvgs?.[cat] ?? null;
    });
    return row;
  });

  // ── Exportar Excel ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    setDownloading(true);
    try {
      exportClimaLaboral({ responses, answers, questions, periods, currentPeriod, filterArea: selectedArea });
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('Error al generar el Excel. Verifica que el paquete xlsx esté instalado: npm install xlsx');
    } finally {
      setDownloading(false);
    }
  };

  // ─── Enlace para empleados ────────────────────────────────────────────────────
  const surveyLink = activePeriod
    ? `${window.location.origin}/encuesta/clima-laboral?pid=${activePeriod.id}`
    : null;

  // ─── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;
  if (error)   return <div className="p-6 text-center"><p className="text-red-500 mb-4">Error: {error}</p><Button onClick={reload} variant="outline">Reintentar</Button></div>;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" style={{ color: C.green }}>Clima Laboral</h2>
          <p className="text-sm" style={{ color: C.olive }}>
            {currentPeriod ? currentPeriod.name : 'Sin período activo'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* ── NUEVO: Botón configuración ── */}
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-1" /> Configurar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={downloading || filteredResponses.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            {downloading ? 'Generando...' : 'Exportar Excel'}
          </Button>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
          </Button>
        </div>
      </div>

      {/* ── Selector de período ── */}
      {periods.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button style={{ ...btnStyle, ...(selectedPeriodId === null ? btnActiveStyle : {}) }} onClick={() => setSelectedPeriodId(null)}>Período activo</button>
          {periods.map(p => (
            <button key={p.id} style={{ ...btnStyle, ...(selectedPeriodId === p.id ? btnActiveStyle : {}) }} onClick={() => setSelectedPeriodId(p.id)}>
              {p.name}{p.is_active && <span style={{ marginLeft: 6, color: C.mint }}>●</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Filtro por área ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>Filtrar área:</span>
        {[
          { value: 'all',            label: 'Todos' },
          { value: 'Administrativo', label: '🏢 Administrativo' },
          { value: 'Operativo',      label: '🔧 Operativo' },
        ].map(a => (
          <button key={a.value} style={{ ...btnStyle, ...(selectedArea === a.value ? btnActiveStyle : {}), fontSize: 12 }}
            onClick={() => setSelectedArea(a.value)}>{a.label}
          </button>
        ))}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total respuestas" value={filteredResponses.length} color={C.green} />
        <StatCard icon={<Smile className="h-5 w-5" />} label="Promedio general" value={filteredAvg} suffix="/ 5"
          color={STATUS_COLORS[getStatus(filteredAvg)]} delta={delta} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="% Satisfacción (≥4)" value={`${filteredSatisfactionRate}%`}
          color={filteredSatisfactionRate >= 70 ? '#22c55e' : filteredSatisfactionRate >= 50 ? '#eab308' : '#ef4444'}
          deltaLabel={prevTrendData ? `${prevTrendData.satisfactionRate}% período ant.` : null} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Categorías evaluadas" value={radarData.length} color={C.olive} />
      </div>

      {/* ── Top 3 / Bottom 3 ── */}
      {filteredResponses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankCard title="✅ Top 3 mejor calificadas" items={top3} color="#22c55e" />
          <RankCard title="⚠️ Top 3 por mejorar"      items={bot3} color="#ef4444" />
        </div>
      )}

      {/* ── Enlace para empleados ── */}
      {surveyLink ? (
        <div className="p-3 rounded-lg border flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: `${C.mint}15`, borderColor: C.mint }}>
          <span style={{ color: C.green, fontSize: 13 }}>🔗 Enlace para empleados:</span>
          <code style={{ color: C.green, fontSize: 12, fontWeight: 600, wordBreak: 'break-all' }}>{surveyLink}</code>
          <button
            style={{ marginLeft: 'auto', fontSize: 12, color: C.mint, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => navigator.clipboard?.writeText(surveyLink)}>
            📋 Copiar
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-lg border" style={{ backgroundColor: '#fff8f0', borderColor: '#f97316' }}>
          <p style={{ fontSize: 13, color: '#c2410c' }}>
            ⚠️ No hay un período activo. Ve a <strong>Configurar</strong> para crear o activar uno.
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'overview',     label: 'Promedios' },
          { id: 'categories',   label: 'Por categoría' },
          { id: 'trend',        label: `Tendencia ${allPeriodsData.length > 1 ? `(${allPeriodsData.length})` : ''}` },
          { id: 'distribution', label: 'Distribución' },
          { id: 'comparison',   label: 'Admin vs Operativo' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 600, background: 'none',
              border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? `2px solid ${C.green}` : '2px solid transparent',
              color: activeTab === tab.id ? C.green : '#888',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Promedios ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {filteredResponses.length === 0 ? <EmptyState /> : (
            <>
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Promedio por pregunta (menor a mayor)</CardTitle>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Línea punteada = meta de satisfacción ({META})</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(320, avgChartData.length * 36)}>
                    <BarChart data={avgChartData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                      <ReferenceLine x={META} stroke={C.olive} strokeDasharray="4 3"
                        label={{ value: `Meta ${META}`, position: 'insideTopRight', fontSize: 10, fill: C.olive }} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', maxWidth: 280, fontSize: 12 }}>
                            <p style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>{d.label}</p>
                            <p>Promedio: <strong style={{ color: STATUS_COLORS[d.status] }}>{d.avg}</strong> / 5</p>
                            <p style={{ color: '#aaa', marginTop: 2 }}>Meta: {META} / 5</p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="avg" radius={[0, 6, 6, 0]}
                        label={{ position: 'right', fontSize: 11, fontWeight: 700, fill: '#444' }}>
                        {avgChartData.map((entry, i) => <rect key={i} fill={STATUS_COLORS[entry.status]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader><CardTitle style={{ color: C.green, fontSize: 15 }}>Detalle por pregunta</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9f4' }}>
                          <th style={th}>#</th>
                          <th style={{ ...th, textAlign: 'left' }}>Pregunta</th>
                          <th style={th}>Categoría</th>
                          <th style={th}>Promedio</th>
                          <th style={th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scaleQuestions.map((q, idx) => {
                          const stat   = filteredStatsByQ[q.id] || {};
                          const status = getStatus(stat.avg);
                          const cc     = CATEGORY_COLORS[q.category] || C.green;
                          return (
                            <tr key={q.id} style={{ borderTop: '1px solid #f0f0e8' }}>
                              <td style={{ ...td, textAlign: 'center', color: '#999' }}>{idx + 1}</td>
                              <td style={{ ...td, color: '#333' }}>{q.question_text}</td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{ fontSize: 11, color: cc, fontWeight: 600, backgroundColor: `${cc}18`, padding: '2px 8px', borderRadius: 10 }}>{q.category}</span>
                              </td>
                              <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>{stat.avg || '—'}</td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}>
                                  {STATUS_LABELS[status]}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Por categoría (RadarChart) ── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {filteredResponses.length === 0 ? <EmptyState /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader><CardTitle style={{ color: C.green, fontSize: 15 }}>Radar por categoría</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#555' }} />
                      <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                      <Radar dataKey="avg" stroke={C.green} fill={C.green} fillOpacity={0.25} dot={{ fill: C.green, r: 4 }} />
                      <Tooltip formatter={(val) => [`${val} / 5`, 'Promedio']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader><CardTitle style={{ color: C.green, fontSize: 15 }}>Promedio por categoría</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9f4' }}>
                        <th style={{ ...th, textAlign: 'left' }}>Categoría</th>
                        <th style={th}>Promedio</th>
                        <th style={th}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...radarData].sort((a, b) => a.avg - b.avg).map(row => {
                        const status = getStatus(row.avg);
                        const cc     = CATEGORY_COLORS[row.fullName] || C.green;
                        return (
                          <tr key={row.fullName} style={{ borderTop: '1px solid #f0f0e8' }}>
                            <td style={td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: cc, flexShrink: 0 }} />
                                <span style={{ color: '#333' }}>{row.fullName}</span>
                              </div>
                            </td>
                            <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>{row.avg} / 5</td>
                            <td style={{ ...td, textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}>
                                {STATUS_LABELS[status]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Tendencia histórica ── */}
      {activeTab === 'trend' && (
        <div className="space-y-4">
          {trendLoading ? <LoadingSpinner /> : allPeriodsData.length < 2 ? (
            <EmptyState message="Se necesitan al menos 2 períodos para mostrar la tendencia. Sigue recolectando datos." />
          ) : (
            <>
              <div className="p-4 rounded-lg" style={{ backgroundColor: `${C.mint}15`, border: `1px solid ${C.mint}40` }}>
                <p style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 4 }}>¿Cómo leer esta gráfica?</p>
                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>
                  Cada línea representa una <strong>categoría del clima laboral</strong> a lo largo de los períodos semestrales.
                  La línea punteada marca la <strong>meta ({META}/5)</strong>. Las líneas que suben indican mejora real en esa dimensión del clima.
                </p>
              </div>

              {/* Tendencia general */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Evolución del promedio general</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={allPeriodsData} margin={{ left: 0, right: 24, top: 16, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                      <XAxis dataKey="semLabel" fontSize={12} />
                      <YAxis domain={[1, 5]} tickCount={5} fontSize={11} />
                      <ReferenceLine y={META} stroke={C.olive} strokeDasharray="5 3"
                        label={{ value: `Meta ${META}`, position: 'insideTopLeft', fontSize: 11, fill: C.olive }} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const status = !d.avg ? 'no_data' : d.avg >= 4 ? 'good' : d.avg >= 3 ? 'warning' : 'critical';
                        return (
                          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                            <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{d.semLabel}</p>
                            <p>Promedio: <strong style={{ color: STATUS_COLORS[status] }}>{d.avg}</strong> / 5</p>
                            <p style={{ color: '#555' }}>{d.count} respuestas · {d.satisfactionRate}% satisfacción</p>
                          </div>
                        );
                      }} />
                      <Line type="monotone" dataKey="avg" stroke={C.green} strokeWidth={2.5}
                        dot={{ fill: C.green, r: 5 }} activeDot={{ r: 7, fill: C.mint }} name="Promedio general" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tendencia por categoría */}
              {allCategories.length > 0 && (
                <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                  <CardHeader>
                    <CardTitle style={{ color: C.green, fontSize: 15 }}>Evolución por categoría</CardTitle>
                    <div className="flex gap-4 flex-wrap mt-2">
                      {allCategories.map((cat, i) => (
                        <div key={cat} className="flex items-center gap-1">
                          <div style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: CAT_LINE_COLORS[i % CAT_LINE_COLORS.length] }} />
                          <span style={{ fontSize: 11, color: '#555' }}>{cat}</span>
                        </div>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={trendByCatData} margin={{ left: 0, right: 24, top: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                        <XAxis dataKey="semLabel" fontSize={12} />
                        <YAxis domain={[1, 5]} tickCount={5} fontSize={11} />
                        <ReferenceLine y={META} stroke={C.olive} strokeDasharray="5 3" />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                                <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{label}</p>
                                {payload.filter(p => p.value !== null).sort((a, b) => b.value - a.value).map(p => (
                                  <p key={p.dataKey} style={{ color: p.color }}>
                                    {p.name}: <strong>{p.value}</strong>
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        {allCategories.map((cat, i) => (
                          <Line key={cat} type="monotone" dataKey={cat} name={cat}
                            stroke={CAT_LINE_COLORS[i % CAT_LINE_COLORS.length]} strokeWidth={2}
                            dot={{ r: 4 }} connectNulls activeDot={{ r: 6 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tabla de evolución */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader><CardTitle style={{ color: C.green, fontSize: 15 }}>Comparativa entre períodos</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9f4' }}>
                          <th style={{ ...th, textAlign: 'left' }}>Período</th>
                          <th style={th}>Resp.</th>
                          <th style={th}>Promedio</th>
                          <th style={th}>% Satisf.</th>
                          <th style={th}>vs. anterior</th>
                          <th style={th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...allPeriodsData].reverse().map((d, idx, arr) => {
                          const prev   = arr[idx + 1];
                          const diff   = prev && d.avg ? parseFloat((d.avg - prev.avg).toFixed(2)) : null;
                          const status = !d.avg ? 'no_data' : d.avg >= 4 ? 'good' : d.avg >= 3 ? 'warning' : 'critical';
                          return (
                            <tr key={d.periodId} style={{ borderTop: '1px solid #f0f0e8', backgroundColor: d.isActive ? `${C.mint}10` : 'transparent' }}>
                              <td style={{ ...td, fontWeight: d.isActive ? 700 : 400, color: d.isActive ? C.green : '#333' }}>
                                {d.semLabel} {d.isActive && <Badge style={{ fontSize: 10, marginLeft: 6 }}>Activo</Badge>}
                              </td>
                              <td style={{ ...td, textAlign: 'center', color: '#666' }}>{d.count}</td>
                              <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>{d.avg ?? '—'}</td>
                              <td style={{ ...td, textAlign: 'center', color: '#555' }}>{d.satisfactionRate !== null ? `${d.satisfactionRate}%` : '—'}</td>
                              <td style={{ ...td, textAlign: 'center' }}><DeltaBadge value={diff} /></td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}>
                                  {STATUS_LABELS[status]}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Distribución ── */}
      {activeTab === 'distribution' && (
        <div className="space-y-4">
          {filteredResponses.length === 0 ? <EmptyState /> : (
            <Card className="border" style={{ borderColor: '#e5e7eb' }}>
              <CardHeader>
                <CardTitle style={{ color: C.green, fontSize: 15 }}>Distribución de respuestas por pregunta</CardTitle>
                <div className="flex gap-3 flex-wrap mt-2">
                  {[1,2,3,4,5].map(v => (
                    <div key={v} className="flex items-center gap-1">
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: SCALE_COLORS[v] }} />
                      <span style={{ fontSize: 11, color: '#666' }}>{['','Alta Insatisf.','Parcial Insatisf.','Regular','Parcial Satisf.','Alta Satisf.'][v]}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(320, distChartData.length * 36)}>
                  <BarChart data={distChartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const item = distChartData.find(d => d.name === label);
                      return (
                        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 12, maxWidth: 280 }}>
                          <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{item?.label}</p>
                          {payload.map(p => (
                            <p key={p.dataKey} style={{ color: SCALE_COLORS[p.dataKey] }}>
                              {['','Alta Insatisf.','Parcial Insatisf.','Regular','Parcial Satisf.','Alta Satisf.'][p.dataKey]}: <strong>{p.value}</strong>
                            </p>
                          ))}
                        </div>
                      );
                    }} />
                    {[1,2,3,4,5].map(v => <Bar key={v} dataKey={String(v)} stackId="a" fill={SCALE_COLORS[v]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Admin vs Operativo ── */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          {responses.length === 0 ? <EmptyState /> : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {['Administrativo', 'Operativo'].map(area => {
                  const aResp = responses.filter(r => r.work_area === area);
                  const aIds  = new Set(aResp.map(r => r.id));
                  const aAns  = answers.filter(a => aIds.has(a.response_id) && a.value_number !== null);
                  const avg   = aAns.length ? (aAns.reduce((s, a) => s + a.value_number, 0) / aAns.length).toFixed(2) : '—';
                  const sat   = aAns.length ? Math.round((aAns.filter(a => a.value_number >= 4).length / aAns.length) * 100) : null;
                  const status = getStatus(avg);
                  return (
                    <Card key={area} className="border" style={{ borderColor: '#e5e7eb' }}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{ fontSize: 20 }}>{area === 'Administrativo' ? '🏢' : '🔧'}</span>
                          <span style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>{area}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: STATUS_COLORS[status] }}>{avg}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{aResp.length} resp. · {sat !== null ? `${sat}% satisf.` : ''}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Comparativa por pregunta</CardTitle>
                  <div className="flex gap-4 mt-1">
                    {[['Administrativo', C.green], ['Operativo', C.mint]].map(([area, color]) => (
                      <div key={area} className="flex items-center gap-2">
                        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
                        <span style={{ fontSize: 12, color: '#666' }}>{area}</span>
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(320, comparisonData.length * 44)}>
                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 12, maxWidth: 280 }}>
                            <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{d?.label}</p>
                            {payload.map(p => <p key={p.dataKey} style={{ color: p.fill }}>{p.dataKey}: <strong>{p.value}</strong></p>)}
                          </div>
                        );
                      }} />
                      <Bar dataKey="Administrativo" fill={C.green} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Operativo"      fill={C.mint}  radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Modal de configuración ── */}
      {showConfig && (
        <SurveyConfigModal
          surveyTypeCode="work_climate"
          surveyTypeName="Clima Laboral"
          onClose={() => { setShowConfig(false); reload(); }}
        />
      )}

    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, suffix, color, delta, deltaLabel }) {
  return (
    <Card className="border" style={{ borderColor: '#e5e7eb' }}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1" style={{ color }}>
          {icon}
          <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>
          {value}
          {suffix && <span style={{ fontSize: 14, fontWeight: 400, color: '#aaa', marginLeft: 4 }}>{suffix}</span>}
        </div>
        {delta !== null && delta !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            <DeltaBadge value={delta} size="sm" />
            <span style={{ fontSize: 11, color: '#aaa' }}>vs período anterior</span>
          </div>
        )}
        {deltaLabel && !delta && <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{deltaLabel}</p>}
      </CardContent>
    </Card>
  );
}

function RankCard({ title, items, color }) {
  if (!items.length) return null;
  return (
    <Card className="border" style={{ borderColor: '#e5e7eb' }}>
      <CardHeader><CardTitle style={{ fontSize: 14, color: '#333' }}>{title}</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span style={{ width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}20`, color }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 12, color: '#444', lineHeight: 1.4 }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color }}>{item.avg}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ value, size = 'md' }) {
  if (value === null || value === undefined) return <span style={{ fontSize: 11, color: '#aaa' }}>—</span>;
  const positive = value > 0;
  const neutral  = value === 0;
  const color    = neutral ? '#888' : positive ? '#22c55e' : '#ef4444';
  const Icon     = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const fs       = size === 'sm' ? 11 : 12;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color, fontSize: fs, fontWeight: 700 }}>
      <Icon style={{ width: fs + 2, height: fs + 2 }} />
      {positive ? '+' : ''}{value}
    </span>
  );
}

function EmptyState({ message = 'No hay respuestas en este período.' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa' }}>
      <BarChart3 style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 14 }}>{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: C.mint, borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: C.green }}>Cargando datos...</p>
      </div>
    </div>
  );
}

const th = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#555', textAlign: 'center' };
const td = { padding: '10px 14px' };
const btnStyle = { padding: '6px 14px', borderRadius: 8, border: '1.5px solid #ddd', backgroundColor: '#fff', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnActiveStyle = { backgroundColor: '#2e5244', borderColor: '#2e5244', color: '#fff' };