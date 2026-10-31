// src/utils/exportEvaluacion.js
// ═══════════════════════════════════════════════════════════════════════
// v3 (31-oct-2026) — Evaluación de proveedores RE-GR-01 (formato de GD)
//   Hoja "V2"      → el formato oficial diligenciado (igual que v2) + la
//                    gráfica "Análisis por criterio" repuesta como imagen
//                    (ExcelJS no conserva los gráficos nativos del formato).
//   Hoja "INFORME" → como en Evaluación de Competencias: gráficas arriba y
//                    debajo las tablas con los datos de la evaluación.
//
// Hoja V2: fila 9 = proveedores (C, E, G, I, K, M, O) · fila 10 PUNTUACIÓN/RESULTADO
//   11 CALIDAD (12 no conforme · 13 devoluciones · 14 SST · 15 BASC)
//   16 SERVICIO (17 cantidad · 18 oportunidad · 19 reclamos · 20 documentación)
//   21 PRECIO (22 competitividad · 23 forma de pago · 24 descuentos)
//   29–35 confiabilidad por proveedor (E nombre · G confiabilidad · I aspectos)
//   40–42 análisis por criterio · 44 conclusiones · 47 realizado / aprobado
//
// Las gráficas se dibujan en el navegador (canvas → PNG).
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';

const PROV_COLS = [['C', 'D'], ['E', 'F'], ['G', 'H'], ['I', 'J'], ['K', 'L'], ['M', 'N'], ['O', 'P']];
const CRITERIOS = {
  calidad:  { fila: 11, peso: 0.40, label: 'Calidad',  sub: { no_conforme: 12, devoluciones: 13, sst: 14, basc: 15 } },
  servicio: { fila: 16, peso: 0.35, label: 'Servicio', sub: { cantidad: 17, oportunidad: 18, reclamos: 19, documentacion: 20 } },
  precio:   { fila: 21, peso: 0.25, label: 'Precio',   sub: { competitividad: 22, forma_pago: 23, descuentos: 24 } },
};
const SUB_LABEL = {
  no_conforme:    'El insumo o servicio ha generado producto no conforme',
  devoluciones:   'Devoluciones por calidad o llamados por garantía',
  sst:            'Tiene implementado el SG-SST',
  basc:           'Seguridad en la cadena de suministro (BASC)',
  cantidad:       'Cantidad de entrega',
  oportunidad:    'Oportunidad / fecha',
  reclamos:       'Atención de reclamos',
  documentacion:  'Documentación solicitada',
  competitividad: 'Competitividad',
  forma_pago:     'Forma de pago',
  descuentos:     'Descuentos',
};
const CONF = { confiable: 'CONFIABLE', aceptable: 'ACEPTABLE', deficiente: 'DEFICIENTE' };
const CONF_COLOR = { confiable: '2E5244', aceptable: 'D97706', deficiente: 'A63D2F' };
const SERIE = ['#2e5244', '#6dbd96', '#6f7b2c'];   // calidad · servicio · precio

const fmt = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00')
  .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(Number(v).toFixed(2)));
const confDe = (t) => (t >= 4 ? 'confiable' : t >= 3 ? 'aceptable' : 'deficiente');

// ── Gráficas (canvas → PNG) ─────────────────────────────────────────────
function lienzo(w, h) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  const k = 2;
  cv.width = w * k; cv.height = h * k;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.scale(k, k);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  return { cv, ctx };
}
const corto = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

