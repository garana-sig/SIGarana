// src/utils/exportListadoMaestro.js
// ═══════════════════════════════════════════════════════════════════════
// Exportador Excel — LISTADO MAESTRO DE DOCUMENTOS (RE-DP-11)
// Mismo patrón que exportPNC.js / exportHojaVidaEquipo.js:
// plantilla del bucket `templates` + ExcelJS + file-saver.
//
// Estructura verificada de la hoja "LISTADO MAESTRO":
//   B7          "Fecha de actualizacion:" → se llena con la fecha de descarga
//   Filas 8-10  Encabezados (grupos + columnas)
//   Datos desde la fila 11, columnas B..R:
//     B CODIGO · C NOMBRE · D VERSION · E FECHA DE CREACION · F RESPONSABLE
//     G ALMACENAMIENTO · H CENTRAL · I GESTION · J MAGNETICO · K FISICO
//     L SELECCIÓN · M CONSERVACION TOTAL · N ELIMINACION
//     O VERSION ACTUAL · P VERSION NUEVA · Q FECHA DE CAMBIO · R MOTIVO
//
// Agrupación: FILA SEPARADORA por proceso (B:R combinadas) — no se
// agregan columnas, así el formato oficial no cambia.
//
// Reglas de datos:
//   - v01  → E = fecha del documento; control de cambios vacío.
//   - v02+ → E vacía; O = versión anterior, P = vigente, Q = fecha, R = motivo.
//   - Gestión (retention_management) = años, igual que Central (oct 2026).
//   - Fechas date-only tomadas tal cual (sin desfase de zona horaria).
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

export const TEMPLATE_FILE = 'RE-DP-11_LISTADO_MAESTRO_DE_DOCUMENTOS.xlsx';
const SHEET_NAME = 'LISTADO MAESTRO';
const DATA_START = 11;
const COL_B = 2;   // primera columna de datos
const COL_R = 18;  // última columna de datos

const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const BOX  = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const FILL_PROCESO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

// ExcelJS comparte el mismo objeto de estilo entre celdas que venían con el
// mismo formato en la plantilla: hay que clonarlo antes de modificarlo.
function own(cell) {
  cell.style = JSON.parse(JSON.stringify(cell.style || {}));
  return cell;
}

