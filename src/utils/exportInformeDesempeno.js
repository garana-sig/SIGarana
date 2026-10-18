// src/utils/exportInformeDesempeno.js
// ═══════════════════════════════════════════════════════════════════════
// Informe de Evaluación del Desempeño (Excel, UNA sola hoja)
// Patrón del SIG: plantilla del bucket `templates` (solo el encabezado
// del formato de calidad) + ExcelJS + file-saver.
//
// Contenido (hoja "INFORME", columnas B..O):
//   1. Resumen del período: aplican, evaluados, pendientes, inactivos,
//      cobertura, promedio, nivel promedio, % sobre meta
//   2. Distribución por nivel (real vs meta)  + gráfica
//   3. Por departamento y por categoría        + gráfica
//   4. Listado de colaboradores con sus métricas
//      (puntaje, %, nivel, promedio por categoría y estado)
//
// Las gráficas se dibujan en el navegador (canvas) y se insertan como
// imagen: ExcelJS no crea gráficos nativos. Los datos de cada gráfica
// quedan en la tabla de al lado.
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

export const TEMPLATE_FILE = 'INFORME_EVALUACION_DESEMPENO.xlsx';
// Datos de control del formato (se escriben en el encabezado — cámbialos aquí)
export const FORMATO = { codigo: 'RE-GH-XX', version: '01', fecha: '' };

const PUNTAJE_MAX = 85;
const NIVELES = [
  'Sobresaliente',
  'Mejora Expectativas',
  'Alcanza Expectativas',
  'Debajo de las Expectativas',
  'Muy debajo de las Expectativas',
];
const COLOR_NIVEL = {
  'Sobresaliente': '2E5244',
  'Mejora Expectativas': '6DBD96',
  'Alcanza Expectativas': '6F7B2C',
  'Debajo de las Expectativas': 'D97706',
  'Muy debajo de las Expectativas': 'EF4444',
};
// Metas del Plan (mismas del Dashboard)
const METAS = {
  'Sobresaliente': 50, 'Mejora Expectativas': 30, 'Alcanza Expectativas': 10,
  'Debajo de las Expectativas': 5, 'Muy debajo de las Expectativas': 5,
};

export function calcularNivel(p) {
  if (p >= 69) return 'Sobresaliente';
  if (p >= 52) return 'Mejora Expectativas';
  if (p >= 35) return 'Alcanza Expectativas';
  if (p >= 18) return 'Debajo de las Expectativas';
  return 'Muy debajo de las Expectativas';
}

// ── Estilos ─────────────────────────────────────────────────────────────
const C_VERDE = 'FF2E5244';
const THIN = { style: 'thin', color: { argb: 'FFB9C9C1' } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const F = (o = {}) => ({ name: 'Arial', size: 9, ...o });
const fill = (hex) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: hex.length === 6 ? `FF${hex}` : hex } });

const fmtFecha = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : '';
};
const hoy = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

function celda(ws, addr, value, { font, align = 'center', bg, border = true, numFmt } = {}) {
  const c = ws.getCell(addr);
  c.value = value;
  c.font = F(font);
  c.alignment = { horizontal: align, vertical: 'middle', wrapText: true };
  if (bg) c.fill = fill(bg);
  if (border) c.border = BOX;
  if (numFmt) c.numFmt = numFmt;
  return c;
}
function rango(ws, r1, c1, r2, c2, value, opts = {}) {
  if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
  const c = celda(ws, ws.getCell(r1, c1).address, value, opts);
  if (opts.border !== false) {
    for (let r = r1; r <= r2; r++) for (let k = c1; k <= c2; k++) ws.getCell(r, k).border = BOX;
  }
  return c;
}
function tituloSeccion(ws, row, texto) {
  rango(ws, row, 2, row, 15, texto, { font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }, align: 'left', bg: C_VERDE });
  ws.getRow(row).height = 18;
}

// ── Gráficas (canvas → PNG) ─────────────────────────────────────────────
function canvas(w, h) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  const k = 2; // nitidez
  cv.width = w * k; cv.height = h * k;
  const ctx = cv.getContext('2d');
  ctx.scale(k, k);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  return { cv, ctx };
}