// Barras verticales simples 0–5 (análisis por criterio)
function chartPromedios(items, titulo, W = 360, H = 200) {
  const c = lienzo(W, H); if (!c) return null;
  const { cv, ctx } = c;
  const left = 30, right = 10, top = 28, bottom = 28;
  const pw = W - left - right, ph = H - top - bottom;
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'left';
  ctx.fillText(titulo, left, 16);
  ctx.font = '9px Arial'; ctx.textAlign = 'right';
  for (let v = 0; v <= 5; v++) {
    const y = top + ph - (v / 5) * ph;
    ctx.strokeStyle = '#e4ede8'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W - right, y); ctx.stroke();
    ctx.fillStyle = '#5a7a6a'; ctx.fillText(String(v), left - 4, y + 3);
  }
  const g = pw / items.length, bw = Math.min(54, g * 0.55);
  items.forEach((it, i) => {
    const x = left + i * g + (g - bw) / 2;
    const h = ((it.v || 0) / 5) * ph;
    ctx.fillStyle = it.color; ctx.fillRect(x, top + ph - h, bw, h);
    ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'center'; ctx.font = 'bold 10px Arial';
    ctx.fillText(it.v != null ? it.v.toFixed(2) : '—', x + bw / 2, top + ph - h - 4);
    ctx.font = '10px Arial'; ctx.fillStyle = '#374151';
    ctx.fillText(it.label, x + bw / 2, top + ph + 16);
  });
  return cv.toDataURL('image/png');
}

// Total ponderado por proveedor (barras horizontales + líneas 3 y 4)
function chartTotales(filas, W = 520) {
  const H = 50 + filas.length * 30;
  const c = lienzo(W, H); if (!c) return null;
  const { cv, ctx } = c;
  const left = 200, right = 46, top = 30;
  const pw = W - left - right, ph = filas.length * 30;
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'left';
  ctx.fillText('Total ponderado por proveedor (escala 0 a 5)', 12, 18);
  [3, 4].forEach((v) => {
    const x = left + (v / 5) * pw;
    ctx.strokeStyle = v === 4 ? '#2e5244' : '#d97706'; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, top + ph); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '9px Arial'; ctx.fillStyle = '#5a7a6a'; ctx.textAlign = 'center';
    ctx.fillText(v === 4 ? 'Confiable 4' : 'Aceptable 3', x, top + ph + 12);
  });
  filas.forEach((f, i) => {
    const y = top + i * 30;
    ctx.font = '10px Arial'; ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'right';
    ctx.fillText(corto(f.nombre, 30), left - 8, y + 15);
    ctx.fillStyle = '#f1f5f2'; ctx.fillRect(left, y + 4, pw, 16);
    const w = (Math.min(f.total, 5) / 5) * pw;
    ctx.fillStyle = `#${CONF_COLOR[f.conf]}`; ctx.fillRect(left, y + 4, w, 16);
    ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'left'; ctx.font = 'bold 10px Arial';
    ctx.fillText(f.total.toFixed(2), left + w + 5, y + 16);
  });
  return { img: cv.toDataURL('image/png'), H };
}

// Barras agrupadas calidad / servicio / precio por proveedor (1–5)
function chartComparativo(filas, W = 520, H = 260) {
  const c = lienzo(W, H); if (!c) return null;
  const { cv, ctx } = c;
  const left = 30, right = 10, top = 30, bottom = 54;
  const pw = W - left - right, ph = H - top - bottom;
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#1a2e25'; ctx.textAlign = 'left';
  ctx.fillText('Comparativo por criterio (puntuación 1 a 5)', left, 18);
  ctx.font = '9px Arial'; ctx.textAlign = 'right';
  for (let v = 0; v <= 5; v++) {
    const y = top + ph - (v / 5) * ph;
    ctx.strokeStyle = '#e4ede8'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W - right, y); ctx.stroke();
    ctx.fillStyle = '#5a7a6a'; ctx.fillText(String(v), left - 4, y + 3);
  }
  const g = pw / Math.max(filas.length, 1), bw = Math.min(16, (g - 10) / 3);
  filas.forEach((f, i) => {
    const x0 = left + i * g + (g - bw * 3 - 4) / 2;
    [f.calidad, f.servicio, f.precio].forEach((v, k) => {
      const h = ((v || 0) / 5) * ph;
      ctx.fillStyle = SERIE[k]; ctx.fillRect(x0 + k * (bw + 2), top + ph - h, bw, h);
    });
    ctx.fillStyle = '#374151'; ctx.textAlign = 'center'; ctx.font = '9px Arial';
    ctx.fillText(corto(f.nombre, Math.max(8, Math.floor(g / 6))), left + i * g + g / 2, top + ph + 13);
  });
  ctx.textAlign = 'left'; ctx.font = '10px Arial';
  ['Calidad', 'Servicio', 'Precio'].forEach((l, k) => {
    const x = left + k * 90;
    ctx.fillStyle = SERIE[k]; ctx.fillRect(x, H - 18, 10, 10);
    ctx.fillStyle = '#374151'; ctx.fillText(l, x + 14, H - 9);
  });
  return cv.toDataURL('image/png');
}

