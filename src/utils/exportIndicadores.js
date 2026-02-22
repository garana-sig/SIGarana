// src/utils/exportIndicadores.js
// Descarga el template RE-DP-02 desde Supabase Storage,
// lo llena con los indicadores activos y lo descarga al usuario.
// Patrón idéntico a exportAccionesMejora.

import ExcelJS   from 'exceljs';
import { supabase } from '@/lib/supabase';
import { FREQUENCIES, PERSPECTIVES } from '@/hooks/useIndicadores';

// ── Helpers ───────────────────────────────────────────────────────────
const perspLabel = (v) => PERSPECTIVES.find(p => p.value === v)?.label || '';
const freqLabel  = (v) => FREQUENCIES.find(f => f.value === v)?.label  || v || '';

// ── Copiar estilo de una celda origen a una celda destino ─────────────
const copyStyle = (src, dst) => {
  try {
    if (src.font)      dst.font      = { ...src.font };
    if (src.fill)      dst.fill      = { ...src.fill };
    if (src.border)    dst.border    = { ...src.border };
    if (src.alignment) dst.alignment = { ...src.alignment, wrapText: true };
    if (src.numFmt)    dst.numFmt    = src.numFmt;
  } catch { /* ignore style errors */ }
};

// ── Ruta del template en Storage ─────────────────────────────────────
// Sube el archivo RE-DP-02_CUADRO_DE_MANDO_INTEGRAL.xlsx al bucket
// 'templates' con la ruta: plantillas/RE-DP-02_CUADRO_DE_MANDO_INTEGRAL.xlsx
const TEMPLATE_PATH   = 'plantillas/RE-DP-02_CUADRO_DE_MANDO_INTEGRAL.xlsx';
const TEMPLATE_BUCKET = 'templates';

// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export const exportIndicadores = async (indicators = []) => {

  // 1️⃣ Descargar template desde Storage
  const { data: fileBlob, error: dlError } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .download(TEMPLATE_PATH);

  if (dlError || !fileBlob) {
    throw new Error(`No se pudo descargar el template: ${dlError?.message || 'archivo no encontrado'}`);
  }

  // 2️⃣ Convertir Blob → ArrayBuffer → ExcelJS
  const arrayBuffer = await fileBlob.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  const ws = wb.getWorksheet('V1') || wb.worksheets[0];

  // 3️⃣ Actualizar fecha de realización (A7)
  const today = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
  ws.getCell('A7').value = `Fecha de realización: ${today}`;

  // ══════════════════════════════════════════════════════════════════
  // SECCIÓN BSC — filas 10 a 20 (11 filas disponibles)
  // Si hay más de 11 indicadores BSC, se insertan filas extra
  // ══════════════════════════════════════════════════════════════════
  const bscRows  = indicators.filter(i => i.indicator_type === 'bsc');
  const procRows = indicators.filter(i => i.indicator_type === 'process');

  // Fila de referencia de estilo para BSC (fila 10 del template vacío)
  const BSC_START = 10;
  const BSC_END   = 20;   // Última fila BSC del template

  // Limpiar y llenar filas BSC
  for (let i = 0; i < 11; i++) {
    const rowNum = BSC_START + i;
    const ind    = bscRows[i] || null;
    const row    = ws.getRow(rowNum);

    const values = ind ? [
      ind.strategic_initiative || '',
      ind.objective            || '',
      perspLabel(ind.perspective),
      ind.indicator_subtype    || '',
      ind.indicator_name       || '',
      ind.formula_expression
        ? `${ind.formula || ''}\n[${ind.formula_expression}]`.trim()
        : (ind.formula           || ''),
      ind.process_name          || '',
      ind.responsible_name      || '',
      freqLabel(ind.frequency),
      ind.definition            || '',
      ind.goal                  || '',
      ind.disclosed_to          || '',
    ] : Array(12).fill('');

    values.forEach((v, c) => {
      const cell     = row.getCell(c + 1);
      cell.value     = v;
      cell.alignment = { wrapText: true, vertical: 'middle',
        horizontal: c === 0 ? 'left' : 'center' };
    });

    row.height = ind ? 30 : 18;
  }

  // Si hay más de 11 BSC — aviso en consola (raro, pero posible)
  if (bscRows.length > 11) {
    console.warn(`⚠️ El template solo tiene 11 filas BSC, hay ${bscRows.length} indicadores. Las últimas ${bscRows.length - 11} no se incluirán.`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECCIÓN PROCESO — filas 23 a 40 (18 filas disponibles)
  // ══════════════════════════════════════════════════════════════════
  const PROC_START = 23;

  for (let i = 0; i < 18; i++) {
    const rowNum = PROC_START + i;
    const ind    = procRows[i] || null;
    const row    = ws.getRow(rowNum);

    const values = ind ? [
      ind.strategic_initiative || '',  // A:C mergeado en template
      '', '',                           // B, C (mergeados)
      ind.indicator_subtype    || '',
      ind.indicator_name       || '',
      ind.formula_expression
        ? `${ind.formula || ''}\n[${ind.formula_expression}]`.trim()
        : (ind.formula           || ''),
      ind.process_name          || '',
      ind.responsible_name      || '',
      freqLabel(ind.frequency),
      ind.definition            || '',
      ind.goal                  || '',
      ind.disclosed_to          || '',
    ] : Array(12).fill('');

    values.forEach((v, c) => {
      if (c === 1 || c === 2) return; // B y C mergeados
      const cell     = row.getCell(c + 1);
      cell.value     = v;
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
    });

    row.height = ind ? 30 : 18;
  }

  if (procRows.length > 18) {
    console.warn(`⚠️ El template solo tiene 18 filas Proceso, hay ${procRows.length} indicadores.`);
  }

  // 4️⃣ Generar buffer y descargar
  const year   = new Date().getFullYear();
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `RE-DP-02_CMI_${year}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};