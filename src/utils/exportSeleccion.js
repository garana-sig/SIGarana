// src/utils/exportSeleccion.js
// ═══════════════════════════════════════════════════════════════════════
// v2 (oct 2026) — Selección de proveedores sobre el formato vigente de
// Gestión Documental (formato_vinculado 'registro_sel_proveedores' → hoy
// RE-GR-05 v02, hoja "V2"). El encabezado (código, versión, fecha) no se toca.
//
// Hoja V2: B7 FECHA · fila 13 pesos · fila 14 encabezados · datos desde la 15:
//   B insumo · C proveedor · D certificado de seguridad · E implementación SST
//   F calidad · G precio · H tiempo de entrega · I facilidad de pago
//   J resultado (fórmula del formato) · K clasificación (AAA / AA / A)
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';
import { CRITERIOS_SELECCION, calcularPuntajeSeleccion, clasificarSeleccion } from '@/hooks/useSeleccionProveedores';

const PRIMERA = 15;
const ULTIMA = 35;                          // filas con formato en la hoja V2
const COLS = ['D', 'E', 'F', 'G', 'H', 'I']; // mismo orden que CRITERIOS_SELECCION

const fmt = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00')
  .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

export async function exportSeleccion(seleccion, formato) {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('V2') || wb.worksheets[wb.worksheets.length - 1];
  if (!ws) throw new Error(`No se encontró la hoja V2 en ${formato?.code || 'el formato'}.`);
  wb.worksheets.filter((s) => s.id !== ws.id).forEach((s) => wb.removeWorksheet(s.id));
  ws.state = 'visible';
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const opciones = [...(seleccion.opciones || [])]
    .sort((a, b) => calcularPuntajeSeleccion(b) - calcularPuntajeSeleccion(a));
  const capacidad = ULTIMA - PRIMERA + 1;
  if (opciones.length > capacidad) throw new Error(`El formato tiene espacio para ${capacidad} proveedores.`);

  ws.getCell('B7').value = `FECHA: ${fmt(seleccion.fecha_realizacion)}`;

  // Limpiar los ejemplos que trae el formato
  for (let r = PRIMERA; r <= ULTIMA; r++) {
    for (const c of ['B', 'C', ...COLS, 'J', 'K']) ws.getCell(`${c}${r}`).value = null;
  }

  opciones.forEach((o, i) => {
    const r = PRIMERA + i;
    if (i === 0) ws.getCell(`B${r}`).value = seleccion.insumo_nombre || null;
    const nombre = o.supplier?.nombre || o.proveedor_nombre || `Proveedor ${i + 1}`;
    ws.getCell(`C${r}`).value = o.es_seleccionado ? `${nombre} ★` : nombre;
    CRITERIOS_SELECCION.forEach((c, k) => {
      const v = Number(o[c.key]) || 0;
      ws.getCell(`${COLS[k]}${r}`).value = v > 0 ? v : null;
    });
    const resultado = calcularPuntajeSeleccion(o);
    ws.getCell(`J${r}`).value = {
      formula: `D${r}*D$13+E${r}*E$13+F${r}*F$13+G${r}*G$13+H${r}*H$13+I${r}*I$13`,
      result: Number(resultado.toFixed(2)),
    };
    ws.getCell(`K${r}`).value = clasificarSeleccion(resultado);
  });

  if (seleccion.observaciones) {
    ws.getCell(`B${ULTIMA + 2}`).value = `Observaciones: ${seleccion.observaciones}`;
  }

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato?.code || 'RE-GR-05'}_SELECCION_${seleccion.consecutive || 'PROVEEDORES'}_${hoy}.xlsx`);
  return true;
}

export default exportSeleccion;