// ── Celdas con estilo (hoja INFORME) ─────────────────────────────────────
const BORDE = { style: 'thin', color: { argb: 'FFC8D9D1' } };
function celda(ws, r, c, value, { bold, color, bg, align = 'center', numFmt, size = 10, wrap = true } = {}) {
  const cell = ws.getCell(r, c);
  cell.value = value ?? null;
  cell.font = { name: 'Arial', size, bold: !!bold, color: color ? { argb: `FF${color}` } : undefined };
  cell.alignment = { horizontal: align, vertical: 'middle', wrapText: wrap };
  cell.border = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };
  if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
  if (numFmt) cell.numFmt = numFmt;
  return cell;
}
function titulo(ws, r, texto, c2 = 9) {
  ws.mergeCells(r, 1, r, c2);
  const cell = ws.getCell(r, 1);
  cell.value = texto;
  cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5244' } };
  cell.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 20;
}

// ═══════════════════════════════════════════════════════════════════════
// Hoja INFORME: gráficas arriba, datos debajo
// ═══════════════════════════════════════════════════════════════════════
export function fillInforme(wb, evaluacion, formato, scoresTodos, { graficas = true } = {}) {
  const ws = wb.addWorksheet('INFORME', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    views: [{ showGridLines: false }],
  });
  ws.columns = [{ width: 36 }, ...Array.from({ length: 8 }, () => ({ width: 15 }))];

  const filas = scoresTodos.map((s, i) => {
    const total = Number(s.total_score) || 0;
    return {
      nombre: s.supplier?.nombre || `Proveedor ${i + 1}`,
      nit: s.supplier?.nit || '',
      calidad: num(s.calidad?.puntuacion), servicio: num(s.servicio?.puntuacion), precio: num(s.precio?.puntuacion),
      total, conf: s.confiabilidad || confDe(total),
      aspectos: s.aspectos_mejorar || '',
      s,
    };
  });
  const prom = (k) => {
    const v = filas.map((f) => f[k]).filter((x) => x != null);
    return v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)) : null;
  };

  // ── Encabezado ──
  ws.mergeCells(1, 1, 1, 9);
  const h = ws.getCell(1, 1);
  h.value = `INFORME DE EVALUACIÓN DE PROVEEDORES · ${formato?.code || 'RE-GR-01'}${formato?.version ? ` v${String(formato.version).padStart(2, '0')}` : ''}`;
  h.font = { name: 'Georgia', size: 14, bold: true, color: { argb: 'FF2E5244' } };
  h.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, 9);
  const h2 = ws.getCell(2, 1);
  h2.value = `${evaluacion.consecutive || ''}   ·   Periodo: ${fmt(evaluacion.fecha_inicio)} al ${fmt(evaluacion.fecha_fin)}   ·   Fecha de evaluación: ${fmt(evaluacion.fecha_evaluacion) || '—'}   ·   Proveedores evaluados: ${filas.length}`;
  h2.font = { name: 'Arial', size: 10, color: { argb: 'FF5A7A6A' } };

  // ── 1. Gráficas ──
  titulo(ws, 4, '1. GRÁFICAS');
  let r = 5;
  const imgTot = graficas ? chartTotales(filas) : null;
  const imgCmp = graficas ? chartComparativo(filas) : null;
  const imgCrit = graficas ? chartPromedios(
    [{ label: 'Calidad', v: prom('calidad'), color: SERIE[0] }, { label: 'Servicio', v: prom('servicio'), color: SERIE[1] }, { label: 'Precio', v: prom('precio'), color: SERIE[2] }],
    'Análisis por criterio (promedio)', 300, 200) : null;
  // filas de 20 px para ubicar las imágenes
  const altoGraf = Math.max(260, imgTot?.H || 0, 200);
  const nFilas = Math.ceil(altoGraf / 20) + 1;
  for (let i = 0; i < nFilas * 2 + 1; i++) ws.getRow(r + i).height = 15;
  if (imgTot) ws.addImage(wb.addImage({ base64: imgTot.img, extension: 'png' }), { tl: { col: 0.1, row: r - 1 + 0.2 }, ext: { width: 520, height: imgTot.H } });
  if (imgCrit) ws.addImage(wb.addImage({ base64: imgCrit, extension: 'png' }), { tl: { col: 5.2, row: r - 1 + 0.2 }, ext: { width: 300, height: 200 } });
  r += nFilas;
  if (imgCmp) ws.addImage(wb.addImage({ base64: imgCmp, extension: 'png' }), { tl: { col: 0.1, row: r - 1 + 0.2 }, ext: { width: 520, height: 260 } });
  r += nFilas + 1;
  if (!graficas) r = 6;

  // ── 2. Resultados por proveedor ──
  titulo(ws, r, '2. RESULTADOS POR PROVEEDOR'); r++;
  ['Proveedor', 'NIT', 'Calidad (40%)', 'Servicio (35%)', 'Precio (25%)', 'Total ponderado', 'Confiabilidad', 'Aspectos por mejorar']
    .forEach((t, i) => celda(ws, r, i + 1, t, { bold: true, bg: 'DEEAE3' }));
  ws.mergeCells(r, 8, r, 9); r++;
  [...filas].sort((a, b) => b.total - a.total).forEach((f) => {
    celda(ws, r, 1, f.nombre, { align: 'left', bold: true });
    celda(ws, r, 2, f.nit);
    celda(ws, r, 3, f.calidad, { numFmt: '0.00' });
    celda(ws, r, 4, f.servicio, { numFmt: '0.00' });
    celda(ws, r, 5, f.precio, { numFmt: '0.00' });
    celda(ws, r, 6, Number(f.total.toFixed(2)), { numFmt: '0.00', bold: true });
    celda(ws, r, 7, CONF[f.conf] || '', { bold: true, color: 'FFFFFF', bg: CONF_COLOR[f.conf] || '6B7280' });
    celda(ws, r, 8, f.aspectos, { align: 'left', size: 9 });
    ws.mergeCells(r, 8, r, 9);
    r++;
  });
  // promedio general
  celda(ws, r, 1, 'Promedio', { align: 'left', bold: true, bg: 'F4F7F5' });
  celda(ws, r, 2, '', { bg: 'F4F7F5' });
  celda(ws, r, 3, prom('calidad'), { numFmt: '0.00', bold: true, bg: 'F4F7F5' });
  celda(ws, r, 4, prom('servicio'), { numFmt: '0.00', bold: true, bg: 'F4F7F5' });
  celda(ws, r, 5, prom('precio'), { numFmt: '0.00', bold: true, bg: 'F4F7F5' });
  celda(ws, r, 6, prom('total'), { numFmt: '0.00', bold: true, bg: 'F4F7F5' });
  celda(ws, r, 7, '', { bg: 'F4F7F5' }); celda(ws, r, 8, '', { bg: 'F4F7F5' }); ws.mergeCells(r, 8, r, 9);
  r += 2;

  // ── 3. Distribución por confiabilidad ──
  titulo(ws, r, '3. DISTRIBUCIÓN POR CONFIABILIDAD'); r++;
  ['Confiabilidad', 'Escala', 'Proveedores', '%'].forEach((t, i) => celda(ws, r, i + 1, t, { bold: true, bg: 'DEEAE3' })); r++;
  [['confiable', '4 a 5 puntos'], ['aceptable', '3 a 3,99 puntos'], ['deficiente', '0 a 2,99 puntos']].forEach(([k, esc]) => {
    const n = filas.filter((f) => f.conf === k).length;
    celda(ws, r, 1, CONF[k], { bold: true, color: CONF_COLOR[k], align: 'left' });
    celda(ws, r, 2, esc);
    celda(ws, r, 3, n);
    celda(ws, r, 4, filas.length ? n / filas.length : 0, { numFmt: '0%' });
    r++;
  });
  r++;

  // ── 4. Detalle por subcriterio ──
  titulo(ws, r, '4. DETALLE POR SUBCRITERIO (PUNTUACIÓN 1 A 5 · 0 = NO APLICA)', Math.max(9, filas.length + 1)); r++;
  celda(ws, r, 1, 'Criterio / subcriterio', { bold: true, bg: 'DEEAE3' });
  filas.forEach((f, i) => celda(ws, r, i + 2, f.nombre, { bold: true, bg: 'DEEAE3', size: 9 }));
  ws.getRow(r).height = 30; r++;
  Object.entries(CRITERIOS).forEach(([k, crit]) => {
    celda(ws, r, 1, `${crit.label.toUpperCase()} (${crit.peso * 100}%)`, { bold: true, align: 'left', bg: 'F4F7F5' });
    filas.forEach((f, i) => celda(ws, r, i + 2, f[k], { numFmt: '0.00', bold: true, bg: 'F4F7F5' }));
    r++;
    Object.keys(crit.sub).forEach((sk) => {
      celda(ws, r, 1, `   ${SUB_LABEL[sk]}`, { align: 'left', size: 9 });
      filas.forEach((f, i) => {
        const v = f.s[k]?.subcats?.[sk];
        celda(ws, r, i + 2, v > 0 ? Number(v) : 'N/A', { size: 9, color: v > 0 ? undefined : '9CA3AF' });
      });
      r++;
    });
  });
  r++;

  // ── 5. Conclusiones ──
  titulo(ws, r, '5. CONCLUSIONES'); r++;
  ws.mergeCells(r, 1, r + 2, 9);
  const cc = ws.getCell(r, 1);
  cc.value = [evaluacion.conclusiones, evaluacion.aspectos_por_mejorar && `Aspectos por mejorar: ${evaluacion.aspectos_por_mejorar}`]
    .filter(Boolean).join('\n\n') || '—';
  cc.font = { name: 'Arial', size: 10 };
  cc.alignment = { wrapText: true, vertical: 'top' };
  r += 4;
  ws.getCell(r, 1).value = `Realizado por: ${evaluacion.realizado_por_profile?.full_name || '____________________'}`;
  ws.getCell(r, 5).value = `Aprobado por: ${evaluacion.aprobado_por_profile?.full_name || '____________________'}`;
  [ws.getCell(r, 1), ws.getCell(r, 5)].forEach((c) => { c.font = { name: 'Arial', size: 10, bold: true }; });
  return ws;
}

