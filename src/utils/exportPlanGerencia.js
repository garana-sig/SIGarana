// src/utils/exportPlanGerencia.js
// ═══════════════════════════════════════════════════════════════════════
// Plan de trabajo anual de Gerencia sobre el formato vigente de Gestión
// Documental (formato_vinculado 'plan_gerencia' → hoy RE-DP-06 v01).
//
// Hoja 1 — fila 8 encabezados, datos desde la fila 9:
//   A Actividad · B Financiero · C Humanos · D Técnicos · E Presupuesto
//   F..Q Enero..Diciembre (1 = actividad planeada ese mes)
// Totales: E(presupuesto) · fila "Actividades planeadas" (suma) ·
// "Actividades ejecutadas" (meses marcados como ejecutados en la app) · % cumplimiento.
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';
import { MONTH_KEYS, parseMonthVal } from '@/hooks/useWorkPlan';

const DATA_START_ROW = 9;
const MESES = 'FGHIJKLMNOPQ'.split('');               // F = enero … Q = diciembre
const clon  = (st) => JSON.parse(JSON.stringify(st || {}));
const SOMBRA_MES = { type: 'pattern', pattern: 'solid', fgColor: { theme: 6, tint: -0.249977111117893 } };

// Fila de "ACTIVIDADES PLANEADAS" del formato (la busca por texto)
const buscarFila = (ws, texto) => {
  for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
    for (let c = 1; c <= 6; c++) {
      const v = ws.getRow(r).getCell(c).value;
      if (typeof v === 'string' && v.toUpperCase().includes(texto)) return r;
    }
  }
  return null;
};

export const exportPlanGerencia = async (items, plan, formato) => {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`El formato ${formato.code} no tiene hojas.`);

  let filaPlan = buscarFila(ws, 'ACTIVIDADES PLANEADAS');
  if (!filaPlan) throw new Error(`No se encontró la fila "ACTIVIDADES PLANEADAS" en ${formato.code}.`);
  // Filas de datos disponibles: desde la 9 hasta antes de la fila del total de presupuesto
  let filaTotalPpto = filaPlan - 1;                    // en el formato: E46 = SUM(...)
  let espacio = filaTotalPpto - DATA_START_ROW;        // filas libres para actividades

  // Si hay más actividades que filas, se insertan filas con el estilo de la primera
  const faltan = items.length - espacio;
  if (faltan > 0) {
    const merges = Object.keys(ws._merges || {}).map((k) => ws._merges[k].range || k);
    const moverDesde = filaTotalPpto;
    merges.forEach((m) => { try { ws.unMergeCells(m); } catch { /* */ } });
    ws.spliceRows(moverDesde, 0, ...Array.from({ length: faltan }, () => []));
    for (let i = 0; i < faltan; i++) {
      const dst = ws.getRow(moverDesde + i), src = ws.getRow(DATA_START_ROW);
      dst.height = src.height;
      for (let c = 1; c <= 17; c++) dst.getCell(c).style = clon(src.getCell(c).style);
    }
    const desplazar = (ref) => ref.replace(/([A-Z]+)(\d+)/g, (_, col, row) =>
      `${col}${Number(row) >= moverDesde ? Number(row) + faltan : row}`);
    merges.forEach((m) => { try { ws.mergeCells(desplazar(m)); } catch { /* */ } });
    filaPlan += faltan; filaTotalPpto += faltan; espacio += faltan;
  }

  // Limpiar los datos que trae el formato. El sombreado de los meses y los colores
  // de letra son del plan anterior: se dejan todas las filas con un estilo base limpio.
  const base = ws.getRow(DATA_START_ROW);
  const estiloBase = {
    A: clon(base.getCell('A').style), B: clon(base.getCell('B').style),
    E: clon(base.getCell('E').style), MES: clon(base.getCell('G').style),
  };
  if (estiloBase.E.font) delete estiloBase.E.font.color;
  delete estiloBase.MES.fill;
  for (let r = DATA_START_ROW; r < filaTotalPpto; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 17; c++) {
      const cell = row.getCell(c);
      cell.value = null;
      cell.style = clon(c === 1 ? estiloBase.A : c <= 4 ? estiloBase.B : c === 5 ? estiloBase.E : estiloBase.MES);
    }
  }

  const orden = [...items].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
  const ejecutadas = Array(12).fill(0);

  orden.forEach((it, i) => {
    const row = ws.getRow(DATA_START_ROW + i);
    row.getCell('A').value = it.activity || null;
    row.getCell('E').value = it.budget != null ? Number(it.budget) : null;
    MONTH_KEYS.forEach((k, m) => {
      const st = parseMonthVal(it[k] || '').s;
      if (st !== 'empty') {
        const cell = row.getCell(MESES[m]);
        cell.value = 1;
        cell.style = { ...clon(cell.style), fill: SOMBRA_MES };   // sombreado del formato = mes planeado
      }
      if (st === 'ejecutada') ejecutadas[m] += 1;
    });
    row.commit();
  });

  const ultima = filaTotalPpto - 1;
  ws.getCell(`E${filaTotalPpto}`).value = { formula: `SUM(E${DATA_START_ROW}:E${ultima})` };
  MESES.forEach((col, m) => {
    ws.getCell(`${col}${filaPlan}`).value     = { formula: `SUM(${col}${DATA_START_ROW}:${col}${ultima})` };
    ws.getCell(`${col}${filaPlan + 1}`).value = ejecutadas[m];
    ws.getCell(`${col}${filaPlan + 2}`).value = { formula: `IFERROR(${col}${filaPlan + 1}/${col}${filaPlan},"")` };
  });

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato?.code || 'RE-DP-06'}_Plan_Gerencia_${plan?.year || ''}_${hoy}.xlsx`);
  return true;
};

export default exportPlanGerencia;
