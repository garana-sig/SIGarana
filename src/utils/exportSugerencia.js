// src/utils/exportSugerencia.js
// ═══════════════════════════════════════════════════════════════════
// Excel RE-GH-05 (Buzón de sugerencias) sobre el formato OFICIAL de
// Gestión Documental (formato vinculado 'registro_sugerencias').
// Mapa de celdas:
//   B13 "Fecha:"  F13 "Hora:"  J13 "Nº:" (J13:K13)
//   Casillas con borde: C16 Queja · E16 Reclamo · H16 Sugerencia · K16 Felicitación
//   B20:K23 descripción del caso (se combinan)
// La "respuesta" es seguimiento interno: NO va en el formato.
// ═══════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';
import { texto, marcaX, bloque, fmtFecha, fmtHora } from '@/utils/excelFormato';

export async function llenarSugerencia(wb, g) {
  const ws = wb.worksheets[0];
  texto(ws, 'B13', `Fecha: ${fmtFecha(g.fecha)}`);
  texto(ws, 'F13', `Hora: ${fmtHora(g.hora)}`);
  texto(ws, 'J13', `Nº: ${g.numero}`, { bold: true });
  marcaX(ws, 'C16', g.clasificacion === 'queja');
  marcaX(ws, 'E16', g.clasificacion === 'reclamo');
  marcaX(ws, 'H16', g.clasificacion === 'sugerencia');
  marcaX(ws, 'K16', g.clasificacion === 'felicitacion');
  bloque(ws, 'B20:K23', [g.area ? `Área: ${g.area}.` : '', g.descripcion].filter(Boolean).join(' '));
}

export async function exportSugerencia(registro, formato) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await descargarPlantilla(formato));
  await llenarSugerencia(wb, registro);
  const out = await wb.xlsx.writeBuffer();
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato.code}_${registro.numero}.xlsx`);
}
