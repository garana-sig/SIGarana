// src/utils/printHojaVidaEquipo.js
// ═══════════════════════════════════════════════════════════════════
// Impresión / PDF de la Hoja de Vida de equipos — formato RE-GR-11
// Patrón del SIG: ventana nueva + window.print() (sin html2canvas).
//
// Estructura fiel al formato de calidad RE-GR-11:
//   Encabezado (logo · título · código/versión/fecha)
//   IDENTIFICACIÓN · CARACTERÍSTICAS · MANTENIMIENTO (rutinario/preventivo)
//   DATOS HISTÓRICOS DE MANTENIMIENTO (fecha · prev/corr · descripción · firma)
// + campos adicionales del tipo de equipo (especificaciones y periféricos).
//
// Uso:
//   printHojasVida({ equipos: [eq] | lista, registros, fotoUrls, config })
// ═══════════════════════════════════════════════════════════════════

const LOGO_URL =
  'https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/garana1.png';

// Datos de control del formato (cámbialos aquí si sale nueva versión)
const FORMATO = { codigo: 'RE-GR-11', version: '1', fecha: '20/01/2023' };

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const val = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : esc(v));

function fmt(s) {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : '—';
}

const nl2br = (v) => (v ? esc(v).replace(/\n/g, '<br>') : '<span class="vacio">—</span>');

