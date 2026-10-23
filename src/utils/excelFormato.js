// src/utils/excelFormato.js
// Utilidades para llenar los formatos OFICIALES de Gestión Documental con ExcelJS.
// ExcelJS comparte objetos de estilo entre celdas y no conserva figuras de dibujo
// (casillas/círculos), por eso las marcas van como texto: "[X] …" / "(X) …" o una X en la celda.
export const own = (cell) => { cell.style = JSON.parse(JSON.stringify(cell.style || {})); return cell; };

export const fmtFecha = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const fmtHora = (s) => (s ? String(s).slice(0, 5) : '');

// Reemplaza el texto de una celda conservando su formato
export function texto(ws, ref, valor, font) {
  const c = own(ws.getCell(ref));
  c.value = valor ?? '';
  if (font) c.font = { ...(c.font || {}), ...font };
  return c;
}

// "X" centrada dentro de una celda-casilla con borde
export function marcaX(ws, ref, marcada) {
  const c = own(ws.getCell(ref));
  c.value = marcada ? 'X' : null;   // null (no '') para no cortar el texto de la celda vecina
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  c.font = { ...(c.font || {}), bold: true, size: 12 };
}

// Marca en el texto de la etiqueta: "[X] PROVEEDOR" / "[  ] PROVEEDOR"
export function etiqueta(ws, ref, marcada, extra = '') {
  const c = own(ws.getCell(ref));
  const base = String(c.value ?? '').replace(/^\s*[[(](X| {0,3})[\])]\s*/, '').trim();
  c.value = `${marcada ? '[X]' : '[  ]'} ${base}${extra}`;
  c.font = { ...(c.font || {}), bold: !!marcada };
}

// Combina un rango y escribe un texto largo con ajuste de línea
export function bloque(ws, rango, valor, size = 10) {
  const [ini] = rango.split(':');
  try { ws.unMergeCells(rango); } catch { /* no estaba combinado */ }
  ws.mergeCells(rango);
  const c = own(ws.getCell(ini));
  c.value = valor || '';
  c.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
  c.font = { name: 'Calibri', size };
}

export const siNo = (v) => `${v === true ? '[X]' : '[  ]'} Sí   ${v === false ? '[X]' : '[  ]'} No`;