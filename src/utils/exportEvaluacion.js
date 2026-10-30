// src/utils/exportEvaluacion.js
// ═══════════════════════════════════════════════════════════════════════
// v2 (oct 2026) — Evaluación de proveedores sobre el formato vigente de
// Gestión Documental (formato_vinculado 'registro_eval_proveedores' → hoy
// RE-GR-01 v02, hoja "V2"). El encabezado (código, versión, fecha) no se toca.
//
// Hoja V2: fila 9 = proveedores (C, E, G, I, K, M, O) · fila 10 PUNTUACIÓN/RESULTADO
//   11 CALIDAD (12 no conforme · 13 devoluciones · 14 SST · 15 BASC)
//   16 SERVICIO (17 cantidad · 18 oportunidad · 19 reclamos · 20 documentación)
//   21 PRECIO (22 competitividad · 23 forma de pago · 24 descuentos)
//   25 totales · 29–35 confiabilidad por proveedor (E nombre · G confiabilidad · I aspectos)
//   40–42 análisis por criterio · 44 conclusiones · 47 realizado / aprobado
// ═══════════════════════════════════════════════════════════════════════
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { descargarPlantilla } from '@/hooks/useFormatoVinculado';

const PROV_COLS = [['C', 'D'], ['E', 'F'], ['G', 'H'], ['I', 'J'], ['K', 'L'], ['M', 'N'], ['O', 'P']];
const CRITERIOS = {
  calidad:  { fila: 11, peso: 0.40, sub: { no_conforme: 12, devoluciones: 13, sst: 14, basc: 15 } },
  servicio: { fila: 16, peso: 0.35, sub: { cantidad: 17, oportunidad: 18, reclamos: 19, documentacion: 20 } },
  precio:   { fila: 21, peso: 0.25, sub: { competitividad: 22, forma_pago: 23, descuentos: 24 } },
};
const CONF = { confiable: 'CONFIABLE', aceptable: 'ACEPTABLE', deficiente: 'DEFICIENTE' };

const fmt = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00')
  .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(Number(v).toFixed(2)));

export async function exportEvaluacion(evaluacion, formato) {
  const buf = await descargarPlantilla(formato);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('V2') || wb.worksheets[wb.worksheets.length - 1];
  if (!ws) throw new Error(`No se encontró la hoja V2 en ${formato?.code || 'el formato'}.`);
  // El archivo trae también la versión anterior (hoja V1): se exporta solo la vigente
  wb.worksheets.filter((s) => s.id !== ws.id).forEach((s) => wb.removeWorksheet(s.id));
  ws.state = 'visible';
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const set = (addr, v) => { ws.getCell(addr).value = v ?? null; };
  const scores = [...(evaluacion.scores || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).slice(0, 7);

  set('A6', `Periodo a evaluar: ${fmt(evaluacion.fecha_inicio)} al ${fmt(evaluacion.fecha_fin)}`);
  set('E6', `Fecha de evaluación: ${fmt(evaluacion.fecha_evaluacion)}`);

  // Pesos por criterio (columna PESO)
  Object.values(CRITERIOS).forEach((c) => set(`B${c.fila}`, c.peso));

  scores.forEach((s, i) => {
    const [cP, cR] = PROV_COLS[i];
    const nombre = s.supplier?.nombre || `Proveedor ${i + 1}`;
    set(`${cP}9`, nombre);
    Object.entries(CRITERIOS).forEach(([k, c]) => {
      const crit = s[k] || {};
      set(`${cP}${c.fila}`, num(crit.puntuacion));   // promedio del criterio (1–5)
      set(`${cR}${c.fila}`, num(crit.resultado));    // promedio × peso
      Object.entries(c.sub).forEach(([sk, fila]) => {
        const v = crit.subcats?.[sk];
        set(`${cP}${fila}`, v > 0 ? Number(v) : null);
      });
    });
    // Confiabilidad (filas 29–35)
    const f = 29 + i;
    set(`E${f}`, nombre);
    set(`G${f}`, `${CONF[s.confiabilidad] || ''} (${(Number(s.total_score) || 0).toFixed(2)})`.trim());
    set(`I${f}`, s.aspectos_mejorar || evaluacion.aspectos_por_mejorar || null);
  });
  // Columnas y filas de confiabilidad sin proveedor: se limpian
  for (let i = scores.length; i < 7; i++) set(`${PROV_COLS[i][0]}9`, null);
  for (let i = scores.length; i < 7; i++) { set(`E${29 + i}`, null); set(`G${29 + i}`, null); set(`I${29 + i}`, null); }

  // Análisis por criterio: promedio (1–5) entre los proveedores evaluados
  const prom = (k) => (scores.length
    ? Number((scores.reduce((t, s) => t + (Number(s[k]?.puntuacion) || 0), 0) / scores.length).toFixed(2))
    : null);
  set('H40', prom('calidad')); set('H41', prom('servicio')); set('H42', prom('precio'));

  set('A44', evaluacion.conclusiones || null);
  set('A47', `Realizado por: ${evaluacion.realizado_por_profile?.full_name || '____________________'}`);
  set('H47', `Aprobado por: ${evaluacion.aprobado_por_profile?.full_name || '____________________'}`);

  const out = await wb.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${formato?.code || 'RE-GR-01'}_EVALUACION_${evaluacion.consecutive || 'PROVEEDORES'}_${hoy}.xlsx`);
  return true;
}

export default exportEvaluacion;
