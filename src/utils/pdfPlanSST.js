// src/utils/pdfPlanSST.js
// ═══════════════════════════════════════════════════════════════════
// Genera, en el navegador, el PDF de consulta de un plan de trabajo SST /
// Bienestar con las 3 primeras columnas de su tabla (sin el #).
// Se arma en el momento con los datos de la BD → siempre actualizado.
// Solo usa jsPDF (ya está en el proyecto); la tabla se dibuja a mano
// con salto de página y encabezado repetido.
//
// Uso:
//   const blob = await generarPdfPlanSST({ plan, year, items });
//   plan  = { label, code, color, desc, cols: ['Actividad','Responsable','Recursos'] }
//   items = [{ order_num, col1, col2, col3 }]
// ═══════════════════════════════════════════════════════════════════
import { jsPDF } from 'jspdf';

const VERDE = '#2e5244';
const MENTA = '#6dbd96';
const ARENA = '#dedecc';

const hex = (h) => {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
// Mezcla un color con blanco (t = 0 → color, 1 → blanco)
const tint = (h, t) => hex(h).map((c) => Math.round(c + (255 - c) * t));

async function cargarLogo(src = '/indecon.png') {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = ko;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => ok(null);
      img.src = dataUrl;
    });
    return dims ? { dataUrl, ...dims } : null;
  } catch {
    return null;
  }
}

