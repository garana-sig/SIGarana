// src/data/politicas.js
// ═══════════════════════════════════════════════════════════════════
// Fuente ÚNICA de las políticas institucionales del SIG.
// La usan:
//   • PlaneacionEstrategica.jsx → pestaña "Planeación 2026"
//   • Politicas.jsx             → acceso "Políticas" desde el Inicio
// Si una política cambia, se edita solo aquí.
//
// Origen: "Planeación Estratégica 2026" (revisada 05/02/2026) y
// Manual Integrado de Gestión MC-DP-01 (Sep/2026) para la declaración
// completa de la Política Integral de Calidad y SST.
// ═══════════════════════════════════════════════════════════════════

import { ShieldCheck, Ban, Award, Heart, Scale, Handshake } from 'lucide-react';

const G = { primary: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', amber: '#d97706' };

export const POLITICAS = [
  {
    id: 'sig',
    title: 'Política del Sistema Integrado de Gestión (SIG + BASC)',
    icon: ShieldCheck,
    color: G.primary,
    text: 'INDECON S.A.S integra su Sistema de Gestión de Calidad (ISO 9000), el sistema de gestión de Seguridad y Salud en el Trabajo (Decreto 1072) y los estándares de seguridad BASC. Se compromete con la seguridad de la cadena de suministros, la prevención de actividades ilícitas y la integridad de la información, superando las expectativas de clientes, proveedores y socios.',
    normas: ['ISO 9001', 'Decreto 1072', 'BASC'],
  },
  {
    id: 'calidad_sst',
    title: 'Política Integral de Calidad y Seguridad y Salud en el Trabajo',
    icon: Award,
    color: G.olive,
    text: 'INDECON confecciona prendas con calidad mediante procesos de mejora continua, reduciendo riesgos laborales y promoviendo la salud en el trabajo, con dirección comprometida con el medio ambiente y el bienestar de sus colaboradores.',
    declaracion: 'INDECON S.A.S. confecciona prendas con calidad, elaboradas por personal idóneo y capacitado mediante procesos en mejora continua, reduciendo los riesgos y promoviendo la salud en el trabajo, cumpliendo con los requisitos legales y superando las expectativas de nuestros clientes, con una dirección comprometida con el medio ambiente y el bienestar de sus colaboradores.',
    compromisos: [
      'Proteger la salud y la seguridad de todos los trabajadores, independientemente de su vinculación, manteniendo condiciones seguras y saludables en los lugares de trabajo.',
      'El responsable del SG-SST cuenta con el apoyo de la alta gerencia, el COPASST y los trabajadores en general.',
      'Cumplir la legislación colombiana en seguridad y salud en el trabajo y los demás requisitos suscritos por INDECON.',
      'Destinar los recursos físicos, económicos y de talento humano para identificar, valorar e intervenir los peligros que puedan generar accidentes, enfermedades laborales y emergencias.',
    ],
    firma: 'Margarita Milena Ramírez — Representante legal',
    fuente: 'Manual Integrado de Gestión MC-DP-01',
    normas: ['ISO 9001', 'Decreto 1072'],
  },
  {
    id: 'consumo',
    title: 'Prevención de Consumo de Tabaco, Alcohol y Sustancias Psicoactivas',
    icon: Ban,
    color: '#dc2626',
    text: 'Prohíbe fumar en instalaciones y anexos, así como el consumo, posesión y venta de sustancias psicoactivas, bebidas alcohólicas y energizantes en los lugares de trabajo. Ningún contratista puede laborar bajo su efecto. Basado en las resoluciones 1075/1992, 4225/1992 y 2646/2008.',
    normas: ['Res. 1075/1992', 'Res. 4225/1992', 'Res. 2646/2008'],
  },
  {
    id: 'genero',
    title: 'Política de Género y Diversidad',
    icon: Heart,
    color: '#be185d',
    text: 'Compromiso con una cultura organizacional diversa e inclusiva: igualdad de oportunidades, no discriminación, ambiente inclusivo y cero tolerancia al acoso, incluido el acoso sexual, con procedimientos confidenciales para reportar.',
  },
  {
    id: 'desconexion',
    title: 'Política de Desconexión Laboral',
    icon: Scale,
    color: G.mint,
    text: 'En cumplimiento de la Ley 2191 de 2022, regula el derecho a no tener contacto laboral fuera de la jornada ordinaria, garantizando el disfrute efectivo del tiempo libre, descansos, licencias y vacaciones. Aplica a todos los colaboradores, con excepciones para cargos de dirección y confianza, y situaciones de urgencia manifiesta.',
    normas: ['Ley 2191 de 2022'],
  },
  {
    id: 'convivencia',
    title: 'Política de Convivencia',
    icon: Handshake,
    color: G.amber,
    text: 'Establece normas para un ambiente laboral armonioso y respetuoso: trato cordial, cero acoso o violencia, cumplimiento de horarios, uso consciente de recursos y confidencialidad. El incumplimiento puede acarrear amonestaciones, suspensiones o terminación de contrato según la gravedad.',
  },
];

export const CODIGO_ETICA = {
  title: 'Código de Ética y Conducta',
  text: 'Durante más de veinte años, INDECON ha confeccionado trajes de baño y prendas con el sello del talento caldense. El Código de Ética eleva los valores de honestidad, responsabilidad, respeto, amor y lealtad a compromisos formales con cada persona de la cadena de valor, incorporando en 2026 los desafíos de la tecnología, la sostenibilidad y la salud mental de los equipos.',
};

export const POLITICAS_META = {
  revision: 'Revisión de Políticas 2026',
  fecha: '05/02/2026',
  aprobadoPor: 'Lina María Ruiz Guzmán (Subgerente)',
  realizadoPor: 'Margarita Milena Ramírez (Gerente)',
};
