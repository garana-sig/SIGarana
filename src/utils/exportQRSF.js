// src/utils/exportQRSF.js  — v2  (ExcelJS, mismo patrón que exportPNC.js)
// ═══════════════════════════════════════════════════════════════════
// Mapeo de columnas VERIFICADO desde XML del archivo real:
//   Fila 6 = sección headers (IDENTIFICACION, CLASIFICACION, etc.)
//   Fila 7 = columna headers (N°, FECHA DE RECEPCION, ...)
//   Fila 8+ = DATOS
//
// A=N°  B=FECHA RECEPCION  C=INTERNO  D=EXTERNO  E=CLIENTE/AREA/PROVEEDOR
// F=PERSONAL  G=BUZON  H=TELEFONICA  I=DESCRIPCION DEL CASO  J=N° DE UNIDADES
// K=QUEJA  L=RECLAMO  M=SUGERENCIA  N=FELICITACION
// O=MAQUINARIA  P=INSUMO  Q=HUMANO  R=OTROS  S=DESCRIPCION DE LA CAUSA
// T=FECHA DE RESPUESTA  U=RESPUESTA  V=SI  W=NO  X=FIRMA
// ═══════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';
import { fmtFechaLarga, TALLAS } from '@/hooks/useQRSF';

const DATA_START_ROW = 8;
const tick = (v) => (v ? 'X' : '');
const fmt  = fmtFechaLarga;

const BORDER = {
  top:    { style: 'thin', color: { argb: 'FFA6B8C2' } },
  left:   { style: 'thin', color: { argb: 'FFA6B8C2' } },
  bottom: { style: 'thin', color: { argb: 'FFA6B8C2' } },
  right:  { style: 'thin', color: { argb: 'FFA6B8C2' } },
};
const FILL_ODD  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const FILL_EVEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9F5' } };

const applyStyle = (cell, fill, hAlign = 'center') => {
  cell.fill      = fill;
  cell.font      = { name: 'Calibri', size: 9 };
  cell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
  cell.border    = BORDER;
};

