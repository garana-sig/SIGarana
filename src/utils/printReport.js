// src/components/modules/MejoramientoContinuo/Informes/utils/printReport.js
// ═══════════════════════════════════════════════════════════════════════
// Genera el PDF del informe usando el motor de impresión nativo.
// El título de la ventana = nombre del archivo sugerido al guardar PDF.
// Formato: "Informe - {periodo} - {responsable}"
// ═══════════════════════════════════════════════════════════════════════

const LOGO_URL =
  'https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/garana1.png';

const C = {
  dark:  '#2e5244',
  mint:  '#6dbd96',
  olive: '#6f7b2c',
  amber: '#d97706',
  gray:  '#6b7280',
};

export function printInforme({
  formData,
  sections,
  indicators,
  selectedIndicators,
  processId,
  processList,
  users,
  getProcessItems,
  getProcessConfig,
}) {
  const proc        = processList.find(p => p.id === processId);
  const procCfg     = getProcessConfig(processId);
  const items       = getProcessItems(processId);
  const selInds     = indicators.filter(i => selectedIndicators.includes(i.id));
  const responsible = users.find(u => u.id === formData.responsible_id);
  const objectives  = [...new Set(selInds.map(i => i.objective).filter(Boolean))];
  const today       = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });

  // ── Nombre del archivo sugerido ──────────────────────────────────
  // Chrome/Edge/Safari usan document.title como nombre al "Guardar como PDF"
  const sanitize = str => (str ?? '').replace(/[/\\:*?"<>|]/g, '').trim();
  const fileName  = [
    'Informe',
    sanitize(formData.period),
    sanitize(responsible?.full_name ?? ''),
  ].filter(Boolean).join(' - ');

  // ── HTML de los ítems ────────────────────────────────────────────
  const cell = (label, emoji, content, bg, accent) => {
    const empty = !content || content === '<p></p>' || content.trim() === '';
    return `
      <div class="cell" style="border-left:3px solid ${accent};background:${empty?'#fafafa':bg};">
        <div class="cell-label">${emoji} ${label}</div>
        <div class="cell-content">${empty ? '<span class="empty-text">Sin información</span>' : content}</div>
      </div>`;
  };

  const itemsHtml = items.map(item => {
    const s = sections[item.key];
    if (!s) return '';
    const hasContent = [s.logros, s.por_mejorar, s.hallazgos, s.por_resaltar]
      .some(v => v && v !== '<p></p>' && v.trim() !== '');
    if (!hasContent) return '';
    return `
      <div class="report-item">
        <div class="item-header" style="background:linear-gradient(135deg,${C.dark},${C.mint});">
          ${item.name}
        </div>
        <div class="item-grid">
          ${cell('LOGROS',       '✅', s.logros,       '#f0fdf4', '#86efac')}
          ${cell('POR MEJORAR',  '⚠️', s.por_mejorar,  '#fff7ed', '#fed7aa')}
          ${cell('HALLAZGOS',    '🔍', s.hallazgos,    '#f7f8f0', '#d9f99d')}
          ${cell('POR RESALTAR', '⭐', s.por_resaltar, '#f0f7f4', '#6dbd9660')}
        </div>
      </div>`;
  }).join('');

  // ── HTML completo ────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
    body {
      font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
      font-size:11pt; color:#1f2937; background:white; line-height:1.5;
    }
    .page { max-width:210mm; margin:0 auto; padding:18mm 16mm; }

    /* ── Portada ── */
    .cover {
      display:flex; justify-content:space-between; align-items:flex-start;
      gap:20px; padding-bottom:18px; border-bottom:3px solid ${C.dark}; margin-bottom:24px;
    }
    .cover-left { flex:1; }
    .cover-logo { height:54px; object-fit:contain; display:block; margin-bottom:12px; }
    .cover-title { font-size:17pt; font-weight:700; color:${C.dark}; margin-bottom:4px; line-height:1.2; }
    .cover-sub   { font-size:9pt; color:${C.gray}; }
    .cover-meta  { text-align:right; min-width:180px; }
    .meta-process {
      background:${(procCfg?.color ?? C.mint)}18;
      border:1px solid ${(procCfg?.color ?? C.mint)}40;
      border-radius:8px; padding:8px 12px; margin-bottom:10px;
    }
    .meta-process-label { font-size:7.5pt; color:${C.gray}; text-transform:uppercase; letter-spacing:.07em; margin-bottom:2px; }
    .meta-process-name  { font-size:11pt; font-weight:700; color:${procCfg?.color ?? C.dark}; }
    .meta-table { width:100%; font-size:9.5pt; border-collapse:collapse; }
    .meta-table td          { padding:2px 0; }
    .meta-table td:first-child { color:${C.gray}; padding-right:8px; text-align:right; }
    .meta-table td:last-child  { font-weight:600; color:#374151; text-align:right; }

    /* ── Secciones ── */
    .section-title {
      font-size:8.5pt; font-weight:700; color:${C.dark};
      text-transform:uppercase; letter-spacing:.07em;
      border-bottom:1.5px solid #e5e7eb; padding-bottom:5px; margin:20px 0 10px;
    }

    /* ── Objetivos ── */
    .objectives-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
    .objective-item {
      display:flex; align-items:flex-start; gap:8px;
      padding:6px 10px; background:#f0f7f4;
      border-left:2.5px solid ${C.mint}; border-radius:0 4px 4px 0;
      font-size:9.5pt; color:#374151; line-height:1.4;
    }
    .dot { width:6px; height:6px; border-radius:50%; background:${C.mint}; flex-shrink:0; margin-top:5px; }

    /* ── Indicadores ── */
    .indicators-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
    .indicator-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:5px; padding:7px 10px; }
    .indicator-name { font-size:9.5pt; font-weight:600; color:#111827; margin-bottom:1px; }
    .indicator-code { font-size:8pt; color:#9ca3af; font-family:monospace; }

    /* ── Ítems ── */
    .report-item { margin-bottom:20px; break-inside:avoid; page-break-inside:avoid; }
    .item-header {
      padding:7px 14px; border-radius:5px 5px 0 0;
      font-size:9pt; font-weight:700; color:white;
      text-transform:uppercase; letter-spacing:.07em;
    }
    .item-grid {
      display:grid; grid-template-columns:1fr 1fr;
      border:1px solid #e5e7eb; border-top:none;
      border-radius:0 0 5px 5px; overflow:hidden;
    }
    .cell          { padding:9px 12px; border-right:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; min-height:70px; }
    .cell:nth-child(2n)      { border-right:none; }
    .cell:nth-last-child(-n+2) { border-bottom:none; }
    .cell-label    { font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#374151; margin-bottom:5px; }
    .cell-content  { font-size:9.5pt; color:#1f2937; line-height:1.55; }
    .empty-text    { color:#d1d5db; font-style:italic; font-size:9pt; }

    /* Contenido TipTap */
    .cell-content p  { margin:0 0 4px; }
    .cell-content ul,
    .cell-content ol { padding-left:18px; margin:3px 0; }
    .cell-content li  { margin:1px 0; }
    .cell-content strong { font-weight:700; }
    .cell-content em     { font-style:italic; }
    .cell-content u      { text-decoration:underline; }

    /* Imágenes: escalan sin deformar */
    .cell-content img {
      max-width:100%; height:auto; display:block;
      margin:6px 0; border-radius:3px;
      max-height:200px; object-fit:contain;
    }

    /* Tablas dentro de celdas */
    .cell-content table {
      border-collapse:collapse; width:100%; font-size:8.5pt;
      margin:6px 0; break-inside:avoid; page-break-inside:avoid;
    }
    .cell-content th,
    .cell-content td { border:1px solid #d1d5db; padding:4px 7px; vertical-align:top; }
    .cell-content th { background:#f3f4f6; font-weight:600; text-align:left; }

    /* ── Footer ── */
    .footer {
      border-top:2px solid #e5e7eb; padding-top:10px; margin-top:24px;
      display:flex; justify-content:space-between; font-size:8pt; color:#9ca3af;
    }

    /* ── Botones (solo en pantalla) ── */
    .print-actions {
      position:fixed; top:14px; right:14px; z-index:999;
      display:flex; gap:8px;
    }
    .btn-print {
      padding:9px 22px; background:${C.dark}; color:white;
      border:none; border-radius:8px; font-size:13px; font-weight:600;
      cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.2);
      display:flex; align-items:center; gap:6px;
    }
    .btn-print:hover { background:#1a2e25; }
    .btn-close {
      padding:9px 14px; background:#e5e7eb; color:#374151;
      border:none; border-radius:8px; font-size:13px; cursor:pointer;
    }
    .btn-close:hover { background:#d1d5db; }

    /* ── Reglas de impresión ── */
    @media print {
      @page { size:A4; margin:14mm 12mm; }
      body  { font-size:10pt; }
      .page { max-width:100%; padding:0; margin:0; }
      .print-actions { display:none !important; }

      .report-item    { break-inside:avoid; page-break-inside:avoid; }
      .item-grid      { break-inside:avoid; page-break-inside:avoid; }
      .cell           { break-inside:avoid; page-break-inside:avoid; }
      .cell-content table { break-inside:avoid; page-break-inside:avoid; }
      .objectives-grid    { break-inside:avoid; }
      .indicators-grid    { break-inside:avoid; }
      .section-title  { break-after:avoid; page-break-after:avoid; }
      .item-header    { break-after:avoid; page-break-after:avoid; }

      .cell-content img {
        max-width:100%; max-height:180px; height:auto;
        object-fit:contain; break-inside:avoid; page-break-inside:avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Botones visibles solo en pantalla -->
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">
      ⬇️ Guardar como PDF
    </button>
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>

  <div class="page">

    <!-- PORTADA -->
    <div class="cover">
      <div class="cover-left">
        <img class="cover-logo" src="${LOGO_URL}" alt="Garana Art" crossorigin="anonymous"/>
        <div class="cover-title">${formData.title}</div>
        <div class="cover-sub">Sistema de Gestión Integral · Garana Art S.A.S.</div>
      </div>
      <div class="cover-meta">
        <div class="meta-process">
          <div class="meta-process-label">Proceso</div>
          <div class="meta-process-name">${procCfg?.icon ?? '📋'} ${proc?.name ?? '—'}</div>
        </div>
        <table class="meta-table">
          <tbody>
            <tr><td>Período</td><td>${formData.period}</td></tr>
            <tr><td>Responsable</td><td>${responsible?.full_name ?? '—'}</td></tr>
            <tr><td>Fecha</td><td>${today}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    ${objectives.length > 0 ? `
    <!-- OBJETIVOS -->
    <div class="section-title">🎯 Objetivos estratégicos evaluados</div>
    <div class="objectives-grid">
      ${objectives.map(obj => `
        <div class="objective-item">
          <span class="dot"></span>
          <span>${obj}</span>
        </div>`).join('')}
    </div>` : ''}

    ${selInds.length > 0 ? `
    <!-- INDICADORES -->
    <div class="section-title">📊 Indicadores de seguimiento</div>
    <div class="indicators-grid">
      ${selInds.map(ind => `
        <div class="indicator-card">
          <div class="indicator-name">${ind.indicator_name}</div>
          ${ind.consecutive ? `<div class="indicator-code">${ind.consecutive}</div>` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${itemsHtml ? `
    <!-- CONTENIDO -->
    <div class="section-title">📋 Contenido del informe</div>
    ${itemsHtml}` : `
    <div style="text-align:center;padding:40px;color:#9ca3af;font-style:italic;">
      Sin ítems con contenido registrado.
    </div>`}

    <!-- FOOTER -->
    <div class="footer">
      <span>Garana Art S.A.S. · Sistema de Gestión Integral · ${proc?.name ?? ''}</span>
      <span>${responsible?.full_name ?? ''} · ${formData.period}</span>
    </div>

  </div><!-- /page -->

  <script>
    // Esperar logo, luego abrir diálogo de impresión automáticamente
    window.addEventListener('load', function () {
      var img = document.querySelector('.cover-logo');
      var trigger = function () { setTimeout(window.print, 350); };
      if (img && !img.complete) {
        img.addEventListener('load',  trigger);
        img.addEventListener('error', trigger);
      } else {
        trigger();
      }
    });
  </script>
</body>
</html>`;

  // ── Abrir ventana con el nombre correcto como título ─────────────
  const win = window.open('', '_blank', 'width=920,height=720,scrollbars=yes');
  if (!win) {
    alert('Permite las ventanas emergentes para generar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // El title ya está en el HTML, pero lo forzamos también por si el navegador
  // cargó la ventana antes de parsear el <title>
  win.document.title = fileName;
}