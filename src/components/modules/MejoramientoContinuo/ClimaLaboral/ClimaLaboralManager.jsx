// src/components/modules/MejoramientoContinuo/ClimaLaboral/ClimaLaboralManager.jsx

import { useState } from 'react';
import { ArrowLeft, Smile, Users, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useSurveyResponses } from '@/hooks/useSurveys';

// ─── Colores del sistema ───────────────────────────────────────────────────────
const C = {
  green: '#2e5244',
  mint:  '#6dbd96',
  olive: '#6f7b2c',
  bg:    '#dedecc',
};

const STATUS_COLORS = { good: '#22c55e', warning: '#eab308', critical: '#ef4444', no_data: '#aaa' };
const STATUS_LABELS = { good: 'Bueno',   warning: 'Regular',  critical: 'Crítico', no_data: 'Sin datos' };
const SCALE_COLORS  = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };

const CATEGORY_COLORS = {
  'Desarrollo y Crecimiento':          '#2e5244',
  'Condiciones Laborales':             '#6f7b2c',
  'Condiciones en Puesto de Trabajo':  '#3d6b59',
  'Comunicación y Liderazgo':          '#4a7c3f',
  'Reconocimiento y Motivación':       '#6dbd96',
};

export default function ClimaLaboralManager({ onBack }) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedArea, setSelectedArea]         = useState('all'); // 'all' | 'Administrativo' | 'Operativo'
  const [activeTab, setActiveTab]               = useState('overview'); // overview | distribution | categories | comparison

  const {
    responses, answers, questions, periods, loading, error, reload,
    overallAverage, satisfactionRate, statsByQuestion, statsByCategory,
    getStatus,
  } = useSurveyResponses('work_climate', selectedPeriodId);

  const activePeriod  = periods.find(p => p.is_active);
  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || activePeriod;

  // ── Filtrar por área ─────────────────────────────────────────────────────────
  const filteredResponses = selectedArea === 'all'
    ? responses
    : responses.filter(r => r.work_area === selectedArea);

  const filteredResponseIds = new Set(filteredResponses.map(r => r.id));
  const filteredAnswers     = answers.filter(a => filteredResponseIds.has(a.response_id));

  // Recalcular stats con el filtro de área
  const scaleQuestions = questions.filter(q => q.question_type === 'scale');

  const filteredStatsByQ = (() => {
    const stats = {};
    scaleQuestions.forEach(q => {
      const qAns = filteredAnswers.filter(a => a.question_id === q.id && a.value_number !== null);
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      qAns.forEach(a => { dist[a.value_number] = (dist[a.value_number] || 0) + 1; });
      const sum = qAns.reduce((acc, a) => acc + a.value_number, 0);
      stats[q.id] = {
        avg:          qAns.length ? (sum / qAns.length).toFixed(2) : null,
        count:        qAns.length,
        distribution: dist,
      };
    });
    return stats;
  })();

  // Promedio filtrado general
  const filteredAvg = (() => {
    const allScaleAns = filteredAnswers.filter(a => a.value_number !== null);
    if (!allScaleAns.length) return 0;
    const sum = allScaleAns.reduce((acc, a) => acc + a.value_number, 0);
    return (sum / allScaleAns.length).toFixed(2);
  })();

  const filteredSatisfactionRate = (() => {
    const allScaleAns = filteredAnswers.filter(a => a.value_number !== null);
    if (!allScaleAns.length) return 0;
    return Math.round((allScaleAns.filter(a => a.value_number >= 4).length / allScaleAns.length) * 100);
  })();

  // ── Datos RadarChart por categoría ──────────────────────────────────────────
  const radarData = (() => {
    const cats = {};
    scaleQuestions.filter(q => q.category).forEach(q => {
      if (!cats[q.category]) cats[q.category] = { sum: 0, count: 0 };
      const qAns = filteredAnswers.filter(a => a.question_id === q.id && a.value_number !== null);
      qAns.forEach(a => { cats[q.category].sum += a.value_number; cats[q.category].count += 1; });
    });
    return Object.entries(cats).map(([cat, data]) => ({
      category: cat.length > 20 ? cat.substring(0, 18) + '…' : cat,
      fullName: cat,
      avg:      data.count ? parseFloat((data.sum / data.count).toFixed(2)) : 0,
    }));
  })();

  // ── Datos comparativa Admin vs Operativo ────────────────────────────────────
  const comparisonData = (() => {
    const areas = ['Administrativo', 'Operativo'];
    const areaAnswers = {};
    areas.forEach(area => {
      const areaRespIds = new Set(responses.filter(r => r.work_area === area).map(r => r.id));
      areaAnswers[area] = answers.filter(a => areaRespIds.has(a.response_id));
    });

    return scaleQuestions.map((q, idx) => {
      const row = { name: `P${idx + 1}`, label: q.question_text };
      areas.forEach(area => {
        const qAns = areaAnswers[area].filter(a => a.question_id === q.id && a.value_number !== null);
        row[area] = qAns.length ? parseFloat((qAns.reduce((s, a) => s + a.value_number, 0) / qAns.length).toFixed(2)) : 0;
      });
      return row;
    });
  })();

  // ── Promedios para tabla ordenada ────────────────────────────────────────────
  const avgChartData = scaleQuestions.map((q, idx) => ({
    name:   `P${idx + 1}`,
    label:  q.question_text,
    avg:    parseFloat(filteredStatsByQ[q.id]?.avg || 0),
    status: getStatus(filteredStatsByQ[q.id]?.avg),
  })).sort((a, b) => a.avg - b.avg);

  // ── Distribución apilada ─────────────────────────────────────────────────────
  const distChartData = scaleQuestions.map((q, idx) => {
    const dist = filteredStatsByQ[q.id]?.distribution || {};
    return { name: `P${idx + 1}`, label: q.question_text, '1': dist[1]||0, '2': dist[2]||0, '3': dist[3]||0, '4': dist[4]||0, '5': dist[5]||0 };
  });

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: C.mint, borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: C.green }}>Cargando datos...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-500 mb-4">Error: {error}</p>
      <Button onClick={reload} variant="outline">Reintentar</Button>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" style={{ color: C.green }}>Clima Laboral</h2>
          <p className="text-sm" style={{ color: C.olive }}>
            {currentPeriod ? currentPeriod.name : 'Sin período activo'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
        </Button>
      </div>

      {/* ── Selector de período ── */}
      {periods.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button style={{ ...btnStyle, ...(selectedPeriodId === null ? btnActiveStyle : {}) }}
            onClick={() => setSelectedPeriodId(null)}>
            Período activo
          </button>
          {periods.map(p => (
            <button key={p.id}
              style={{ ...btnStyle, ...(selectedPeriodId === p.id ? btnActiveStyle : {}) }}
              onClick={() => setSelectedPeriodId(p.id)}>
              {p.name}
              {p.is_active && <span style={{ marginLeft: 6, color: C.mint }}>●</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Filtro por área ── */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>Filtrar área:</span>
        {['all', 'Administrativo', 'Operativo'].map(area => (
          <button key={area}
            style={{
              ...btnStyle,
              ...(selectedArea === area ? btnActiveStyle : {}),
              fontSize: 12,
            }}
            onClick={() => setSelectedArea(area)}>
            {area === 'all' ? 'Todos' : area === 'Administrativo' ? '🏢 Administrativo' : '🔧 Operativo'}
          </button>
        ))}
      </div>

      {/* ── Stats header ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />}
          label="Total respuestas" value={filteredResponses.length} color={C.green} />
        <StatCard icon={<Smile className="h-5 w-5" />}
          label="Promedio general" value={filteredAvg} suffix="/ 5"
          color={STATUS_COLORS[getStatus(filteredAvg)]} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />}
          label="% Satisfacción (≥4)" value={`${filteredSatisfactionRate}%`}
          color={filteredSatisfactionRate >= 70 ? '#22c55e' : filteredSatisfactionRate >= 50 ? '#eab308' : '#ef4444'} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />}
          label="Categorías evaluadas" value={radarData.length} color={C.olive} />
      </div>

      {/* ── Enlace al formulario público ── */}
      <div className="p-3 rounded-lg border flex items-center gap-3"
        style={{ backgroundColor: `${C.mint}15`, borderColor: C.mint }}>
        <span style={{ color: C.green, fontSize: 13 }}>🔗 Enlace para empleados:</span>
        <code style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>
          {window.location.origin}/encuesta/clima-laboral
        </code>
        <button
          style={{ marginLeft: 'auto', fontSize: 12, color: C.mint, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/encuesta/clima-laboral`)}>
          Copiar
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'overview',     label: 'Promedios' },
          { id: 'categories',   label: 'Por categoría' },
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
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>
                    Promedio por pregunta (menor a mayor)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(320, avgChartData.length * 36)}>
                    <BarChart data={avgChartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', maxWidth: 280, fontSize: 12 }}>
                            <p style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>{d.label}</p>
                            <p>Promedio: <strong style={{ color: STATUS_COLORS[d.status] }}>{d.avg}</strong> / 5</p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="avg" radius={[0, 6, 6, 0]}
                        label={{ position: 'right', fontSize: 11, fontWeight: 700 }}>
                        {avgChartData.map((entry, i) => (
                          <rect key={i} fill={STATUS_COLORS[entry.status]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabla detalle */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Detalle por pregunta</CardTitle>
                </CardHeader>
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
                          const catColor = CATEGORY_COLORS[q.category] || C.green;
                          return (
                            <tr key={q.id} style={{ borderTop: '1px solid #f0f0e8' }}>
                              <td style={{ ...td, textAlign: 'center', color: '#999' }}>{idx + 1}</td>
                              <td style={{ ...td, color: '#333' }}>{q.question_text}</td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{ fontSize: 11, color: catColor, fontWeight: 600,
                                  backgroundColor: `${catColor}18`, padding: '2px 8px', borderRadius: 10 }}>
                                  {q.category}
                                </span>
                              </td>
                              <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>
                                {stat.avg || '—'}
                              </td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                                  fontSize: 11, fontWeight: 600,
                                  backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}>
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
              {/* RadarChart */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Radar por categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#555' }} />
                      <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                      <Radar dataKey="avg" stroke={C.green} fill={C.green} fillOpacity={0.25}
                        dot={{ fill: C.green, r: 4 }} />
                      <Tooltip formatter={(val) => [`${val} / 5`, 'Promedio']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabla de categorías */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Promedio por categoría</CardTitle>
                </CardHeader>
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
                      {radarData.sort((a, b) => a.avg - b.avg).map(row => {
                        const status   = getStatus(row.avg);
                        const catColor = CATEGORY_COLORS[row.fullName] || C.green;
                        return (
                          <tr key={row.fullName} style={{ borderTop: '1px solid #f0f0e8' }}>
                            <td style={{ ...td }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: catColor, flexShrink: 0 }} />
                                <span style={{ color: '#333', fontSize: 13 }}>{row.fullName}</span>
                              </div>
                            </td>
                            <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>
                              {row.avg} / 5
                            </td>
                            <td style={{ ...td, textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                                fontSize: 11, fontWeight: 600,
                                backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}>
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
                      <span style={{ fontSize: 11, color: '#666' }}>{v}</span>
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
                        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 12, maxWidth: 260 }}>
                          <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{item?.label}</p>
                          {payload.map(p => (
                            <p key={p.dataKey} style={{ color: SCALE_COLORS[p.dataKey] }}>
                              {p.dataKey}: <strong>{p.value}</strong> resp.
                            </p>
                          ))}
                        </div>
                      );
                    }} />
                    {[1,2,3,4,5].map(v => (
                      <Bar key={v} dataKey={String(v)} stackId="a" fill={SCALE_COLORS[v]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Comparativa Admin vs Operativo ── */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          {responses.length === 0 ? <EmptyState /> : (
            <>
              {/* Resumen por área */}
              <div className="grid grid-cols-2 gap-4">
                {['Administrativo', 'Operativo'].map(area => {
                  const areaResps = responses.filter(r => r.work_area === area);
                  const areaIds   = new Set(areaResps.map(r => r.id));
                  const areaAns   = answers.filter(a => areaIds.has(a.response_id) && a.value_number !== null);
                  const avg       = areaAns.length
                    ? (areaAns.reduce((s, a) => s + a.value_number, 0) / areaAns.length).toFixed(2)
                    : '—';
                  const status    = getStatus(avg);
                  return (
                    <Card key={area} className="border" style={{ borderColor: '#e5e7eb' }}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{ fontSize: 20 }}>{area === 'Administrativo' ? '🏢' : '🔧'}</span>
                          <span style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>{area}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: STATUS_COLORS[status] }}>{avg}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{areaResps.length} respuesta{areaResps.length !== 1 ? 's' : ''}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Gráfica comparativa */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Comparativa por pregunta</CardTitle>
                  <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.green }} />
                      <span style={{ fontSize: 12, color: '#666' }}>Administrativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.mint }} />
                      <span style={{ fontSize: 12, color: '#666' }}>Operativo</span>
                    </div>
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
                            {payload.map(p => (
                              <p key={p.dataKey} style={{ color: p.fill }}>
                                {p.dataKey}: <strong>{p.value}</strong>
                              </p>
                            ))}
                          </div>
                        );
                      }} />
                      <Bar dataKey="Administrativo" fill={C.green}  radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Operativo"      fill={C.mint}   radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, suffix, color }) {
  return (
    <Card className="border" style={{ borderColor: '#e5e7eb' }}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2" style={{ color }}>
          {icon}
          <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>
          {value}
          {suffix && <span style={{ fontSize: 14, fontWeight: 400, color: '#aaa', marginLeft: 4 }}>{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa' }}>
      <BarChart3 style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 14 }}>No hay respuestas en este período.</p>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const th = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#555', textAlign: 'center' };
const td = { padding: '10px 14px' };

const btnStyle = {
  padding: '6px 14px', borderRadius: 8, border: '1.5px solid #ddd',
  backgroundColor: '#fff', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const btnActiveStyle = {
  backgroundColor: '#2e5244', borderColor: '#2e5244', color: '#fff',
};