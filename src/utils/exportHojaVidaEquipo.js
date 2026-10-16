// src/utils/exportHojaVidaEquipo.js
// ═══════════════════════════════════════════════════════════════════════
// Exportador Excel — Hoja de Vida de equipos sobre la plantilla oficial
// RE-GR-11 (bucket `templates`). Mismo patrón que exportPNC.js:
// ExcelJS + descarga de plantilla desde Storage + file-saver.
//
// Estructura verificada de la hoja "v1" de la plantilla:
//   A10:E10 Código        F10:I10 Serial
//   A11:E11 Tipo          F11:I11 Modelo
//   A12:E12 Localización  F12:I12 Marca
//   J9:O19  Foto (recuadro derecho, etiqueta en L13)
//   A15:I17 Función       A18:I18 (renglón libre → Herramientas)
//   A20 RUTINARIO: (cuerpo A21:F25)   G20 PREVENTIVO: (cuerpo G21:O25)
//   Datos históricos: cada registro ocupa 2 filas, de la 29-30 a la 53-54
//     A:B Fecha · C Prev. · D Corr. · E:M Descripción · N:O Firma
//   Si hay más de 13 registros se agregan filas con el mismo estilo.
//
// Campos adicionales del tipo de equipo (especificaciones y periféricos)
// van en una segunda hoja "Ficha técnica", sin alterar el formato oficial.
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

export const TEMPLATE_FILE = 'RE-GR-11_HOJA_DE_VIDA_DE_MAQUINA.xlsx'; // nombre oficial del formato
const SHEET_NAME   = 'v1';
const HIST_START   = 29;   // primera fila de datos históricos
const HIST_SLOTS   = 13;   // registros que caben en la plantilla (29..54, de a 2 filas)

const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const BOX  = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const fmt = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : '';
};

const txt = (v) => (v === null || v === undefined ? '' : String(v).trim());

// ⚠ ExcelJS comparte el MISMO objeto de estilo entre celdas que venían con
// el mismo formato en la plantilla. Si se modifica border/alignment/font sin
// clonar, el cambio "se riega" a otras celdas (aparecen bordes donde no van).
// Por eso toda modificación de estilo pasa primero por own(cell).
function own(cell) {
  cell.style = JSON.parse(JSON.stringify(cell.style || {}));
  return cell;
}

// Escribe "Etiqueta: valor" en la celda (fusionada) de la plantilla.
// NO se toca fuente ni bordes: se respeta el estilo original del formato.
function label(ws, addr, etiqueta, valor) {
  ws.getCell(addr).value = valor ? `${etiqueta} ${valor}` : etiqueta;
}

// Solo valor + alineación (conserva fuente/bordes de la plantilla)
function escribir(ws, addr, valor, alineacion) {
  const c = own(ws.getCell(addr));
  c.value = valor;
  c.alignment = { ...(c.alignment || {}), ...alineacion };
}

function mergeSafe(ws, ...rango) {
  try { ws.mergeCells(...rango); } catch { /* ya estaba fusionado */ }
}

function boxRange(ws, r1, c1, r2, c2) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = own(ws.getCell(r, c));
      cell.border = {
        top:    r === r1 ? THIN : cell.border?.top,
        bottom: r === r2 ? THIN : cell.border?.bottom,
        left:   c === c1 ? THIN : cell.border?.left,
        right:  c === c2 ? THIN : cell.border?.right,
      };
    }
  }
}