// ══════════════════════════════════════════════════════════════════
// EXPORTAR QRSF — con plantilla RE-GC-03 del Storage
// ══════════════════════════════════════════════════════════════════
export const exportQRSF = async (registros, filename = 'RE-GC-03_QRSF') => {
  try {
    console.log('📊 Descargando plantilla RE-GC-03...');
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('templates')
      .download('RE-GC-03_QUEJAS_RECLAMOS_SUGERENCIAS_FELICITACIONES.xlsx');

    if (dlErr || !fileData) {
      throw new Error(
        `Plantilla no encontrada. Sube "RE-GC-03_QUEJAS_RECLAMOS_SUGERENCIAS_FELICITACIONES.xlsx" ` +
        `al bucket "templates". Error: ${dlErr?.message || 'archivo no encontrado'}`
      );
    }
    console.log('✅ Plantilla descargada');

    const arrayBuffer = await fileData.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) throw new Error('No se encontró la hoja en la plantilla RE-GC-03.');

    // Limpiar filas de ejemplo existentes (si las hay)
    for (let r = DATA_START_ROW; r <= Math.max(ws.rowCount, DATA_START_ROW + registros.length); r++) {
      const row = ws.getRow(r);
      row.eachCell({ includeEmpty: true }, cell => { cell.value = null; });
    }

    // Escribir registros
    registros.forEach((reg, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const fill   = idx % 2 === 0 ? FILL_ODD : FILL_EVEN;
      const row    = ws.getRow(rowNum);
      row.height   = 20;

      const set = (col, val, align = 'center') => {
        const cell = ws.getCell(`${col}${rowNum}`);
        cell.value = val ?? '';
        applyStyle(cell, fill, align);
      };

      const clienteNombre = reg.cliente?.nombre || '';
      set('A', idx + 1);                               // N°
      set('B', fmt(reg.fecha_recepcion));               // FECHA RECEPCION
      set('C', tick(reg.canal_interno));                // INTERNO
      set('D', tick(reg.canal_externo));                // EXTERNO
      set('E', clienteNombre, 'left');                  // CLIENTE/AREA/PROVEEDOR
      set('F', tick(reg.canal_personal));               // PERSONAL
      set('G', tick(reg.canal_buzon));                  // BUZON
      set('H', tick(reg.canal_telefonica));             // TELEFONICA
      set('I', reg.descripcion_caso || '', 'left');     // DESCRIPCION DEL CASO
      set('J', reg.total_unidades ?? '');               // N° DE UNIDADES
      // CLASIFICACION
      set('K', tick(reg.tipo === 'queja'));              // QUEJA
      set('L', tick(reg.tipo === 'reclamo'));            // RECLAMO
      set('M', tick(reg.tipo === 'sugerencia'));         // SUGERENCIA
      set('N', tick(reg.tipo === 'felicitacion'));       // FELICITACION
      // ANALISIS DE CAUSAS
      set('O', tick(reg.causa_maquinaria));             // MAQUINARIA
      set('P', tick(reg.causa_insumo));                 // INSUMO
      set('Q', tick(reg.causa_humano));                 // HUMANO
      set('R', tick(reg.causa_otros));                  // OTROS
      set('S', reg.descripcion_causa || '', 'left');    // DESCRIPCION DE LA CAUSA
      // TRATAMIENTO
      set('T', fmt(reg.fecha_respuesta));               // FECHA DE RESPUESTA
      set('U', reg.respuesta || reg.tratamiento || '', 'left'); // RESPUESTA
      // CIERRE
      set('V', reg.is_cerrado ? 'X' : '');              // SI
      set('W', reg.is_cerrado ? '' : 'X');              // NO
      // X = FIRMA (vacío)

      row.commit();
    });

    // Fila vacía con bordes si no hay datos
    if (registros.length === 0) {
      const row = ws.getRow(DATA_START_ROW);
      row.height = 20;
      for (const col of ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W']) {
        ws.getCell(`${col}${DATA_START_ROW}`).border = BORDER;
      }
      row.commit();
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const today  = new Date().toLocaleDateString('es-CO',{ day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g,'-');
    saveAs(blob, `${filename}_${today}.xlsx`);
    console.log('✅ RE-GC-03 exportado correctamente');
    return true;
  } catch(err) {
    console.error('❌ exportQRSF:', err);
    throw err;
  }
};

// ══════════════════════════════════════════════════════════════════
// EXPORTAR DEVOLUCIONES — Excel limpio
// Formato fiel al documento físico: MES/AÑO/N° en cabecera,
// TALLAS en dos filas sin etiquetas "infantil/adulto"
// ══════════════════════════════════════════════════════════════════
export const exportDevoluciones = (registros, referencias, anio, mes, filename = 'DEVOLUCIONES') => {
  if (typeof ExcelJS === 'undefined') {
    // Fallback XLSX si ExcelJS no disponible en este contexto
    _exportDevolucionesSimple(registros, referencias, filename);
    return;
  }

  const wb  = new ExcelJS.Workbook();
  const ws  = wb.addWorksheet('Devoluciones');
  const getRef = (id) => referencias.find(r => r.id === id);

  const BRD = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
  const hFill = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{ argb } });
  const hFont = { name:'Calibri', bold:true, size:10, color:{ argb:'FF1F2937' } };

  const LABELS_F1 = ['U','2','4','6','8','10','12','14','16'];
  const LABELS_F2 = ['16','28','30','32','34','36','38','40','42'];
  const FIELDS_F1 = TALLAS.slice(0,9).map(t=>t.field);
  const FIELDS_F2 = TALLAS.slice(9,18).map(t=>t.field);

  // ── Fila 1: TÍTULO principal — abarca todas las columnas activas (A:AF) ──
  ws.getRow(1).height = 22;
  ws.getCell('A1').value = 'DEVOLUCIONES';
  ws.getCell('A1').font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  ws.getCell('A1').fill  = hFill('FF2E5244');
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell('A1').border = BRD;
  ws.mergeCells('A1:AF1'); // abarca todas las columnas activas del documento

  // ── Fila 2: MES / AÑO / N° ──────────────────────────────────
  ws.getRow(2).height = 18;
  const mesLabel = mes ? `MES: ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mes-1]?.toUpperCase() || mes}` : '';
  ws.getCell('A2').value = `${mesLabel}${anio ? `  ${anio}` : ''}`;
  ws.getCell('A2').font  = { bold: true, size: 11 };
  ws.mergeCells('A2:F2');

  // N° en cabecera derecha
  ws.getCell('U2').value = 'N°';
  ws.getCell('U2').font  = { bold: true };
  ws.mergeCells('U2:V2');

  // ── Fila 3: Sección headers ─────────────────────────────────
  ws.getRow(3).height = 16;

  ws.getCell('A3').value = 'RECEPCIÓN';
  ws.getCell('A3').fill  = hFill('FF2E5244');
  ws.getCell('A3').font  = { bold:true, color:{ argb:'FFFFFFFF' }, size:9 };
  ws.getCell('A3').alignment = { horizontal:'center', vertical:'middle' };
  ws.getCell('A3').border = BRD;
  ws.mergeCells('A3:E3');

  ws.getCell('F3').value = 'TALLAS';
  ws.getCell('F3').fill  = hFill('FF548235');
  ws.getCell('F3').font  = { bold:true, color:{ argb:'FFFFFFFF' }, size:9 };
  ws.getCell('F3').alignment = { horizontal:'center', vertical:'middle' };
  ws.getCell('F3').border = BRD;
  ws.mergeCells('F3:W3');

  ws.getCell('X3').value = 'TOTAL';
  ws.getCell('X3').fill  = hFill('FF2E5244');
  ws.getCell('X3').font  = { bold:true, color:{ argb:'FFFFFFFF' }, size:9 };
  ws.getCell('X3').alignment = { horizontal:'center', vertical:'middle' };
  ws.getCell('X3').border = BRD;

  ws.getCell('Y3').value = 'RECLASIFICACIÓN';
  ws.getCell('Y3').fill  = hFill('FFD97706');
  ws.getCell('Y3').font  = { bold:true, color:{ argb:'FFFFFFFF' }, size:9 };
  ws.getCell('Y3').alignment = { horizontal:'center', vertical:'middle' };
  ws.getCell('Y3').border = BRD;
  ws.mergeCells('Y3:AD3');

  ws.getCell('AE3').value = 'RESPUESTA';
  ws.getCell('AE3').fill  = hFill('FF2E75B6');
  ws.getCell('AE3').font  = { bold:true, color:{ argb:'FFFFFFFF' }, size:9 };
  ws.getCell('AE3').alignment = { horizontal:'center', vertical:'middle' };
  ws.getCell('AE3').border = BRD;
  ws.mergeCells('AE3:AF3');

  // ── Filas 4-5: Sub-headers columnas ─────────────────────────
  ws.getRow(4).height = 16;
  ws.getRow(5).height = 16;

  const hdr = (cell, text, fillArgb='FFDEEAF1', color='FF1F2937') => {
    const c = ws.getCell(cell);
    c.value = text; c.fill = hFill(fillArgb);
    c.font  = { bold:true, size:9, color:{ argb:color } };
    c.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    c.border = BRD;
  };

  // Recepción headers con merge filas 4-5
  hdr('A4','N°'); ws.mergeCells('A4:A5');
  hdr('B4','FECHA\nDEVOL.'); ws.mergeCells('B4:B5');
  hdr('C4','REF'); ws.mergeCells('C4:C5');
  hdr('D4','CAN'); ws.mergeCells('D4:D5');
  hdr('E4','FACTURA /\nREMISIÓN'); ws.mergeCells('E4:E5');

  // TALLAS fila superior (F-N fila 4): U 2 4 6 8 10 12 14 16
  LABELS_F1.forEach((lbl, i) => {
    const col = String.fromCharCode(70 + i); // F=70
    hdr(`${col}4`, lbl, 'FF70AD47', 'FF1F2937');
  });
  // TALLAS fila inferior (O-W fila 5): 16 28 30 32 34 36 38 40 42
  LABELS_F2.forEach((lbl, i) => {
    const col = String.fromCharCode(79 + i); // O=79
    hdr(`${col}5`, lbl, 'FF375623', 'FFFFFFFF');
  });

  hdr('X4','TOTAL'); ws.mergeCells('X4:X5');

  // Reclasif
  hdr('Y4','REPA-\nRACIÓN'); ws.mergeCells('Y4:Y5');
  hdr('Z4','LÍNEA'); ws.mergeCells('Z4:Z5');
  hdr('AA4','APRO-\nVECH.'); ws.mergeCells('AA4:AA5');
  hdr('AB4','DE-\nSECHO'); ws.mergeCells('AB4:AB5');
  hdr('AC4','CAUSA'); ws.mergeCells('AC4:AC5');
  hdr('AD4','FECHA\nINGRESO\nBODEGA'); ws.mergeCells('AD4:AD5');

  // Respuesta
  hdr('AE4','FECHA\nRESP.'); ws.mergeCells('AE4:AE5');
  hdr('AF4','DESCRIPCIÓN'); ws.mergeCells('AF4:AF5');

  // ── Anchos de columna ────────────────────────────────────────
  ws.getColumn('A').width = 5;
  ws.getColumn('B').width = 11;
  ws.getColumn('C').width = 8;
  ws.getColumn('D').width = 5;
  ws.getColumn('E').width = 14;
  for (let i = 6; i <= 23; i++) ws.getColumn(i).width = 4.5; // tallas F-W
  ws.getColumn('X').width = 7;
  ws.getColumn('Y').width = 8; ws.getColumn('Z').width = 7;
  ws.getColumn('AA').width = 8; ws.getColumn('AB').width = 7;
  ws.getColumn('AC').width = 18; ws.getColumn('AD').width = 11;
  ws.getColumn('AE').width = 11; ws.getColumn('AF').width = 22;

  // ── Filas de datos (desde fila 6) ───────────────────────────
  const DATA_ROW = 6;
  registros.forEach((r, idx) => {
    const rowN = DATA_ROW + idx;
    const ref  = getRef(r.referencia_id);
    const fill = hFill(idx%2===0 ? 'FFFFFFFF' : 'FFF8FDF9');
    const row  = ws.getRow(rowN);
    row.height = 16;

    const setD = (col, val, align='center') => {
      const c = ws.getCell(`${col}${rowN}`);
      c.value = val ?? ''; c.fill = fill;
      c.font  = { name:'Calibri', size:9 };
      c.alignment = { horizontal:align, vertical:'middle' };
      c.border = BRD;
    };

    setD('A', idx+1);
    setD('B', fmtFechaLarga(r.fecha_devolucion));
    setD('C', ref?.ref || '');
    setD('D', ref?.categoria?.slice(0,6) || '');
    setD('E', r.factura_remision || '', 'left');
    // Tallas fila 1 (F-N)
    FIELDS_F1.forEach((f,i) => setD(String.fromCharCode(70+i), r[f] ?? ''));
    // Tallas fila 2 (O-W)
    FIELDS_F2.forEach((f,i) => setD(String.fromCharCode(79+i), r[f] ?? ''));
    setD('X', r.total_unidades ?? 0);
    setD('Y', r.reclass_reparacion      ? 'X' : '');
    setD('Z', r.reclass_linea           ? 'X' : '');
    setD('AA', r.reclass_aprovechamiento? 'X' : '');
    setD('AB', r.reclass_desecho        ? 'X' : '');
    setD('AC', r.reclass_causa || '', 'left');
    setD('AD', fmtFechaLarga(r.reclass_fecha_ingreso));
    setD('AE', fmtFechaLarga(r.resp_fecha));
    setD('AF', r.resp_descripcion || '', 'left');

    row.commit();
  });

  wb.xlsx.writeBuffer().then(buffer => {
    const blob  = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const today = new Date().toLocaleDateString('es-CO',{ day:'2-digit',month:'2-digit',year:'numeric' }).replace(/\//g,'-');
    saveAs(blob, `${filename}_${today}.xlsx`);
  });
};

