// src/utils/exportWorkPlan.js
// ═══════════════════════════════════════════════════════════════════════
// Exportador Excel — Planes de Trabajo SST
// Reutilizable para: convivencia · copasst · bienestar
// Mismo patrón que exportAccionesMejora.js
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

// ─── Nombre de plantilla por tipo de plan ────────────────────────────
const TEMPLATE_FILES = {
  convivencia:          'RE-GS-32_PLAN_DE _TRABAJO_CONVIVENCIA.xlsx',
  copasst:              'RE-GS-32_PLAN_DE _TRABAJO_COPASST.xlsx',
  bienestar:            'RE-GS-32_PLAN_DE _TRABAJO_BIENESTAR.xlsx',
  sst:                  'RE-GS-32_PLAN_DE _TRABAJO_SST.xlsx',
  promocion_prevencion: 'RE-GS-32_PLAN_DE _TRABAJO_PROMOCION.xlsx',
  gerencia:             'RE-GS-32_PLAN_DE _TRABAJO_GERENCIA.xlsx',
};

// Títulos que van en la celda B6 de cada plantilla
const PLAN_TITLES = {
  convivencia:          'PROPUESTA PLAN DE TRABAJO COMITÉ DE CONVIVENCIA',
  copasst:              'PROPUESTA PLAN DE TRABAJO COPASST',
  bienestar:            'PROPUESTA PLAN DE TRABAJO BIENESTAR SOCIAL',
  sst:                  'PLAN DE TRABAJO DE SEGURIDAD Y SALUD EN EL TRABAJO',
  promocion_prevencion: 'PLAN DEL PROGRAMA DE PROMOCIÓN Y PREVENCIÓN',
  gerencia:             'PLAN DE TRABAJO — PLAN DE GERENCIA SST',
};

const MONTH_KEYS = [
  'month_jan','month_feb','month_mar','month_apr','month_may','month_jun',
  'month_jul','month_aug','month_sep','month_oct','month_nov','month_dec',
];

const DATA_START_ROW = 9;

// ─── Estilos ─────────────────────────────────────────────────────────
const BORDER = {
  top:    { style: 'thin', color: { argb: 'FFA6B8C2' } },
  left:   { style: 'thin', color: { argb: 'FFA6B8C2' } },
  bottom: { style: 'thin', color: { argb: 'FFA6B8C2' } },
  right:  { style: 'thin', color: { argb: 'FFA6B8C2' } },
};
const BORDER_DARK = {
  top:    { style: 'medium', color: { argb: 'FF2E5244' } },
  left:   { style: 'medium', color: { argb: 'FF2E5244' } },
  bottom: { style: 'medium', color: { argb: 'FF2E5244' } },
  right:  { style: 'medium', color: { argb: 'FF2E5244' } },
};

const FILL_ODD   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const FILL_EVEN  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9F5' } };
// Mes con valor → verde oscuro Garana
const FILL_MONTH = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5244' } };
// Filas trazabilidad
const FILL_GREEN  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // planeadas
const FILL_YELLOW = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; // ejecutadas
const FILL_ORANGE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }; // % cumplimiento
const FILL_TOTAL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // total presupuesto

const fmtCOP = (v) =>
  v ? `$ ${Number(v).toLocaleString('es-CO')}` : '$ -';

const styleData = (cell, fill, hAlign = 'left') => {
  cell.fill      = fill;
  cell.font      = { name: 'Arial', size: 9 };
  cell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
  cell.border    = BORDER;
};

