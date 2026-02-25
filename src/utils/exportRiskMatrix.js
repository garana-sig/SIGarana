// src/utils/exportRiskMatrix.js
// Exporta la Matriz de Riesgos al formato oficial RE-DP-05
// CORRECCIÓN: ExcelJS falla con shared formulas si limpiamos celdas.
// Solución: escribir valores estáticos directamente sobre las celdas
// (incluyendo las que tenían fórmulas → las reemplazamos con el resultado calculado)

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';
import { getImpactInfo, getProbabilityInfo, getRiskLevelInfo } from '@/hooks/useRiskMatrix';

const TEMPLATE_NAME = 'RE-DP-05_MATRIZ_DE_RIESGOS_DE_PROCESOS.xlsx';
const DATA_START_ROW = 12;

/** Hex #RRGGBB → ARGB FFRRGGBB que usa ExcelJS */
const toARGB = (hex) => 'FF' + hex.replace('#', '').toUpperCase();

/** Aplica fondo de color a una celda */
const setBg = (cell, hex) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: toARGB(hex) },
  };
};

/** Escribe un valor estático en una celda eliminando cualquier fórmula */
const setVal = (cell, value) => {
  // Al asignar directamente .value con un primitivo,
  // ExcelJS descarta la fórmula compartida y guarda el valor estático.
  cell.value = value ?? null;
};

/**
 * Exporta la lista de riesgos al formato RE-DP-05
 * @param {Array}  rows      Riesgos enriquecidos (con process_name, impact_info, etc.)
 * @param {string} filename  Nombre del archivo de salida (opcional)
 */
export async function exportRiskMatrix(rows, filename) {
  try {
    // ── 1. Descargar plantilla ────────────────────────────────────────────
    const { data: blob, error: storageError } = await supabase.storage
      .from('templates')
      .download(TEMPLATE_NAME);

    if (storageError) {
      throw new Error(
        `No se pudo descargar la plantilla "${TEMPLATE_NAME}". ` +
        `Verifica que esté en el bucket "templates". ` +
        `Error: ${storageError.message}`
      );
    }

    const arrayBuffer = await blob.arrayBuffer();

    // ── 2. Cargar en ExcelJS ──────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.getWorksheet('formato') || wb.worksheets[0];
    if (!ws) throw new Error('No se encontró la hoja "formato" en la plantilla.');

    // ── 3. Actualizar fecha ───────────────────────────────────────────────
    const today = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    try {
      const c = ws.getCell('M2');
      c.value = `FECHA:\n${today}`;
    } catch (_) { /* no crítico */ }

    // ── 4. Escribir datos fila por fila ───────────────────────────────────
    // NO limpiamos las filas antes — eso rompe las shared formulas.
    // Simplemente sobreescribimos celda por celda con valores estáticos.
    // ExcelJS elimina la fórmula al asignar un valor primitivo.

    rows.forEach((r, index) => {
      const rowNum   = DATA_START_ROW + index;
      const excelRow = ws.getRow(rowNum);

      const impactInfo  = getImpactInfo(r.impact_value);
      const probInfo    = getProbabilityInfo(r.probability_value);
      const levelInfo   = getRiskLevelInfo(r.impact_value, r.probability_value);

      // Col A — Proceso
      const cA = excelRow.getCell(1);
      setVal(cA, r.process_name || '');
      cA.font      = { bold: true, size: 9 };
      cA.alignment = { vertical: 'middle', wrapText: true };

      // Col B — Riesgo
      setVal(excelRow.getCell(2), r.risk_name || '');

      // Col C — Descripción
      setVal(excelRow.getCell(3), r.description || '');

      // Col D — Causa
      setVal(excelRow.getCell(4), r.cause || '');

      // Col E — Efecto
      setVal(excelRow.getCell(5), r.effect || '');

      // Col F — Impacto label (LEVE / MODERADO / CATASTROFICO)
      const cF = excelRow.getCell(6);
      setVal(cF, impactInfo.label !== '—' ? impactInfo.label : '');
      cF.alignment = { horizontal: 'center', vertical: 'middle' };
      cF.font      = { bold: true, size: 9, color: { argb: toARGB(impactInfo.color || '#1F2937') } };
      if (impactInfo.bg && impactInfo.bg !== '#f3f4f6') setBg(cF, impactInfo.bg);

      // Col G — Impacto valor (5 / 10 / 20)
      const cG = excelRow.getCell(7);
      setVal(cG, r.impact_value ? Number(r.impact_value) : null);
      cG.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col H — Probabilidad label (BAJA / MEDIO / ALTA)
      const cH = excelRow.getCell(8);
      setVal(cH, probInfo.label !== '—' ? probInfo.label : '');
      cH.alignment = { horizontal: 'center', vertical: 'middle' };
      cH.font      = { bold: true, size: 9, color: { argb: toARGB(probInfo.color || '#1F2937') } };
      if (probInfo.bg && probInfo.bg !== '#f3f4f6') setBg(cH, probInfo.bg);

      // Col I — Probabilidad valor (1 / 2 / 3)
      const cI = excelRow.getCell(9);
      setVal(cI, r.probability_value ? Number(r.probability_value) : null);
      cI.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col J — Evaluación (IxP)
      const cJ = excelRow.getCell(10);
      setVal(cJ, levelInfo.evaluation ?? null);
      cJ.alignment = { horizontal: 'center', vertical: 'middle' };
      cJ.font      = { bold: true, size: 9 };

      // Col K — Nivel de riesgo (ACEPTABLE / TOLERABLE / MODERADO / IMPORTANTE / INACEPTABLE)
      const cK = excelRow.getCell(11);
      setVal(cK, levelInfo.label !== '—' ? levelInfo.label : '');
      cK.alignment = { horizontal: 'center', vertical: 'middle' };
      cK.font      = { bold: true, size: 9, color: { argb: toARGB(levelInfo.color || '#1F2937') } };
      if (levelInfo.bg && levelInfo.bg !== '#f3f4f6') setBg(cK, levelInfo.bg);

      // Col L — Descripción de los controles
      setVal(excelRow.getCell(12), r.controls_description || '');

      // Col M — Opciones de manejo
      setVal(excelRow.getCell(13), r.management_option || '');

      // Col N — Acciones Preventivas
      setVal(excelRow.getCell(14), r.preventive_actions || '');

      // Altura de fila
      excelRow.height = 30;
      excelRow.commit();
    });

    // ── 5. Limpiar filas sobrantes del template (después de los datos) ────
    // Aquí SÍ podemos limpiar porque ya no hay shared formulas pendientes
    // (las sobreescribimos todas en el paso anterior).
    const lastDataRow  = DATA_START_ROW + rows.length - 1;
    const maxCleanRow  = DATA_START_ROW + 15; // límite razonable
    for (let i = lastDataRow + 1; i <= maxCleanRow; i++) {
      const row = ws.getRow(i);
      for (let col = 1; col <= 14; col++) {
        const cell = row.getCell(col);
        cell.value = null;
        cell.fill  = { type: 'pattern', pattern: 'none' };
      }
      row.commit();
    }

    // ── 6. Exportar ───────────────────────────────────────────────────────
    const buffer   = await wb.xlsx.writeBuffer();
    const fileBlob = new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const outName  = filename || `RE-DP-05_RIESGOS_${new Date().getFullYear()}.xlsx`;
    saveAs(fileBlob, outName);

    return { success: true };

  } catch (err) {
    console.error('❌ Error exportando Matriz de Riesgos:', err);
    return { success: false, error: err.message };
  }
}