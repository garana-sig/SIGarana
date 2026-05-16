// src/utils/exportEvaluacion.js
// Exporta evaluación de proveedores al formato RE-GR-01
// Patrón idéntico a exportAccionesMejora.js — descarga plantilla de Storage y la llena con ExcelJS

import ExcelJS  from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

const TEMPLATE_NAME = 'RE-GR-01_EVALUACION_DE_PROVEEDORES.xls';

function fmt(date) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function confiabilidadLabel(valor) {
  const map = { confiable: 'CONFIABLE', aceptable: 'ACEPTABLE', deficiente: 'DEFICIENTE' };
  return map[valor] || '';
}

export async function exportEvaluacion(evaluacion) {
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

    const scores = evaluacion.scores || [];

    // 3. Escribir período y fecha de evaluación
    // Fila 6 — Periodo a evaluar
    const periodoStr = `${fmt(evaluacion.fecha_inicio)} al ${fmt(evaluacion.fecha_fin)}`;
    const cellPeriodo = ws.getCell('B6');
    cellPeriodo.value = periodoStr;

    // Fecha de evaluación
    const cellFecha = ws.getCell('H6');
    cellFecha.value = fmt(evaluacion.fecha_evaluacion);

    // 4. Escribir puntajes por proveedor
    // El formato tiene columnas para 7 proveedores a partir de la columna C
    // Estructura: C=Prov1 Puntuación, D=Prov1 Resultado, E=Prov2 Puntuación, F=Prov2 Resultado, etc.
    const provCols = [
      { puntuacion: 'C', resultado: 'D' }, // Proveedor 1
      { puntuacion: 'E', resultado: 'F' }, // Proveedor 2
      { puntuacion: 'G', resultado: 'H' }, // Proveedor 3
      { puntuacion: 'I', resultado: 'J' }, // Proveedor 4
      { puntuacion: 'K', resultado: 'L' }, // Proveedor 5
      { puntuacion: 'M', resultado: 'N' }, // Proveedor 6
      { puntuacion: 'O', resultado: 'P' }, // Proveedor 7
    ];

    // Fila 9 — nombres de proveedores (encabezado)
    scores.forEach((score, idx) => {
      if (idx >= provCols.length) return;
      const nombreCell = ws.getCell(`${provCols[idx].puntuacion}9`);
      nombreCell.value = score.supplier?.nombre || `Proveedor ${idx + 1}`;
    });

    // Filas de criterios — mapeo fijo según estructura del formato
    // Calidad: fila 11 (no conforme), 12 (devoluciones), 13 (SST)
    // Servicio: fila 15 (cantidad), 16 (oportunidad), 17 (reclamos), 18 (documentación)
    // Precio: fila 20 (competitividad), 21 (forma pago), 22 (descuentos)
    // Contratista: fila 28 (peligros)

    const SUBCRIT_ROWS = {
      calidad: {
        no_conforme:   11,
        devoluciones:  12,
        sst:           13,
      },
      servicio: {
        cantidad:      15,
        oportunidad:   16,
        reclamos:      17,
        documentacion: 18,
      },
      precio: {
        competitividad: 20,
        forma_pago:     21,
        descuentos:     22,
      },
      contratista: {
        peligros: 28,
      },
    };

    scores.forEach((score, idx) => {
      if (idx >= provCols.length) return;
      const cols = provCols[idx];

      // Escribir subcategorías por criterio
      Object.entries(SUBCRIT_ROWS).forEach(([criterioKey, subcats]) => {
        Object.entries(subcats).forEach(([subKey, rowNum]) => {
          const val = score[criterioKey]?.subcats?.[subKey] || 0;
          if (val > 0) {
            ws.getCell(`${cols.puntuacion}${rowNum}`).value = val;
          }
        });
      });

      // Resultados por criterio (filas resumen)
      // Calidad fila 10, Servicio fila 14, Precio fila 19
      ws.getCell(`${cols.resultado}10`).value = score.calidad?.resultado   || 0;
      ws.getCell(`${cols.resultado}14`).value = score.servicio?.resultado  || 0;
      ws.getCell(`${cols.resultado}19`).value = score.precio?.resultado    || 0;

      // Total score — fila 31
      ws.getCell(`${cols.puntuacion}31`).value = score.total_score || 0;

      // Confiabilidad — fila 35 en adelante (una por proveedor)
      const confRow = 35 + idx;
      ws.getCell(`C${confRow}`).value = score.supplier?.nombre || `Proveedor ${idx + 1}`;
      ws.getCell(`D${confRow}`).value = (score.total_score || 0).toFixed(2);
      ws.getCell(`E${confRow}`).value = confiabilidadLabel(score.confiabilidad);
      ws.getCell(`F${confRow}`).value = score.aspectos_mejorar || '';
    });

    // 5. Análisis por criterio (fila 46 aprox)
    // Calcular promedios de criterios entre todos los proveedores
    if (scores.length > 0) {
      const avgCalidad  = scores.reduce((s, sc) => s + (sc.calidad?.resultado  || 0), 0) / scores.length;
      const avgServicio = scores.reduce((s, sc) => s + (sc.servicio?.resultado || 0), 0) / scores.length;
      const avgPrecio   = scores.reduce((s, sc) => s + (sc.precio?.resultado   || 0), 0) / scores.length;

      ws.getCell('D46').value = avgCalidad.toFixed(2);
      ws.getCell('D47').value = avgServicio.toFixed(2);
      ws.getCell('D48').value = avgPrecio.toFixed(2);
    }

    // 6. Conclusiones — fila 49
    if (evaluacion.conclusiones) {
      ws.getCell('B50').value = evaluacion.conclusiones;
    }

    // 7. Realizado por / Aprobado por — fila 53
    ws.getCell('B53').value = evaluacion.realizado_por_profile?.full_name || '';
    ws.getCell('H53').value = evaluacion.aprobado_por_profile?.full_name  || '';

    // 8. Exportar
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fechaHoy = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    saveAs(blob, `RE-GR-01_EVALUACION_${evaluacion.consecutive || 'PROVEEDORES'}_${fechaHoy}.xlsx`);

    return { success: true };
  } catch (e) {
    console.error('exportEvaluacion error:', e);
    return { success: false, error: e.message };
  }
}