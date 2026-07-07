// src/utils/exportPNC.js
// ═══════════════════════════════════════════════════════════════════════
// Exportador Excel — Control de Producto No Conforme (RE-GS-06 modificado)
// ✅ Mismo patrón que exportAccionesMejora.js
// ✅ Direccionamiento directo ws.getCell() para celdas fusionadas
//
// Estructura verificada del archivo RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx
// (hoja "v1"), fila 4 = grupos, fila 5 = columnas, datos desde fila 6:
//
//   A = N°                       (IDENTIFICACION, A4:B4)
//   B = MES REPORTE               (IDENTIFICACION)
//   C = SECCION                   (DESCRIPCION, C4:F4)
//   D = REFERENCIA                (DESCRIPCION)
//   E = FECHA DEL REPORTE         (DESCRIPCION)
//   F = CODIGO DEL DEFECTO        (DESCRIPCION)
//   G = DESCRIPCION               (ANALISIS CAUSA/ORIGEN, G4:I4)
//   H = OPERACIÓN DE ORIGEN       (ANALISIS CAUSA/ORIGEN)
//   I = CANTIDAD                  (ANALISIS CAUSA/ORIGEN)
//   J = COMO SE SOLUCIONO         (TRATAMIENTO, J4:K4)
//   K = RESPONSABLE               (TRATAMIENTO)
//   L = FECHA                     (VERIFICACION, L4:N4)
//   M = RESPONSABLE               (VERIFICACION — fusionada M5:N5, escribir en M)
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';
import { MESES } from '@/hooks/usePNC';

const DATA_START_ROW = 6;
const SHEET_NAME      = 'v1';
const TEMPLATE_FILE   = 'RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx';

const BORDER = {
  top:    { style: 'thin', color: { argb: 'FFA6B8C2' } },
  left:   { style: 'thin', color: { argb: 'FFA6B8C2' } },
  bottom: { style: 'thin', color: { argb: 'FFA6B8C2' } },
  right:  { style: 'thin', color: { argb: 'FFA6B8C2' } },
};

const FILL_ODD  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const FILL_EVEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9F5' } };

const fmt = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const applyStyle = (cell, fill, hAlign = 'left') => {
  cell.fill      = fill;
  cell.font      = { name: 'Arial', size: 9 };
  cell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
  cell.border    = BORDER;
};

// ═══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// @param {Array}  registros  — array de pnc_registro (con anio, mes) y pnc_item
//                              anidados, cada item debe traer referencia_obj
//                              y defecto_obj ya resueltos
// @param {string} filename   — nombre sin extensión
// ═══════════════════════════════════════════════════════════════════════
export const exportPNC = async (registros, filename = 'RE-GS-06_PNC') => {
  try {
    console.log('📊 Descargando plantilla RE-GS-06 desde Supabase Storage...');

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download(TEMPLATE_FILE);

    if (downloadError || !fileData) {
      throw new Error(
        `No se pudo descargar la plantilla: ${downloadError?.message || 'archivo no encontrado'}. ` +
        `Verifica que "${TEMPLATE_FILE}" exista en el bucket "templates".`
      );
    }

    console.log('✅ Plantilla descargada');

    const arrayBuffer = await fileData.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];
    if (!ws) throw new Error(`No se encontró la hoja "${SHEET_NAME}" en la plantilla RE-GS-06.`);

    // Limpiar filas de ejemplo desde fila 6 en adelante
    for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    }

    // Ordenar registros por año/mes para que el consolidado salga cronológico
    const regsOrdenados = [...registros].sort((a, b) => a.anio - b.anio || a.mes - b.mes);

    const totalFilas = regsOrdenados.reduce((s, r) => s + (r.pnc_item || []).length, 0);
    console.log(`📝 Escribiendo ${totalFilas} fila(s)...`);

    let rowNum = DATA_START_ROW;

    regsOrdenados.forEach((reg) => {
      const items = (reg.pnc_item || []).sort((a, b) => a.numero_fila - b.numero_fila);

      items.forEach((it, idx) => {
        const fill = idx % 2 === 0 ? FILL_ODD : FILL_EVEN;
        const row  = ws.getRow(rowNum);
        row.height = 26;

        const setCell = (col, val, align = 'left') => {
          const cell = ws.getCell(`${col}${rowNum}`);
          cell.value = val ?? '';
          applyStyle(cell, fill, align);
        };

        const ref = it.referencia_obj || null;
        const def = it.defecto_obj    || null;

        // IDENTIFICACION
        setCell('A', it.numero_fila,          'center'); // N°
        setCell('B', MESES[reg.mes - 1] || '','center'); // MES REPORTE

        // DESCRIPCION
        setCell('C', it.seccion || '',                    'center'); // SECCION
        setCell('D', ref ? ref.ref : (it.referencia_texto || ''), 'center'); // REFERENCIA
        setCell('E', fmt(it.fecha_reporte),               'center'); // FECHA DEL REPORTE
        setCell('F', def ? def.codigo : '',               'center'); // CODIGO DEL DEFECTO

        // ANALISIS DE CAUSA/ORIGEN
        setCell('G', def ? def.nombre : (it.defecto_texto || ''));   // DESCRIPCION
        setCell('H', it.operacion_origen || '');                    // OPERACIÓN DE ORIGEN
        setCell('I', it.total ?? '',                      'center'); // CANTIDAD

        // TRATAMIENTO
        setCell('J', it.tratamiento_descripcion || '');   // COMO SE SOLUCIONO
        setCell('K', it.tratamiento_responsable || '');   // RESPONSABLE

        // VERIFICACION
        setCell('L', fmt(it.verificacion_fecha),          'center'); // FECHA
        setCell('M', it.verificacion_responsable || '');             // RESPONSABLE (fusionada M:N)

        row.commit();
        rowNum++;
      });
    });

    if (rowNum === DATA_START_ROW) {
      const r = ws.getRow(DATA_START_ROW);
      r.height = 20;
      for (const col of ['A','B','C','D','E','F','G','H','I','J','K','L','M']) {
        ws.getCell(`${col}${DATA_START_ROW}`).border = BORDER;
      }
      r.commit();
    }

    console.log('💾 Generando archivo final RE-GS-06...');
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const today = new Date()
      .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '-');

    saveAs(blob, `${filename}_${today}.xlsx`);
    console.log('✅ RE-GS-06 exportado correctamente');
    return true;

  } catch (err) {
    console.error('❌ Error exportando RE-GS-06:', err);
    throw err;
  }
};

export default exportPNC;