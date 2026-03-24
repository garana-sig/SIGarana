// src/components/modules/MejoramientoContinuo/SatisfaccionClientes/SatisfaccionClientesManager.jsx

import { useState } from 'react';
import {
  ArrowLeft, Award, Users, TrendingUp, MessageSquare,
  BarChart3, RefreshCw, Download, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { useSurveyResponses, useAllPeriodsStats } from '@/hooks/useSurveys';
import { exportSatisfaccionClientes } from '@/utils/exportSurveyExcel';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', bg: '#dedecc' };
const STATUS_COLORS = { good: '#22c55e', warning: '#eab308', critical: '#ef4444', no_data: '#aaa' };
const STATUS_LABELS = { good: 'Bueno', warning: 'Regular', critical: 'Crítico', no_data: 'Sin datos' };
const SCALE_COLORS  = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };

const META = 4.0; // línea de referencia en gráficas

export default function SatisfaccionClientesManager({ onBack }) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [activeTab, setActiveTab]               = useState('overview');
  const [downloading, setDownloading]           = useState(false);

  // ── Datos del período seleccionado ──────────────────────────────────────────
  const {
    responses, answers, questions, periods, loading, error, reload,
    overallAverage, satisfactionRate, statsByQuestion, suggestions,
    getStatus,
  } = useSurveyResponses('customer_satisfaction', selectedPeriodId);

  // ── Datos históricos para tendencia ─────────────────────────────────────────
  const {
    data: allPeriodsData,
    loading: trendLoading,
  } = useAllPeriodsStats('customer_satisfaction');

  const activePeriod  = periods.find(p => p.is_active);
  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || activePeriod;

  // ── Delta vs período anterior ────────────────────────────────────────────────
  // Busca el período inmediatamente anterior en los datos históricos
  const currentTrendIdx = allPeriodsData.findIndex(d => d.periodId === currentPeriod?.id);
  const prevTrendData   = currentTrendIdx > 0 ? allPeriodsData[currentTrendIdx - 1] : null;
  const delta           = prevTrendData && overallAverage
    ? parseFloat((parseFloat(overallAverage) - prevTrendData.avg).toFixed(2))
    : null;

  // ── Datos gráficas ────────────────────────────────────────────────────────────
  const scaleQuestions = questions.filter(q => q.question_type === 'scale');

  const avgChartData = scaleQuestions.map((q, idx) => ({
    name:   `P${idx + 1}`,
    label:  q.question_text,
    avg:    parseFloat(statsByQuestion[q.id]?.avg || 0),
    status: getStatus(statsByQuestion[q.id]?.avg),
  })).sort((a, b) => a.avg - b.avg);

  const distChartData = scaleQuestions.map((q, idx) => {
    const dist = statsByQuestion[q.id]?.distribution || {};
    return {
      name: `P${idx + 1}`,
      label: q.question_text,
      '1': dist[1] || 0, '2': dist[2] || 0, '3': dist[3] || 0,
      '4': dist[4] || 0, '5': dist[5] || 0,
    };
  });

  // Top 3 mejor y peor
  const ranked = [...avgChartData].filter(d => d.avg > 0).sort((a, b) => b.avg - a.avg);
  const top3   = ranked.slice(0, 3);
  const bot3   = [...ranked].reverse().slice(0, 3);

  // ── Exportar Excel ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setDownloading(true);
    try {
      exportSatisfaccionClientes({ responses, answers, questions, periods, currentPeriod });
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('Error al generar el Excel. Verifica que el paquete xlsx esté instalado: npm install xlsx');
    } finally {
      setDownloading(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" style={{ color: C.green }}>
            Satisfacción del Cliente
          </h2>
          <p className="text-sm" style={{ color: C.olive }}>
            {currentPeriod ? currentPeriod.name : 'Sin período activo'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={downloading || responses.length === 0}>
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

      {/* ── Stats header ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />}
          label="Total respuestas" value={responses.length} color={C.green} />
        <StatCard icon={<Award className="h-5 w-5" />}
          label="Promedio general" value={overallAverage} suffix="/ 5"
          color={STATUS_COLORS[getStatus(overallAverage)]}
          delta={delta} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />}
          label="% Satisfacción (≥4)" value={`${satisfactionRate}%`}
          color={satisfactionRate >= 70 ? '#22c55e' : satisfactionRate >= 50 ? '#eab308' : '#ef4444'}
          deltaLabel={prevTrendData ? `${prevTrendData.satisfactionRate}% período ant.` : null} />
        <StatCard icon={<MessageSquare className="h-5 w-5" />}
          label="Sugerencias" value={suggestions.length} color={C.olive} />
      </div>

      {/* ── Top 3 / Bottom 3 (solo si hay datos) ── */}
      {responses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankCard title="✅ Top 3 mejor calificadas" items={top3} color="#22c55e" />
          <RankCard title="⚠️ Top 3 por mejorar"      items={bot3} color="#ef4444" reverse />
        </div>
      )}

      {/* ── Enlace formulario ── */}
      <div className="p-3 rounded-lg border flex items-center gap-3"
        style={{ backgroundColor: `${C.mint}15`, borderColor: C.mint }}>
        <span style={{ color: C.green, fontSize: 13 }}>🔗 Enlace para clientes:</span>
        <code style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>
          {window.location.origin}/encuesta/satisfaccion-cliente
        </code>
        <button style={{ marginLeft: 'auto', fontSize: 12, color: C.mint, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/encuesta/satisfaccion-cliente`)}>
          Copiar
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#e5e7eb' }}>
        {[
          { id: 'overview',     label: 'Promedios' },
          { id: 'trend',        label: `Tendencia ${allPeriodsData.length > 1 ? `(${allPeriodsData.length} períodos)` : ''}` },
          { id: 'distribution', label: 'Distribución' },
          { id: 'suggestions',  label: `Sugerencias (${suggestions.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              color: activeTab === tab.id ? C.green : '#888',
  background: 'none',
  border: 'none',
  borderBottom: activeTab === tab.id 
    ? `2px solid ${C.green}` 
    : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Promedios ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {responses.length === 0 ? <EmptyState message="No hay respuestas en este período." /> : (
            <>
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>
                    Promedio por pregunta — ordenado de menor a mayor
                  </CardTitle>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    La línea punteada indica la meta de satisfacción ({META})
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, avgChartData.length * 38)}>
                    <BarChart data={avgChartData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                      <ReferenceLine x={META} stroke={C.olive} strokeDasharray="4 3"
                        label={{ value: `Meta ${META}`, position: 'insideTopRight', fontSize: 10, fill: C.olive }} />
                      <Tooltip content={<CustomTooltipAvg />} />
                      <Bar dataKey="avg" radius={[0, 6, 6, 0]}
                        label={{ position: 'right', fontSize: 11, fontWeight: 700, fill: '#444' }}>
                        {avgChartData.map((entry, i) => (
                          <rect key={i} fill={STATUS_COLORS[entry.status]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
                          <th style={th}>Promedio</th>
                          <th style={th}>Respuestas</th>
                          <th style={th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scaleQuestions.map((q, idx) => {
                          const stat   = statsByQuestion[q.id] || {};
                          const status = getStatus(stat.avg);
                          return (
                            <tr key={q.id} style={{ borderTop: '1px solid #f0f0e8' }}>
                              <td style={{ ...td, textAlign: 'center', color: '#999' }}>{idx + 1}</td>
                              <td style={{ ...td, color: '#333' }}>{q.question_text}</td>
                              <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>
                                {stat.avg || '—'}
                              </td>
                              <td style={{ ...td, textAlign: 'center', color: '#666' }}>{stat.count || 0}</td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                                  fontSize: 11, fontWeight: 600,
                                  backgroundColor: `${STATUS_COLORS[status]}20`,
                                  color: STATUS_COLORS[status],
                                }}>
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

      {/* ── Tab: Tendencia histórica ── */}
      {activeTab === 'trend' && (
        <div className="space-y-4">
          {trendLoading ? (
            <LoadingSpinner />
          ) : allPeriodsData.length < 2 ? (
            <EmptyState message="Se necesitan al menos 2 períodos con respuestas para mostrar la tendencia. Sigue recolectando datos." />
          ) : (
            <>
              {/* Contexto de lectura */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: `${C.mint}15`, border: `1px solid ${C.mint}40` }}>
                <p style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 4 }}>
                  ¿Cómo leer esta gráfica?
                </p>
                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>
                  Cada punto es el <strong>promedio general</strong> de todas las preguntas en ese período semestral.
                  La línea punteada marca la <strong>meta de satisfacción ({META}/5)</strong>.
                  Una línea ascendente indica mejora continua en la percepción del cliente.
                </p>
              </div>

              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>
                    Evolución del promedio general por período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={allPeriodsData} margin={{ left: 0, right: 24, top: 16, bottom: 8 }}>
                      <defs>
                        <linearGradient id="gradSat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.mint} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={C.mint} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                      <XAxis dataKey="semLabel" fontSize={12} />
                      <YAxis domain={[1, 5]} tickCount={5} fontSize={11} />
                      <ReferenceLine y={META} stroke={C.olive} strokeDasharray="5 3"
                        label={{ value: `Meta ${META}`, position: 'insideTopLeft', fontSize: 11, fill: C.olive }} />
                      <Tooltip content={<CustomTooltipTrend />} />
                      <Area type="monotone" dataKey="avg" stroke={C.green} strokeWidth={2.5}
                        fill="url(#gradSat)" dot={{ fill: C.green, r: 5 }}
                        activeDot={{ r: 7, fill: C.mint }} name="Promedio" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabla de evolución */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>Comparativa entre períodos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9f4' }}>
                          <th style={{ ...th, textAlign: 'left' }}>Período</th>
                          <th style={th}>Respuestas</th>
                          <th style={th}>Promedio</th>
                          <th style={th}>% Satisfacción</th>
                          <th style={th}>vs. anterior</th>
                          <th style={th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...allPeriodsData].reverse().map((d, idx, arr) => {
                          const prev     = arr[idx + 1];
                          const diff     = prev && d.avg ? parseFloat((d.avg - prev.avg).toFixed(2)) : null;
                          const status   = !d.avg ? 'no_data' : d.avg >= 4 ? 'good' : d.avg >= 3 ? 'warning' : 'critical';
                          return (
                            <tr key={d.periodId} style={{ borderTop: '1px solid #f0f0e8', backgroundColor: d.isActive ? `${C.mint}10` : 'transparent' }}>
                              <td style={{ ...td, fontWeight: d.isActive ? 700 : 400, color: d.isActive ? C.green : '#333' }}>
                                {d.semLabel} {d.isActive && <Badge style={{ fontSize: 10, marginLeft: 6 }}>Activo</Badge>}
                              </td>
                              <td style={{ ...td, textAlign: 'center', color: '#666' }}>{d.count}</td>
                              <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: STATUS_COLORS[status] }}>
                                {d.avg ?? '—'}
                              </td>
                              <td style={{ ...td, textAlign: 'center', color: '#555' }}>
                                {d.satisfactionRate !== null ? `${d.satisfactionRate}%` : '—'}
                              </td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <DeltaBadge value={diff} />
                              </td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                                  fontSize: 11, fontWeight: 600,
                                  backgroundColor: `${STATUS_COLORS[status]}20`,
                                  color: STATUS_COLORS[status],
                                }}>
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
          {responses.length === 0 ? <EmptyState message="No hay respuestas en este período." /> : (
            <Card className="border" style={{ borderColor: '#e5e7eb' }}>
              <CardHeader>
                <CardTitle style={{ color: C.green, fontSize: 15 }}>
                  Distribución de respuestas por pregunta
                </CardTitle>
                <div className="flex gap-3 flex-wrap mt-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <div key={v} className="flex items-center gap-1">
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: SCALE_COLORS[v] }} />
                      <span style={{ fontSize: 11, color: '#666' }}>
                        {['', 'Alta Insatisf.', 'Parcial Insatisf.', 'Regular', 'Parcial Satisf.', 'Alta Satisf.'][v]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(300, distChartData.length * 38)}>
                  <BarChart data={distChartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                    <Tooltip content={<CustomTooltipDist data={distChartData} />} />
                    {[1, 2, 3, 4, 5].map(v => (
                      <Bar key={v} dataKey={String(v)} stackId="a" fill={SCALE_COLORS[v]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Sugerencias ── */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <EmptyState message="No hay sugerencias registradas en este período." />
          ) : (
            suggestions.map((s, idx) => (
              <Card key={s.id} className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', backgroundColor: `${C.mint}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.green, fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>{idx + 1}</div>
                    <div className="flex-1">
                      <p style={{ color: '#333', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
                        "{s.text}"
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {s.company    && <Badge variant="outline" style={{ fontSize: 11, color: C.green }}>🏢 {s.company}</Badge>}
                        {s.respondent && <Badge variant="outline" style={{ fontSize: 11, color: C.olive }}>👤 {s.respondent}</Badge>}
                        {s.city       && <Badge variant="outline" style={{ fontSize: 11, color: '#666' }}>📍 {s.city}</Badge>}
                        {s.submitted  && <Badge variant="outline" style={{ fontSize: 11, color: '#aaa' }}>{new Date(s.submitted).toLocaleDateString('es-CO')}</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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
        {deltaLabel && !delta && (
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{deltaLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RankCard({ title, items, color, reverse }) {
  if (!items.length) return null;
  return (
    <Card className="border" style={{ borderColor: '#e5e7eb' }}>
      <CardHeader>
        <CardTitle style={{ fontSize: 14, color: '#333' }}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span style={{
              width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: `${color}20`, color,
            }}>{i + 1}</span>
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

function EmptyState({ message }) {
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
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: C.mint, borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: C.green }}>Cargando datos...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="p-6 text-center">
      <p className="text-red-500 mb-4">Error: {message}</p>
      <Button onClick={onRetry} variant="outline">Reintentar</Button>
    </div>
  );
}

// ── Tooltips personalizados ────────────────────────────────────────────────────
function CustomTooltipAvg({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', maxWidth: 300, fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>{d.label}</p>
      <p>Promedio: <strong style={{ color: STATUS_COLORS[d.status] }}>{d.avg}</strong> / 5</p>
      <p style={{ color: '#aaa', marginTop: 2 }}>Meta: {META} / 5</p>
    </div>
  );
}

function CustomTooltipTrend({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const status = !d.avg ? 'no_data' : d.avg >= 4 ? 'good' : d.avg >= 3 ? 'warning' : 'critical';
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{d.semLabel}</p>
      <p>Promedio: <strong style={{ color: STATUS_COLORS[status] }}>{d.avg}</strong> / 5</p>
      <p style={{ color: '#555' }}>{d.count} respuestas · {d.satisfactionRate}% satisfacción</p>
      {d.avg < META && <p style={{ color: '#ef4444', marginTop: 4 }}>↓ {(META - d.avg).toFixed(2)} puntos bajo la meta</p>}
      {d.avg >= META && <p style={{ color: '#22c55e', marginTop: 4 }}>✓ Por encima de la meta</p>}
    </div>
  );
}

function CustomTooltipDist({ data = [] }) {
  return ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const item = data.find(d => d.name === label);
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 12, maxWidth: 280 }}>
        <p style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>{item?.label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: SCALE_COLORS[p.dataKey] }}>
            {['', 'Alta Insatisf.', 'Parcial Insatisf.', 'Regular', 'Parcial Satisf.', 'Alta Satisf.'][p.dataKey]}:
            <strong> {p.value}</strong> resp.
          </p>
        ))}
      </div>
    );
  };
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const th = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#555', textAlign: 'center' };
const td = { padding: '10px 14px' };
const btnStyle = { padding: '6px 14px', borderRadius: 8, border: '1.5px solid #ddd', backgroundColor: '#fff', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnActiveStyle = { backgroundColor: '#2e5244', borderColor: '#2e5244', color: '#fff' };