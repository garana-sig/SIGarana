// src/utils/exportAccionesMejora.js
// ═══════════════════════════════════════════════════════════════════════
// v2 (oct 2026) — Exporta sobre el formato vigente de Gestión Documental
// (formato_vinculado 'registro_acciones_mejora' → hoy RE-GS-06 v01).
// El encabezado (código, versión, fecha) es el del Listado Maestro: no se toca.
//
// Hoja "v3" — filas 6-8 encabezados, datos desde la fila 9 (9–19 formateadas):
//   A Consecutivo · B Fecha · C Proceso
//   D Auditoría · E QRS · F Satisfacción · G Autocontrol · H Análisis riesgos · I Pto no conforme (X)
//   J Descripción del hallazgo · K Corrección · L Correctiva · M Preventiva (X) · N Causas
//   O Descripción acciones · P Logros · Q Recursos · R Responsable · S Fecha propuesta
//   T Criterios verificación · U:W Hallazgo de verificación · X Fecha verificación · Y Fecha eficacia
//   Z Cierre SI · AA Cierre NO · AB Auditor
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';

const SHEET_NAME     = 'v3';
const DATA_START_ROW = 9;
const FILAS_FORMATO  = 11;            // 9..19 vienen con bordes en el formato
const ULTIMA_COL     = 28;            // AB

const fmt = (d) => {
  if (!d) return null;
  const x = new Date(d + (String(d).includes('T') ? '' : 'T00:00:00'));
  return x.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const X = (v) => (v ? 'X' : null);
const clon = (st) => JSON.parse(JSON.stringify(st || {}));

const poner = (cell, val, h = 'left') => {
  cell.value = val ?? null;
  cell.style = { ...clon(cell.style), alignment: { horizontal: h, vertical: 'middle', wrapText: true } };
};

/**
 * @param {Array}    acciones    filas de improvement_action con responsible_name y auditor
 * @param {Function} getProcess  (process_id) => nombre del proceso
 * @param {object}   formato     documento vinculado (useFormato('registro_acciones_mejora'))
 * @param {string}   sufijo      texto para el nombre del archivo
 */
export const exportAccionesMejora = async (acciones, getProcess, formato, sufijo = 'Acciones') => {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];
  if (!ws) throw new Error(`No se encontró la hoja "${SHEET_NAME}" en ${formato.code}.`);

  // Limpiar los ejemplos que trae el formato (solo valores, se conserva el estilo)
  for (let r = DATA_START_ROW; r < DATA_START_ROW + FILAS_FORMATO; r++)
    for (let c = 1; c <= ULTIMA_COL; c++) ws.getRow(r).getCell(c).value = null;

  // Filas extra con el estilo de la primera fila de datos. La fila 20 del formato
  // es una franja de cierre fusionada (A20:AB20): se separa para usarla como dato.
  if (acciones.length > FILAS_FORMATO) {
    const pie = `A${DATA_START_ROW + FILAS_FORMATO}:AB${DATA_START_ROW + FILAS_FORMATO}`;
    try { ws.unMergeCells(pie); } catch { /* el formato ya no la trae */ }
  }
  for (let i = FILAS_FORMATO; i < acciones.length; i++) {
    const src = ws.getRow(DATA_START_ROW), dst = ws.getRow(DATA_START_ROW + i);
    dst.height = src.height;
    for (let c = 1; c <= ULTIMA_COL; c++) dst.getCell(c).style = clon(src.getCell(c).style);
  }

  acciones.forEach((a, i) => {
    const row = ws.getRow(DATA_START_ROW + i);
    const g = (c) => row.getCell(c);
    // IDENTIFICACIÓN
    poner(g('A'), a.consecutive || null, 'center');
    poner(g('B'), fmt(a.date || a.created_at), 'center');
    poner(g('C'), getProcess(a.process_id) || null, 'center');
    poner(g('D'), X(a.origin_audit), 'center');
    poner(g('E'), X(a.origin_qrs), 'center');
    poner(g('F'), X(a.origin_satisfaction), 'center');
    poner(g('G'), X(a.origin_autocontrol), 'center');
    poner(g('H'), X(a.origin_risk_analysis), 'center');
    poner(g('I'), X(a.origin_nonconforming), 'center');
    // ANÁLISIS
    poner(g('J'), a.finding_description || null);
    poner(g('K'), X(a.action_correction), 'center');
    poner(g('L'), X(a.action_corrective || a.action_improvement), 'center');
    poner(g('M'), X(a.action_preventive), 'center');
    poner(g('N'), a.causes || null);
    // PLAN DE ACCIÓN
    poner(g('O'), a.action_description || null);
    poner(g('P'), a.expected_results || null);
    poner(g('Q'), a.resources_budget || null);
    poner(g('R'), a.responsible_name && a.responsible_name !== '—' ? a.responsible_name : null);
    poner(g('S'), fmt(a.proposed_date), 'center');
    // VERIFICACIÓN
    poner(g('T'), a.verification_criteria || null);
    poner(g('U'), a.verification_finding || null);
    poner(g('X'), fmt(a.verification_date), 'center');
    poner(g('Y'), fmt(a.efficacy_date), 'center');
    poner(g('Z'),  a.closure_approved === 'SI' ? 'X' : null, 'center');
    poner(g('AA'), a.closure_approved === 'NO' ? 'X' : null, 'center');
    poner(g('AB'), a.auditor?.full_name || null, 'center');
    row.commit();
  });

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato.code}_${sufijo}_${hoy}.xlsx`);
  return true;
};

export default exportAccionesMejora;
