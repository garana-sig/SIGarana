// src/components/modules/SSTBienestar/SSTBienestar.jsx
import { useState } from 'react';
import { useAuth }     from '@/context/AuthContext';
import { Button }      from '@/app/components/ui/button';
import ModuleHero      from '@/components/ModuleHero';

import CapacitacionesTab from './SSTBienestar/Capacitaciones/CapacitacionesTab';
import WorkPlanTab       from './SSTBienestar/PlanesTrabajo/WorkPlanTab';
import BienestarTab      from './SSTBienestar/PlanesTrabajo/BienestarTab';
import EstandaresTab     from './SSTBienestar/Estandares/EstandaresTab';

import {
  Shield, BookOpen, CheckSquare, AlertTriangle,
  ClipboardCheck, HardHat, Stethoscope, Heart,
  BarChart3, ArrowRight, Construction, Plus,
} from 'lucide-react';

const C = {
  primary:'#2e5244', mint:'#6dbd96', olive:'#6f7b2c',
  sand:'#dedecc', amber:'#d97706', blue:'#1d4ed8', purple:'#7e22ce',
};

const TABS = [
  { id:'planes',        label:'Planes y Programas',  icon:BookOpen,       color:C.primary, badge:'7 programas' },
  { id:'estandares',    label:'Estándares Mínimos',   icon:CheckSquare,    color:C.blue,    badge:'Res. 0312'   },
  { id:'matriz',        label:'Matriz de Peligros',   icon:AlertTriangle,  color:C.amber,   badge:'GTC-45'      },
  { id:'inspecciones',  label:'Inspecciones',         icon:HardHat,        color:C.purple,  badge:null          },
  { id:'profesiograma', label:'Profesiograma',        icon:Stethoscope,    color:C.mint,    badge:null          },
];

const PROGRAMAS = [
  { id:'capacitacion',       label:'Capacitación',           icon:BookOpen,    color:C.primary, desc:'Cronograma anual de capacitaciones en SST.' },
  { id:'convivencia',        label:'Comité de Convivencia',  icon:Shield,      color:'#1d4ed8', desc:'Gestión del Comité de Convivencia Laboral.' },
  { id:'copasst',            label:'COPASST',                icon:Shield,      color:'#15803d', desc:'Comité Paritario de Seguridad y Salud en el Trabajo.' },
  { id:'bienestar',          label:'Bienestar Social',       icon:Heart,       color:'#6dbd96', desc:'Programa de actividades de bienestar para colaboradores.' },
  { id:'sst',                label:'SST',                    icon:HardHat,     color:'#7e22ce', desc:'Plan de trabajo anual de Seguridad y Salud en el Trabajo.' },
  { id:'promocion_prevencion',label:'Promoción y Prevención',icon:Stethoscope, color:'#0891b2', desc:'Plan anual de promoción y prevención en salud.' },
  { id:'gerencia',           label:'Plan de Gerencia',       icon:BarChart3,   color:C.olive,   desc:'Plan de trabajo SST aprobado por gerencia.' },
];