function chartRealVsMeta(dist) {
  const W = 520, H = 240;
  const c = canvas(W, H); if (!c) return null;
  const { cv, ctx } = c;
  const left = 36, right = 12, top = 30, bottom = 46;
  const pw = W - left - right, ph = H - top - bottom;
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#1a2e25';
  ctx.fillText('Distribución real vs meta (%)', left, 18);
  // ejes y grilla 0..100
  ctx.font = '9px Arial'; ctx.textAlign = 'right';
  for (let v = 0; v <= 100; v += 25) {
    const y = top + ph - (v / 100) * ph;
    ctx.strokeStyle = '#e4ede8'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W - right, y); ctx.stroke();
    ctx.fillStyle = '#5a7a6a'; ctx.fillText(String(v), left - 4, y + 3);
  }
  const g = pw / dist.length, bw = Math.min(26, g / 3);
  dist.forEach((d, i) => {
    const x0 = left + i * g + g / 2;
    const hr = (d.real / 100) * ph, hm = (d.meta / 100) * ph;
    ctx.fillStyle = '#c8d9d1'; ctx.fillRect(x0 - bw - 2, top + ph - hm, bw, hm);
    ctx.fillStyle = `#${COLOR_NIVEL[d.nivel]}`; ctx.fillRect(x0 + 2, top + ph - hr, bw, hr);
    ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'center'; ctx.font = 'bold 9px Arial';
    ctx.fillText(`${d.real}%`, x0 + 2 + bw / 2, top + ph - hr - 4);
    ctx.font = '9px Arial'; ctx.fillStyle = '#5a7a6a';
    ctx.fillText(d.corto, x0, top + ph + 14);
  });
  // leyenda
  ctx.textAlign = 'left'; ctx.font = '9px Arial';
  ctx.fillStyle = '#c8d9d1'; ctx.fillRect(left, H - 16, 10, 10);
  ctx.fillStyle = '#5a7a6a'; ctx.fillText('Meta', left + 14, H - 7);
  ctx.fillStyle = '#6dbd96'; ctx.fillRect(left + 60, H - 16, 10, 10);
  ctx.fillStyle = '#5a7a6a'; ctx.fillText('Real', left + 74, H - 7);
  return cv.toDataURL('image/png');
}

function chartCategorias(cats) {
  const W = 520, H = 40 + cats.length * 40;
  const c = canvas(W, H); if (!c) return null;
  const { cv, ctx } = c;
  const left = 190, right = 50, top = 32;
  const pw = W - left - right;
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'left';
  ctx.fillText('Promedio por categoría (escala 1 a 5)', 12, 18);
  cats.forEach((cat, i) => {
    const y = top + i * 40;
    ctx.font = '10px Arial'; ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'right';
    const nombre = cat.nombre.length > 30 ? `${cat.nombre.slice(0, 29)}…` : cat.nombre;
    ctx.fillText(nombre, left - 8, y + 16);
    ctx.fillStyle = '#e4ede8'; ctx.fillRect(left, y + 6, pw, 16);
    const w = cat.prom ? (cat.prom / 5) * pw : 0;
    ctx.fillStyle = cat.prom >= 4 ? '#2e5244' : cat.prom >= 3 ? '#6dbd96' : '#d97706';
    ctx.fillRect(left, y + 6, w, 16);
    ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'left'; ctx.font = 'bold 10px Arial';
    ctx.fillText(cat.prom ? cat.prom.toFixed(2) : '—', left + w + 6, y + 18);
  });
  return cv.toDataURL('image/png');
}

