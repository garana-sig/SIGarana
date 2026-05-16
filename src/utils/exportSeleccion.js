// src/utils/exportSeleccion.js
// Exporta selección de proveedores al formato RE-GR-05
// Patrón idéntico a exportAccionesMejora.js — descarga plantilla de Storage y la llena con ExcelJS

import ExcelJS   from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

const TEMPLATE_NAME = 'RE-GR-05_SELECCION_DE_PROVEEDORES.xlsx';

function fmt(date) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export async function exportSeleccion(seleccion) {
  try {
    // 1. Descargar plantilla desde Storage
    const { data: fileData, error } = await supabase.storage
      .from('templates')
      .download(TEMPLATE_NAME);

    if (error) throw new Error(`No se pudo descargar la plantilla: ${error.message}`);

    const arrayBuffer = await fileData.arrayBuffer();

    // 2. Cargar en ExcelJS
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) throw new Error('No se encontró hoja en la plantilla');

    const opciones = [...(seleccion.opciones || [])]
      .sort((a, b) => a.orden - b.orden);

    // 3. Fecha de realización — fila 6
    ws.getCell('B6').value = fmt(seleccion.fecha_realizacion);

    // 4. Encabezados de pesos — fila 9 (ya están en plantilla, solo confirmar)
    // Pesos: Precio 0.5 | Entrega 0.25 | Dto Vol 0.0625 | Dto PP 0.0625 | SGSST 0.0625 | Rendimiento 0.0625

    // 5. Escribir datos de cada opción a partir de fila 11
    // Columnas del formato RE-GR-05:
    // A = Insumo/Contratista  B = Proveedor Potencial
    // C = SGSST  D = Rendimiento  E = Composición
    // F = Precio (score)  G = Precio (ponderado)
    // H = Entrega (score) I = Entrega (ponderado)
    // J = Dto Vol (score) K = Dto Vol (ponderado)
    // L = Dto PP (score)  M = Dto PP (ponderado)
    // N = Puntaje total

    const START_ROW = 11;

    // Escribir nombre del insumo en primera fila (fusionado en el formato)
    ws.getCell(`A${START_ROW}`).value = seleccion.insumo_nombre || '';

    opciones.forEach((opcion, idx) => {
      const row = START_ROW + idx;

      // Nombre del proveedor
      const nombreProveedor = opcion.supplier?.nombre || opcion.proveedor_nombre || '';
      ws.getCell(`B${row}`).value = nombreProveedor;

      // Criterios con score y ponderado
      ws.getCell(`C${row}`).value = opcion.sgsst_score          || 0;
      ws.getCell(`D${row}`).value = opcion.rendimiento_score     || 0;
      ws.getCell(`E${row}`).value = opcion.composicion_score     || 0;

      // Precio
      ws.getCell(`F${row}`).value = opcion.precio_score          || 0;
      ws.getCell(`G${row}`).value = ((opcion.precio_score || 0) * 0.5).toFixed(3);

      // Entrega
      ws.getCell(`H${row}`).value = opcion.entrega_score         || 0;
      ws.getCell(`I${row}`).value = ((opcion.entrega_score || 0) * 0.25).toFixed(3);

      // Descuento volumen
      ws.getCell(`J${row}`).value = opcion.descuento_vol_score   || 0;
      ws.getCell(`K${row}`).value = ((opcion.descuento_vol_score || 0) * 0.0625).toFixed(4);

      // Descuento pronto pago
      ws.getCell(`L${row}`).value = opcion.descuento_pp_score    || 0;
      ws.getCell(`M${row}`).value = ((opcion.descuento_pp_score  || 0) * 0.0625).toFixed(4);

      // Puntaje total
      ws.getCell(`N${row}`).value = parseFloat((opcion.puntaje_total || 0).toFixed(3));

      // Marcar seleccionado con fondo verde si aplica
      if (opcion.es_seleccionado) {
        ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'].forEach(col => {
          const cell = ws.getCell(`${col}${row}`);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' }, // verde claro
          };
        });
      }
    });

    // 6. Realizado por / Aprobado por — última fila del formato (fila 47)
    const lastRow = START_ROW + opciones.length + 2;
    ws.getCell(`A${lastRow}`).value = `Realizado por: ${seleccion.realizado_por_profile?.full_name || ''}`;
    ws.getCell(`H${lastRow}`).value = `Aprobado por: ${seleccion.aprobado_por_profile?.full_name  || ''}`;

    // Observaciones si las hay
    if (seleccion.observaciones) {
      ws.getCell(`A${lastRow + 1}`).value = `Observaciones: ${seleccion.observaciones}`;
    }

    // 7. Exportar
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fechaHoy = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    saveAs(blob, `RE-GR-05_SELECCION_${seleccion.consecutive || 'PROVEEDORES'}_${fechaHoy}.xlsx`);

    return { success: true };
  } catch (e) {
    console.error('exportSeleccion error:', e);
    return { success: false, error: e.message };
  }
}