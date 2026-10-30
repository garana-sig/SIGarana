// src/utils/exportListadoMaestro.js
// ═══════════════════════════════════════════════════════════════════════
// v3 (oct 2026) — Exporta sobre el formato vigente de Gestión Documental
// (formato_vinculado 'listado_maestro' → hoy RE-GS-07 v02). El encabezado
// (código, versión, fecha, página) es el del Listado Maestro: no se toca.
//
// Las columnas se ubican por el TEXTO de los encabezados del formato
// (fila con "CODIGO" / "NOMBRE DEL DOCUMENTO" y la fila siguiente), así un
// ajuste menor del formato no rompe la exportación:
//   A. CONTROL DE DOCUMENTOS: PROCESO · CODIGO · NOMBRE · TIPO (Manual,
//      Procedimiento, Documento específico, Formato) · VERSION · FECHA
//      CREACION · RESPONSABLE
//   B. CONTROL DE REGISTROS: UBICACIÓN · DIGITAL · FISICO · CENTRAL · GESTION
//      (años) · CONSERVACION TOTAL · SELECCIÓN · ELIMINACION · VERSION
//      ACTUAL · VERSION NUEVA · FECHA DE CAMBIO · MOTIVO DE CAMBIO
// Orden: procesos según process.display_order → tipo (MN, PR, PL, GU, IN, RE)
// → número. La columna PROCESO va fusionada por bloque, como en el formato.
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';

const ORDEN_TIPOS = ['MN', 'PR', 'PL', 'GU', 'IN', 'RE'];
const clon = (st) => JSON.parse(JSON.stringify(st || {}));
const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();
const v2 = (n) => String(n).padStart(2, '0');
const X = (b) => (b ? 'X' : null);
const fmtFecha = (s) => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : null;
};
const hoyCO = () => {
  const d = new Date();
  return `${v2(d.getDate())}-${v2(d.getMonth() + 1)}-${d.getFullYear()}`;
};

// Columnas del formato: clave interna → textos posibles del encabezado
const COLUMNAS = {
  proceso:      ['PROCESO'],
  codigo:       ['CODIGO'],
  nombre:       ['NOMBRE DEL DOCUMENTO', 'NOMBRE'],
  manual:       ['MANUAL'],
  procedimiento:['PROCEDIMIENTO'],
  especifico:   ['DOCUMENTO ESPECIFICO'],
  formato:      ['FORMATO'],
  version:      ['VERSION'],
  creacion:     ['FECHA CREACION', 'FECHA DE CREACION'],
  responsable:  ['RESPONSABLE'],
  ubicacion:    ['UBICACION DE ALMACENAMIENTO', 'UBICACION'],
  digital:      ['DIGITAL', 'MAGNETICO'],
  fisico:       ['FISICO'],
  central:      ['CENTRAL'],
  gestion:      ['GESTION'],
  conservacion: ['CONSERVACION TOTAL'],
  seleccion:    ['SELECCION'],
  eliminacion:  ['ELIMINACION'],
  verActual:    ['VERSION ACTUAL'],
  verNueva:     ['VERSION NUEVA'],
  fechaCambio:  ['FECHA DE CAMBIO'],
  motivo:       ['MOTIVO DE CAMBIO', 'MOTIVO'],
};

// Ubica la fila de encabezados y arma { clave: númeroDeColumna }
function mapearColumnas(ws) {
  let filaEnc = null;
  for (let r = 1; r <= Math.min(ws.rowCount, 30) && !filaEnc; r++) {
    const textos = [];
    ws.getRow(r).eachCell((c) => textos.push(norm(c.value)));
    if (textos.includes('CODIGO') && textos.some((t) => t.startsWith('NOMBRE'))) filaEnc = r;
  }
  if (!filaEnc) throw new Error('No se encontró la fila de encabezados (CODIGO / NOMBRE DEL DOCUMENTO) en el formato.');

  const cols = {};
  [filaEnc, filaEnc + 1].forEach((r) => {
    ws.getRow(r).eachCell((c, n) => {
      const t = norm(c.value);
      Object.entries(COLUMNAS).forEach(([k, alias]) => {
        if (!cols[k] && alias.some((a) => t === a)) cols[k] = n;
      });
    });
  });
  const faltan = ['codigo', 'nombre', 'version'].filter((k) => !cols[k]);
  if (faltan.length) throw new Error(`El formato no tiene las columnas: ${faltan.join(', ')}.`);
  return { cols, dataStart: filaEnc + 2, ultimaCol: Math.max(...Object.values(cols)) };
}

const tipoDe = (d) => d.document_type?.code || d.document_type_code || String(d.code || '').slice(0, 2);
const ordenTipo = (d) => { const i = ORDEN_TIPOS.indexOf(tipoDe(d)); return i === -1 ? 99 : i; };

