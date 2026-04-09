// src/utils/exportMatrizPeligros.js
// Exporta la Matriz de Peligros GTC-45 al formato oficial RE-GS-10
// Patrón idéntico a exportIndicadores.js:
//   1. Descarga plantilla desde Storage (bucket 'templates')
//   2. Carga con ExcelJS
//   3. Actualiza fecha en cabecera
//   4. Escribe filas de datos a partir de la fila 8
//   5. Exporta con saveAs (file-saver)
//
// Recibe SOLO los peligros que están visibles en pantalla (ya filtrados).

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// MAPA DE COLUMNAS — RE-GS-10 (fila de datos empieza en la 8)
//  A(1)  PROCESO            B(2)  SECCION          C(3)  ACTIVIDAD
//  D(4)  TAREA              E(5)  RUTINARIO
//  F(6)  PELIGRO CLASE      G(7)  PELIGRO DESC      H(8)  EFECTOS
//  I(9)  CTRL FUENTE        J(10) CTRL MEDIO        K(11) CTRL TRAB
//  L(12) ND                 M(13) NE                N(14) NP
//  O(15) INTERP NP          P(16) NC               Q(17) NR
//  R(18) ACEPTABILIDAD
//  S(19) NUM EXPUESTOS      T(20) POR CONSECUENCIAS U(21) REQ LEGAL
//  V(22) ELIMINACION        W(23) SUSTITUCION       X(24) INGENIERIA
//  Y(25) ADMINISTRATIVOS    Z(26) EPP
//  AA(27) FECHA PLAN        AB(28) RESPONSABLE PLAN
//  AC(29) FECHA CIERRE      AD(30) CIERRE EFECTIVO
//  AE(31) HALLAZGO          AF(32) RESP VERIFICACION
// ─────────────────────────────────────────────────────────────

const NOMBRE_PLANTILLA = 'RE-GS-10_MATRIZ_DE_PELIGROS_Y_EVALUACION_DE_RIESGOS.xlsx';
const PRIMERA_FILA_DATOS = 8;

