// src/utils/exportAccionesMejora.js
// ═══════════════════════════════════════════════════════════════════════
// v3 (13-nov-2026) — Exporta sobre el formato vigente de Gestión Documental
// (formato_vinculado 'registro_acciones_mejora' → RE-GS-06).
// El encabezado (código, versión, fecha) es el del Listado Maestro: no se toca.
//
// RE-GS-06 v2 · hoja "v2" — filas 6-8 encabezados, datos 9–19, pie A20:AB20
//   A Consecutivo · B Fecha · C Proceso
//   D Auditoría · E QRS · F Satisfacción · G Autocontrol · H Análisis riesgos · I Pto no conforme (X)
//   J Descripción del hallazgo
//   K Corrección (X) · L Descripción de corrección
//   M Acción correctiva (X) · N Causa 5 ¿por qué? (1..5) · O Descripción acciones correctivas (1..n)
//   P Acción de mejora (X) · Q Descripción acciones de mejora
//   R Presupuesto · S Responsable · T Fecha
//   U Criterios verificación · V:X Hallazgo de verificación (fusionada por fila)
//   Y Fecha verificación · Z Fecha eficacia · AA Cierre SI · AB Cierre NO · AC Auditor
//
// Si en Gestión Documental sigue cargado el RE-GS-06 v1 (hoja "v3"), se usa
// el mapeo anterior para no romper la descarga.
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';

const DATA_START_ROW = 9;
const FILAS_FORMATO  = 11;            // 9..19 vienen con bordes en el formato

const fmt = (d) => {
  if (!d) return null;
  const x = new Date(d + (String(d).includes('T') ? '' : 'T00:00:00'));
  return x.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const X = (v) => (v ? 'X' : null);
const clon = (st) => JSON.parse(JSON.stringify(st || {}));
const lista = (arr) =>
  Array.isArray(arr) && arr.length ? arr.map((t, i) => `${i + 1}. ${t}`).join('\n') : null;
const nombre = (n) => (n && n !== '—' ? n : null);

const poner = (cell, val, h = 'left') => {
  cell.value = val ?? null;
  cell.style = { ...clon(cell.style), alignment: { horizontal: h, vertical: 'middle', wrapText: true } };
};

// Alto aproximado según el texto más largo de la fila (ancho de columna en caracteres)
const altoFila = (ws, row, cols, base) => {
  let lineas = 1;
  for (const c of cols) {
    const v = row.getCell(c).value;
    if (!v) continue;
    const ancho = Math.max(6, (ws.getColumn(c).width || 10) * 1.1);
    const n = String(v).split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / ancho)), 0);
    lineas = Math.max(lineas, n);
  }
  return Math.max(base || 15, Math.min(409, lineas * 12.5 + 6));
};

// ── Mapeos por versión del formato ──────────────────────────────────────
const LAYOUT_V2 = {
  hoja: 'v2', ultimaCol: 29, pie: 'AB', fusion: ['V', 'X'],
  textos: ['J', 'L', 'N', 'O', 'Q', 'U', 'V'],
  escribir: (g, a, getProcess) => {
    poner(g('A'), a.consecutive || null, 'center');
    poner(g('B'), fmt(a.date || a.created_at), 'center');
    poner(g('C'), getProcess(a.process_id) || null, 'center');
    poner(g('D'), X(a.origin_audit), 'center');
    poner(g('E'), X(a.origin_qrs), 'center');
    poner(g('F'), X(a.origin_satisfaction), 'center');
    poner(g('G'), X(a.origin_autocontrol), 'center');
    poner(g('H'), X(a.origin_risk_analysis), 'center');
    poner(g('I'), X(a.origin_nonconforming), 'center');
    poner(g('J'), a.finding_description || null);
    // ANÁLISIS Y ACCIONES
    poner(g('K'), X(a.action_correction), 'center');
    poner(g('L'), a.correction_description || null);
    poner(g('M'), X(a.action_corrective), 'center');
    poner(g('N'), lista(a.causes_whys) || a.causes || null);              // histórico: texto libre
    poner(g('O'), lista(a.corrective_actions) || a.action_description || null);
    poner(g('P'), X(a.action_improvement), 'center');
    poner(g('Q'), a.improvement_description || null);
    // CRONOGRAMA
    poner(g('R'), a.resources_budget || null);
    poner(g('S'), nombre(a.responsible_name), 'center');
    poner(g('T'), fmt(a.proposed_date), 'center');
    // VERIFICACIÓN
    poner(g('U'), a.verification_criteria || null);
    poner(g('V'), a.verification_finding || null);
    poner(g('Y'), fmt(a.verification_date), 'center');
    poner(g('Z'), fmt(a.efficacy_date), 'center');
    poner(g('AA'), a.closure_approved === 'SI' ? 'X' : null, 'center');
    poner(g('AB'), a.closure_approved === 'NO' ? 'X' : null, 'center');
    poner(g('AC'), a.auditor?.full_name || null, 'center');
  },
};

