// src/utils/printHojaVidaEquipo.js
// ═══════════════════════════════════════════════════════════════════
// Impresión / PDF de la Hoja de Vida de equipos — formato RE-GR-11
// Réplica del formato de calidad "RE-GR-11 HOJA DE VIDA DE MAQUINA.xls":
//   Encabezado: logo INDECON · título · CÓDIGO/VERSIÓN/FECHA/PÁGINA
//   IDENTIFICACION: (Código/Serial · Tipo/Modelo · Localización/Marca) + Foto
//   CARACTERISTICAS (Función + campos adicionales del tipo de equipo)
//   RUTINARIO: | PREVENTIVO:
//   DATOS HISTÓRICOS DE MANTENIMIENTO: Fecha · Tipo (Prev./Corr.) · Descripción · Firma
// Patrón del SIG: ventana nueva + window.print().
//
// Logo: /public/logo-indecon.jpg (extraído del formato oficial).
// Uso: printHojasVida({ equipos, registros, fotoUrls, config, win? })
// ═══════════════════════════════════════════════════════════════════

// Datos de control del formato (cámbialos aquí si sale nueva versión)
const FORMATO = { codigo: 'RE-GR-11', version: '1', fecha: '20/01/2023' };
const FILAS_MIN_HISTORICO = 12; // el formato trae renglones vacíos para diligenciar

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const val = (v) => (v === null || v === undefined || String(v).trim() === '' ? '' : esc(v));
const nl2br = (v) => (v ? esc(v).replace(/\n/g, '<br>') : '');

function fmt(s) {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : '';
}

// Fila "Etiqueta: valor | Etiqueta: valor" como en el formato
const par = (l1, v1, l2, v2) => `
  <tr>
    <td class="lb">${l1}</td><td class="vl">${v1}</td>
    <td class="lb">${l2 ?? ''}</td><td class="vl">${v2 ?? ''}</td>
  </tr>`;

function hoja(eq, regs, fotoUrl, cfg, idx, total, logoUrl) {
  const esPC = eq.tipo === 'computador';
  const titulo = esPC ? 'HOJA DE VIDA DE EQUIPO DE CÓMPUTO' : 'HOJA DE VIDA DE MAQUINA';
  const sp = eq.especificaciones || {};

  // Campos adicionales del tipo (de a dos por fila, mismo estilo del formato)
  const extras = [
    ['Responsable:', val(eq.usuario_responsable)],
    ['Estado:', val(eq.estado)],
    ['Fecha de compra:', fmt(eq.fecha_compra)],
    ['Garantía hasta:', fmt(eq.garantia_hasta)],
    ...cfg.especificaciones.map((c) => [`${esc(c.l)}:`, val(sp[c.k])]),
    ...cfg.perifericos.map((c) => [`${esc(c.l)}:`, sp[c.k] ? 'SI' : 'NO']),
    ...(cfg.otrosPerifericos ? [['Otros periféricos:', val(sp.otros)]] : []),
  ];
  let extrasHtml = '';
  for (let i = 0; i < extras.length; i += 2) {
    const [a, b] = [extras[i], extras[i + 1] || ['', '']];
    extrasHtml += par(a[0], a[1], b[0], b[1]);
  }

  const filas = regs.map((r) => `
    <tr>
      <td class="c">${fmt(r.fecha)}</td>
      <td class="c">${r.tipo === 'Preventivo' ? 'X' : ''}</td>
      <td class="c">${r.tipo === 'Correctivo' ? 'X' : ''}</td>
      <td>${esc(r.descripcion)}${r.tecnico ? ` <span class="tec">— Técnico: ${esc(r.tecnico)}</span>` : ''}${r.estado === 'Pendiente' ? ' <i>(Pendiente)</i>' : ''}</td>
      <td class="c firma">${esc(r.registrado?.full_name || '')}</td>
    </tr>`).join('');
  const vacias = Array.from({ length: Math.max(0, FILAS_MIN_HISTORICO - regs.length) })
    .map(() => '<tr class="vacia"><td></td><td></td><td></td><td></td><td></td></tr>').join('');

  return `
  <section class="hoja">
    <!-- ENCABEZADO -->
    <table class="enc">
      <tr>
        <td class="enc-logo" rowspan="4">${logoUrl ? `<img src="${logoUrl}" alt="INDECON SAS">` : 'INDECON SAS'}</td>
        <td class="enc-tit" rowspan="4">${titulo}</td>
        <td class="enc-k b">CODIGO:</td><td class="enc-k b">VERSION:</td>
      </tr>
      <tr><td class="enc-k">${FORMATO.codigo}</td><td class="enc-k">${FORMATO.version}</td></tr>
      <tr><td class="enc-k b">FECHA:</td><td class="enc-k b">PAGINA:</td></tr>
      <tr><td class="enc-k">${FORMATO.fecha}</td><td class="enc-k">${idx} DE ${total}</td></tr>
    </table>

    <!-- IDENTIFICACION + CARACTERISTICAS | FOTO -->
    <table class="cuerpo">
      <tr>
        <td class="izq">
          <div class="st">IDENTIFICACION:</div>
          <table class="kv">
            ${par('Código:', `<b>${val(eq.codigo)}</b>`, 'Serial:', val(eq.serial))}
            ${par(esPC ? 'Tipo de equipo:' : 'Tipo de máquina:', val(eq.tipo_equipo), 'Modelo:', val(eq.modelo))}
            ${par('Localizacion:', val(eq.area), 'Marca:', val(eq.marca))}
          </table>

          <div class="st">CARACTERISTICAS</div>
          <table class="kv">
            <tr><td class="lb">Funcion:</td><td class="vl" colspan="3">${nl2br(eq.funcion)}</td></tr>
            ${extrasHtml}
            <tr><td class="lb">Herramientas:</td><td class="vl" colspan="3">${nl2br(eq.herramientas)}</td></tr>
          </table>
        </td>
        <td class="foto">${fotoUrl ? `<img src="${fotoUrl}" alt="Foto">` : '<span>Foto</span>'}</td>
      </tr>
    </table>

    <!-- RUTINARIO | PREVENTIVO -->
    <table class="mant">
      <tr>
        <td><div class="st0">RUTINARIO:</div><div class="txt">${nl2br(eq.mant_rutinario)}</div></td>
        <td><div class="st0">PREVENTIVO:</div><div class="txt">${nl2br(eq.mant_preventivo)}</div></td>
      </tr>
    </table>

    <!-- DATOS HISTÓRICOS -->
    <div class="st">DATOS HISTÓRICOS DE MANTENIMIENTO:</div>
    <table class="hist">
      <thead>
        <tr><th rowspan="2" style="width:13%">Fecha</th><th colspan="2" style="width:14%">Tipo</th><th rowspan="2">Descripción</th><th rowspan="2" style="width:20%">Firma</th></tr>
        <tr><th>Prev.</th><th>Corr.</th></tr>
      </thead>
      <tbody>${filas}${vacias}</tbody>
    </table>
    ${eq.observaciones ? `<p class="obs"><b>Observaciones:</b> ${nl2br(eq.observaciones)}</p>` : ''}
  </section>`;
}