function hoja(eq, regs, fotoUrl, cfg, idx, total) {
  const sp = eq.especificaciones || {};
  const titulo = eq.tipo === 'computador' ? 'HOJA DE VIDA DE EQUIPO DE CÓMPUTO' : 'HOJA DE VIDA DE MÁQUINA';

  const specs = cfg.especificaciones.map((c) => `
    <tr><th>${esc(c.l)}</th><td>${val(sp[c.k])}</td></tr>`).join('');

  const perifs = cfg.perifericos.length ? `
    <div class="perifs">
      ${cfg.perifericos.map((c) => `<span class="pf ${sp[c.k] ? 'si' : 'no'}">${sp[c.k] ? '✔' : '✘'} ${esc(c.l)}</span>`).join('')}
      ${cfg.otrosPerifericos ? `<span class="pf otros"><b>Otros:</b> ${val(sp.otros)}</span>` : ''}
    </div>` : '';

  const filas = regs.length
    ? regs.map((r) => `
      <tr>
        <td class="c">${fmt(r.fecha)}</td>
        <td class="c">${r.tipo === 'Preventivo' ? 'X' : ''}</td>
        <td class="c">${r.tipo === 'Correctivo' ? 'X' : ''}</td>
        <td>${esc(r.descripcion)}${r.estado === 'Pendiente' ? ' <span class="pend">(Pendiente)</span>' : ''}
            ${r.tecnico ? `<div class="tec">Técnico: ${esc(r.tecnico)}</div>` : ''}</td>
        <td class="c firma">${esc(r.registrado?.full_name || '')}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="vacio c">Sin registros de mantenimiento.</td></tr>';

  return `
  <section class="hoja">
    <table class="enc">
      <tr>
        <td class="enc-logo" rowspan="2"><img src="${LOGO_URL}" alt="Garana"></td>
        <td class="enc-tit" rowspan="2">${titulo}</td>
        <td class="enc-k">CÓDIGO:<br><b>${FORMATO.codigo}</b></td>
        <td class="enc-k">VERSIÓN:<br><b>${FORMATO.version}</b></td>
      </tr>
      <tr>
        <td class="enc-k">FECHA:<br><b>${FORMATO.fecha}</b></td>
        <td class="enc-k">PÁGINA:<br><b>${idx} DE ${total}</b></td>
      </tr>
    </table>

    <div class="sec">IDENTIFICACIÓN</div>
    <div class="ident">
      <table class="kv">
        <tr><th>Código</th><td><b>${val(eq.codigo)}</b></td><th>Serial</th><td>${val(eq.serial)}</td></tr>
        <tr><th>Tipo de equipo</th><td>${val(eq.tipo_equipo)}</td><th>Modelo</th><td>${val(eq.modelo)}</td></tr>
        <tr><th>Localización</th><td>${val(eq.area)}</td><th>Marca</th><td>${val(eq.marca)}</td></tr>
        <tr><th>Responsable</th><td>${val(eq.usuario_responsable)}</td><th>Estado</th><td>${val(eq.estado)}</td></tr>
        <tr><th>Fecha de compra</th><td>${fmt(eq.fecha_compra)}</td><th>Garantía hasta</th><td>${fmt(eq.garantia_hasta)}</td></tr>
      </table>
      <div class="foto">${fotoUrl ? `<img src="${fotoUrl}" alt="Foto">` : '<span>Foto</span>'}</div>
    </div>

    <div class="sec">CARACTERÍSTICAS</div>
    <div class="box"><b>Función:</b> ${nl2br(eq.funcion)}</div>
    ${specs ? `<table class="kv specs">${specs}</table>` : ''}
    ${perifs}
    ${eq.herramientas ? `<div class="box"><b>Herramientas:</b> ${nl2br(eq.herramientas)}</div>` : ''}

    <div class="sec">MANTENIMIENTO</div>
    <table class="mant">
      <tr><th>RUTINARIO</th><th>PREVENTIVO</th></tr>
      <tr><td>${nl2br(eq.mant_rutinario)}</td><td>${nl2br(eq.mant_preventivo)}</td></tr>
    </table>

    <div class="sec">DATOS HISTÓRICOS DE MANTENIMIENTO</div>
    <table class="hist">
      <thead>
        <tr><th rowspan="2" style="width:80px">Fecha</th><th colspan="2">Tipo</th><th rowspan="2">Descripción</th><th rowspan="2" style="width:120px">Firma</th></tr>
        <tr><th style="width:40px">Prev.</th><th style="width:40px">Corr.</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>

    ${eq.observaciones ? `<div class="box"><b>Observaciones:</b> ${nl2br(eq.observaciones)}</div>` : ''}

    <div class="pie"><span>Impreso el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</span><span>Garana Art · INDECON S.A.S</span></div>
  </section>`;
}

export function printHojasVida({ equipos, registros, fotoUrls = {}, config }) {
  const lista = (equipos || []).filter(Boolean);
  if (!lista.length) return false;

  const body = lista.map((eq, i) => {
    const regs = (registros || [])
      .filter((r) => r.equipo_id === eq.id)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return hoja(eq, regs, fotoUrls[eq.foto_path], config, i + 1, lista.length);
  }).join('');

  const title = lista.length === 1
    ? `${FORMATO.codigo} Hoja de Vida - ${lista[0].codigo}`
    : `${FORMATO.codigo} Hojas de Vida - ${config.label}`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: letter; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a2e25; margin: 0; font-size: 10pt; }
  .hoja { page-break-after: always; }
  .hoja:last-child { page-break-after: auto; }
  table { border-collapse: collapse; width: 100%; }
  .enc td { border: 1px solid #2e5244; padding: 4px 8px; }
  .enc-logo { width: 90px; text-align: center; }
  .enc-logo img { max-width: 70px; max-height: 50px; }
  .enc-tit { text-align: center; font-size: 13pt; font-weight: bold; color: #2e5244; letter-spacing: .04em; }
  .enc-k { width: 95px; font-size: 7.5pt; color: #555; text-align: center; }
  .enc-k b { font-size: 9pt; color: #1a2e25; }
  .sec { background: #2e5244; color: #fff; font-weight: bold; font-size: 9pt; letter-spacing: .06em;
         padding: 4px 8px; margin-top: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ident { display: flex; gap: 8px; align-items: stretch; }
  .ident .kv { flex: 1; }
  .kv th, .kv td { border: 1px solid #c9cfb8; padding: 4px 6px; text-align: left; vertical-align: top; }
  .kv th { background: #f2f2ea; color: #2e5244; font-size: 8.5pt; width: 22%;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .specs th { width: 35%; }
  .foto { width: 150px; min-height: 120px; border: 1px solid #c9cfb8; display: flex; align-items: center;
          justify-content: center; color: #999; font-size: 8pt; }
  .foto img { max-width: 100%; max-height: 150px; object-fit: contain; }
  .box { border: 1px solid #c9cfb8; border-top: none; padding: 5px 7px; }
  .sec + .box { border-top: 1px solid #c9cfb8; }
  .perifs { border: 1px solid #c9cfb8; border-top: none; padding: 5px 7px; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 9pt; }
  .pf.si { color: #2e5244; } .pf.no { color: #999; }
  .mant th { border: 1px solid #c9cfb8; background: #f2f2ea; color: #2e5244; font-size: 8.5pt; padding: 4px;
             -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .mant td { border: 1px solid #c9cfb8; padding: 6px; vertical-align: top; width: 50%; min-height: 50px; }
  .hist th { border: 1px solid #c9cfb8; background: #f2f2ea; color: #2e5244; font-size: 8.5pt; padding: 3px;
             -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hist td { border: 1px solid #c9cfb8; padding: 4px 6px; vertical-align: top; font-size: 9pt; }
  .hist tr { page-break-inside: avoid; }
  .c { text-align: center; }
  .tec { color: #6f7b2c; font-size: 8pt; margin-top: 2px; }
  .pend { color: #d97706; font-size: 8pt; }
  .firma { font-size: 8.5pt; font-style: italic; }
  .vacio { color: #aaa; font-style: italic; }
  .pie { display: flex; justify-content: space-between; margin-top: 10px; font-size: 7.5pt; color: #888;
         border-top: 1px solid #dedecc; padding-top: 4px; }
</style></head>
<body>${body}
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 300); };
</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false; // bloqueador de ventanas emergentes
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}