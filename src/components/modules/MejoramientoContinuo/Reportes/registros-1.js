// src/components/modules/MejoramientoContinuo/Reportes/registros.js
// Configuración de los registros de "Ayúdanos a mejorar" (3 con formato + 2 solo bandeja).
// La clave de cada objeto = id del submódulo en MejoramientoContinuo.jsx
// = clave del formato vinculado (Gestión Documental → Formatos del sistema).
import FormActoInseguro, { EPP_OPCIONES } from './FormActoInseguro';
import FormSugerencia, { CLASIFICACIONES } from './FormSugerencia';
import FormOperacionInusual, { CONTRAPARTES, OPERACIONES } from './FormOperacionInusual';
import { exportActoInseguro } from '@/utils/exportActoInseguro';
import { exportSugerencia } from '@/utils/exportSugerencia';
import { exportOperacionInusual } from '@/utils/exportOperacionInusual';

const etq = (lista, k) => lista.find((x) => x.key === k)?.label || '';

export const REGISTROS = {
  registro_actos_inseguros: {
    titulo: 'Registro Actos Inseguros',
    subtitulo: 'Actos y/o condiciones inseguras o condiciones de salud',
    claveFormato: 'registro_actos_inseguros',
    tipo: 'acto_inseguro',
    tabla: 'reg_acto_inseguro',
    Formulario: FormActoInseguro,
    exportar: exportActoInseguro,
    buscar: (g) => (g.epp_omitidos || []).map((k) => etq(EPP_OPCIONES, k)).join(' '),
    columnas: [
      { h: 'Reporta', v: (g) => g.reportado_por },
      { h: 'Tipo', nowrap: true, v: (g) => [g.es_acto_inseguro && 'Acto', g.es_condicion_insegura && 'Condición', g.es_condicion_salud && 'Salud'].filter(Boolean).join(' · ') },
      { h: 'Área', v: (g) => g.area },
      { h: 'Descripción', ancho: 280, clamp: true, v: (g) => g.descripcion },
    ],
  },

  registro_sugerencias: {
    titulo: 'Registro Sugerencias',
    subtitulo: 'Buzón de sugerencias: quejas, reclamos, sugerencias y felicitaciones',
    claveFormato: 'registro_sugerencias',
    tipo: 'sugerencia',
    tabla: 'reg_sugerencia',
    Formulario: FormSugerencia,
    exportar: exportSugerencia,
    buscar: (g) => `${etq(CLASIFICACIONES, g.clasificacion)} ${g.respuesta || ''}`,
    columnas: [
      { h: 'Clasificación', nowrap: true, v: (g) => etq(CLASIFICACIONES, g.clasificacion) },
      { h: 'Envía', v: (g) => g.reportado_por },
      { h: 'Descripción', ancho: 300, clamp: true, v: (g) => g.descripcion },
      { h: 'Respuesta', ancho: 220, clamp: true, v: (g) => g.respuesta },
    ],
  },

  registro_operacion_inusual: {
    titulo: 'Registro Operación Inusual en Exportación',
    subtitulo: 'Reporte interno de operación inusual (BASC)',
    claveFormato: 'registro_operacion_inusual',
    tipo: 'operacion_inusual',
    tabla: 'reg_operacion_inusual',
    Formulario: FormOperacionInusual,
    exportar: exportOperacionInusual,
    buscar: (g) => `${g.contraparte_nombre || ''} ${g.persona_asociada || ''} ${etq(CONTRAPARTES, g.contraparte_tipo)}`,
    columnas: [
      { h: 'Reporta', v: (g) => g.reportado_por },
      { h: 'Contraparte', v: (g) => [etq(CONTRAPARTES, g.contraparte_tipo), g.contraparte_nombre].filter(Boolean).join(': ') },
      { h: 'Operación', nowrap: true, v: (g) => etq(OPERACIONES, g.tipo_operacion) },
      { h: 'Descripción', ancho: 260, clamp: true, v: (g) => g.descripcion },
      { h: 'UIAF', nowrap: true, v: (g) => (g.reporte_uiaf === true ? 'Sí' : g.reporte_uiaf === false ? 'No' : '') },
    ],
  },

  // ── Solo bandeja (30-oct-2026): sin formato diligenciable todavía. ──
  // tabla/Formulario/exportar = null → el manager muestra solo la bandeja
  // y deja cerrar el reporte directamente desde "Nuevo" o "En gestión".
  registro_seguridad_fisica: {
    titulo: 'Posible Afectación en la Seguridad Física',
    subtitulo: 'Bandeja de reportes de seguridad física',
    claveFormato: 'registro_seguridad_fisica',
    tipo: 'seguridad_fisica',
    tabla: null, Formulario: null, exportar: null, columnas: [],
  },

  registro_amenazas_informaticas: {
    titulo: 'Amenazas Informáticas',
    subtitulo: 'Bandeja de reportes de amenazas informáticas',
    claveFormato: 'registro_amenazas_informaticas',
    tipo: 'amenaza_informatica',
    tabla: null, Formulario: null, exportar: null, columnas: [],
  },
};