// ── Promedios por categoría de cada evaluación ──────────────────────────
async function cargarPromediosCategoria(evalIds) {
  if (!evalIds.length) return {};
  const out = {}; // evalId → { catId: { suma, n } }
  for (let i = 0; i < evalIds.length; i += 150) {
    const lote = evalIds.slice(i, i + 150);
    const { data, error } = await supabase
      .from('ec_evaluacion_detalle')
      .select('evaluacion_id, respuesta, pregunta:ec_pregunta(categoria_id)')
      .in('evaluacion_id', lote);
    if (error) throw error;
    (data || []).forEach((d) => {
      const cat = d.pregunta?.categoria_id;
      if (!cat) return;
      out[d.evaluacion_id] = out[d.evaluacion_id] || {};
      const o = (out[d.evaluacion_id][cat] = out[d.evaluacion_id][cat] || { suma: 0, n: 0 });
      o.suma += Number(d.respuesta) || 0; o.n += 1;
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// Arma el contenido (separado de la descarga para poder probarlo)
// ═══════════════════════════════════════════════════════════════════════
export function fillInforme(wb, {
  periodoNombre, deptoFiltro, filas, categorias, promCat, graficas = true,
}) {
  const ws = wb.getWorksheet('INFORME') || wb.worksheets[0];

  // Encabezado (datos de control)
  ws.getCell('N2').value = FORMATO.codigo;
  ws.getCell('O2').value = FORMATO.version;
  ws.getCell('N4').value = FORMATO.fecha || hoy();

  const evaluados  = filas.filter((f) => f.estado === 'Evaluado');
  const pendientes = filas.filter((f) => f.estado === 'Pendiente');
  const inactivos  = filas.filter((f) => f.estado === 'Inactivo');
  const aplican = evaluados.length + pendientes.length;
  const n = evaluados.length;
  const prom = n ? Math.round(evaluados.reduce((s, f) => s + f.ev.puntaje_total, 0) / n) : 0;
  const cobertura = aplican ? n / aplican : 0;
  const sobreMeta = n ? evaluados.filter((f) => ['Sobresaliente', 'Mejora Expectativas'].includes(f.ev.nivel_desempeno)).length / n : 0;

  // ── Datos generales ──
  let r = 6;
  rango(ws, r, 2, r, 8, `Período evaluado: ${periodoNombre}`, { font: { bold: true, size: 10 }, align: 'left', border: false });
  rango(ws, r, 9, r, 15, `Departamento: ${deptoFiltro || 'Todos'}   ·   Generado: ${hoy()}`, { align: 'right', border: false, font: { color: { argb: 'FF5A7A6A' } } });

  // ── 1. Resumen ──
  r = 8; tituloSeccion(ws, r, '1. RESUMEN DEL PERÍODO');
  const kpis = [
    [2, 3, 'Colaboradores que aplican', aplican],
    [4, 4, 'Evaluados', n],
    [5, 5, 'Pendientes', pendientes.length],
    [6, 6, 'Inactivos (no aplican)', inactivos.length],
    [7, 8, 'Cobertura', { v: cobertura, fmt: '0%' }],
    [9, 10, 'Puntaje promedio', `${prom} / ${PUNTAJE_MAX}`],
    [11, 13, 'Nivel promedio', n ? calcularNivel(prom) : '—'],
    [14, 15, '% Sobre meta (Mejora + Sobresaliente)', { v: sobreMeta, fmt: '0%' }],
  ];
  kpis.forEach(([c1, c2, label, val]) => {
    rango(ws, r + 1, c1, r + 1, c2, label, { font: { size: 8, color: { argb: 'FF5A7A6A' } }, bg: 'F4F7F5' });
    const isObj = val && typeof val === 'object';
    rango(ws, r + 2, c1, r + 2, c2, isObj ? val.v : val, { font: { bold: true, size: 13, color: { argb: C_VERDE } }, numFmt: isObj ? val.fmt : undefined });
  });
  ws.getRow(r + 1).height = 24; ws.getRow(r + 2).height = 24;

  // ── 2. Distribución por nivel ──
  r = 12; tituloSeccion(ws, r, '2. DISTRIBUCIÓN POR NIVEL DE DESEMPEÑO (REAL VS META)');
  const dist = NIVELES.map((nv) => {
    const cant = evaluados.filter((f) => f.ev.nivel_desempeno === nv).length;
    return { nivel: nv, cant, real: n ? Math.round((cant / n) * 100) : 0, meta: METAS[nv],
      corto: { 'Sobresaliente': 'Sobresal.', 'Mejora Expectativas': 'Mejora', 'Alcanza Expectativas': 'Alcanza', 'Debajo de las Expectativas': 'Debajo', 'Muy debajo de las Expectativas': 'Muy bajo' }[nv] };
  });
  const hd = r + 1;
  rango(ws, hd, 2, hd, 3, 'Nivel', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(hd, 4).address, 'Cantidad', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(hd, 5).address, '% Real', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(hd, 6).address, 'Meta %', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(hd, 7).address, 'Diferencia', { font: { bold: true }, bg: 'DEEAE3' });
  dist.forEach((d, i) => {
    const rr = hd + 1 + i;
    rango(ws, rr, 2, rr, 3, d.nivel, { align: 'left', font: { bold: true, color: { argb: `FF${COLOR_NIVEL[d.nivel]}` } } });
    celda(ws, ws.getCell(rr, 4).address, d.cant);
    celda(ws, ws.getCell(rr, 5).address, d.real / 100, { numFmt: '0%' });
    celda(ws, ws.getCell(rr, 6).address, d.meta / 100, { numFmt: '0%' });
    const dif = (d.real - d.meta) / 100;
    celda(ws, ws.getCell(rr, 7).address, dif, { numFmt: '+0%;-0%;0%', font: { bold: true, color: { argb: dif >= 0 ? 'FF2E5244' : 'FFD97706' } } });
  });
  const img1 = graficas ? chartRealVsMeta(dist) : null;
  if (img1) ws.addImage(wb.addImage({ base64: img1, extension: 'png' }), { tl: { col: 7.3, row: hd - 1 }, ext: { width: 520, height: 240 } });

  // ── 3. Departamento y categorías ──
  r = 26; tituloSeccion(ws, r, '3. RESULTADOS POR DEPARTAMENTO Y POR CATEGORÍA');
  let rr = r + 1;
  rango(ws, rr, 2, rr, 3, 'Departamento', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(rr, 4).address, 'Evaluados', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(rr, 5).address, 'Pendientes', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(rr, 6).address, 'Promedio', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(rr, 7).address, 'Nivel', { font: { bold: true }, bg: 'DEEAE3' });
  ['Operativo', 'Administrativo'].forEach((dep) => {
    rr++;
    const evs = evaluados.filter((f) => f.emp.departamento === dep);
    const p = evs.length ? Math.round(evs.reduce((s, f) => s + f.ev.puntaje_total, 0) / evs.length) : 0;
    rango(ws, rr, 2, rr, 3, dep, { align: 'left', font: { bold: true } });
    celda(ws, ws.getCell(rr, 4).address, evs.length);
    celda(ws, ws.getCell(rr, 5).address, pendientes.filter((f) => f.emp.departamento === dep).length);
    celda(ws, ws.getCell(rr, 6).address, evs.length ? p : '—');
    celda(ws, ws.getCell(rr, 7).address, evs.length ? calcularNivel(p) : '—', { font: { size: 8 } });
  });

  // promedio por categoría (todas las evaluaciones del período)
  rr += 2;
  rango(ws, rr, 2, rr, 3, 'Categoría', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(rr, 4).address, 'Promedio (1-5)', { font: { bold: true }, bg: 'DEEAE3' });
  celda(ws, ws.getCell(rr, 5).address, '%', { font: { bold: true }, bg: 'DEEAE3' });
  const catsProm = categorias.map((cat) => {
    let suma = 0, k = 0;
    evaluados.forEach((f) => { const o = promCat[f.ev.id]?.[cat.id]; if (o?.n) { suma += o.suma / o.n; k++; } });
    return { id: cat.id, nombre: cat.nombre, prom: k ? suma / k : null };
  });
  catsProm.forEach((c) => {
    rr++;
    rango(ws, rr, 2, rr, 3, c.nombre, { align: 'left' });
    celda(ws, ws.getCell(rr, 4).address, c.prom != null ? Number(c.prom.toFixed(2)) : '—', { numFmt: '0.00' });
    celda(ws, ws.getCell(rr, 5).address, c.prom != null ? c.prom / 5 : '—', { numFmt: '0%' });
  });
  const img2 = graficas ? chartCategorias(catsProm) : null;
  if (img2) ws.addImage(wb.addImage({ base64: img2, extension: 'png' }), { tl: { col: 7.3, row: r }, ext: { width: 520, height: 40 + catsProm.length * 40 } });

  // ── 4. Listado de colaboradores ──
  r = Math.max(rr + 2, r + 2 + Math.ceil((40 + catsProm.length * 40) / 20) + 1);
  tituloSeccion(ws, r, '4. LISTADO DE COLABORADORES Y MÉTRICAS');
  const hdr = r + 1;
  const cabeceras = ['#', 'Colaborador', 'Cargo', 'Departamento', 'Evaluador', 'Fecha', 'Puntaje', '%', 'Nivel',
    ...categorias.slice(0, 4).map((c) => c.nombre), 'Estado'];
  cabeceras.forEach((h, i) => celda(ws, ws.getCell(hdr, 2 + i).address, h, { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 }, bg: C_VERDE }));
  ws.getRow(hdr).height = 50;
  ws.pageSetup.printTitlesRow = `${hdr}:${hdr}`;

  const orden = { Evaluado: 0, Pendiente: 1, Inactivo: 2 };
  const lista = [...filas].sort((a, b) =>
    orden[a.estado] - orden[b.estado] ||
    (b.ev?.puntaje_total || 0) - (a.ev?.puntaje_total || 0) ||
    a.emp.nombre_completo.localeCompare(b.emp.nombre_completo, 'es'));

  lista.forEach((f, i) => {
    const row = hdr + 1 + i;
    const ev = f.ev;
    const zebra = i % 2 ? 'F7FAF8' : 'FFFFFF';
    const vals = [
      i + 1, f.emp.nombre_completo, f.emp.cargo || '', f.emp.departamento || '',
      ev?.evaluador?.full_name || '', ev ? fmtFecha(ev.fecha_evaluacion) : '',
      ev ? ev.puntaje_total : '', ev ? ev.puntaje_total / PUNTAJE_MAX : '', ev?.nivel_desempeno || '',
      ...categorias.slice(0, 4).map((c) => { const o = ev && promCat[ev.id]?.[c.id]; return o?.n ? Number((o.suma / o.n).toFixed(2)) : ''; }),
      f.estado,
    ];
    vals.forEach((v, k) => {
      const col = 2 + k;
      const c = celda(ws, ws.getCell(row, col).address, v, {
        align: [1, 2, 4].includes(k) ? 'left' : 'center',
        bg: zebra,
        numFmt: k === 7 ? '0%' : (k >= 9 && k <= 12 ? '0.00' : undefined),
      });
      if (k === 8 && ev) c.font = F({ bold: true, color: { argb: `FF${COLOR_NIVEL[ev.nivel_desempeno] || '1A2E25'}` } });
      if (k === vals.length - 1) {
        c.font = F({ bold: true, color: { argb: f.estado === 'Evaluado' ? 'FF2E5244' : f.estado === 'Pendiente' ? 'FFD97706' : 'FF6B7280' } });
      }
    });
    // alto según el texto más largo (Colaborador ≈34, Cargo ≈21, Evaluador ≈19 caracteres por línea)
    const lineas = Math.max(
      Math.ceil((f.emp.nombre_completo || '').length / 34),
      Math.ceil((f.emp.cargo || '').length / 21),
      Math.ceil((ev?.evaluador?.full_name || '').length / 19), 1);
    ws.getRow(row).height = 12 * lineas + 4;
  });

  // Barra de datos en el puntaje (formato condicional)
  if (lista.length) {
    ws.addConditionalFormatting({
      ref: `H${hdr + 1}:H${hdr + lista.length}`,
      rules: [{ type: 'dataBar', minLength: 0, maxLength: 100, gradient: false,
        cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: PUNTAJE_MAX }], color: { argb: 'FF6DBD96' } }],
    });
  }

  ws.pageSetup = { ...ws.pageSetup, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return { evaluados: n, pendientes: pendientes.length, inactivos: inactivos.length };
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// @param periodoNombre / deptoFiltro — filtros del Dashboard
// @param filas — [{ emp, ev|null, estado: 'Evaluado'|'Pendiente'|'Inactivo' }]
// @param categorias — categorías activas (orden del cuestionario)
// ═══════════════════════════════════════════════════════════════════════
export async function exportInformeDesempeno({ periodoNombre, deptoFiltro, filas, categorias }) {
  if (!filas?.length) throw new Error('No hay colaboradores para el informe.');

  const { data: fileData, error: dlErr } = await supabase.storage.from('templates').download(TEMPLATE_FILE);
  if (dlErr || !fileData) {
    throw new Error(`No se pudo descargar la plantilla: ${dlErr?.message || 'archivo no encontrado'}. ` +
      `Verifica que "${TEMPLATE_FILE}" exista en el bucket "templates".`);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await fileData.arrayBuffer());

  const evalIds = filas.filter((f) => f.ev).map((f) => f.ev.id);
  const promCat = await cargarPromediosCategoria(evalIds);
  const cats = (categorias || []).filter((c) => c.is_active !== false).sort((a, b) => (a.orden || 0) - (b.orden || 0));

  fillInforme(wb, { periodoNombre, deptoFiltro, filas, categorias: cats, promCat });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `INFORME_EVALUACION_DESEMPENO_${periodoNombre}${deptoFiltro ? `_${deptoFiltro}` : ''}.xlsx`);
}