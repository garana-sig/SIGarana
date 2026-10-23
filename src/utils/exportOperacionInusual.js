// src/utils/exportOperacionInusual.js
// ═══════════════════════════════════════════════════════════════════
// Excel RE-GF-10 (Reporte interno de operación inusual · BASC) sobre el
// formato OFICIAL de Gestión Documental ('registro_operacion_inusual').
// Los 9 círculos del formato son figuras que ExcelJS no conserva → la
// marca va en el texto de la etiqueta: "[X] PROVEEDOR".
// Mapa: A5 fecha · C5 hora · A6 nombre · A7 cargo · A8 proceso
//   B11/D11/F11/B12/D12 contraparte · A14 razón social · A15 persona asociada
//   A18/C18/E18 tipo de operación · A21:H23 descripción
//   G25…G33 señales (X) · A33 "Otra cuál" · A36–A38 soporte
//   A40 recepción + radicado · A41 firma BASC · A42 investigación · A43 UIAF
// ═══════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';
import { texto, marcaX, etiqueta, bloque, siNo, fmtFecha, fmtHora } from '@/utils/excelFormato';

const FILAS_SENAL = {
  origen_destino: 25, frecuencia: 26, modalidad_transporte: 27, listas_restrictivas: 28,
  documentacion_alterada: 29, operacion_financiera: 30, negativa_informacion: 31, pago_fraccionado: 32, otra: 33,
};

export async function llenarOperacionInusual(wb, g) {
  const ws = wb.worksheets[0];
  const b = { bold: true };
  // Quien reporta
  texto(ws, 'A5', `FECHA: ${fmtFecha(g.fecha)}`, b);
  texto(ws, 'C5', `HORA: ${fmtHora(g.hora)}`, b);
  texto(ws, 'A6', `NOMBRE: ${g.reportado_por || 'Anónimo'}`, b);
  texto(ws, 'A7', `CARGO: ${g.reportado_cargo || ''}`, b);
  texto(ws, 'A8', `PROCESO: ${g.reportado_proceso || ''}`, b);
  // Contraparte
  etiqueta(ws, 'B11', g.contraparte_tipo === 'proveedor');
  etiqueta(ws, 'D11', g.contraparte_tipo === 'cliente');
  etiqueta(ws, 'F11', g.contraparte_tipo === 'socio');
  etiqueta(ws, 'B12', g.contraparte_tipo === 'contratista');
  etiqueta(ws, 'D12', g.contraparte_tipo === 'transportador');
  texto(ws, 'A14', `NOMBRE O RAZÓN SOCIAL: ${g.contraparte_nombre || ''}`);
  texto(ws, 'A15', `NOMBRE DE PERSONA ASOCIADA: ${g.persona_asociada || ''}`);
  // Tipo de operación
  etiqueta(ws, 'A18', g.tipo_operacion === 'realizada');
  etiqueta(ws, 'C18', g.tipo_operacion === 'rechazada');
  etiqueta(ws, 'E18', g.tipo_operacion === 'suspendida');
  // Descripción
  bloque(ws, 'A21:H23', g.descripcion);
  // Señales
  const s = new Set(g.senales || []);
  Object.entries(FILAS_SENAL).forEach(([k, fila]) => marcaX(ws, `G${fila}`, s.has(k)));
  texto(ws, 'A33', `Otra, ¿cuál? ${s.has('otra') ? (g.senal_otra || '') : ''}`);
  // Soporte
  etiqueta(ws, 'A36', g.soporte_listas);
  etiqueta(ws, 'A37', g.soporte_documentos);
  texto(ws, 'A38', `${g.soporte_correos ? '[X]' : '[  ]'} Correos electrónicos de respaldo.   ${g.soporte_otros ? '[X]' : '[  ]'} Otros: ${g.soporte_otros || ''}`);
  // Recepción
  texto(ws, 'A40', `Fecha de Recepción: ${fmtFecha(g.fecha_recepcion)}     Radicado Interno No: ${g.numero}`);
  texto(ws, 'A41', `Firma Responsable BASC: ${g.receptor?.full_name || ''}`);
  texto(ws, 'A42', `¿Requiere investigación ampliada?: ${siNo(g.requiere_investigacion)}`);
  texto(ws, 'A43', `¿Constituye Operación Sospechosa para reporte externo a la UIAF/UAF?: ${siNo(g.reporte_uiaf)}`);
}

export async function exportOperacionInusual(registro, formato) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await descargarPlantilla(formato));
  await llenarOperacionInusual(wb, registro);
  const out = await wb.xlsx.writeBuffer();
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato.code}_${registro.numero}.xlsx`);
}