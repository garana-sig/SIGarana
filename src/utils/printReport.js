// src/components/modules/MejoramientoContinuo/Informes/utils/printReport.js
// Nueva estructura:
//   - Por ítem del proceso: solo LOGROS
//   - Al final del informe: HALLAZGOS y POR MEJORAR como columnas generales

const LOGO_URL =
  'https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/garana1.png';

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
  const color       = procCfg?.color ?? '#2e5244';

  // ── Nombre del archivo ────────────────────────────────────────────
  const sanitize = str => (str ?? '').replace(/[/\\:*?"<>|]/g, '').trim();
  const fileName = [
    'Informe',
    sanitize(formData.period),
    sanitize(responsible?.full_name ?? ''),
  ].filter(Boolean).join(' - ');

  // ── Sección general (hallazgos + por_mejorar) ─────────────────────
  const general   = sections['__general__'] ?? {};
  const hallazgos  = general.hallazgos  || '';
  const porMejorar = general.por_mejorar || '';
  const hayGeneral = (hallazgos && hallazgos !== '<p></p>') ||
                     (porMejorar && porMejorar !== '<p></p>');

  // ── Ítems del proceso (solo logros) ───────────────────────────────
  const itemsHtml = items.map(item => {
    const s      = sections[item.key];
    const logros = s?.logros ?? '';
    const empty  = !logros || logros === '<p></p>' || logros.trim() === '';

    return `
      <div style="margin-bottom:14px;page-break-inside:avoid;">
        <div style="background:linear-gradient(135deg,${color},${color}bb);
                    padding:6px 14px;border-radius:5px 5px 0 0;">
          <h3 style="margin:0;font-size:9pt;font-weight:bold;color:white;
                     text-transform:uppercase;letter-spacing:.07em;">${item.name}</h3>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 5px 5px;
                    padding:10px 13px;background:${empty?'#fafafa':'#f0fdf4'};
                    border-left:3px solid ${empty?'#e5e7eb':'#86efac'};">
          ${empty
            ? '<p style="margin:0;color:#d1d5db;font-size:9pt;font-style:italic;">Sin logros registrados</p>'
            : `<div style="font-size:9.5pt;line-height:1.6;color:#1f2937;">${logros}</div>`}
        </div>
      </div>`;
  }).join('');

  // ── Sección general al final ──────────────────────────────────────
  const generalHtml = hayGeneral ? `
    <div style="margin-top:24px;page-break-inside:avoid;">
      <h2 style="font-size:9pt;font-weight:bold;color:#2e5244;text-transform:uppercase;
                 letter-spacing:.07em;border-bottom:1.5px solid #e5e7eb;
                 padding-bottom:5px;margin:0 0 12px;">
        📊 Análisis General del Período
      </h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

        <div style="page-break-inside:avoid;">
          <div style="background:#2e5244;padding:7px 14px;border-radius:5px 5px 0 0;">
            <h3 style="margin:0;font-size:9pt;font-weight:bold;color:white;
                       text-transform:uppercase;letter-spacing:.07em;">🔍 Hallazgos</h3>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 5px 5px;
                      padding:10px 13px;min-height:80px;
                      background:${hallazgos && hallazgos !== '<p></p>' ? '#f7f8f0' : '#fafafa'};
                      border-left:3px solid ${hallazgos && hallazgos !== '<p></p>' ? '#d9f99d' : '#e5e7eb'};">
            ${hallazgos && hallazgos !== '<p></p>'
              ? `<div style="font-size:9.5pt;line-height:1.6;color:#1f2937;">${hallazgos}</div>`
              : '<p style="margin:0;color:#d1d5db;font-size:9pt;font-style:italic;">Sin hallazgos registrados</p>'}
          </div>
        </div>

        <div style="page-break-inside:avoid;">
          <div style="background:#d97706;padding:7px 14px;border-radius:5px 5px 0 0;">
            <h3 style="margin:0;font-size:9pt;font-weight:bold;color:white;
                       text-transform:uppercase;letter-spacing:.07em;">⚠️ Por mejorar</h3>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 5px 5px;
                      padding:10px 13px;min-height:80px;
                      background:${porMejorar && porMejorar !== '<p></p>' ? '#fff7ed' : '#fafafa'};
                      border-left:3px solid ${porMejorar && porMejorar !== '<p></p>' ? '#fed7aa' : '#e5e7eb'};">
            ${porMejorar && porMejorar !== '<p></p>'
              ? `<div style="font-size:9.5pt;line-height:1.6;color:#1f2937;">${porMejorar}</div>`
              : '<p style="margin:0;color:#d1d5db;font-size:9pt;font-style:italic;">Sin aspectos por mejorar</p>'}
          </div>
        </div>

      </div>
    </div>` : '';

  // ── HTML completo ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1f2937; background: white; font-size: 11pt; }
    .page { max-width: 210mm; margin: 0 auto; padding: 18mm 16mm; }

    .print-actions { position:fixed; top:14px; right:14px; z-index:999; display:flex; gap:8px; }
    .btn-print { padding:9px 22px; background:#2e5244; color:white; border:none; border-radius:8px;
                 font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.2); }
    .btn-print:hover { background:#1a2e25; }
    .btn-close { padding:9px 14px; background:#e5e7eb; color:#374151; border:none;
                 border-radius:8px; font-size:13px; cursor:pointer; }

    .cell-content p  { margin: 0 0 4px; }
    .cell-content ul,
    .cell-content ol { padding-left: 18px; margin: 3px 0; }
    .cell-content li  { margin: 1px 0; }
    .cell-content strong { font-weight: 700; }
    .cell-content em     { font-style: italic; }
    .cell-content u      { text-decoration: underline; }
    .cell-content img    { max-width:100%; height:auto; max-height:180px; object-fit:contain;
                           display:block; margin:6px 0; border-radius:3px; }
    .cell-content table  { border-collapse:collapse; width:100%; font-size:8.5pt; margin:6px 0; }
    .cell-content th,
    .cell-content td     { border:1px solid #d1d5db; padding:4px 7px; vertical-align:top; }
    .cell-content th     { background:#f3f4f6; font-weight:600; text-align:left; }

    @media print {
      @page { size: A4; margin: 14mm 12mm; }
      body  { font-size: 10pt; }
      .page { max-width: 100%; padding: 0; }
      .print-actions { display: none !important; }
      .no-break { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<div class="print-actions">
  <button class="btn-print" onclick="window.print()">⬇️ Guardar como PDF</button>
  <button class="btn-close"  onclick="window.close()">✕ Cerrar</button>
</div>

<div class="page">

  <!-- PORTADA -->
  <div style="border-bottom:3px solid #2e5244;padding-bottom:20px;margin-bottom:26px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="flex:1;">
        <img src="${LOGO_URL}" crossorigin="anonymous"
          style="height:52px;object-fit:contain;display:block;margin-bottom:12px;"/>
        <h1 style="font-size:17pt;font-weight:bold;color:#2e5244;margin:0 0 4px;">${formData.title}</h1>
        <p style="font-size:10pt;color:#6b7280;margin:0;">Sistema de Gestión Integral · Garana Art S.A.S.</p>
      </div>
      <div style="text-align:right;min-width:185px;">
        <div style="background:${color}18;border:1px solid ${color}35;border-radius:8px;
                    padding:9px 13px;margin-bottom:9px;">
          <p style="margin:0 0 2px;font-size:7.5pt;color:#6b7280;text-transform:uppercase;
                    letter-spacing:.07em;">Proceso</p>
          <p style="margin:0;font-weight:bold;color:${color};font-size:12pt;">
            ${procCfg?.icon ?? '📋'} ${proc?.name ?? '—'}
          </p>
        </div>
        <table style="width:100%;font-size:10pt;border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="color:#9ca3af;padding:2px 6px 2px 0;text-align:right;">Período</td>
              <td style="font-weight:600;color:#374151;text-align:right;">${formData.period}</td>
            </tr>
            <tr>
              <td style="color:#9ca3af;padding:2px 6px 2px 0;text-align:right;">Responsable</td>
              <td style="font-weight:600;color:#374151;text-align:right;">${responsible?.full_name ?? '—'}</td>
            </tr>
            <tr>
              <td style="color:#9ca3af;padding:2px 6px 2px 0;text-align:right;">Fecha</td>
              <td style="font-weight:600;color:#374151;text-align:right;">${today}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  ${objectives.length > 0 ? `
  <!-- OBJETIVOS -->
  <h2 style="font-size:9pt;font-weight:bold;color:#2e5244;text-transform:uppercase;
             letter-spacing:.07em;border-bottom:1px solid #e5e7eb;
             padding-bottom:5px;margin:0 0 10px;">
    🎯 Objetivos estratégicos evaluados
  </h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:22px;">
    ${objectives.map(obj => `
      <div style="display:flex;align-items:flex-start;gap:7px;padding:6px 10px;
                  background:#f0f7f4;border-left:2.5px solid #6dbd96;border-radius:0 4px 4px 0;">
        <span style="width:5px;height:5px;border-radius:50%;background:#6dbd96;
                     flex-shrink:0;margin-top:5px;display:inline-block;"></span>
        <span style="font-size:9.5pt;color:#374151;line-height:1.4;">${obj}</span>
      </div>`).join('')}
  </div>` : ''}

  ${selInds.length > 0 ? `
  <!-- INDICADORES -->
  <h2 style="font-size:9pt;font-weight:bold;color:#2e5244;text-transform:uppercase;
             letter-spacing:.07em;border-bottom:1px solid #e5e7eb;
             padding-bottom:5px;margin:0 0 10px;">
    📊 Indicadores de seguimiento
  </h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:22px;">
    ${selInds.map(ind => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:5px;padding:7px 10px;">
        <p style="margin:0 0 1px;font-weight:600;color:#111827;font-size:9.5pt;">${ind.indicator_name}</p>
        ${ind.consecutive ? `<p style="margin:0;color:#9ca3af;font-size:8pt;font-family:monospace;">${ind.consecutive}</p>` : ''}
      </div>`).join('')}
  </div>` : ''}

  <!-- LOGROS POR ÍTEM -->
  <h2 style="font-size:9pt;font-weight:bold;color:#2e5244;text-transform:uppercase;
             letter-spacing:.07em;border-bottom:1px solid #e5e7eb;
             padding-bottom:5px;margin:0 0 14px;">
    ✅ Logros por proceso
  </h2>
  ${itemsHtml || '<p style="color:#9ca3af;font-style:italic;font-size:9pt;">Sin logros registrados.</p>'}

  <!-- HALLAZGOS Y POR MEJORAR GENERALES -->
  ${generalHtml}

  <!-- FOOTER -->
  <div style="border-top:1.5px solid #e5e7eb;padding-top:10px;margin-top:24px;
              display:flex;justify-content:space-between;font-size:8pt;color:#9ca3af;">
    <span>Garana Art S.A.S. · Sistema de Gestión Integral · ${proc?.name ?? ''}</span>
    <span>${responsible?.full_name ?? ''} · ${formData.period}</span>
  </div>

</div>

<script>
  window.addEventListener('load', function () {
    var img = document.querySelector('img');
    var trigger = function () { setTimeout(window.print, 350); };
    if (img && !img.complete) {
      img.addEventListener('load',  trigger);
      img.addEventListener('error', trigger);
    } else { trigger(); }
  });
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=920,height=720,scrollbars=yes');
  if (!win) { alert('Permite las ventanas emergentes para generar el PDF.'); return; }
  win.document.write(html);
  win.document.close();
  win.document.title = fileName;
}