// Fallback simple con XLSX si ExcelJS no carga
const _exportDevolucionesSimple = (registros, referencias, filename) => {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Error: librería Excel no disponible'); return; }
  const getRef = (id) => referencias.find(r => r.id === id);
  const h = ['N°','CONSEC.','AÑO','FECHA','REF','FACTURA','U','2','4','6','8','10','12','14','16','16','28','30','32','34','36','38','40','42','TOTAL','REPARACIÓN','LÍNEA','APROVECH.','DESECHO','CAUSA','F.INGRESO','F.RESP.','DESCRIPCIÓN'];
  const rows = registros.map((r,i) => {
    const ref = getRef(r.referencia_id);
    return [i+1, String(r.consecutivo).padStart(2,'0'), r.anio, fmtFechaLarga(r.fecha_devolucion),
      ref?.ref||'', r.factura_remision||'',
      ...TALLAS.map(t=>r[t.field]??''),
      r.total_unidades??0,
      r.reclass_reparacion?'X':'', r.reclass_linea?'X':'', r.reclass_aprovechamiento?'X':'', r.reclass_desecho?'X':'',
      r.reclass_causa||'', fmtFechaLarga(r.reclass_fecha_ingreso),
      fmtFechaLarga(r.resp_fecha), r.resp_descripcion||''];
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([h, ...rows]);
  ws['!cols'] = h.map((_,i)=>({ wch: i<6?14:i<24?5:20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');
  XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString('es-CO').replace(/\//g,'-')}.xlsx`);
};

export default exportQRSF;