// src/utils/exportPNC.js
// ═══════════════════════════════════════════════════════════════════════
// Exportador Excel — Control de Producto No Conforme (RE-GS-06)
// ✅ Mismo patrón que exportAccionesMejora.js
// ✅ Direccionamiento directo ws.getCell() para celdas fusionadas
//
// Merges verificados del archivo RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx:
//   C3:X3  → fila MES/PROCESO (se limpia)
//   D6:H6 … D40:H40 → PRODUCTO NO CONFORME (escribir en D)
//   W6:X6 … W40:X40 → RESPONSABLE verificación (escribir en W)
//
// Columnas fila 5 (encabezados):
//   A=N°  B=REF  C=FECHA REPORTE  D=PRODUCTO NO CONFORME  I=TOTAL
//   J=MODULO  K=OPERACIÓN  L=INSUMO  M=CORTE  N=SUBLIMACION  O=REVISION
//   P=FECHA  Q=DESCRIPCION  R=RESPONSABLE  (TRATAMIENTO)
//   S=CORRECION  T=RECLASIFICACION  U=CONCESIÓN  (CLASIFICACION)
//   V=FECHA  W=RESPONSABLE  (VERIFICACION)
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

const DATA_START_ROW = 6;

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

const tick = (val) => (val ? 'X' : '');

const applyStyle = (cell, fill, hAlign = 'left') => {
  cell.fill      = fill;
  cell.font      = { name: 'Arial', size: 9 };
  cell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
  cell.border    = BORDER;
};

// ═══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// @param {Array}  registros  — array de pnc_registro con pnc_item anidados
//                              cada item debe tener referencia_obj y defecto_obj
// @param {string} filename   — nombre sin extensión
// ═══════════════════════════════════════════════════════════════════════
export const exportPNC = async (registros, filename = 'RE-GS-06_PNC') => {
  try {
    console.log('📊 Descargando plantilla RE-GS-06 desde Supabase Storage...');

    // 1️⃣ Descargar plantilla — patrón del proyecto
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download('RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx');

    if (downloadError || !fileData) {
      throw new Error(
        `No se pudo descargar la plantilla: ${downloadError?.message || 'archivo no encontrado'}. ` +
        'Verifica que "RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx" exista en el bucket "templates".'
      );
    }

    console.log('✅ Plantilla descargada');

    // 2️⃣ Cargar con ExcelJS
    const arrayBuffer = await fileData.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    // La hoja se llama "v1" (verificado inspeccionando el archivo)
    const ws = wb.getWorksheet('v1') || wb.worksheets[0];
    if (!ws) throw new Error('No se encontró la hoja "v1" en la plantilla RE-GS-06.');

    // 3️⃣ Limpiar celda C3 (fusionada C3:X3) — quita el texto MES/PROCESO de la plantilla
    ws.getCell('C3').value = '';

    // 4️⃣ Limpiar filas de ejemplo desde fila 6
    for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    }

    console.log(`📝 Escribiendo ${registros.reduce((s, r) => s + (r.pnc_item || []).length, 0)} fila(s)...`);

    // 5️⃣ Escribir filas de datos — todos los registros consecutivamente
    let rowNum = DATA_START_ROW;

    registros.forEach((reg) => {
      const items = (reg.pnc_item || []).sort((a, b) => a.numero_fila - b.numero_fila);

      items.forEach((it, idx) => {
        const fill = idx % 2 === 0 ? FILL_ODD : FILL_EVEN;
        const row  = ws.getRow(rowNum);
        row.height = 28;

        // Helper: escribir por letra de columna (evita problemas con celdas fusionadas)
        const setCell = (col, val, align = 'left') => {
          const cell = ws.getCell(`${col}${rowNum}`);
          cell.value = val ?? '';
          applyStyle(cell, fill, align);
        };

        const ref     = it.referencia_obj || null;
        const def     = it.defecto_obj    || null;
        const refText = ref ? ref.ref : (it.referencia_texto || '');
        // ↓ Código + descripción en columna D (D:H fusionadas → solo escribir en D)
        const defText = def
          ? `${def.codigo} — ${def.nombre}`
          : (it.defecto_texto || '');

        // IDENTIFICACION
        setCell('A', it.numero_fila,        'center'); // N°
        setCell('B', refText,               'center'); // REF
        setCell('C', fmt(it.fecha_reporte), 'center'); // FECHA REPORTE

        // DESCRIPCION — celda fusionada D:H → escribir SOLO en D
        setCell('D', defText);                         // PRODUCTO NO CONFORME

        // TOTAL
        setCell('I', it.total ?? '',        'center'); // TOTAL

        // ANALISIS DE CAUSA / ORIGEN
        setCell('J', tick(it.causa_modulo),      'center');
        setCell('K', tick(it.causa_operacion),   'center');
        setCell('L', tick(it.causa_insumo),      'center');
        setCell('M', tick(it.causa_corte),       'center');
        setCell('N', tick(it.causa_sublimacion), 'center');
        setCell('O', tick(it.causa_revision),    'center');

        // TRATAMIENTO
        setCell('P', fmt(it.tratamiento_fecha),         'center');
        setCell('Q', it.tratamiento_descripcion || '');
        setCell('R', it.tratamiento_responsable || '');

        // CLASIFICACION
        setCell('S', tick(it.clasificacion_correccion),      'center');
        setCell('T', tick(it.clasificacion_reclasificacion), 'center');
        setCell('U', tick(it.clasificacion_concesion),       'center');

        // VERIFICACION — celda fusionada W:X → escribir SOLO en W
        setCell('V', fmt(it.verificacion_fecha),       'center');
        setCell('W', it.verificacion_responsable || '');       // ← fusionada W:X

        row.commit();
        rowNum++;
      });
    });

    // Fila vacía con borde si no hay datos
    if (rowNum === DATA_START_ROW) {
      const r = ws.getRow(DATA_START_ROW);
      r.height = 20;
      for (const col of ['A','B','C','D','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W']) {
        ws.getCell(`${col}${DATA_START_ROW}`).border = BORDER;
      }
      r.commit();
    }

    // 6️⃣ Exportar — igual que exportAccionesMejora
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