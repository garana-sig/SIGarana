// src/utils/exportActoInseguro.js
// ═══════════════════════════════════════════════════════════════════
// Excel RE-GS-02 sobre el formato OFICIAL de Gestión Documental
// (formato vinculado 'registro_actos_inseguros' → document.file_path).
// Un archivo por registro.
//
// Mapa de celdas (hoja única del formato):
//   D5  nombre de quien reporta        G5  "Reporte N° REP-…"
//   Casillas → se marcan en el TEXTO de la etiqueta: "[X] Acto inseguro" / "[  ] …"
//     A9 acto inseguro · C9 condición insegura · E9 condición de salud
//     EPP: A19 tapabocas · A20 medias · A21 tapaoídos · D19 guante metálico ·
//          D20 dotación · D21 guante de tela · F19 cabello · F20 accesorios · F21 otro
//   A12:H15 descripción (se combinan)  A24:H28 correctivos (se combinan)
//   A30 firma / recibido por
// Las casillas del formato son figuras de dibujo que ExcelJS no conserva (se
// pierden al guardar); por eso la marca va en la etiqueta y no en una celda
// aparte, que además taparía el texto.
// ═══════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';

// ExcelJS comparte objetos de estilo entre celdas: clonar antes de modificar
const own = (cell) => { cell.style = JSON.parse(JSON.stringify(cell.style || {})); return cell; };

const fmtFecha = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

// Marca la casilla en el texto de la etiqueta (conserva el texto original)
function casilla(ws, ref, marcada) {
  const c = own(ws.getCell(ref));
  const base = String(c.value ?? '').replace(/^\[(X| {1,2})\]\s*/, '').trim();
  c.value = `${marcada ? '[X]' : '[  ]'} ${base}`;
  c.font = { name: 'Calibri', size: 11, bold: !!marcada };
}

function bloque(ws, rango, texto) {
  const [ini] = rango.split(':');
  try { ws.unMergeCells(rango); } catch { /* no estaba combinado */ }
  ws.mergeCells(rango);
  const c = own(ws.getCell(ini));
  c.value = texto || '';
  c.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
  c.font = { name: 'Calibri', size: 10 };
}

export async function exportActoInseguro(registro, formato) {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  const epp = new Set(registro.epp_omitidos || []);
  const receptor = registro.receptor?.full_name || '';

  // Identificación
  own(ws.getCell('D5')).value = registro.reportado_por || 'Anónimo';
  // "Reporte N°" está en G5 y H5 es angosta: el número va en la misma etiqueta
  const n = own(ws.getCell('G5'));
  n.value = `Reporte N° ${registro.numero}`;
  n.font = { name: 'Calibri', size: 10, bold: true };

  // Qué se reporta
  casilla(ws, 'A9', registro.es_acto_inseguro);
  casilla(ws, 'C9', registro.es_condicion_insegura);
  casilla(ws, 'E9', registro.es_condicion_salud);

  // Descripción
  bloque(ws, 'A12:H15', [
    registro.fecha ? `Fecha: ${fmtFecha(registro.fecha)}.` : '',
    registro.area ? `Área: ${registro.area}.` : '',
    registro.descripcion,
  ].filter(Boolean).join(' '));

  // EPP / normas
  casilla(ws, 'A19', epp.has('tapabocas'));
  casilla(ws, 'A20', epp.has('medias_ortopedicas'));
  casilla(ws, 'A21', epp.has('tapaoidos'));
  casilla(ws, 'D19', epp.has('guante_metalico'));
  casilla(ws, 'D20', epp.has('dotacion'));
  casilla(ws, 'D21', epp.has('guante_tela'));
  casilla(ws, 'F19', epp.has('cabello_sin_recoger'));
  casilla(ws, 'F20', epp.has('uso_accesorios'));
  casilla(ws, 'F21', epp.has('otro'));
  if (epp.has('otro') && registro.epp_otro) {
    const c = ws.getCell('F21');
    c.value = `${c.value}: ${registro.epp_otro}`;
  }

  // Correctivos
  bloque(ws, 'A24:H28', registro.correctivos || '');

  // Firmas
  own(ws.getCell('A30')).value =
    `Firma quien reporta: ${registro.reportado_por || 'Anónimo'}          Recibido por: ${receptor}`;

  const out = await wb.xlsx.writeBuffer();
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato.code}_${registro.numero}.xlsx`);
}