// ── Rellena el workbook (separado de la descarga para poder probarlo) ──
export function fillListadoMaestro(wb, { documentos, procesos = [] }) {
  const ws = wb.worksheets[0];
  const { cols, dataStart, ultimaCol } = mapearColumnas(ws);

  // Estilo base: el de la primera fila de datos del formato
  const base = {};
  for (let c = 1; c <= ultimaCol; c++) base[c] = clon(ws.getRow(dataStart).getCell(c).style);
  const alturaBase = ws.getRow(dataStart).height || 15.75;

  // Quitar fusiones y datos de ejemplo desde la primera fila de datos
  Object.keys(ws._merges || {}).forEach((k) => {
    const m = ws._merges[k];
    const top = m?.model?.top ?? m?.top;
    if (top >= dataStart) { try { ws.unMergeCells(m.range || k); } catch { /* */ } }
  });
  for (let r = dataStart; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= ultimaCol; c++) row.getCell(c).value = null;
  }

  // Orden: proceso (display_order) → tipo → código
  const ordProc = new Map([...procesos]
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99) || String(a.name).localeCompare(String(b.name)))
    .map((p, i) => [p.id, i]));
  const docs = [...documentos].sort((a, b) =>
    (ordProc.get(a.process_id) ?? 999) - (ordProc.get(b.process_id) ?? 999) ||
    ordenTipo(a) - ordenTipo(b) ||
    String(a.code || '').localeCompare(String(b.code || ''), 'es', { numeric: true }));

  let r = dataStart;
  let inicioBloque = r, procActual = null;
  const cerrarBloque = (hasta) => {
    if (!cols.proceso || procActual == null) return;
    if (hasta > inicioBloque) ws.mergeCells(inicioBloque, cols.proceso, hasta, cols.proceso);
    const cell = ws.getRow(inicioBloque).getCell(cols.proceso);
    cell.value = procActual;
    cell.style = { ...clon(cell.style), alignment: { vertical: 'middle', horizontal: 'center', wrapText: true, textRotation: hasta > inicioBloque + 2 ? 90 : 0 } };
  };

  docs.forEach((d) => {
    const proc = (d.process?.name || 'SIN PROCESO').toUpperCase();
    if (proc !== procActual) { cerrarBloque(r - 1); procActual = proc; inicioBloque = r; }

    const row = ws.getRow(r);
    row.height = alturaBase;
    for (let c = 1; c <= ultimaCol; c++) row.getCell(c).style = clon(base[c]);

    const ver = Number(d.version || 1);
    const cambio = ver > 1;
    const t = tipoDe(d);
    const set = (k, v, h = 'center') => {
      if (!cols[k]) return;
      const cell = row.getCell(cols[k]);
      cell.value = v ?? null;
      cell.style = { ...clon(cell.style), alignment: { vertical: 'middle', horizontal: h, wrapText: true } };
    };
    set('codigo', d.code, 'left');
    set('nombre', (d.name || '').trim().toUpperCase(), 'left');
    set('manual', X(t === 'MN'));
    set('procedimiento', X(t === 'PR'));
    set('formato', X(t === 'RE'));
    set('especifico', X(!['MN', 'PR', 'RE'].includes(t)));   // guías, instructivos, planes
    set('version', ver);
    set('creacion', fmtFecha(d.change_date || d.created_at));   // fecha de la versión vigente
    set('responsable', d.responsible || null, 'left');
    set('ubicacion', d.storage_location || null, 'left');
    set('digital', X(d.file_type_magnetic));
    set('fisico', X(d.file_type_physical));
    set('central', d.retention_central ?? null);
    set('gestion', d.retention_management ?? null);
    set('conservacion', X(d.disposition_total_conservation));
    set('seleccion', X(d.disposition_selection));
    set('eliminacion', X(d.disposition_elimination));
    set('verActual', cambio ? ver - 1 : null);
    set('verNueva', cambio ? ver : null);
    set('fechaCambio', cambio ? fmtFecha(d.change_date) : null);
    set('motivo', cambio ? (d.change_reason || null) : null, 'left');
    // Alto de fila según el texto más largo (nombre ≈ 46 car., motivo/ubicación ≈ 18)
    const lineas = Math.max(
      Math.ceil(((d.name || '').length || 1) / 46),
      Math.ceil(((cambio ? d.change_reason : '') || '').length / 18) || 1,
      Math.ceil(((d.storage_location || '').length || 1) / 30),
    );
    row.height = Math.max(alturaBase, 12.5 * lineas + 3);
    row.commit();
    r++;
  });
  cerrarBloque(r - 1);

  // Filas sobrantes del formato: se dejan vacías con el estilo base
  for (let k = r; k <= ws.rowCount; k++) {
    const row = ws.getRow(k);
    for (let c = 1; c <= ultimaCol; c++) { row.getCell(c).value = null; row.getCell(c).style = clon(base[c]); }
  }

  ws.pageSetup = {
    ...ws.pageSetup,
    orientation: 'landscape',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printTitlesRow: `${dataStart - 4 > 0 ? dataStart - 4 : 1}:${dataStart - 1}`,
  };
  return { filas: docs.length };
}

// ═══════════════════════════════════════════════════════════════════════
// @param {Array}  documentos — documentos a exportar (ya filtrados en pantalla), con process { name }
// @param {Array}  procesos   — procesos (id, name, display_order) para el orden
// @param {object} formato    — documento vinculado (useFormato('listado_maestro'))
// ═══════════════════════════════════════════════════════════════════════
export async function exportListadoMaestro({ documentos, procesos = [], formato }) {
  if (!documentos?.length) throw new Error('No hay documentos para exportar.');
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  fillListadoMaestro(wb, { documentos, procesos });
  const out = await wb.xlsx.writeBuffer();
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato?.code || 'RE-GS-07'}_LISTADO_MAESTRO_${hoyCO()}.xlsx`);
  return true;
}
