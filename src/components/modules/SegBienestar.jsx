// src/components/modules/SSTBienestar/SSTBienestar.jsx
// ═══════════════════════════════════════════════════════════════════
// MÓDULO: SST y Bienestar Social
// Submódulos: Planes y Programas · Estándares Mínimos · Requisitos
//             Matriz de Peligros · Inspecciones · Profesiograma
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useAuth }     from '@/context/AuthContext';
import { Button }      from '@/app/components/ui/button';
import { Input }       from '@/app/components/ui/input';
import ModuleHero      from '@/components/ModuleHero';
import CapacitacionesTab from './SSTBienestar/Capacitaciones/CapacitacionesTab';
import WorkPlanTab       from './SSTBienestar/PlanesTrabajo/WorkPlanTab';
import {
  Shield, BookOpen, CheckSquare, AlertTriangle,
  ClipboardCheck, Users, Stethoscope, FileText,
  ChevronDown, ChevronUp, Plus, Calendar, User,
  Building2, Heart, Truck, BarChart3, Lock,
  RefreshCw, ArrowRight, Construction, HardHat,
} from 'lucide-react';

// ─── Paleta Garana ───────────────────────────────────────────────────────────
const C = {
  primary:  '#2e5244',
  mint:     '#6dbd96',
  olive:    '#6f7b2c',
  sand:     '#dedecc',
  amber:    '#d97706',
  red:      '#dc2626',
  blue:     '#1d4ed8',
  purple:   '#7e22ce',
};

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  {
    id:    'planes',
    label: 'Planes y Programas',
    icon:  BookOpen,
    color: C.primary,
    badge: '7 programas',
  },
  {
    id:    'estandares',
    label: 'Estándares Mínimos',
    icon:  CheckSquare,
    color: C.blue,
    badge: 'Res. 0312',
  },
  {
    id:    'requisitos',
    label: 'Evaluar Requisitos',
    icon:  ClipboardCheck,
    color: C.olive,
    badge: null,
  },
  {
    id:    'matriz',
    label: 'Matriz de Peligros',
    icon:  AlertTriangle,
    color: C.amber,
    badge: 'GTC-45',
  },
  {
    id:    'inspecciones',
    label: 'Inspecciones',
    icon:  HardHat,
    color: C.purple,
    badge: null,
  },
  {
    id:    'profesiograma',
    label: 'Profesiograma',
    icon:  Stethoscope,
    color: C.mint,
    badge: null,
  },
];

// ─── Sub-programas de "Planes y Programas" ───────────────────────────────────
const PROGRAMAS = [
  {
    id:     'capacitacion',
    label:  'Capacitación',
    icon:   BookOpen,
    color:  C.primary,
    desc:   'Cronograma anual de capacitaciones en SST. Registro de asistencia, temas cubiertos y evaluaciones de efectividad.',
    campos: [
      'Tema de la capacitación',
      'Fecha y duración',
      'Responsable / Facilitador',
      'Participantes',
      'Evaluación de efectividad',
      'Evidencias (fotos, firmas)',
    ],
  },
  {
    id:     'convivencia',
    label:  'Comité de Convivencia',
    icon:   Users,
    color:  '#1d4ed8',
    desc:   'Gestión del Comité de Convivencia Laboral (COCOLA). Actas de reunión, casos atendidos, seguimiento de compromisos.',
    campos: [
      'Actas de reunión (mínimo bimestral)',
      'Casos recibidos y estado',
      'Miembros vigentes (periodo 2 años)',
      'Compromisos y seguimiento',
      'Informes a gerencia',
    ],
  },
  {
    id:     'copasst',
    label:  'COPASST',
    icon:   Shield,
    color:  '#15803d',
    desc:   'Comité Paritario de Seguridad y Salud en el Trabajo. Reuniones mensuales, investigación de AT, recomendaciones.',
    campos: [
      'Actas de reunión (mensual)',
      'Investigación de accidentes de trabajo',
      'Recomendaciones de mejora',
      'Vigías / Representantes (periodo 2 años)',
      'Plan de trabajo anual COPASST',
    ],
  },
  

  
  {
    id:     'sst',
    label:  'SST',
    icon:   HardHat,
    color:  '#7e22ce',
    desc:   'Plan de trabajo anual de Seguridad y Salud en el Trabajo. Actividades, responsables, cronograma y trazabilidad.',
    campos: [],
  },
  {
    id:     'promocion_prevencion',
    label:  'Promoción y Prevención',
    icon:   Stethoscope,
    color:  '#0891b2',
    desc:   'Plan anual del programa de promoción y prevención en salud para los colaboradores.',
    campos: [],
  },{
    id:     'gerencia',
    label:  'Plan de Gerencia',
    icon:   BarChart3,
    color:  C.olive,
    desc:   'Plan de trabajo SST aprobado por gerencia. Objetivos, metas, recursos y seguimiento de indicadores del sistema.',
    campos: [
      'Política SST firmada y vigente',
      'Objetivos y metas SST',
      'Plan de trabajo anual',
      'Presupuesto SST',
      'Revisión por la dirección',
    ],
  },
];

