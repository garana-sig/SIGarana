// src/utils/exportPNC.js
// ═══════════════════════════════════════════════════════════════════════
// v4 (oct 2026) — Exporta sobre el formato vigente de Gestión Documental
// (formato_vinculado 'registro_pnc' → hoy RE-GP-13 v02). El código, la
// versión y la fecha del encabezado vienen en el mismo archivo del Listado
// Maestro, así que si suben una versión nueva la app la toma sola.
//
// Hoja "v1" — fila 4 grupos, fila 5 columnas, datos desde la fila 6:
//   A N° · B REF · C FECHA REPORTE · D:H PRODUCTO NO CONFORME · I TOTAL
//   J MÓDULO · K OPERACIÓN · L INSUMO · M CORTE · N SUBLIMACIÓN · O REVISIÓN (X)
//   P FECHA · Q DESCRIPCIÓN · R RESPONSABLE              (TRATAMIENTO)
//   S CORRECCIÓN · T RECLASIFICACIÓN · U CONCESIÓN (X)    (CLASIFICACIÓN)
//   V FECHA · W:X RESPONSABLE                             (VERIFICACIÓN)
// C3 = "MES: …   PROCESO: …"
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';
import { MESES } from '@/hooks/usePNC';

const SHEET_NAME = 'v1';
const DATA_START_ROW = 6;
const PLANTILLA_FILAS = 35;              // filas 6..40 ya formateadas en el formato

export const CAUSAS = [
  { campo: 'causa_modulo',      label: 'Módulo',      col: 'J' },
  { campo: 'causa_operacion',   label: 'Operación',   col: 'K' },
  { campo: 'causa_insumo',      label: 'Insumo',      col: 'L' },
  { campo: 'causa_corte',       label: 'Corte',       col: 'M' },
  { campo: 'causa_sublimacion', label: 'Sublimación', col: 'N' },
  { campo: 'causa_revision',    label: 'Revisión',    col: 'O' },
];
export const CLASIFICACIONES = [
  { campo: 'clasificacion_correccion',      label: 'Corrección',      col: 'S' },
  { campo: 'clasificacion_reclasificacion', label: 'Reclasificación', col: 'T' },
  { campo: 'clasificacion_concesion',       label: 'Concesión',       col: 'U' },
];

const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

const fmt = (d) => {
  if (!d) return null;
  const x = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
  return x.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Copia el estilo de la fila modelo (para filas por encima de la 40)
const copiarFila = (ws, desde, hasta) => {
  const src = ws.getRow(desde);
  const dst = ws.getRow(hasta);
  dst.height = src.height;
  COLS.forEach(c => { dst.getCell(c).style = JSON.parse(JSON.stringify(src.getCell(c).style || {})); });
  ws.mergeCells(`D${hasta}:H${hasta}`);
  ws.mergeCells(`W${hasta}:X${hasta}`);
};

const poner = (cell, val, h = 'center') => {
  cell.value = val ?? null;
  cell.style = { ...JSON.parse(JSON.stringify(cell.style || {})),
    alignment: { horizontal: h, vertical: 'middle', wrapText: true } };
};

const periodo = (filas) => {
  const keys = [...new Set(filas.map(f => f.anio * 100 + f.mes))].sort();
  if (!keys.length) return '';
  const t = (k) => `${MESES[(k % 100) - 1]} ${Math.floor(k / 100)}`;
  return keys.length === 1 ? t(keys[0]) : `${t(keys[0])} a ${t(keys[keys.length - 1])}`;
};

/**
 * @param {Array}  filas    ítems planos { anio, mes, numero_fila, referencia_obj, defecto_obj, ... }
 * @param {object} formato  documento vinculado (useFormato('registro_pnc'))
 * @param {object} opts     { proceso }
 */
export const exportPNC = async (filas, formato, { proceso = 'Producción' } = {}) => {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];
  if (!ws) throw new Error(`No se encontró la hoja "${SHEET_NAME}" en ${formato.code}.`);

  const orden = [...filas].sort((a, b) => a.anio - b.anio || a.mes - b.mes || a.numero_fila - b.numero_fila);

  ws.getCell('C3').value = `MES: ${periodo(orden)}     PROCESO: ${proceso}`;

  for (let i = PLANTILLA_FILAS; i < orden.length; i++) copiarFila(ws, DATA_START_ROW, DATA_START_ROW + i);

  orden.forEach((it, i) => {
    const r = DATA_START_ROW + i;
    const g = (c) => ws.getCell(`${c}${r}`);
    const fila = ws.getRow(r);
    fila.hidden = false;                 // el formato trae filas ocultas (9–22)
    fila.height = 24;
    const ref = it.referencia_obj, def = it.defecto_obj;

    poner(g('A'), i + 1);
    poner(g('B'), ref ? ref.ref : (it.referencia_texto || null));
    poner(g('C'), fmt(it.fecha_reporte));
    poner(g('D'), def ? `${def.codigo} — ${def.nombre}` : (it.defecto_texto || null), 'left');
    poner(g('I'), it.total ?? null);
    CAUSAS.forEach(c => poner(g(c.col), it[c.campo] ? 'X' : null));
    poner(g('P'), fmt(it.tratamiento_fecha));
    poner(g('Q'), it.tratamiento_descripcion || null, 'left');
    poner(g('R'), it.tratamiento_responsable || null, 'left');
    CLASIFICACIONES.forEach(c => poner(g(c.col), it[c.campo] ? 'X' : null));
    poner(g('V'), fmt(it.verificacion_fecha));
    poner(g('W'), it.verificacion_responsable || null, 'left');
  });

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato.code}_PNC_${hoy}.xlsx`);
  return true;
};

export default exportPNC;