// Helpers
const txt  = (v) => v ? String(v).trim() : '';
const num  = (v) => v != null && v !== '' ? Number(v) : '';
const bool = (v) => v ? 'SI' : 'NO';
const fecha = (v) => {
  if (!v) return '';
  try { return new Date(v).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return txt(v); }
};

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// peligros: array de registros de vw_sst_matriz_peligros
// filtroLabel: string descriptivo de los filtros activos (para el nombre del archivo)
// ─────────────────────────────────────────────────────────────
export const exportMatrizPeligros = async (peligros = [], filtroLabel = '') => {
  if (!peligros.length) {
    throw new Error('No hay peligros para exportar con los filtros actuales.');
  }

  // 1️⃣ Descargar plantilla desde Storage
  const { data: fileData, error: dlError } = await supabase.storage
    .from('templates')
    .download(NOMBRE_PLANTILLA);

  if (dlError || !fileData) {
    throw new Error(
      `Error descargando plantilla RE-GS-10: ${dlError?.message || 'archivo no encontrado en Storage'}. ` +
      `Verifica que el archivo "${NOMBRE_PLANTILLA}" esté subido al bucket "templates".`
    );
  }

  // 2️⃣ Cargar en ExcelJS
  const arrayBuffer = await fileData.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  const ws = wb.getWorksheet('MATRIZ TODA LA EMPRESA2023') || wb.worksheets[0];

  // 3️⃣ Actualizar fecha de generación en cabecera (celda AE3)
  const hoy = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const celdaFecha = ws.getCell('AE3');
  const valorFechaOriginal = String(celdaFecha.value || '');
  // Reemplaza la fecha manteniendo el formato original de la celda
  celdaFecha.value = valorFechaOriginal.replace(/\d{2}-\d{2}-\d{4}/, hoy)
    || `     FECHA                                                                ${hoy}`;

  // 4️⃣ Tomar estilos de la fila 8 (primera fila de datos del template)
  //    para aplicarlos a las filas nuevas y preservar el formato oficial
  const filaReferencia = ws.getRow(PRIMERA_FILA_DATOS);
  const estilosRef = {};
  filaReferencia.eachCell({ includeEmpty: true }, (cell) => {
    estilosRef[cell.col] = {
      font:      cell.font      ? { ...cell.font }      : undefined,
      border:    cell.border    ? { ...cell.border }    : undefined,
      alignment: cell.alignment ? { ...cell.alignment } : undefined,
      fill:      cell.fill      ? { ...cell.fill }      : undefined,
    };
  });

  // Limpiar la fila de referencia (era solo un placeholder vacío)
  filaReferencia.values = [];
  filaReferencia.height = 45;

  // 5️⃣ Escribir una fila por peligro a partir de la fila 8
  peligros.forEach((p, idx) => {
    const numFila = PRIMERA_FILA_DATOS + idx;
    const row = ws.getRow(numFila);
    row.height = 45;

    // Aplicar estilos de la fila referencia
    for (let col = 1; col <= 32; col++) {
      const cell = row.getCell(col);
      const estRef = estilosRef[col];
      if (estRef) {
        if (estRef.font)      cell.font      = estRef.font;
        if (estRef.border)    cell.border    = estRef.border;
        if (estRef.alignment) cell.alignment = { ...estRef.alignment, wrapText: true };
        if (estRef.fill && estRef.fill.type !== 'none') cell.fill = estRef.fill;
      }
    }

    // ── Escribir datos en las columnas correctas ──────────
    // Jerarquía
    row.getCell(1).value  = txt(p.proceso);        // A — PROCESO
    row.getCell(2).value  = txt(p.seccion);        // B — SECCIÓN
    row.getCell(3).value  = txt(p.actividad);      // C — ACTIVIDAD
    row.getCell(4).value  = txt(p.tarea);          // D — TAREA
    row.getCell(5).value  = bool(p.rutinario);     // E — RUTINARIO

    // Peligro
    row.getCell(6).value  = txt(p.peligro_clase);        // F — CLASIFICACIÓN
    row.getCell(7).value  = txt(p.peligro_descripcion);  // G — DESCRIPCIÓN
    row.getCell(8).value  = txt(p.efectos_posibles);     // H — EFECTOS POSIBLES

    // Controles existentes
    row.getCell(9).value  = txt(p.control_fuente);      // I — EN LA FUENTE
    row.getCell(10).value = txt(p.control_medio);       // J — EN EL MEDIO
    row.getCell(11).value = txt(p.control_trabajador);  // K — EN EL TRABAJADOR

    // Evaluación del riesgo
    row.getCell(12).value = num(p.nivel_deficiencia);    // L — ND
    row.getCell(13).value = num(p.nivel_exposicion);     // M — NE
    row.getCell(14).value = num(p.nivel_probabilidad);   // N — NP (calculado)
    row.getCell(15).value = txt(p.interpretacion_np);    // O — INTERPRETACIÓN NP
    row.getCell(16).value = num(p.nivel_consecuencias);  // P — NC
    row.getCell(17).value = num(p.nivel_riesgo);         // Q — NR (calculado)
    row.getCell(18).value = txt(p.aceptabilidad);        // R — ACEPTABILIDAD

    // Criterios para evaluar controles
    row.getCell(19).value = num(p.num_expuestos);        // S — N° EXPUESTOS
    row.getCell(20).value = txt(p.por_consecuencias);    // T — POR CONSECUENCIAS
    row.getCell(21).value = txt(p.requisito_legal);      // U — REQUISITO LEGAL

    // Medidas de intervención
    row.getCell(22).value = txt(p.medida_eliminacion);    // V — ELIMINACIÓN
    row.getCell(23).value = txt(p.medida_sustitucion);    // W — SUSTITUCIÓN
    row.getCell(24).value = txt(p.medida_ingenieria);     // X — INGENIERÍA
    row.getCell(25).value = txt(p.medida_administrativa); // Y — ADMINISTRATIVOS
    row.getCell(26).value = txt(p.medida_epp);            // Z — EPP

    // Plan de acción
    row.getCell(27).value = fecha(p.fecha_realizacion);  // AA — FECHA PLAN
    row.getCell(28).value = txt(p.responsable_plan);     // AB — RESPONSABLE

    // Verificación
    row.getCell(29).value = fecha(p.fecha_cierre);       // AC — FECHA CIERRE
    row.getCell(30).value = bool(p.cierre_efectivo);     // AD — CIERRE EFECTIVO
    row.getCell(31).value = txt(p.hallazgo_evidencia);   // AE — HALLAZGO
    row.getCell(32).value = txt(p.responsable_verificacion); // AF — RESP. VERIF.

    row.commit();
  });

  // 6️⃣ Generar nombre del archivo con filtro activo
  const anio    = new Date().getFullYear();
  const sufijo  = filtroLabel
    ? `_${filtroLabel.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 40)}`
    : '';
  const nombreArchivo = `RE-GS-10_MATRIZ_PELIGROS${sufijo}_${anio}.xlsx`;

  // 7️⃣ Exportar con saveAs
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    nombreArchivo,
  );

  return { ok: true, filas: peligros.length, archivo: nombreArchivo };
};