const styleMonth = (cell, fill, value) => {
  const hasVal = value?.trim();
  cell.fill      = hasVal ? FILL_MONTH : fill;
  cell.font      = {
    name: 'Arial', size: 9, bold: !!hasVal,
    color: { argb: hasVal ? 'FFFFFFFF' : 'FF9CA3AF' },
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border    = BORDER;
  cell.value     = hasVal ? value.trim() : '';
};

// ═══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// @param {Array}  items        — filas de work_plan_item
// @param {Object} plan         — { year, plan_type }
// @param {Array}  trazabilidad — [{ planeadas, ejecutadas, pct }] x 12 meses
// ═══════════════════════════════════════════════════════════════════════
export const exportWorkPlan = async (items, plan, trazabilidad) => {
  try {
    const templateFile = TEMPLATE_FILES[plan.plan_type];
    if (!templateFile) throw new Error(`Tipo de plan desconocido: ${plan.plan_type}`);

    console.log(`📊 Descargando plantilla: ${templateFile}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download(templateFile);

    if (downloadError || !fileData) {
      throw new Error(
        `No se pudo descargar la plantilla: ${downloadError?.message}. ` +
        `Verifica que "${templateFile}" exista en el bucket "templates".`
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) throw new Error('No se encontró ninguna hoja en la plantilla.');

    // ── Actualizar encabezado ────────────────────────────────────────
    ws.getCell('B6').value = `${PLAN_TITLES[plan.plan_type]} ${plan.year}`;

    // ── Limpiar filas de datos y footer existentes ───────────────────
    // Primero deshacer todos los merges existentes desde fila 9 en adelante
    // para evitar "cannot merge already merged cells"
    const mergesToRemove = [];
    ws.mergeCells; // trigger load
    for (const merge of ws.model.merges || []) {
      const startRow = parseInt(merge.split(':')[0].replace(/[A-Z]/g, ''), 10);
      if (startRow >= DATA_START_ROW) mergesToRemove.push(merge);
    }
    mergesToRemove.forEach(m => { try { ws.unMergeCells(m); } catch(e) {} });

    for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
        cell.value  = null;
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.border = {};
      });
    }

    // ── Escribir ítems desde fila 9 ──────────────────────────────────
    items.forEach((item, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const fill   = idx % 2 === 0 ? FILL_ODD : FILL_EVEN;
      const row    = ws.getRow(rowNum);
      row.height   = 40;

      const set = (col, val, align = 'left') => {
        const cell = row.getCell(col);
        cell.value = val ?? '';
        styleData(cell, fill, align);
      };

      // B: Actividad
      set(2,  item.activity);
      // C: Responsable
      set(3,  item.responsible || '-');
      // D: Recursos
      set(4,  item.resources   || '-');
      // E: # Personas
      set(5,  item.num_persons ?? '', 'center');
      // F: Horas
      set(6,  item.hours       ?? '', 'center');
      // G: Presupuesto (sin precio unitario — así es el formato real)
      set(7,  fmtCOP(item.budget), 'right');

      // H–S: Meses (col 8 → 19)
      MONTH_KEYS.forEach((key, mi) => {
        styleMonth(row.getCell(8 + mi), fill, item[key] || '');
      });

      // T: Evidencia
      set(20, item.evidence_text || '', 'left');

      row.commit();
    });

    // ── Calcular posición del footer ─────────────────────────────────
    const lastDataRow   = DATA_START_ROW + items.length;
    const blankRow      = lastDataRow + 1;   // fila en blanco
    const totalRow      = blankRow    + 1;   // TOTAL PRESUPUESTO
    const trazTitle     = totalRow    + 2;   // TRAZABILIDAD (título)
    const headerRow     = trazTitle   + 1;   // meses encabezado
    const planeadasRow  = headerRow   + 1;
    const ejecutadasRow = headerRow   + 2;
    const pctRow        = headerRow   + 3;

    // ── Fila TOTAL PRESUPUESTO ────────────────────────────────────────
    const trw = ws.getRow(totalRow);
    trw.height = 22;

    // Celdas B-C: "REALIZADO POR"
    const realizadoCell = trw.getCell(2);
    realizadoCell.value = 'REALIZADO POR:';
    realizadoCell.font  = { name: 'Arial', size: 9, bold: true };
    realizadoCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Celdas D-F: "TOTAL PRESUPUESTO"
    const labelCell = trw.getCell(4);
    labelCell.value     = 'TOTAL PRESUPUESTO';
    labelCell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF92400E' } };
    labelCell.fill      = FILL_TOTAL;
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    labelCell.border    = BORDER_DARK;
    ws.mergeCells(`D${totalRow}:F${totalRow}`);

    // Celda G: valor total (col 7 — igual que en el formato)
    const total = items.reduce((s, it) => s + (Number(it.budget) || 0), 0);
    const totalCell = trw.getCell(7);
    totalCell.value     = fmtCOP(total);
    totalCell.font      = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF92400E' } };
    totalCell.fill      = FILL_TOTAL;
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalCell.border    = BORDER_DARK;
    trw.commit();

    // ── Título TRAZABILIDAD ───────────────────────────────────────────
    const trazTitleRow = ws.getRow(trazTitle);
    trazTitleRow.height = 18;
    const trazLabelCell = trazTitleRow.getCell(4);
    trazLabelCell.value = 'TRAZABILIDAD DE LA EJECUCION DE LAS ACTIVIDADES';
    trazLabelCell.font  = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } };
    trazLabelCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    trazLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    trazLabelCell.border = BORDER;
    ws.mergeCells(`D${trazTitle}:T${trazTitle}`);
    trazTitleRow.commit();

    // ── Encabezado meses trazabilidad ────────────────────────────────
    const MONTHS_SHORT = ['EN','FE','MA','AB','MA','JU','JL','AG','SE','OC','NO','DI'];
    const hRow = ws.getRow(headerRow);
    hRow.height = 16;
    MONTHS_SHORT.forEach((m, i) => {
      const cell = hRow.getCell(8 + i);  // H=8 igual que datos
      cell.value     = m;
      cell.font      = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF374151' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      cell.border    = BORDER;
    });
    hRow.commit();

    // ── Helper para escribir filas de trazabilidad ────────────────────
    const writeTrazRow = (rowNum, label, values, fillStyle, textColor) => {
      const row = ws.getRow(rowNum);
      row.height = 18;

      // Etiqueta D-H
      const labelC = row.getCell(4);
      labelC.value     = label;
      labelC.font      = { name: 'Arial', size: 9, bold: true, color: { argb: textColor } };
      labelC.fill      = fillStyle;
      labelC.alignment = { horizontal: 'center', vertical: 'middle' };
      labelC.border    = BORDER;
      ws.mergeCells(`D${rowNum}:H${rowNum}`);

      // Valores H-S (col 8→19, igual que datos)
      values.forEach((val, i) => {
        const cell = row.getCell(8 + i);
        cell.value     = val || '';
        cell.font      = { name: 'Arial', size: 9, bold: !!val, color: { argb: textColor } };
        cell.fill      = fillStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = BORDER;
      });
      row.commit();
    };

    // Actividades planeadas
    writeTrazRow(
      planeadasRow,
      'ACTIVIDADES PLANEADAS',
      trazabilidad.map(t => t.planeadas > 0 ? t.planeadas : ''),
      FILL_GREEN,
      'FF166534'
    );

    // Actividades ejecutadas
    writeTrazRow(
      ejecutadasRow,
      'ACTIVIDADES EJECUTADAS',
      trazabilidad.map(t => t.ejecutadas > 0 ? t.ejecutadas : ''),
      FILL_YELLOW,
      'FF92400E'
    );

    // Porcentaje de cumplimiento
    writeTrazRow(
      pctRow,
      'PORCENTAJE DE CUMPLIMIENTO',
      trazabilidad.map(t => t.planeadas > 0 ? `${t.pct}%` : ''),
      FILL_ORANGE,
      'FF9A3412'
    );

    // ── Exportar ─────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const today = new Date().toLocaleDateString('es-CO', {
      day:'2-digit', month:'2-digit', year:'numeric',
    }).replace(/\//g, '-');

    saveAs(blob, `Plan_${plan.plan_type}_${plan.year}_${today}.xlsx`);

    console.log('✅ Excel exportado correctamente');
    return true;

  } catch (err) {
    console.error('❌ Error exportando plan de trabajo:', err);
    throw err;
  }
};

export default exportWorkPlan;