// ── Rellena el workbook (separado de la descarga para poder probarlo) ──
export async function fillHojaVida(wb, { equipo, registros, foto, config }) {
  const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];
  const esPC = equipo.tipo === 'computador';
  const sp = equipo.especificaciones || {};

  // Hoja borrador de la plantilla: no hace parte del formato
  const borrador = wb.getWorksheet('Hoja2');
  if (borrador) wb.removeWorksheet(borrador.id);

  // Título según el tipo de equipo
  if (esPC) ws.getCell('D1').value = 'HOJA DE VIDA DE EQUIPO DE CÓMPUTO';
  // Fecha del formato en formato colombiano (la plantilla la trae como m/d/yy)
  own(ws.getCell('N4')).numFmt = 'dd/mm/yyyy';

  // ── IDENTIFICACIÓN ──
  label(ws, 'A10', 'Código:', txt(equipo.codigo));
  label(ws, 'F10', 'Serial:', txt(equipo.serial));
  label(ws, 'A11', esPC ? 'Tipo de equipo:' : 'Tipo de máquina:', txt(equipo.tipo_equipo));
  label(ws, 'F11', 'Modelo:', txt(equipo.modelo));
  label(ws, 'A12', 'Localizacion:', txt(equipo.area));
  label(ws, 'F12', 'Marca:', txt(equipo.marca));

  // ── CARACTERÍSTICAS ──
  escribir(ws, 'A15', `Funcion: ${txt(equipo.funcion)}`, { vertical: 'top', horizontal: 'left', wrapText: true });
  escribir(ws, 'A18', equipo.herramientas ? `Herramientas: ${txt(equipo.herramientas)}` : '', { vertical: 'middle', wrapText: true });

  // ── RUTINARIO / PREVENTIVO ──
  mergeSafe(ws, 'A21:F25');
  mergeSafe(ws, 'G21:O25');
  escribir(ws, 'A21', txt(equipo.mant_rutinario),  { vertical: 'top', horizontal: 'left', wrapText: true });
  escribir(ws, 'G21', txt(equipo.mant_preventivo), { vertical: 'top', horizontal: 'left', wrapText: true });

  // ── FOTO ──
  if (foto?.buffer) {
    ws.getCell('L13').value = '';
    const id = wb.addImage({ buffer: foto.buffer, extension: foto.extension || 'jpeg' });
    // Recuadro J9:O19 ≈ 440 x 225 px → ajustar conservando proporción
    const maxW = 400, maxH = 210;
    const k = Math.min(maxW / (foto.width || maxW), maxH / (foto.height || maxH), 1);
    const w = Math.round((foto.width || maxW) * k);
    const h = Math.round((foto.height || maxH) * k);
    ws.addImage(id, { tl: { col: 9.15, row: 8.3 }, ext: { width: w, height: h }, editAs: 'oneCell' });
  }

  // ── DATOS HISTÓRICOS (2 filas por registro) ──
  const fuenteHist = { ...(ws.getCell(`A${HIST_START}`).font || {}) }; // fuente de la plantilla
  const regs = [...registros].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  // La plantilla trae A55:D55 fusionada justo debajo de la tabla; se libera si hay más filas
  if (regs.length > HIST_SLOTS) { try { ws.unMergeCells('A55:D55'); } catch { /* no estaba */ } }
  regs.forEach((r, i) => {
    const row = HIST_START + i * 2;
    const extra = i >= HIST_SLOTS;   // filas nuevas fuera de la plantilla
    if (extra) {
      ws.getRow(row).height = 15.75;
      ws.getRow(row + 1).height = 15.75;
    }
    const celdas = [
      { c1: 1,  c2: 2,  v: fmt(r.fecha), h: 'center' },
      { c1: 3,  c2: 3,  v: r.tipo === 'Preventivo' ? 'X' : '', h: 'center' },
      { c1: 4,  c2: 4,  v: r.tipo === 'Correctivo' ? 'X' : '', h: 'center' },
      { c1: 5,  c2: 13, v: [txt(r.descripcion), r.tecnico ? `Técnico: ${txt(r.tecnico)}` : '', r.estado === 'Pendiente' ? '(Pendiente)' : '']
                          .filter(Boolean).join(' — '), h: 'left' },
      { c1: 14, c2: 15, v: r.registrado?.full_name || '', h: 'center' },
    ];
    celdas.forEach(({ c1, c2, v, h }) => {
      mergeSafe(ws, row, c1, row + 1, c2);
      const cell = own(ws.getCell(row, c1));
      cell.value = v;
      if (extra) cell.font = fuenteHist; // filas nuevas heredan la fuente de la plantilla
      cell.alignment = { vertical: 'middle', horizontal: h, wrapText: true };
      boxRange(ws, row, c1, row + 1, c2); // bordes explícitos (fusionadas y filas nuevas)
    });
  });

  // ── HOJA 2: Ficha técnica (campos adicionales) ──
  const filas = [
    ['Responsable', txt(equipo.usuario_responsable)],
    ['Estado general', txt(equipo.estado)],
    ['Fecha de compra', fmt(equipo.fecha_compra)],
    ['Garantía hasta', fmt(equipo.garantia_hasta)],
    ...config.especificaciones.map((c) => [c.l, txt(sp[c.k])]),
    ...config.perifericos.map((c) => [c.l, sp[c.k] ? 'SI' : 'NO']),
    ...(config.otrosPerifericos ? [['Otros periféricos', txt(sp.otros)]] : []),
    ...(equipo.observaciones ? [['Observaciones', txt(equipo.observaciones)]] : []),
  ];
  const ft = wb.addWorksheet('Ficha técnica', {
    pageSetup: { paperSize: 1, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ft.columns = [{ width: 34 }, { width: 58 }];
  ft.mergeCells('A1:B1');
  const t = ft.getCell('A1');
  t.value = `CARACTERÍSTICAS TÉCNICAS — ${txt(equipo.codigo)}  (anexo RE-GR-11)`;
  t.font = { name: 'Arial', size: 12, bold: true };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ft.getRow(1).height = 24;
  filas.forEach(([k, v], i) => {
    const r = ft.getRow(i + 3);
    r.getCell(1).value = k;
    r.getCell(2).value = v;
    r.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    r.getCell(2).font = { name: 'Arial', size: 10 };
    r.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
    r.getCell(1).border = BOX;
    r.getCell(2).border = BOX;
  });

  // Impresión: ajustar a 1 página de ancho (la plantilla corta la columna Firma)
  ws.pageSetup = { ...ws.pageSetup, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Nombre de la hoja principal = código del equipo
  ws.name = txt(equipo.codigo).replace(/[\\/*?:[\]]/g, '-').slice(0, 31) || 'v1';
  return wb;
}

// ── Lee la foto (URL firmada) para incrustarla ──
async function leerFoto(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    const extension = blob.type.includes('png') ? 'png' : 'jpeg';
    return { buffer: await blob.arrayBuffer(), extension, width: bmp.width, height: bmp.height };
  } catch {
    return null; // sin foto no se bloquea la descarga
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// @param {Object} equipo    — fila de mant_equipo
// @param {Array}  registros — mant_registro del equipo (con registrado.full_name)
// @param {String} fotoUrl   — URL firmada vigente de la foto (o null)
// @param {Object} config    — MANT_CONFIG[tipo]
// ═══════════════════════════════════════════════════════════════════════
export async function exportHojaVidaExcel({ equipo, registros, fotoUrl, config }) {
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

  const foto = await leerFoto(fotoUrl);
  await fillHojaVida(wb, { equipo, registros, foto, config });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `RE-GR-11_HOJA_DE_VIDA_${txt(equipo.codigo)}.xlsx`);
}