// ═══════════════════════════════════════════════════════════════════════
// Hoja V2 (formato oficial)
// ═══════════════════════════════════════════════════════════════════════
export function fillFormato(wb, evaluacion, formato, { graficas = true } = {}) {
  const ws = wb.getWorksheet('V2') || wb.worksheets[wb.worksheets.length - 1];
  if (!ws) throw new Error(`No se encontró la hoja V2 en ${formato?.code || 'el formato'}.`);
  // El archivo trae también la versión anterior (hoja V1): se exporta solo la vigente
  wb.worksheets.filter((s) => s.id !== ws.id).forEach((s) => wb.removeWorksheet(s.id));
  ws.state = 'visible';

  const set = (addr, v) => { ws.getCell(addr).value = v ?? null; };
  const scores = [...(evaluacion.scores || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).slice(0, 7);

  set('A6', `Periodo a evaluar: ${fmt(evaluacion.fecha_inicio)} al ${fmt(evaluacion.fecha_fin)}`);
  set('E6', `Fecha de evaluación: ${fmt(evaluacion.fecha_evaluacion)}`);
  Object.values(CRITERIOS).forEach((c) => set(`B${c.fila}`, c.peso));

  scores.forEach((s, i) => {
    const [cP, cR] = PROV_COLS[i];
    const nombre = s.supplier?.nombre || `Proveedor ${i + 1}`;
    set(`${cP}9`, nombre);
    Object.entries(CRITERIOS).forEach(([k, c]) => {
      const crit = s[k] || {};
      set(`${cP}${c.fila}`, num(crit.puntuacion));
      set(`${cR}${c.fila}`, num(crit.resultado));
      Object.entries(c.sub).forEach(([sk, fila]) => {
        const v = crit.subcats?.[sk];
        set(`${cP}${fila}`, v > 0 ? Number(v) : null);
      });
    });
    const f = 29 + i;
    set(`E${f}`, nombre);
    set(`G${f}`, `${CONF[s.confiabilidad] || ''} (${(Number(s.total_score) || 0).toFixed(2)})`.trim());
    set(`I${f}`, s.aspectos_mejorar || evaluacion.aspectos_por_mejorar || null);
  });
  for (let i = scores.length; i < 7; i++) set(`${PROV_COLS[i][0]}9`, null);
  for (let i = scores.length; i < 7; i++) { set(`E${29 + i}`, null); set(`G${29 + i}`, null); set(`I${29 + i}`, null); }

  const prom = (k) => (scores.length
    ? Number((scores.reduce((t, s) => t + (Number(s[k]?.puntuacion) || 0), 0) / scores.length).toFixed(2))
    : null);
  const pc = prom('calidad'), ps = prom('servicio'), pp = prom('precio');
  // El formato muestra estas celdas en % (antes: promedio / 5)
  set('H40', pc != null ? pc / 5 : null); set('H41', ps != null ? ps / 5 : null); set('H42', pp != null ? pp / 5 : null);

  set('A44', evaluacion.conclusiones || null);
  set('A47', `Realizado por: ${evaluacion.realizado_por_profile?.full_name || '____________________'}`);
  set('H47', `Aprobado por: ${evaluacion.aprobado_por_profile?.full_name || '____________________'}`);

  // Gráfica "Análisis por criterio" en el mismo lugar del formato (I35:M42)
  const img = graficas ? chartPromedios(
    [{ label: 'Calidad', v: pc, color: SERIE[0] }, { label: 'Servicio', v: ps, color: SERIE[1] }, { label: 'Precio', v: pp, color: SERIE[2] }],
    'Análisis por criterio') : null;
  if (img) ws.addImage(wb.addImage({ base64: img, extension: 'png' }), { tl: { col: 8.6, row: 34.3 }, br: { col: 12.1, row: 41.6 } });
  return ws;
}

// ═══════════════════════════════════════════════════════════════════════
export async function exportEvaluacion(evaluacion, formato) {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  fillFormato(wb, evaluacion, formato);
  const todos = [...(evaluacion.scores || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  fillInforme(wb, evaluacion, formato, todos);
  // Excel recalcula al abrir (totales de la fila 25 y demás fórmulas del formato)
  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true };
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato?.code || 'RE-GR-01'}_EVALUACION_${evaluacion.consecutive || 'PROVEEDORES'}_${hoy}.xlsx`);
  return true;
}

export default exportEvaluacion;
