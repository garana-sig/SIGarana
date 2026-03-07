// src/components/modules/MejoramientoContinuo/SatisfaccionClientes/SatisfaccionClientesManager.jsx

import { useState } from 'react';
import { ArrowLeft, Award, Users, TrendingUp, MessageSquare, BarChart3, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { useSurveyResponses } from '@/hooks/useSurveys';

// ─── Colores del sistema ───────────────────────────────────────────────────────
const C = {
  green:  '#2e5244',
  mint:   '#6dbd96',
  olive:  '#6f7b2c',
  bg:     '#dedecc',
};

const STATUS_COLORS  = { good: '#22c55e', warning: '#eab308', critical: '#ef4444', no_data: '#aaa' };
const STATUS_LABELS  = { good: 'Bueno',   warning: 'Regular',  critical: 'Crítico', no_data: 'Sin datos' };
const SCALE_COLORS   = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };

export default function SatisfaccionClientesManager({ onBack }) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [activeTab, setActiveTab]               = useState('overview'); // overview | questions | suggestions

  const {
    responses, questions, periods, loading, error, reload,
    overallAverage, satisfactionRate, statsByQuestion, suggestions,
    getStatus,
  } = useSurveyResponses('customer_satisfaction', selectedPeriodId);

  const activePeriod = periods.find(p => p.is_active);
  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || activePeriod;

  // ── Datos para gráfica de promedios por pregunta ─────────────────────────────
  const scaleQuestions = questions.filter(q => q.question_type === 'scale');

  const avgChartData = scaleQuestions.map((q, idx) => ({
    name:   `P${idx + 1}`,
    label:  q.question_text,
    avg:    parseFloat(statsByQuestion[q.id]?.avg || 0),
    status: getStatus(statsByQuestion[q.id]?.avg),
  })).sort((a, b) => a.avg - b.avg); // ordenar de menor a mayor

  // ── Datos para distribución apilada ─────────────────────────────────────────
  const distChartData = scaleQuestions.map((q, idx) => {
    const dist = statsByQuestion[q.id]?.distribution || {};
    return {
      name: `P${idx + 1}`,
      label: q.question_text,
      '1': dist[1] || 0,
      '2': dist[2] || 0,
      '3': dist[3] || 0,
      '4': dist[4] || 0,
      '5': dist[5] || 0,
    };
  });

  // ── Tendencia histórica por período ─────────────────────────────────────────
  const trendData = periods.map(p => ({
    name: `${p.semester === 1 ? 'I' : 'II'} Sem ${p.year}`,
    // Por ahora se muestra el promedio del período activo; los demás requieren
    // queries adicionales — se puede ampliar con una versión futura
    avg: p.id === currentPeriod?.id ? parseFloat(overallAverage) : null,
  })).filter(d => d.avg !== null);

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
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

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={reload} variant="outline">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
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
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
        </Button>
      </div>

      {/* ── Selector de período ── */}
      {periods.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            style={{
              ...btnStyle,
              ...(selectedPeriodId === null ? btnActiveStyle : {}),
            }}
            onClick={() => setSelectedPeriodId(null)}
          >
            Período activo
          </button>
          {periods.map(p => (
            <button
              key={p.id}
              style={{
                ...btnStyle,
                ...(selectedPeriodId === p.id ? btnActiveStyle : {}),
              }}
              onClick={() => setSelectedPeriodId(p.id)}
            >
              {p.name}
              {p.is_active && <span style={{ marginLeft: 6, color: C.mint }}>●</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Stats header ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total respuestas"
          value={responses.length}
          color={C.green}
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Promedio general"
          value={overallAverage}
          suffix="/ 5"
          color={STATUS_COLORS[getStatus(overallAverage)]}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="% Satisfacción (≥4)"
          value={`${satisfactionRate}%`}
          color={satisfactionRate >= 70 ? '#22c55e' : satisfactionRate >= 50 ? '#eab308' : '#ef4444'}
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Sugerencias"
          value={suggestions.length}
          color={C.olive}
        />
      </div>

      {/* ── Enlace al formulario público ── */}
      <div className="p-3 rounded-lg border flex items-center gap-3"
        style={{ backgroundColor: `${C.mint}15`, borderColor: C.mint }}>
        <span style={{ color: C.green, fontSize: 13 }}>
          🔗 Enlace para clientes:
        </span>
        <code style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>
          {window.location.origin}/encuesta/satisfaccion-cliente
        </code>
        <button
          style={{ marginLeft: 'auto', fontSize: 12, color: C.mint, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/encuesta/satisfaccion-cliente`)}
        >
          Copiar
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#e5e7eb' }}>
        {[
          { id: 'overview',    label: 'Promedios' },
          { id: 'distribution', label: 'Distribución' },
          { id: 'suggestions', label: `Sugerencias (${suggestions.length})` },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              borderBottom: activeTab === tab.id ? `2px solid ${C.green}` : '2px solid transparent',
              color: activeTab === tab.id ? C.green : '#888',
              background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${C.green}` : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Promedios por pregunta ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {responses.length === 0 ? (
            <EmptyState message="No hay respuestas en este período." />
          ) : (
            <>
              {/* Gráfica de barras horizontales */}
              <Card className="border" style={{ borderColor: '#e5e7eb' }}>
                <CardHeader>
                  <CardTitle style={{ color: C.green, fontSize: 15 }}>
                    Promedio por pregunta (ordenado de menor a mayor)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, avgChartData.length * 36)}>
                    <BarChart data={avgChartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', maxWidth: 280, fontSize: 12 }}>
                              <p style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>{d.label}</p>
                              <p>Promedio: <strong style={{ color: STATUS_COLORS[d.status] }}>{d.avg}</strong> / 5</p>
                            </div>
                          );
                        }}
                      />
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

              {/* Tabla de preguntas con semáforo */}
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
                                  display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11,
                                  fontWeight: 600, backgroundColor: `${STATUS_COLORS[status]}20`,
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
          {responses.length === 0 ? (
            <EmptyState message="No hay respuestas en este período." />
          ) : (
            <Card className="border" style={{ borderColor: '#e5e7eb' }}>
              <CardHeader>
                <CardTitle style={{ color: C.green, fontSize: 15 }}>
                  Distribución de respuestas por pregunta
                </CardTitle>
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
                <ResponsiveContainer width="100%" height={Math.max(300, distChartData.length * 36)}>
                  <BarChart data={distChartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={32} fontSize={11} />
                    <Tooltip
                      content={({ active, payload, label }) => {
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
                      }}
                    />
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
                    }}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p style={{ color: '#333', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
                        "{s.text}"
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {s.company && (
                          <Badge variant="outline" style={{ fontSize: 11, color: C.green }}>
                            🏢 {s.company}
                          </Badge>
                        )}
                        {s.respondent && (
                          <Badge variant="outline" style={{ fontSize: 11, color: C.olive }}>
                            👤 {s.respondent}
                          </Badge>
                        )}
                        {s.city && (
                          <Badge variant="outline" style={{ fontSize: 11, color: '#666' }}>
                            📍 {s.city}
                          </Badge>
                        )}
                        {s.submitted && (
                          <Badge variant="outline" style={{ fontSize: 11, color: '#aaa' }}>
                            {new Date(s.submitted).toLocaleDateString('es-CO')}
                          </Badge>
                        )}
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

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa' }}>
      <BarChart3 style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 14 }}>{message}</p>
    </div>
  );
}

// ── Estilos de tabla ───────────────────────────────────────────────────────────
const th = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#555', textAlign: 'center' };
const td = { padding: '10px 14px' };

// ── Estilos botones período ────────────────────────────────────────────────────
const btnStyle = {
  padding: '6px 14px', borderRadius: 8, border: '1.5px solid #ddd',
  backgroundColor: '#fff', color: '#666', fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
};
const btnActiveStyle = {
  backgroundColor: '#2e5244', borderColor: '#2e5244', color: '#fff',
};