// dd/mm/aa: las columnas de fecha de la plantilla son angostas (E ≈ 7)
const fmtFecha = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y.slice(2)}` : '';
};
const v2 = (n) => String(n).padStart(2, '0');
const X = (b) => (b ? 'X' : '');

function hoyCO() {
  const d = new Date();
  return `${v2(d.getDate())}/${v2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Altura según el texto más largo de las columnas que ajustan línea
// (caracteres por línea ≈ ancho de la columna en la plantilla, letra 9)
const CAPACIDAD = { 3: 20, 6: 12, 7: 14, 18: 13 }; // C, F, G, R
function alturaFila(valores) {
  let lineas = 1;
  Object.entries(CAPACIDAD).forEach(([col, cap]) => {
    const txt = String(valores[Number(col) - COL_B] ?? '');
    if (!txt) return;
    // cuenta por palabras para aproximar el salto de línea real
    let l = 1, actual = 0;
    txt.split(/\s+/).forEach((w) => {
      const n = w.length;
      if (actual === 0) actual = n;
      else if (actual + 1 + n <= cap) actual += 1 + n;
      else { l++; actual = n; }
      while (actual > cap) { l++; actual -= cap; }
    });
    lineas = Math.max(lineas, l);
  });
  return Math.min(12.5 * lineas + 5, 90);
}

// ── Rellena el workbook (separado de la descarga para poder probarlo) ──
export function fillListadoMaestro(wb, { documentos, procesos = [] }) {
  const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];

  // Fecha de actualización
  const b7 = own(ws.getCell('B7'));
  b7.value = `Fecha de actualizacion: ${hoyCO()}`;

  // La plantilla trae B30:R30 fusionada (renglón libre) → se libera para escribir
  try { ws.unMergeCells('B30:R30'); } catch { /* no estaba fusionada */ }

  // Limpiar renglones de ejemplo de la plantilla
  for (let r = DATA_START; r <= Math.max(ws.rowCount, 30); r++) {
    for (let c = COL_B; c <= COL_R; c++) ws.getCell(r, c).value = null;
  }

  // Fuente base de la plantilla (fila 11)
  const fuente = { ...(ws.getCell(DATA_START, COL_B).font || {}), size: 9 };

  // ── Agrupar por proceso, en el orden de la tabla `process` ──
  const orden = new Map(procesos.map((p, i) => [p.name, i]));
  const grupos = {};
  documentos.forEach((d) => {
    const key = d.process?.name || 'Sin proceso';
    (grupos[key] = grupos[key] || []).push(d);
  });
  const nombresProceso = Object.keys(grupos).sort((a, b) =>
    (orden.has(a) ? orden.get(a) : 999) - (orden.has(b) ? orden.get(b) : 999) || a.localeCompare(b, 'es'));

  let row = DATA_START;

  nombresProceso.forEach((proc) => {
    const docs = grupos[proc].sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
    // Código del proceso: de la tabla si viene; si no, del código del documento (GU-DP-01 → DP)
    const codigoProc = docs[0]?.process?.code || (docs[0]?.code || '').split('-')[1];

    // ── Fila separadora del proceso ──
    ws.mergeCells(row, COL_B, row, COL_R);
    const sep = own(ws.getCell(row, COL_B));
    sep.value = `${proc.toUpperCase()}${codigoProc ? ` (${codigoProc})` : ''}  ·  ${docs.length} documento${docs.length === 1 ? '' : 's'}`;
    sep.font = { ...fuente, size: 10, bold: true, color: { argb: 'FF2E5244' } };
    sep.fill = FILL_PROCESO;
    sep.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = COL_B; c <= COL_R; c++) own(ws.getCell(row, c)).border = BOX;
    ws.getRow(row).height = 18;
    row++;

    // ── Documentos del proceso ──
    docs.forEach((d) => {
      const ver = Number(d.version || 1);
      const cambio = ver > 1;
      const valores = [
        d.code,                                       // B
        (d.name || '').trim().toUpperCase(),          // C (nombres en mayúscula)
        v2(ver),                                      // D
        cambio ? '' : fmtFecha(d.change_date),        // E fecha de creación
        d.responsible || '',                          // F
        d.storage_location || '',                     // G
        d.retention_central ?? '',                    // H central (años)
        d.retention_management ?? '',                 // I gestión (años)
        X(d.file_type_magnetic),                      // J
        X(d.file_type_physical),                      // K
        X(d.disposition_selection),                   // L
        X(d.disposition_total_conservation),          // M
        X(d.disposition_elimination),                 // N
        cambio ? v2(ver - 1) : '',                    // O versión actual (anterior)
        cambio ? v2(ver) : '',                        // P versión nueva (vigente)
        cambio ? fmtFecha(d.change_date) : '',        // Q fecha de cambio
        cambio ? (d.change_reason || '') : '',        // R motivo
      ];
      valores.forEach((v, i) => {
        const col = COL_B + i;
        const cell = own(ws.getCell(row, col));
        cell.value = v;
        cell.font = fuente;
        cell.border = BOX;
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 4, 5, 16].includes(i) ? 'left' : 'center', // C, F, G, R a la izquierda
          wrapText: true,
        };
      });
      ws.getRow(row).height = alturaFila(valores);
      row++;
    });
  });

  // Impresión: horizontal, 1 página de ancho, encabezados repetidos en cada hoja
  ws.pageSetup = {
    ...ws.pageSetup,
    orientation: 'landscape',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printArea: `A1:R${row - 1}`,
    printTitlesRow: '8:10',
  };

  return { filas: row - DATA_START, procesos: nombresProceso.length };
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// @param {Array} documentos — documentos a exportar (ya filtrados en pantalla)
//                             con process { name, code }
// @param {Array} procesos   — lista de procesos (para el orden de los grupos)
// ═══════════════════════════════════════════════════════════════════════
export async function exportListadoMaestro({ documentos, procesos = [] }) {
  if (!documentos?.length) throw new Error('No hay documentos para exportar.');

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('templates')
    .download(TEMPLATE_FILE);

  if (downloadError || !fileData) {
    throw new Error(
      `No se pudo descargar la plantilla: ${downloadError?.message || 'archivo no encontrado'}. ` +
      `Verifica que "${TEMPLATE_FILE}" exista en el bucket "templates".`
    );
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await fileData.arrayBuffer());

  fillListadoMaestro(wb, { documentos, procesos });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `RE-DP-11_LISTADO_MAESTRO_${hoyCO().replace(/\//g, '-')}.xlsx`);
  return true;
}