export function printHojasVida({ equipos, registros, fotoUrls = {}, config, win = null }) {
  const lista = (equipos || []).filter(Boolean);
  if (!lista.length) return false;

  const logoUrl = `${window.location.origin}/logo-indecon.jpg`;

  const body = lista.map((eq, i) => {
    const regs = (registros || [])
      .filter((r) => r.equipo_id === eq.id)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return hoja(eq, regs, fotoUrls[eq.foto_path], config, i + 1, lista.length, logoUrl);
  }).join('');

  const title = lista.length === 1
    ? `${FORMATO.codigo} Hoja de Vida - ${lista[0].codigo}`
    : `${FORMATO.codigo} Hojas de Vida - ${config.label}`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: letter; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 9.5pt; }
  .hoja { page-break-after: always; }
  .hoja:last-child { page-break-after: auto; }
  table { border-collapse: collapse; width: 100%; }

  /* Encabezado */
  .enc td { border: 1px solid #000; }
  .enc-logo { width: 17%; text-align: center; padding: 4px; }
  .enc-logo img { max-width: 95px; max-height: 62px; }
  .enc-tit { text-align: center; vertical-align: top; padding-top: 6px; font-size: 13pt; font-weight: bold; }
  .enc-k { width: 10%; text-align: center; font-size: 7pt; padding: 2px; }
  .enc-k.b { font-weight: bold; }

  /* Títulos de sección: negrita, cursiva, subrayado (como el formato) */
  .st { font-weight: bold; font-style: italic; text-decoration: underline; margin: 14px 0 3px; font-size: 9.5pt; }
  .st0 { font-weight: bold; text-decoration: underline; font-size: 9.5pt; }

  .cuerpo { margin-top: 18px; }
  .cuerpo > tbody > tr > td { vertical-align: top; }
  .izq { padding-right: 8px; }
  .kv td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
  .kv .lb { width: 22%; white-space: nowrap; }
  .kv .vl { width: 28%; }
  .foto { width: 30%; border: 1px solid #000; text-align: center; vertical-align: middle !important; }
  .foto img { max-width: 100%; max-height: 210px; object-fit: contain; }

  .mant { margin-top: 6px; }
  .mant td { border: 1px solid #000; border-left-width: 2px; vertical-align: top; width: 50%; height: 88px; padding: 2px 4px; }
  .mant .txt { margin-top: 3px; }

  .hist th { border: 1px solid #000; font-size: 9pt; padding: 2px; }
  .hist td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 26px; }
  .hist tr { page-break-inside: avoid; }
  .c { text-align: center; }
  .tec { font-size: 8pt; color: #333; }
  .firma { font-size: 8.5pt; }
  .obs { margin-top: 6px; font-size: 9pt; }
</style></head>
<body>${body}
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 300); };
</script>
</body></html>`;

  // `win` = ventana abierta previamente por el componente (evita el bloqueador)
  const w = win || window.open('', '_blank');
  if (!w) return false; // bloqueador de ventanas emergentes
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}