function SectionHeader({ title, subtitle, color, icon: Icon }) {
  return (
    <div style={{
      background:`linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
      borderRadius:14, padding:'22px 26px', color:'#fff', marginBottom:18,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{
          background:'rgba(255,255,255,0.2)', borderRadius:12,
          width:46, height:46, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          <Icon size={22} color="white"/>
        </div>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>{title}</h2>
          {subtitle && <p style={{ fontSize:13, opacity:0.85 }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ title, desc, fields=[], accentColor=C.primary }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{
        background:'#fff', borderRadius:14, padding:'20px 24px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)', borderLeft:`5px solid ${accentColor}`,
      }}>
        <p style={{ fontSize:14, color:'#374151', lineHeight:1.7 }}>{desc}</p>
      </div>
      {fields.length > 0 && (
        <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
            📋 Estructura planeada para este módulo
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10 }}>
            {fields.map((f,i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                borderRadius:10, background:`${accentColor}08`, border:`1px solid ${accentColor}20`,
              }}>
                <ArrowRight size={13} color={accentColor} style={{ flexShrink:0 }}/>
                <span style={{ fontSize:13, color:'#374151' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{
        background:'#fff', borderRadius:14, overflow:'hidden',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:`2px dashed ${accentColor}30`,
      }}>
        <div style={{ padding:'48px 24px', textAlign:'center' }}>
          <div style={{
            width:64, height:64, borderRadius:'50%', background:`${accentColor}12`,
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
          }}>
            <Construction size={28} color={accentColor}/>
          </div>
          <p style={{ fontSize:16, fontWeight:700, color:accentColor, marginBottom:8 }}>
            {title} — Próximamente
          </p>
          <p style={{ fontSize:13, color:'#9ca3af', maxWidth:360, margin:'0 auto', lineHeight:1.6 }}>
            Este submódulo está diseñado y listo para implementarse en la siguiente sesión de desarrollo.
          </p>
          <div style={{ marginTop:20 }}>
            <Button disabled style={{ background:accentColor, color:'#fff', opacity:0.5, fontSize:13 }}>
              <Plus size={14} style={{ marginRight:6 }}/>Registrar {title.toLowerCase()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab Planes ────────────────────────────────────────────────────────
function PlanesTab() {
  const [openProg, setOpenProg] = useState('capacitacion');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionHeader title="Planes y Programas SST"
        subtitle="Gestión de los 7 programas del sistema de seguridad y salud"
        icon={BookOpen} color={C.primary}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:10 }}>
        {PROGRAMAS.map(prog => {
          const PIcon = prog.icon;
          const isActive = openProg === prog.id;
          return (
            <button key={prog.id} onClick={() => setOpenProg(prog.id)} style={{
              background: isActive ? prog.color : '#fff',
              border:`2px solid ${isActive ? prog.color : '#e5e7eb'}`,
              borderRadius:14, padding:'14px 16px', cursor:'pointer', textAlign:'left',
              boxShadow: isActive ? `0 4px 16px ${prog.color}30` : '0 1px 4px rgba(0,0,0,0.05)',
              transition:'all 0.15s',
            }}>
              <PIcon size={18} color={isActive ? 'white' : prog.color} style={{ marginBottom:8 }}/>
              <p style={{ fontSize:13, fontWeight:700, color: isActive ? 'white' : '#1f2937', lineHeight:1.3 }}>
                {prog.label}
              </p>
            </button>
          );
        })}
      </div>
      {openProg === 'capacitacion'        && <CapacitacionesTab />}
      {openProg === 'convivencia'         && <WorkPlanTab planType="convivencia" />}
      {openProg === 'copasst'             && <WorkPlanTab planType="copasst" />}
      {openProg === 'bienestar'           && <BienestarTab />}
      {openProg === 'sst'                 && <WorkPlanTab planType="sst" />}
      {openProg === 'promocion_prevencion'&& <WorkPlanTab planType="promocion_prevencion" />}
      {openProg === 'gerencia'            && (
        <ComingSoon title="Plan de Gerencia"
          desc="Plan de trabajo SST aprobado por gerencia. Objetivos, metas, recursos y seguimiento de indicadores del sistema."
          fields={['Política SST firmada y vigente','Objetivos y metas SST','Plan de trabajo anual','Presupuesto SST','Revisión por la dirección']}
          accentColor={C.olive}/>
      )}
    </div>
  );
}

// ── Tabs pendientes ───────────────────────────────────────────────────


function MatrizTab() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionHeader title="Matriz de Identificación de Peligros"
        subtitle="GTC-45:2012 · Identificación de peligros, evaluación y valoración de riesgos para INDECON S.A.S."
        icon={AlertTriangle} color={C.amber}/>
      <ComingSoon title="Matriz de Peligros"
        desc="La implementación completa incluirá todos los campos de la GTC-45: proceso, zona/área, actividad, peligro, efectos posibles, controles existentes, evaluación del riesgo y medidas de intervención propuestas."
        fields={['Proceso / Área','Actividad','Tipo de peligro','Descripción del peligro','Efectos posibles','Controles actuales','Nivel de riesgo','Aceptabilidad','Medidas de intervención','Responsable','Fecha de revisión']}
        accentColor={C.amber}/>
    </div>
  );
}

function InspeccionesTab() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionHeader title="Inspecciones de Seguridad"
        subtitle="Registro y seguimiento de inspecciones planeadas y no planeadas"
        icon={HardHat} color={C.purple}/>
      <ComingSoon title="Inspecciones"
        desc="Este módulo registrará cada inspección realizada con: tipo, fecha, área inspeccionada, hallazgos encontrados (conformes/no conformes), responsable de inspección, y plan de acción para los hallazgos críticos."
        fields={['Tipo de inspección','Fecha y hora','Área / Proceso','Inspector','Hallazgos','Clasificación del hallazgo','Acción correctiva','Responsable corrección','Fecha límite','Estado de cierre']}
        accentColor={C.purple}/>
    </div>
  );
}

function ProfesiogramaTab() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionHeader title="Profesiograma"
        subtitle="Relación de cargos de INDECON S.A.S. con los exámenes médicos ocupacionales requeridos y EPP por cargo"
        icon={Stethoscope} color={C.mint}/>
      <ComingSoon title="Profesiograma"
        desc="El módulo completo permitirá gestionar el profesiograma digital: agregar cargos, asignar riesgos por GTC-45, definir exámenes de ingreso/periódico/retiro, registrar resultados, controlar vencimientos y generar alertas."
        fields={['Cargo / Rol','Área / Proceso','Peligros expuestos (GTC-45)','Examen de ingreso','Examen periódico (frecuencia)','Examen de retiro','Restricciones médicas','EPP requerido','Fecha último examen','Vencimiento próximo examen','Resultado / Aptitud']}
        accentColor={C.mint}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function SegBienestar() {
  const { isAdmin, isGerencia, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('planes');

  const canView = isAdmin || isGerencia || hasPermission('sst_bienestar:view');

  if (!canView) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center', color:'#6b7280' }}>
        <Shield size={48} style={{ opacity:0.3, marginBottom:12 }}/>
        <p style={{ fontSize:16, fontWeight:600 }}>Sin acceso a este módulo</p>
      </div>
    </div>
  );

  return (
    <div className="p-3 space-y-3">
      <ModuleHero
        title="SST y Bienestar"
        subtitle="Sistema de Gestión de Seguridad y Salud en el Trabajo · INDECON S.A.S."
        icon={Shield}
        color="#6dbd96"
      />

      {/* Tabs */}
      <div style={{
        background:'#fff', borderRadius:14, padding:6,
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', gap:4, flexWrap:'wrap',
      }}>
        {TABS.map(tab => {
          const TIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'9px 16px', borderRadius:10, border:'none', cursor:'pointer',
              fontSize:13, fontWeight: isActive ? 700 : 400,
              background: isActive ? tab.color : 'transparent',
              color: isActive ? '#fff' : '#6b7280',
              transition:'all 0.15s',
            }}>
              <TIcon size={14}/>
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize:10, background: isActive ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                  color: isActive ? '#fff' : '#6b7280',
                  borderRadius:8, padding:'0 6px', fontWeight:600,
                }}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {activeTab === 'planes'        && <PlanesTab />}
      {activeTab === 'estandares'    && <EstandaresTab />}
      {activeTab === 'matriz'        && <MatrizTab />}
      {activeTab === 'inspecciones'  && <InspeccionesTab />}
      {activeTab === 'profesiograma' && <ProfesiogramaTab />}
    </div>
  );
}