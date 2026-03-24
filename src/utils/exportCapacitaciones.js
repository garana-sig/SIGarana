// src/utils/exportCapacitaciones.js
// ═══════════════════════════════════════════════════════════════════════
// Exportador Excel — Plan de Capacitaciones SST
// Mismo patrón que exportAccionesMejora.js
// Plantilla en Supabase Storage: templates/plantilla_capacitaciones.xlsx
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const MONTH_KEYS = [
  'month_jan','month_feb','month_mar','month_apr','month_may','month_jun',
  'month_jul','month_aug','month_sep','month_oct','month_nov','month_dec',
];
const DATA_START_ROW = 10; // Fila 10 en la plantilla (igual al Excel original)

const BORDER = {
  top:    { style: 'thin', color: { argb: 'FFA6B8C2' } },
  left:   { style: 'thin', color: { argb: 'FFA6B8C2' } },
  bottom: { style: 'thin', color: { argb: 'FFA6B8C2' } },
  right:  { style: 'thin', color: { argb: 'FFA6B8C2' } },
};

const FILL_ODD   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const FILL_EVEN  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9F5' } };
// Color de mes activo — verde menta Garana
const FILL_MONTH = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5244' } };

const fmtCurrency = (val) =>
  val ? `$ ${Number(val).toLocaleString('es-CO')}` : '-';

const fmtDate = (d) => {
  if (!d) return '-';
  const date = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
  return date.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
};

const styleCell = (cell, fill, hAlign = 'left', isMonthActive = false) => {
  cell.fill      = isMonthActive ? FILL_MONTH : fill;
  cell.font      = {
    name: 'Arial', size: 9,
    bold: isMonthActive,
    color: { argb: isMonthActive ? 'FFFFFFFF' : 'FF1F2937' },
  };
  cell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
  cell.border    = BORDER;
};

export const exportCapacitaciones = async (items, plan, filename) => {
  try {
    console.log('📊 Descargando plantilla capacitaciones...');

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download('RE-GH-03_PROGRAMA_DE_CAPACITACION.xlsx');

    if (downloadError || !fileData) {
      throw new Error(
        `No se pudo descargar la plantilla: ${downloadError?.message}. ` +
        'Verifica que "RE-GH-03_PROGRAMA_DE_CAPACITACION.xlsx" exista en el bucket "templates".'
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) throw new Error('No se encontró ninguna hoja en la plantilla.');

    // Actualizar año en encabezado
    ws.getCell('B7').value = `LISTA GENERAL DE CAPACITACIONES ${plan.year}`;

    // Limpiar filas de ejemplo
    for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    }

    // Escribir filas de datos
    items.forEach((item, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const fill   = idx % 2 === 0 ? FILL_ODD : FILL_EVEN;
      const row    = ws.getRow(rowNum);
      row.height   = 35;

      const set = (col, val, align = 'left', monthActive = false) => {
        const cell = row.getCell(col);
        cell.value = val ?? '';
        styleCell(cell, fill, align, monthActive);
      };

      // La plantilla empieza en col B (2) — no hay col A de número
      // B: Capacitación
      set(2,  item.title);
      // C: Objetivo
      set(3,  item.objective || '-');
      // D: Instructor
      set(4,  item.instructor || '-');
      // E: Participante
      set(5,  item.participants || '-');
      // F: Duración
      set(6,  item.duration || '-',        'center');
      // G: Recursos
      set(7,  item.resources || '-');
      // H: Presupuesto
      set(8,  fmtCurrency(item.budget),    'right');

      // Cols I–T: Meses (ENE=col 9 … DIC=col 20)
      // Celda activa → color verde Garana, texto "●" ; inactiva → vacía
      MONTH_KEYS.forEach((key, mi) => {
        const active = !!item[key];
        const cell = row.getCell(9 + mi);
        cell.value = active ? '●' : '';
        styleCell(cell, fill, 'center', active);
      });

      // Col U: Fecha ejecución
      set(21, fmtDate(item.execution_date), 'center');
      // Col V: Descripción ejecución
      set(22, item.execution_description || '-');
      // Col W: Evaluación (SI/NO)
      set(23, item.evaluation_done ? 'SI' : 'NO', 'center');

      row.commit();
    });

    // Fila de total presupuesto
    if (items.length > 0) {
      const totalRow = ws.getRow(DATA_START_ROW + items.length + 1);
      totalRow.height = 22;
      const labelCell = totalRow.getCell(7);
      labelCell.value = 'TOTAL PRESUPUESTO';
      labelCell.font  = { name: 'Arial', size: 9, bold: true };
      labelCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5244' } };
      labelCell.font  = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      labelCell.border = BORDER;

      const total = items.reduce((s, it) => s + (Number(it.budget) || 0), 0);
      const totalCell = totalRow.getCell(8);
      totalCell.value = `$ ${total.toLocaleString('es-CO')}`;
      totalCell.font  = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      totalCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5244' } };
      totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalCell.border = BORDER;
      totalRow.commit();
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const safeName = filename || `PlanCapacitaciones_${plan.year}`;
    saveAs(blob, `${safeName}.xlsx`);

    console.log('✅ Excel exportado correctamente');
    return true;
  } catch (err) {
    console.error('❌ Error exportando Plan de Capacitaciones:', err);
    throw err;
  }
};

export default exportCapacitaciones;