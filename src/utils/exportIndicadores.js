// src/utils/exportIndicadores.js
// Patrón idéntico a exportAccionesMejora:
// 1. Descarga plantilla desde Storage (bucket 'templates')
// 2. Carga con ExcelJS
// 3. Actualiza fecha, escribe datos
// 4. Exporta con saveAs (file-saver)
//
// 🆕 v2 (plantilla con columna RESULTADO):
//   - Columnas: A..J igual | K = RESULTADO | L = META | M = A QUIÉN SE DIVULGA
//   - RESULTADO = última medición (valor, unidad y período)
//   - Si hay más indicadores que filas en la plantilla, se insertan filas
//     con el mismo formato (antes se cortaba en 11 BSC / 18 proceso)
//   - Se separan las celdas combinadas de la columna G en las filas de datos
//     (antes escondían el proceso de algunos indicadores)

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';
import { FREQUENCIES, PERSPECTIVES } from '@/hooks/useIndicadores';

const perspLabel = (v) => PERSPECTIVES.find(p => p.value === v)?.label || '';
const freqLabel  = (v) => FREQUENCIES.find(f => f.value === v)?.label  || v || '';

const formulaText = (ind) => {
  if (!ind.formula_expression) return ind.formula || '';
  return ind.formula
    ? `${ind.formula}\n[${ind.formula_expression}]`
    : `[${ind.formula_expression}]`;
};

// ─── Estructura de la plantilla RE-DP-02 ─────────────────────────────────────
const BSC_FIRST_ROW  = 10; // primera fila de datos BSC
const BSC_SLOTS      = 11; // filas 10–20
const PROC_HEADER_GAP = 3; // fila 21 (título) + fila 22 (encabezados) → datos en 23
const PROC_SLOTS     = 18; // filas 23–40
const LAST_COL       = 13; // columna M

// ─── Formato del RESULTADO ───────────────────────────────────────────────────
const formatNumber = (v) =>
  Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 });

const resultText = (m) => {
  if (!m || m.measured_value === null || m.measured_value === undefined) return 'Sin medición';
  const unit = (m.unit || '').trim();
  const num  = formatNumber(m.measured_value);
  const value = unit === '%' ? `${num}%` : unit ? `${num} ${unit}` : num;
  const period = (m.period_label || '').trim();
  return period ? `${value} (${period})` : value;
};

