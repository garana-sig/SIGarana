// src/utils/exportIndicadores.js
// Patrón idéntico a exportAccionesMejora:
// 1. Descarga plantilla desde Storage (bucket 'templates')
// 2. Carga con ExcelJS
// 3. Actualiza fecha, limpia filas ejemplo, escribe datos
// 4. Exporta con saveAs (file-saver)

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

  // 3️⃣ Actualizar fecha (celda A7, igual que AccionesMejora actualiza P3)
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  ws.getCell('A7').value = `Fecha de realización: ${hoy}`;

  const bscRows  = indicators.filter(i => i.indicator_type === 'bsc');
  const procRows = indicators.filter(i => i.indicator_type === 'process');

  // 4️⃣ Sección BSC — limpiar filas 10–20 y escribir datos
  for (let i = 0; i < 11; i++) {
    const row = ws.getRow(10 + i);
    const ind = bscRows[i];
    if (!ind) continue;

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
    row.getCell(11).value = ind.goal                 || '';
    row.getCell(12).value = ind.disclosed_to         || '';
    row.height = 30;
  }

  // 5️⃣ Sección Proceso — limpiar filas 23–40 y escribir datos
  for (let i = 0; i < 18; i++) {
    const row = ws.getRow(23 + i);
    const ind = procRows[i];
    if (!ind) continue;

    row.getCell(1).value  = ind.strategic_initiative || ''; // A:C mergeadas
    row.getCell(4).value  = ind.indicator_subtype    || '';
    row.getCell(5).value  = ind.indicator_name       || '';
    row.getCell(6).value  = formulaText(ind);
    row.getCell(7).value  = ind.process_name         || '';
    row.getCell(8).value  = ind.responsible_name     || '';
    row.getCell(9).value  = freqLabel(ind.frequency);
    row.getCell(10).value = ind.definition           || '';
    row.getCell(11).value = ind.goal                 || '';
    row.getCell(12).value = ind.disclosed_to         || '';
    row.height = 30;
  }

  // 6️⃣ Exportar con saveAs (igual que AccionesMejora)
  const year   = new Date().getFullYear();
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `RE-DP-02_CMI_${year}.xlsx`
  );
};