// ─── Helpers UI ──────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, color, icon: Icon }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
      borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)', borderRadius: 12,
          width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={22} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, opacity: 0.85 }}>{subtitle}</p>}
        </div>

      </div>
    </div>
  );
}

function ComingSoon({ title, desc, fields = [], accentColor = C.primary }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Descripción */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft: `5px solid ${accentColor}`,
      }}>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{desc}</p>
      </div>

      {/* Campos / estructura planeada */}
      {fields.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            📋 Estructura planeada para este módulo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {fields.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: `${accentColor}08`, border: `1px solid ${accentColor}20`,
              }}>
                <ArrowRight size={13} color={accentColor} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder de tabla */}
      <div style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: `2px dashed ${accentColor}30`,
      }}>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `${accentColor}12`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Construction size={28} color={accentColor} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: accentColor, marginBottom: 8 }}>
            {title} — Próximamente
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
            Este submódulo está diseñado y listo para implementarse en la siguiente sesión de desarrollo.
          </p>
          <div style={{ marginTop: 20 }}>
            <Button disabled style={{ background: accentColor, color: '#fff', opacity: 0.5, fontSize: 13 }}>
              <Plus size={14} style={{ marginRight: 6 }} />
              Registrar {title.toLowerCase()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1: PLANES Y PROGRAMAS
// ═══════════════════════════════════════════════════════════════════
function PlanesTab({ canManage }) {
  const [openProg, setOpenProg] = useState('capacitacion');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader
        title="Planes y Programas SST"
        subtitle="Gestión de los 7 programas del sistema de seguridad y salud"
        icon={BookOpen}
        color={C.primary}
      />

      {/* Selector de programa */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10,
      }}>
        {PROGRAMAS.map(prog => {
          const PIcon = prog.icon;
          const isActive = openProg === prog.id;
          return (
            <button key={prog.id} onClick={() => setOpenProg(prog.id)} style={{
              background: isActive ? prog.color : '#fff',
              border: `2px solid ${isActive ? prog.color : '#e5e7eb'}`,
              borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              boxShadow: isActive ? `0 4px 16px ${prog.color}30` : '0 1px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.15s',
            }}>
              <PIcon size={18} color={isActive ? 'white' : prog.color} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'white' : '#1f2937', lineHeight: 1.3 }}>
                {prog.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Detalle del programa seleccionado */}
      {openProg === 'capacitacion' ? (
        <CapacitacionesTab />
      ) : openProg === 'convivencia' ? (
        <WorkPlanTab planType="convivencia" />
      ) : openProg === 'copasst' ? (
        <WorkPlanTab planType="copasst" />
      ) : openProg === 'bienestar' ? (
        <WorkPlanTab planType="bienestar" />
      ) : openProg === 'sst' ? (
        <WorkPlanTab planType="sst" />
      ) : openProg === 'promocion_prevencion' ? (
        <WorkPlanTab planType="promocion_prevencion" />
      ) : (
        PROGRAMAS.filter(p => p.id === openProg).map(prog => (
          <ComingSoon
            key={prog.id}
            title={prog.label}
            desc={prog.desc}
            fields={prog.campos}
            accentColor={prog.color}
          />
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2: ESTÁNDARES MÍNIMOS (Resolución 0312 de 2019)
// ═══════════════════════════════════════════════════════════════════
function EstandaresTab() {
  // Estándares de la Resolución 0312 para empresas de menos de 50 trabajadores
  // (riesgo I y II — Garana aplica aquí)
  const ESTANDARES = [
    { num: '1.1.1', titulo: 'Responsable del Sistema de Gestión de SST', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.2', titulo: 'Responsabilidades en el Sistema de Gestión de SST', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.3', titulo: 'Asignación de recursos para el Sistema de Gestión en SST', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.4', titulo: 'Afiliación al Sistema General de Riesgos Laborales', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.5', titulo: 'Identificación de trabajadores de alto riesgo', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.6', titulo: 'Conformación COPASST / Vigía', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.7', titulo: 'Capacitación COPASST / Vigía', tipo: 'Recursos', peso: 0.5 },
    { num: '1.1.8', titulo: 'Conformación Comité de Convivencia', tipo: 'Recursos', peso: 0.5 },
    { num: '1.2.1', titulo: 'Programa Capacitación promoción y prevención PyP', tipo: 'Capacitación', peso: 2 },
    { num: '1.2.2', titulo: 'Capacitación, inducción y reinducción en SST', tipo: 'Capacitación', peso: 2 },
    { num: '1.2.3', titulo: 'Responsables del SG-SST con curso virtual de 50 horas', tipo: 'Capacitación', peso: 2 },
    { num: '2.4.1', titulo: 'Plan que identifica objetivos, metas, responsabilidad, recursos', tipo: 'Planeación', peso: 2.5 },
    { num: '2.11.1', titulo: 'Empresa adelanta programa de vigilancia epidemiológica', tipo: 'Planeación', peso: 0 },
    { num: '3.1.1', titulo: 'Evaluación médica ocupacional', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.2', titulo: 'Actividades de Promoción y Prevención en Salud', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.3', titulo: 'Información al médico de los perfiles de cargo', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.4', titulo: 'Realización de los exámenes médicos ocupacionales', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.5', titulo: 'Custodia de Historias Clínicas', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.6', titulo: 'Restricciones y recomendaciones médico laborales', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.7', titulo: 'Estilos de vida y entornos saludables', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.8', titulo: 'Agua potable, servicios sanitarios y disposición de basuras', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.1.9', titulo: 'Eliminación adecuada de residuos sólidos, líquidos o gaseosos', tipo: 'Gestión de Salud', peso: 1 },
    { num: '3.3.1', titulo: 'Medición de frecuencia de la accidentalidad', tipo: 'Registro', peso: 1 },
    { num: '3.3.2', titulo: 'Medición de la severidad de la accidentalidad', tipo: 'Registro', peso: 1 },
    { num: '3.3.3', titulo: 'Medición de la mortalidad por Accidentes de Trabajo', tipo: 'Registro', peso: 1 },
    { num: '3.3.4', titulo: 'Medición de la prevalencia de enfermedad laboral', tipo: 'Registro', peso: 1 },
    { num: '3.3.5', titulo: 'Medición de la incidencia de Enfermedad Laboral', tipo: 'Registro', peso: 1 },
    { num: '3.3.6', titulo: 'Medición del ausentismo por causa médica', tipo: 'Registro', peso: 1 },
    { num: '4.1.1', titulo: 'Metodología para la identificación de peligros y evaluación', tipo: 'Gestión de Peligros', peso: 4 },
    { num: '4.1.2', titulo: 'Identificación de peligros con participación de todos niveles', tipo: 'Gestión de Peligros', peso: 4 },
    { num: '4.1.3', titulo: 'Identificación y priorización de la naturaleza de los peligros', tipo: 'Gestión de Peligros', peso: 3 },
    { num: '4.1.4', titulo: 'Realización mediciones ambientales, químicos, físicos y biológicos', tipo: 'Gestión de Peligros', peso: 4 },
    { num: '5.1.1', titulo: 'Se cuenta con el Plan de Prevención y Preparación ante emergencias', tipo: 'Plan de Emergencias', peso: 5 },
    { num: '5.1.2', titulo: 'Brigada de prevención conformada, capacitada y dotada', tipo: 'Plan de Emergencias', peso: 5 },
    { num: '6.1.1', titulo: 'Indicadores estructura, proceso y resultado', tipo: 'Verificación', peso: 1.25 },
    { num: '6.1.2', titulo: 'Las empresa adelanta auditoría por lo menos una vez al año', tipo: 'Verificación', peso: 1.25 },
    { num: '6.1.3', titulo: 'Revisión anual por la alta dirección', tipo: 'Verificación', peso: 1.25 },
    { num: '6.1.4', titulo: 'Planificación del Sistema de Gestión de SST', tipo: 'Verificación', peso: 1.25 },
    { num: '7.1.1', titulo: 'Acciones preventivas y/o correctivas con base en resultados del SG-SST', tipo: 'Mejoramiento', peso: 2.5 },
    { num: '7.1.2', titulo: 'Acciones de mejora conforme a revisión de la alta dirección', tipo: 'Mejoramiento', peso: 2.5 },
    { num: '7.1.3', titulo: 'Acciones de mejora con base en investigaciones de AT y EL', tipo: 'Mejoramiento', peso: 2.5 },
    { num: '7.1.4', titulo: 'Elaborar y actualizar a disposición el plan de mejora', tipo: 'Mejoramiento', peso: 2.5 },
  ];

  // Tipos únicos para agrupar
  const TIPOS = [...new Set(ESTANDARES.map(e => e.tipo))];
  const TIPO_COLORS = {
    'Recursos':               '#2e5244',
    'Capacitación':           '#1d4ed8',
    'Planeación':             '#6f7b2c',
    'Gestión de Salud':       '#dc2626',
    'Registro':               '#7e22ce',
    'Gestión de Peligros':    '#d97706',
    'Plan de Emergencias':    '#0891b2',
    'Verificación':           '#059669',
    'Mejoramiento':           '#6dbd96',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader
        title="Estándares Mínimos — Res. 0312 de 2019"
        subtitle="Evaluación del cumplimiento del Sistema de Gestión de SST para empresas de 10 a 50 trabajadores (Riesgo I, II o III)"
        icon={CheckSquare}
        color={C.blue}
      />

      {/* Alerta informativa */}
      <div style={{
        background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12,
        padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <CheckSquare size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
            60 estándares aplicables a INDECON S.A.S.
          </p>
          <p style={{ fontSize: 12, color: '#1e40af' }}>
            Garana Art cuenta con menos de 50 trabajadores. La calificación máxima es 100%.
            Una puntuación ≥ 86% equivale a "ACEPTABLE". El módulo permitirá registrar
            evidencia documental de cumplimiento por cada estándar.
          </p>
        </div>
      </div>

      {/* Lista agrupada por tipo */}
      {TIPOS.map(tipo => {
        const tipoEsts = ESTANDARES.filter(e => e.tipo === tipo);
        const color = TIPO_COLORS[tipo] || C.primary;
        return (
          <div key={tipo} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '10px 18px', background: color, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{tipo}</p>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                {tipoEsts.length} estándares · {tipoEsts.reduce((s, e) => s + e.peso, 0).toFixed(1)} pts
              </span>
            </div>
            {tipoEsts.map((est, i) => (
              <div key={est.num} style={{
                display: 'flex', alignItems: 'center', padding: '10px 18px',
                borderTop: i > 0 ? '1px solid #f9fafb' : undefined, gap: 12,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: color,
                  background: `${color}12`, borderRadius: 6, padding: '2px 8px',
                  flexShrink: 0, fontFamily: 'monospace',
                }}>{est.num}</span>
                <p style={{ fontSize: 12, color: '#374151', flex: 1 }}>{est.titulo}</p>
                <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                  {est.peso > 0 ? `${est.peso} pts` : 'N/A'}
                </span>
                {/* Estado — próximamente será un select o toggle */}
                <div style={{
                  background: '#f3f4f6', borderRadius: 8, padding: '4px 12px',
                  fontSize: 11, color: '#9ca3af', flexShrink: 0,
                }}>
                  ⚪ Sin evaluar
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Nota de desarrollo */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '16px 20px',
        border: `2px dashed ${C.blue}30`, textAlign: 'center', color: '#9ca3af',
      }}>
        <Construction size={20} style={{ marginBottom: 8, color: C.blue, opacity: 0.5 }} />
        <p style={{ fontSize: 12 }}>
          En la implementación final cada estándar tendrá: estado (Cumple / No Cumple / Parcial),
          porcentaje, responsable, fecha de evaluación y campo para adjuntar evidencia documental.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3: EVALUAR REQUISITOS
// ═══════════════════════════════════════════════════════════════════
function RequisitosTab() {
  const CATEGORIAS = [
    { cat: 'Normas Técnicas',         icon: '📐', color: C.olive,  items: ['GTC-45:2012 (Identificación de peligros)', 'NTC-OHSAS 18001', 'ISO 45001:2018'] },
    { cat: 'Resoluciones MinTrabajo', icon: '📋', color: C.blue,   items: ['Resolución 0312/2019 (Estándares mínimos)', 'Resolución 2400/1979', 'Resolución 1401/2007 (Investigación AT)', 'Resolución 0256/2014 (Semanas de Seguridad)'] },
    { cat: 'Decretos y Leyes',        icon: '⚖️', color: C.primary, items: ['Decreto 1072/2015 (DUR Sector Trabajo)', 'Ley 1562/2012 (SG-SST)', 'Ley 9a/1979 (Código Sanitario)', 'Decreto 472/2015 (Multas y sanciones)'] },
    { cat: 'Circulares',              icon: '🔔', color: C.amber,   items: ['Circular 0071/2020 (Trabajo en casa)', 'Circular 0041/2020 (COVID-19)'] },
    { cat: 'Específicos del sector textil', icon: '👗', color: C.purple, items: ['NTC 1960 (Materiales textiles)', 'Riesgos por postura prolongada', 'Iluminación puestos de trabajo'] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader
        title="Evaluación de Requisitos Legales"
        subtitle="Identificación y seguimiento del cumplimiento de requisitos legales y normativos aplicables a INDECON S.A.S."
        icon={ClipboardCheck}
        color={C.olive}
      />

      {/* Grid de categorías */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {CATEGORIAS.map(cat => (
          <div key={cat.cat} style={{
            background: '#fff', borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderTop: `4px solid ${cat.color}`,
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{cat.icon}</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.cat}</p>
            </div>
            {cat.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px',
                borderTop: i > 0 ? '1px solid #f9fafb' : undefined,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: '#374151', flex: 1 }}>{item}</p>
                <span style={{ fontSize: 10, color: '#9ca3af', background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                  ⚪ Pendiente
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <ComingSoon
        title="Evaluación de Requisitos"
        desc="Este módulo permitirá registrar el estado de cumplimiento de cada requisito legal: cumple, no cumple, en progreso. Incluirá fecha de última revisión, responsable, evidencias y plan de acción cuando no se cumpla."
        fields={['Norma / Decreto / Resolución', 'Artículo aplicable', 'Estado de cumplimiento', 'Fecha de revisión', 'Responsable', 'Evidencias', 'Plan de acción']}
        accentColor={C.olive}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4: MATRIZ DE PELIGROS (GTC-45)
// ═══════════════════════════════════════════════════════════════════
function MatrizTab() {
  const PELIGROS_EJEMPLO = [
    { tipo: 'Biológico',    subtipo: 'Virus / Bacterias',        proceso: 'Confección', nivel: 'Bajo',  color: '#16a34a' },
    { tipo: 'Físico',       subtipo: 'Ruido (máquinas de coser)',proceso: 'Confección', nivel: 'Medio', color: '#d97706' },
    { tipo: 'Físico',       subtipo: 'Iluminación deficiente',   proceso: 'Bordado',    nivel: 'Medio', color: '#d97706' },
    { tipo: 'Ergonómico',   subtipo: 'Postura prolongada sentada',proceso: 'Confección',nivel: 'Alto',  color: '#dc2626' },
    { tipo: 'Ergonómico',   subtipo: 'Movimientos repetitivos',  proceso: 'Corte',      nivel: 'Alto',  color: '#dc2626' },
    { tipo: 'Psicosocial',  subtipo: 'Carga de trabajo',         proceso: 'Producción', nivel: 'Medio', color: '#d97706' },
    { tipo: 'Mecánico',     subtipo: 'Agujas / herramientas',    proceso: 'Confección', nivel: 'Medio', color: '#d97706' },
    { tipo: 'Locativo',     subtipo: 'Caídas al mismo nivel',    proceso: 'General',    nivel: 'Bajo',  color: '#16a34a' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader
        title="Matriz de Identificación de Peligros"
        subtitle="GTC-45:2012 · Identificación de peligros, evaluación y valoración de riesgos para INDECON S.A.S."
        icon={AlertTriangle}
        color={C.amber}
      />

      {/* Info GTC-45 */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12,
        padding: '14px 18px', display: 'flex', gap: 12,
      }}>
        <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
            Guía Técnica Colombiana GTC-45
          </p>
          <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
            La matriz identifica los peligros por proceso/área, evalúa el riesgo (probabilidad × impacto)
            y define controles en la jerarquía: Eliminación → Sustitución → Controles de ingeniería
            → Controles administrativos → EPP.
          </p>
        </div>
      </div>

      {/* Preview de la matriz */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 18px', background: C.amber, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Vista previa — Peligros identificados para Garana Art</p>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Datos de ejemplo · Se llenará en implementación</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {/* Headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 90px',
            padding: '8px 18px', background: '#f8fafc',
            fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
          }}>
            <span>Tipo de peligro</span><span>Descripción</span><span>Proceso</span><span style={{ textAlign: 'center' }}>Nivel</span>
          </div>
          {PELIGROS_EJEMPLO.map((p, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 90px',
              padding: '10px 18px', borderTop: '1px solid #f3f4f6', alignItems: 'center',
            }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: p.color,
                background: `${p.color}12`, borderRadius: 6, padding: '2px 10px',
                display: 'inline-block',
              }}>{p.tipo}</span>
              <span style={{ fontSize: 12, color: '#374151' }}>{p.subtipo}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{p.proceso}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: p.color,
                background: `${p.color}15`, borderRadius: 20, padding: '2px 12px',
                textAlign: 'center',
              }}>{p.nivel}</span>
            </div>
          ))}
        </div>
      </div>

      <ComingSoon
        title="Matriz de Peligros"
        desc="La implementación completa incluirá todos los campos de la GTC-45: proceso, zona/área, actividad, peligro, efectos posibles, controles existentes, evaluación del riesgo (nivel de deficiencia, exposición, probabilidad, consecuencia), nivel de riesgo y medidas de intervención propuestas."
        fields={['Proceso / Área', 'Actividad', 'Tipo de peligro', 'Descripción del peligro', 'Efectos posibles', 'Controles actuales', 'Nd · Ne · Np', 'Nc · NR · NR', 'Aceptabilidad', 'Medidas de intervención', 'Responsable', 'Fecha de revisión']}
        accentColor={C.amber}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5: INSPECCIONES
// ═══════════════════════════════════════════════════════════════════
function InspeccionesTab() {
  const TIPOS_INSP = [
    { tipo: 'Inspección de puestos de trabajo', icono: '🪑', freq: 'Mensual',     color: C.primary },
    { tipo: 'Inspección de extintores',         icono: '🧯', freq: 'Mensual',     color: '#dc2626' },
    { tipo: 'Inspección de botiquín',            icono: '💊', freq: 'Mensual',     color: '#16a34a' },
    { tipo: 'Inspección de orden y aseo',        icono: '🧹', freq: 'Semanal',     color: C.blue   },
    { tipo: 'Inspección de EPP',                 icono: '🦺', freq: 'Mensual',     color: C.olive  },
    { tipo: 'Inspección de instalaciones',       icono: '🏭', freq: 'Trimestral',  color: C.purple },
    { tipo: 'Inspección de maquinaria',          icono: '⚙️', freq: 'Mensual',    color: C.amber  },
    { tipo: 'Inspección de rutas de evacuación', icono: '🚨', freq: 'Trimestral',  color: '#0891b2'},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader
        title="Inspecciones de Seguridad"
        subtitle="Registro y seguimiento de inspecciones planeadas y no planeadas de las instalaciones, equipos y condiciones de trabajo"
        icon={HardHat}
        color={C.purple}
      />

      {/* Tipos de inspección */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {TIPOS_INSP.map(t => (
          <div key={t.tipo} style={{
            background: '#fff', borderRadius: 12, padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: `4px solid ${t.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{t.icono}</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>{t.tipo}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: t.color, fontWeight: 600, background: `${t.color}12`, borderRadius: 6, padding: '2px 8px' }}>
                {t.freq}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>⚪ Sin registros</span>
            </div>
          </div>
        ))}
      </div>

      <ComingSoon
        title="Inspecciones"
        desc="Este módulo registrará cada inspección realizada con: tipo, fecha, área inspeccionada, hallazgos encontrados (conformes / no conformes), responsable de inspección, y plan de acción para los hallazgos críticos. Generará automáticamente el cronograma de próximas inspecciones."
        fields={['Tipo de inspección', 'Fecha y hora', 'Área / Proceso', 'Inspector', 'Hallazgos (fotos)', 'Clasificación del hallazgo', 'Acción correctiva', 'Responsable corrección', 'Fecha límite', 'Estado de cierre']}
        accentColor={C.purple}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 6: PROFESIOGRAMA
// ═══════════════════════════════════════════════════════════════════
function ProfesiogramaTab() {
  const CARGOS_EJEMPLO = [
    { cargo: 'Operaria de Confección', area: 'Producción', riesgo: 'Ergonómico, Físico', examen: 'Ingreso + Periódico anual', epp: ['Guantes', 'Gafas', 'Tapabocas'] },
    { cargo: 'Cortador(a)',            area: 'Corte',       riesgo: 'Mecánico, Ergonómico', examen: 'Ingreso + Periódico anual', epp: ['Guantes anticorte', 'Calzado industrial'] },
    { cargo: 'Bordadora',              area: 'Bordado',      riesgo: 'Ergonómico, Visual', examen: 'Ingreso + Periódico anual', epp: ['Gafas', 'Protección auditiva'] },
    { cargo: 'Coordinador(a) de Calidad', area: 'Calidad', riesgo: 'Psicosocial, Ergonómico', examen: 'Ingreso + Periódico bianual', epp: ['Ninguno específico'] },
    { cargo: 'Conductor / Mensajero',  area: 'Logística',   riesgo: 'Mecánico, Psicosocial', examen: 'Ingreso + Periódico anual', epp: ['Casco', 'Chaleco reflectivo'] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader
        title="Profesiograma"
        subtitle="Relación de cargos de INDECON S.A.S. con los exámenes médicos ocupacionales requeridos y EPP por cargo"
        icon={Stethoscope}
        color={C.mint}
      />

      {/* Info */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 18px',
        display: 'flex', gap: 12,
      }}>
        <Stethoscope size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
            ¿Qué es el Profesiograma?
          </p>
          <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
            Documento que relaciona cada cargo con los riesgos laborales a los que está expuesto,
            los exámenes médicos ocupacionales requeridos (ingreso, periódico, retiro) y los
            elementos de protección personal (EPP). Es requerido por la Resolución 2346 de 2007
            y la Resolución 0312 de 2019.
          </p>
        </div>
      </div>

      {/* Preview tabla */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 18px', background: C.mint, display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Cargos identificados — Vista previa</p>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Datos ilustrativos</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.5fr 1.5fr 1.2fr',
            padding: '8px 18px', background: '#f8fafc',
            fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
          }}>
            <span>Cargo</span><span>Área</span><span>Riesgos</span><span>Exámenes</span><span>EPP</span>
          </div>
          {CARGOS_EJEMPLO.map((c, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.5fr 1.5fr 1.2fr',
              padding: '10px 18px', borderTop: '1px solid #f3f4f6', alignItems: 'start', gap: 8,
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{c.cargo}</p>
              <span style={{ fontSize: 11, color: C.mint, background: `${C.mint}15`, borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                {c.area}
              </span>
              <p style={{ fontSize: 11, color: '#374151' }}>{c.riesgo}</p>
              <p style={{ fontSize: 11, color: '#374151' }}>{c.examen}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.epp.map((e, ei) => (
                  <span key={ei} style={{ fontSize: 10, color: '#6b7280', background: '#f3f4f6', borderRadius: 4, padding: '1px 6px' }}>{e}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ComingSoon
        title="Profesiograma"
        desc="El módulo completo permitirá gestionar el profesiograma digital: agregar cargos, asignar riesgos por GTC-45, definir exámenes de ingreso/periódico/retiro, registrar resultados de exámenes, controlar vencimientos y generar alertas cuando un examen esté próximo a vencer."
        fields={['Cargo / Rol', 'Área / Proceso', 'Peligros expuestos (GTC-45)', 'Examen de ingreso', 'Examen periódico (frecuencia)', 'Examen de retiro', 'Restricciones médicas', 'EPP requerido', 'Fecha último examen', 'Vencimiento próximo examen', 'Resultado / Aptitud']}
        accentColor={C.mint}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function SegBienestar() {
  const { isAdmin, isGerencia, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('planes');

  const canView   = isAdmin || isGerencia || hasPermission('sst_bienestar:view');
  const canManage = isAdmin || isGerencia || hasPermission('sst_bienestar:manage');

  if (!canView) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <Shield size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 600 }}>Sin acceso a este módulo</p>
      </div>
    </div>
  );

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="p-3 space-y-3">
      {/* ModuleHero — mismo patrón que todos los demás módulos */}
      <ModuleHero
        title="SST y Bienestar"
        subtitle="Sistema de Gestión de Seguridad y Salud en el Trabajo · INDECON S.A.S."
        icon={Shield}
        color="#6dbd96"
      />

      {/* Tabs de navegación */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const TIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 700 : 400,
                background: isActive ? tab.color : 'transparent',
                color: isActive ? '#fff' : '#6b7280',
                transition: 'all 0.15s',
              }}>
                <TIcon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    fontSize: 10, background: isActive ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                    color: isActive ? '#fff' : '#6b7280',
                    borderRadius: 8, padding: '0 6px', fontWeight: 600,
                  }}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido del tab activo */}
      {activeTab === 'planes'       && <PlanesTab       canManage={canManage} />}
      {activeTab === 'estandares'   && <EstandaresTab   />}
      {activeTab === 'requisitos'   && <RequisitosTab   />}
      {activeTab === 'matriz'       && <MatrizTab        />}
      {activeTab === 'inspecciones' && <InspeccionesTab  />}
      {activeTab === 'profesiograma'&& <ProfesiogramaTab />}
    </div>
  );
}