// Última medición por indicador (con unidad), ordenada por fecha y creación
const fetchLastMeasurements = async (indicatorIds) => {
  if (!indicatorIds.length) return {};
  const { data, error } = await supabase
    .from('indicator_measurement')
    .select('indicator_id, measured_value, unit, period_label, measurement_date, created_at')
    .in('indicator_id', indicatorIds);

  if (error) {
    console.warn('⚠️ No se pudieron cargar mediciones para el Excel:', error.message);
    return {};
  }

  const sorted = [...(data || [])].sort((a, b) => {
    const d = new Date(b.measurement_date) - new Date(a.measurement_date);
    if (d !== 0) return d;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const last = {};
  sorted.forEach(m => { if (!last[m.indicator_id]) last[m.indicator_id] = m; });
  return last;
};

// ─── Utilidades de filas / celdas combinadas ─────────────────────────────────
// "G23" → { row: 23, col: 7 }
const decodeCell = (addr) => {
  const m = /^([A-Z]+)(\d+)$/.exec(addr.replace(/\$/g, ''));
  const col = m[1].split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
  return { row: parseInt(m[2], 10), col };
};

// "G23:G25" → { top, left, bottom, right }
const parseRange = (range) => {
  const [a, b] = range.split(':');
  const ca = decodeCell(a), cb = decodeCell(b || a);
  return { top: ca.row, left: ca.col, bottom: cb.row, right: cb.col };
};

const getMerges = (ws) => (ws.model.merges || []).map(r => ({ range: r, ...parseRange(r) }));

// Separa las celdas combinadas de la columna G (7) dentro de un rango de filas
const unmergeColumnG = (ws, fromRow, toRow) => {
  getMerges(ws)
    .filter(m => m.left === 7 && m.right === 7 && m.top >= fromRow && m.bottom <= toRow)
    .forEach(m => ws.unMergeCells(m.range));
};

// Copia formato (no valores) de una fila modelo a otra
const copyRowStyle = (ws, fromRowNum, toRowNum) => {
  const from = ws.getRow(fromRowNum);
  const to   = ws.getRow(toRowNum);
  for (let c = 1; c <= LAST_COL; c++) {
    to.getCell(c).style = JSON.parse(JSON.stringify(from.getCell(c).style || {}));
  }
  to.height = from.height;
};

/**
 * Inserta `count` filas ANTES de `atRow`, copiando el formato de la fila
 * anterior (atRow - 1). Las celdas combinadas desde atRow hacia abajo se
 * separan y se vuelven a combinar desplazadas (ExcelJS no las mueve solo).
 */
const insertRows = (ws, atRow, count) => {
  if (count <= 0) return;

  const below = getMerges(ws).filter(m => m.top >= atRow);
  below.forEach(m => ws.unMergeCells(m.range));

  ws.spliceRows(atRow, 0, ...Array.from({ length: count }, () => []));

  for (let i = 0; i < count; i++) copyRowStyle(ws, atRow - 1, atRow + i);

  below.forEach(m => ws.mergeCells(m.top + count, m.left, m.bottom + count, m.right));
};

// ─── Exportar ────────────────────────────────────────────────────────────────
export const exportIndicadores = async (indicators = []) => {

  // 1️⃣ Descargar plantilla desde Storage (mismo patrón que AccionesMejora)
  const { data: fileData, error: dlError } = await supabase.storage
    .from('templates')
    .download('RE-DP-02_CUADRO_DE_MANDO_INTEGRAL.xlsx');

  if (dlError || !fileData) {
    throw new Error(`Error descargando plantilla: ${dlError?.message || 'archivo no encontrado'}`);
  }

  // 2️⃣ Cargar en ExcelJS
  const arrayBuffer = await fileData.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  const ws = wb.getWorksheet('V1') || wb.worksheets[0];

  // 3️⃣ Actualizar fecha
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  ws.getCell('A7').value = `Fecha de realización: ${hoy}`;

  const bscRows  = indicators.filter(i => i.indicator_type === 'bsc');
  const procRows = indicators.filter(i => i.indicator_type === 'process');

  // 🆕 Última medición de cada indicador (para RESULTADO)
  const lastByInd = await fetchLastMeasurements(indicators.map(i => i.id).filter(Boolean));
  const lastOf = (ind) => lastByInd[ind.id] || (
    ind.last_measurement_value !== null && ind.last_measurement_value !== undefined
      ? { measured_value: ind.last_measurement_value, period_label: ind.last_period_label, unit: '' }
      : null
  );

  // 4️⃣ Preparar filas — separar G combinadas y agregar filas si hacen falta
  const bscLast  = BSC_FIRST_ROW + BSC_SLOTS - 1;               // 20
  const procFirstOriginal = bscLast + PROC_HEADER_GAP;          // 23
  const procLastOriginal  = procFirstOriginal + PROC_SLOTS - 1; // 40

  unmergeColumnG(ws, BSC_FIRST_ROW, bscLast);
  unmergeColumnG(ws, procFirstOriginal, procLastOriginal);

  // BSC: insertar antes de la última fila (conserva el borde inferior)
  const bscExtra = Math.max(0, bscRows.length - BSC_SLOTS);
  insertRows(ws, bscLast, bscExtra);

  const procFirst = procFirstOriginal + bscExtra;
  const procLast  = procLastOriginal  + bscExtra;

  // Proceso: insertar antes de la última fila y combinar A:C en las nuevas
  const procExtra = Math.max(0, procRows.length - PROC_SLOTS);
  insertRows(ws, procLast, procExtra);
  for (let i = 0; i < procExtra; i++) {
    ws.mergeCells(procLast + i, 1, procLast + i, 3);
  }

  // 5️⃣ Sección BSC
  bscRows.forEach((ind, i) => {
    const row = ws.getRow(BSC_FIRST_ROW + i);
    row.getCell(1).value  = ind.strategic_initiative || '';
    row.getCell(2).value  = ind.objective            || '';
    row.getCell(3).value  = perspLabel(ind.perspective);
    row.getCell(4).value  = ind.indicator_subtype    || '';
    row.getCell(5).value  = ind.indicator_name       || '';
    row.getCell(6).value  = formulaText(ind);
    row.getCell(7).value  = ind.process_name         || '';
    row.getCell(8).value  = ind.responsible_name     || '';
    row.getCell(9).value  = freqLabel(ind.frequency);
    row.getCell(10).value = ind.definition           || '';
    row.getCell(11).value = resultText(lastOf(ind));   // 🆕 K = RESULTADO
    row.getCell(12).value = ind.goal                 || ''; // L = META
    row.getCell(13).value = ind.disclosed_to         || ''; // M = A QUIÉN SE DIVULGA
    row.height = 30;
  });

  // 6️⃣ Sección Proceso
  procRows.forEach((ind, i) => {
    const row = ws.getRow(procFirst + i);
    row.getCell(1).value  = ind.strategic_initiative || ''; // A:C mergeadas
    row.getCell(4).value  = ind.indicator_subtype    || '';
    row.getCell(5).value  = ind.indicator_name       || '';
    row.getCell(6).value  = formulaText(ind);
    row.getCell(7).value  = ind.process_name         || '';
    row.getCell(8).value  = ind.responsible_name     || '';
    row.getCell(9).value  = freqLabel(ind.frequency);
    row.getCell(10).value = ind.definition           || '';
    row.getCell(11).value = resultText(lastOf(ind));   // 🆕 K = RESULTADO
    row.getCell(12).value = ind.goal                 || ''; // L = META
    row.getCell(13).value = ind.disclosed_to         || ''; // M = A QUIÉN SE DIVULGA
    row.height = 30;
  });

  // 7️⃣ Exportar con saveAs (igual que AccionesMejora)
  const year   = new Date().getFullYear();
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `RE-DP-02_CMI_${year}.xlsx`
  );
};