const hoy = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export async function generarPdfPlanSST({ plan, year, items }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();   // 279.4
  const H = doc.internal.pageSize.getHeight();  // 215.9
  const M = 12;                                  // margen
  const color = plan.color || VERDE;
  const logo = await cargarLogo();

  // ── Columnas: # + 3 columnas del plan ─────────────────────────────
  const usable = W - M * 2;
  const colW = [12, usable * 0.46, usable * 0.27, 0];
  colW[3] = usable - colW[0] - colW[1] - colW[2];
  const colX = colW.reduce((acc, w, i) => (acc.push(i ? acc[i - 1] + colW[i - 1] : M), acc), []);
  const PAD = 2.6;
  const FS = 8.6;               // tamaño de letra de las celdas
  const LH = FS * 0.42;         // alto de línea en mm

  // ── Encabezado tipo formato (se repite en cada página) ────────────
  const encabezado = () => {
    const top = M, h = 22;
    doc.setDrawColor(...hex(VERDE)); doc.setLineWidth(0.35);
    doc.rect(M, top, usable, h);
    // Logo
    const logoW = 42;
    doc.line(M + logoW, top, M + logoW, top + h);
    if (logo) {
      const maxW = logoW - 6, maxH = h - 6;
      const r = Math.min(maxW / logo.w, maxH / logo.h);
      const lw = logo.w * r, lh = logo.h * r;
      doc.addImage(logo.dataUrl, 'PNG', M + (logoW - lw) / 2, top + (h - lh) / 2, lw, lh);
    } else {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...hex(VERDE));
      doc.text('INDECON S.A.S.', M + logoW / 2, top + h / 2 + 1.5, { align: 'center' });
    }
    // Título
    const infoW = 62;
    const tx = M + logoW, tw = usable - logoW - infoW;
    doc.setTextColor(...hex(VERDE));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(`PLAN DE TRABAJO ${plan.label.toUpperCase()}`, tx + tw / 2, top + 9, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
    doc.text(`Sistema Integrado de Gestión · Vigencia ${year}`, tx + tw / 2, top + 15.5, { align: 'center' });
    // Casilla código / vigencia / fecha
    const ix = M + usable - infoW;
    doc.line(ix, top, ix, top + h);
    const filas = [['CÓDIGO', plan.code || '—'], ['VIGENCIA', String(year)], ['GENERADO', hoy()]];
    filas.forEach(([k, v], i) => {
      const y = top + (h / 3) * i;
      if (i) doc.line(ix, y, ix + infoW, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...hex(VERDE));
      doc.text(k, ix + 3, y + h / 6 + 1.3);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      doc.text(v, ix + infoW - 3, y + h / 6 + 1.3, { align: 'right' });
    });
    // Franja del color del plan
    doc.setFillColor(...hex(color));
    doc.rect(M, top + h, usable, 1.6, 'F');
    return top + h + 1.6;
  };

  // ── Encabezado de la tabla ────────────────────────────────────────
  const thead = (y) => {
    const h = 8;
    doc.setFillColor(...hex(color));
    doc.rect(M, y, usable, h, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.setTextColor(255, 255, 255);
    ['#', ...plan.cols].forEach((t, i) => {
      const cx = i === 0 ? colX[i] + colW[i] / 2 : colX[i] + PAD;
      doc.text(String(t).toUpperCase(), cx, y + h / 2 + 1.3, { align: i === 0 ? 'center' : 'left' });
    });
    return y + h;
  };

  // ── Pie ───────────────────────────────────────────────────────────
  const pie = (n, total) => {
    doc.setDrawColor(...hex(ARENA)); doc.setLineWidth(0.3);
    doc.line(M, H - 10, W - M, H - 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
    doc.text('Garana SIG · Documento de consulta generado automáticamente desde el módulo SST y Bienestar', M, H - 6);
    doc.text(`Página ${n} de ${total}`, W - M, H - 6, { align: 'right' });
  };

  // ── Primera página: resumen ───────────────────────────────────────
  let y = encabezado() + 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
  const descLines = doc.splitTextToSize(plan.desc || '', usable - 70);
  doc.text(descLines, M, y + 3);
  // Chip con total
  const chip = `${items.length} ${plan.id === 'capacitacion' ? 'capacitaciones' : 'actividades'}`;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  const cw = doc.getTextWidth(chip) + 10;
  doc.setFillColor(...tint(color, 0.85));
  doc.roundedRect(W - M - cw, y - 1.5, cw, 7, 3.5, 3.5, 'F');
  doc.setTextColor(...hex(color));
  doc.text(chip, W - M - cw / 2, y + 3, { align: 'center' });
  y += Math.max(descLines.length * 4.2, 7) + 4;

  y = thead(y);
  const limite = H - 14;

  if (!items.length) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5); doc.setTextColor(150, 150, 150);
    doc.text('Este plan aún no tiene actividades registradas.', W / 2, y + 12, { align: 'center' });
  }

  items.forEach((it, idx) => {
    const celdas = [
      String(it.order_num ?? idx + 1),
      it.col1 || '—',
      it.col2 || 'Sin definir',
      it.col3 || 'Sin definir',
    ];
    // Medir con la misma fuente con la que se dibuja (la negrita es más ancha)
    doc.setFontSize(FS);
    const lineas = celdas.map((t, i) => {
      if (i === 0) return [t];
      doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
      return doc.splitTextToSize(String(t), colW[i] - PAD * 2);
    });
    const rowH = Math.max(...lineas.map((l) => l.length)) * LH + PAD * 2;

    if (y + rowH > limite) {
      doc.addPage();
      y = thead(encabezado() + 4);
    }

    // Fondo alterno + borde inferior
    if (idx % 2) { doc.setFillColor(...tint(color, 0.94)); doc.rect(M, y, usable, rowH, 'F'); }
    doc.setDrawColor(...hex(ARENA)); doc.setLineWidth(0.2);
    doc.line(M, y + rowH, M + usable, y + rowH);

    // Número en círculo
    doc.setFillColor(...hex(color));
    doc.circle(colX[0] + colW[0] / 2, y + PAD + 1.6, 2.6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(celdas[0], colX[0] + colW[0] / 2, y + PAD + 2.5, { align: 'center' });

    // Columnas
    lineas.slice(1).forEach((ls, k) => {
      const i = k + 1;
      const vacio = (i === 2 && !it.col2) || (i === 3 && !it.col3);
      doc.setFont('helvetica', i === 1 ? 'bold' : vacio ? 'italic' : 'normal');
      doc.setFontSize(FS);
      if (i === 1) doc.setTextColor(...hex('#1a2e25'));
      else if (vacio) doc.setTextColor(170, 170, 170);
      else doc.setTextColor(60, 60, 60);
      doc.text(ls, colX[i] + PAD, y + PAD + LH * 0.8);
    });
    y += rowH;
  });

  // Pies con total de páginas
  const total = doc.getNumberOfPages();
  for (let n = 1; n <= total; n++) { doc.setPage(n); pie(n, total); }

  doc.setProperties({ title: `Plan de trabajo ${plan.label} ${year}`, subject: 'Garana SIG', creator: 'Garana SIG' });
  return doc.output('blob');
}