const LAYOUT_V1 = {
  hoja: 'v3', ultimaCol: 28, pie: 'AB', fusion: null,
  textos: ['J', 'N', 'O', 'T', 'U'],
  escribir: (g, a, getProcess) => {
    poner(g('A'), a.consecutive || null, 'center');
    poner(g('B'), fmt(a.date || a.created_at), 'center');
    poner(g('C'), getProcess(a.process_id) || null, 'center');
    poner(g('D'), X(a.origin_audit), 'center');
    poner(g('E'), X(a.origin_qrs), 'center');
    poner(g('F'), X(a.origin_satisfaction), 'center');
    poner(g('G'), X(a.origin_autocontrol), 'center');
    poner(g('H'), X(a.origin_risk_analysis), 'center');
    poner(g('I'), X(a.origin_nonconforming), 'center');
    poner(g('J'), a.finding_description || null);
    poner(g('K'), X(a.action_correction), 'center');
    poner(g('L'), X(a.action_corrective), 'center');
    poner(g('M'), X(a.action_improvement), 'center');
    poner(g('N'), lista(a.causes_whys) || a.causes || null);
    poner(g('O'), [a.correction_description, lista(a.corrective_actions) || a.action_description,
      a.improvement_description].filter(Boolean).join('\n') || null);
    poner(g('P'), a.expected_results || null);
    poner(g('Q'), a.resources_budget || null);
    poner(g('R'), nombre(a.responsible_name));
    poner(g('S'), fmt(a.proposed_date), 'center');
    poner(g('T'), a.verification_criteria || null);
    poner(g('U'), a.verification_finding || null);
    poner(g('X'), fmt(a.verification_date), 'center');
    poner(g('Y'), fmt(a.efficacy_date), 'center');
    poner(g('Z'),  a.closure_approved === 'SI' ? 'X' : null, 'center');
    poner(g('AA'), a.closure_approved === 'NO' ? 'X' : null, 'center');
    poner(g('AB'), a.auditor?.full_name || null, 'center');
  },
};

const colLetra = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

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

  const L = wb.getWorksheet(LAYOUT_V2.hoja) ? LAYOUT_V2
          : wb.getWorksheet(LAYOUT_V1.hoja) ? LAYOUT_V1
          : /PORQU/i.test(String(wb.worksheets[0]?.getCell('N8').value ?? '')) ? LAYOUT_V2 : LAYOUT_V1;
  const ws = wb.getWorksheet(L.hoja) || wb.worksheets[0];
  if (!ws) throw new Error(`No se encontró la hoja del formato ${formato.code}.`);
  if (L === LAYOUT_V1) {
    const h = ws.getCell('M8'); if (/PREVENT/i.test(String(h.value ?? ''))) h.value = 'DE MEJORA';
  }

  // Limpiar los ejemplos que trae el formato (solo valores, se conserva el estilo)
  for (let r = DATA_START_ROW; r < DATA_START_ROW + FILAS_FORMATO; r++)
    for (let c = 1; c <= L.ultimaCol; c++) ws.getRow(r).getCell(c).value = null;

  // Filas extra con el estilo de la primera fila de datos. La fila del pie
  // (fusionada A20:AB20) se separa para usarla como dato.
  const filaPie = DATA_START_ROW + FILAS_FORMATO;
  const hayExtra = acciones.length > FILAS_FORMATO;
  if (hayExtra) {
    try { ws.unMergeCells(`A${filaPie}:${L.pie}${filaPie}`); } catch { /* el formato ya no la trae */ }
  }
  for (let i = FILAS_FORMATO; i < acciones.length; i++) {
    const r = DATA_START_ROW + i;
    const src = ws.getRow(DATA_START_ROW), dst = ws.getRow(r);
    dst.height = src.height;
    for (let c = 1; c <= L.ultimaCol; c++) dst.getCell(c).style = clon(src.getCell(c).style);
    if (L.fusion) { try { ws.mergeCells(`${L.fusion[0]}${r}:${L.fusion[1]}${r}`); } catch { /* ya fusionada */ } }
  }

  acciones.forEach((a, i) => {
    const row = ws.getRow(DATA_START_ROW + i);
    L.escribir((c) => row.getCell(c), a, getProcess);
    row.height = altoFila(ws, row, L.textos, row.height);
    row.commit();
  });

  // Área de impresión: todo el registro
  const ultimaFila = Math.max(filaPie, DATA_START_ROW + acciones.length - 1);
  ws.pageSetup.printArea = `A1:${colLetra(L.ultimaCol)}${ultimaFila}`;

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato.code}_${sufijo}_${hoy}.xlsx`);
  return true;
};

export default exportAccionesMejora;
