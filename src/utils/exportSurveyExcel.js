// src/utils/exportSurveyExcel.js
// Exportar encuestas a Excel — datos completos
// Requiere: npm install xlsx

import * as XLSX from 'xlsx';

// ─── Satisfacción de Clientes ─────────────────────────────────────────────────
export function exportSatisfaccionClientes({ responses, answers, questions, periods, currentPeriod }) {
  const wb          = XLSX.utils.book_new();
  const periodName  = currentPeriod?.name || 'Período';
  const scaleQs     = questions.filter(q => q.question_type === 'scale').sort((a, b) => a.order_index - b.order_index);
  const textQs      = questions.filter(q => q.question_type === 'text').sort((a, b) => a.order_index - b.order_index);

  // ── Hoja 1: Respuestas completas (una fila por encuestado) ────────────────
  const headers = [
    'Fecha',
    'Empresa',
    'Nombre',
    'Ciudad',
    'Acepta tratamiento de datos',
    ...scaleQs.map(q => q.question_text),
    ...textQs.map(q => q.question_text),
  ];

  const dataRows = responses.map(r => {
    const rAnswers = answers.filter(a => a.response_id === r.id);
    return [
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('es-CO') : '',
      r.company_name         || '',
      r.respondent_name      || '',
      r.city                 || '',
      r.accepts_data_treatment ? 'Sí' : 'No',
      ...scaleQs.map(q => {
        const a = rAnswers.find(a => a.question_id === q.id);
        return a?.value_number ?? '';
      }),
      ...textQs.map(q => {
        const a = rAnswers.find(a => a.question_id === q.id);
        return a?.value_text || '';
      }),
    ];
  });

  const wsRespuestas = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  wsRespuestas['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 12 },
    ...scaleQs.map(() => ({ wch: 52 })),
    ...textQs.map(() => ({ wch: 60 })),
  ];
  XLSX.utils.book_append_sheet(wb, wsRespuestas, 'Respuestas completas');

  // ── Hoja 2: Resumen de promedios ──────────────────────────────────────────
  const allScaleAns = answers.filter(a => a.value_number !== null);
  const generalAvg  = allScaleAns.length
    ? parseFloat((allScaleAns.reduce((s, a) => s + a.value_number, 0) / allScaleAns.length).toFixed(2)) : 0;
  const satRate     = allScaleAns.length
    ? Math.round((allScaleAns.filter(a => a.value_number >= 4).length / allScaleAns.length) * 100) : 0;

  const resumenRows = [
    [`Satisfacción del Cliente — ${periodName}`],
    [`Total respuestas: ${responses.length}`, '', `Promedio general: ${generalAvg} / 5`, '', `% Satisfacción: ${satRate}%`],
    [],
    ['Pregunta', 'Promedio', 'Respuestas', '% Satisf. (≥4)', 'Estado', '1 (Alta Insatisf.)', '2 (Parcial Insatisf.)', '3 (Regular)', '4 (Parcial Satisf.)', '5 (Alta Satisf.)'],
  ];
  scaleQs.forEach(q => {
    const qAns  = answers.filter(a => a.question_id === q.id && a.value_number !== null);
    const avg   = qAns.length ? parseFloat((qAns.reduce((s, a) => s + a.value_number, 0) / qAns.length).toFixed(2)) : null;
    const sat   = qAns.length ? Math.round((qAns.filter(a => a.value_number >= 4).length / qAns.length) * 100) : 0;
    const dist  = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    qAns.forEach(a => { dist[a.value_number] = (dist[a.value_number] || 0) + 1; });
    const estado = !avg ? 'Sin datos' : avg >= 4 ? 'Bueno' : avg >= 3 ? 'Regular' : 'Crítico';
    resumenRows.push([q.question_text, avg ?? '—', qAns.length, `${sat}%`, estado, dist[1], dist[2], dist[3], dist[4], dist[5]]);
  });
  resumenRows.push([], ['PROMEDIO GENERAL', generalAvg, responses.length, `${satRate}%`, generalAvg >= 4 ? 'Bueno' : generalAvg >= 3 ? 'Regular' : 'Crítico']);

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [
    { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ── Hoja 3: Sugerencias ───────────────────────────────────────────────────
  if (textQs.length > 0) {
    const sugHeaders = ['Fecha', 'Empresa', 'Nombre', 'Ciudad', ...textQs.map(q => q.question_text)];
    const sugRows = responses.map(r => {
      const rAns = answers.filter(a => a.response_id === r.id);
      return [
        r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('es-CO') : '',
        r.company_name    || '',
        r.respondent_name || '',
        r.city            || '',
        ...textQs.map(q => rAns.find(a => a.question_id === q.id)?.value_text || ''),
      ];
    }).filter(row => row.slice(4).some(v => v));

    if (sugRows.length > 0) {
      const wsSug = XLSX.utils.aoa_to_sheet([sugHeaders, ...sugRows]);
      wsSug['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 16 }, ...textQs.map(() => ({ wch: 70 }))];
      XLSX.utils.book_append_sheet(wb, wsSug, 'Sugerencias');
    }
  }

  XLSX.writeFile(wb, `SatisfaccionClientes_${periodName.replace(/\s+/g, '_')}_${_today()}.xlsx`);
}

// ─── Clima Laboral ────────────────────────────────────────────────────────────
export function exportClimaLaboral({ responses, answers, questions, periods, currentPeriod, filterArea = 'all' }) {
  const wb         = XLSX.utils.book_new();
  const periodName = currentPeriod?.name || 'Período';
  const scaleQs    = questions.filter(q => q.question_type === 'scale').sort((a, b) => a.order_index - b.order_index);
  const textQs     = questions.filter(q => q.question_type === 'text').sort((a, b) => a.order_index - b.order_index);
  const categories = [...new Set(scaleQs.map(q => q.category).filter(Boolean))];

  const filteredResponses = filterArea === 'all' ? responses : responses.filter(r => r.work_area === filterArea);
  const filteredIds       = new Set(filteredResponses.map(r => r.id));
  const filteredAnswers   = answers.filter(a => filteredIds.has(a.response_id));
  const areaLabel         = filterArea === 'all' ? 'Todas las áreas' : filterArea;

  // ── Hoja 1: Respuestas completas ──────────────────────────────────────────
  const headers = [
    'Fecha',
    'Nombre y apellidos',
    'Área',
    'Acepta tratamiento de datos',
    ...scaleQs.map(q => `[${q.category || 'General'}] ${q.question_text}`),
    ...textQs.map(q => q.question_text),
  ];

  const dataRows = filteredResponses.map(r => {
    const rAnswers = answers.filter(a => a.response_id === r.id);
    return [
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('es-CO') : '',
      r.employee_name || r.respondent_name || '',
      r.work_area || '',
      r.accepts_data_treatment ? 'Sí' : 'No',
      ...scaleQs.map(q => rAnswers.find(a => a.question_id === q.id)?.value_number ?? ''),
      ...textQs.map(q => rAnswers.find(a => a.question_id === q.id)?.value_text || ''),
    ];
  });

  const wsRespuestas = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  wsRespuestas['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
    ...scaleQs.map(() => ({ wch: 52 })),
    ...textQs.map(() => ({ wch: 60 })),
  ];
  XLSX.utils.book_append_sheet(wb, wsRespuestas, 'Respuestas completas');

  // ── Hoja 2: Resumen por categoría ─────────────────────────────────────────
  const allScaleAns = filteredAnswers.filter(a => a.value_number !== null);
  const generalAvg  = allScaleAns.length
    ? parseFloat((allScaleAns.reduce((s, a) => s + a.value_number, 0) / allScaleAns.length).toFixed(2)) : 0;
  const satRate     = allScaleAns.length
    ? Math.round((allScaleAns.filter(a => a.value_number >= 4).length / allScaleAns.length) * 100) : 0;

  const resumenRows = [
    [`Clima Laboral — ${periodName} — ${areaLabel}`],
    [`Total respuestas: ${filteredResponses.length}`, '', `Promedio general: ${generalAvg} / 5`, '', `% Satisfacción: ${satRate}%`],
    [],
    ['Categoría', 'Promedio', 'Preguntas', '% Satisf. (≥4)', 'Estado'],
  ];
  categories.forEach(cat => {
    const catQs  = scaleQs.filter(q => q.category === cat);
    const catAns = filteredAnswers.filter(a => catQs.some(q => q.id === a.question_id) && a.value_number !== null);
    const avg    = catAns.length ? parseFloat((catAns.reduce((s, a) => s + a.value_number, 0) / catAns.length).toFixed(2)) : null;
    const sat    = catAns.length ? Math.round((catAns.filter(a => a.value_number >= 4).length / catAns.length) * 100) : 0;
    const estado = !avg ? 'Sin datos' : avg >= 4 ? 'Bueno' : avg >= 3 ? 'Regular' : 'Crítico';
    resumenRows.push([cat, avg ?? '—', catQs.length, `${sat}%`, estado]);
  });
  resumenRows.push([], ['PROMEDIO GENERAL', generalAvg, scaleQs.length, `${satRate}%`, generalAvg >= 4 ? 'Bueno' : generalAvg >= 3 ? 'Regular' : 'Crítico']);

  resumenRows.push([], ['── COMPARATIVA POR ÁREA ──']);
  resumenRows.push(['Área', 'Respuestas', 'Promedio', '% Satisfacción']);
  ['Administrativo', 'Operativo'].forEach(area => {
    const aResp = responses.filter(r => r.work_area === area);
    const aIds  = new Set(aResp.map(r => r.id));
    const aAns  = answers.filter(a => aIds.has(a.response_id) && a.value_number !== null);
    const avg   = aAns.length ? parseFloat((aAns.reduce((s, a) => s + a.value_number, 0) / aAns.length).toFixed(2)) : '—';
    const sat   = aAns.length ? Math.round((aAns.filter(a => a.value_number >= 4).length / aAns.length) * 100) : '—';
    resumenRows.push([area, aResp.length, avg, typeof sat === 'number' ? `${sat}%` : '—']);
  });

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 36 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ── Hoja 3: Detalle por pregunta ──────────────────────────────────────────
  const detalleRows = [
    ['Categoría', 'Pregunta', 'Promedio', 'Respuestas', '% Satisf. (≥4)', 'Estado', '1', '2', '3', '4', '5'],
  ];
  scaleQs.forEach(q => {
    const qAns  = filteredAnswers.filter(a => a.question_id === q.id && a.value_number !== null);
    const avg   = qAns.length ? parseFloat((qAns.reduce((s, a) => s + a.value_number, 0) / qAns.length).toFixed(2)) : null;
    const sat   = qAns.length ? Math.round((qAns.filter(a => a.value_number >= 4).length / qAns.length) * 100) : 0;
    const dist  = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    qAns.forEach(a => { dist[a.value_number] = (dist[a.value_number] || 0) + 1; });
    const estado = !avg ? 'Sin datos' : avg >= 4 ? 'Bueno' : avg >= 3 ? 'Regular' : 'Crítico';
    detalleRows.push([q.category || '', q.question_text, avg ?? '—', qAns.length, `${sat}%`, estado, dist[1], dist[2], dist[3], dist[4], dist[5]]);
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
  wsDetalle['!cols'] = [{ wch: 32 }, { wch: 60 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }];
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Por pregunta');

  // ── Hoja 4: Comentarios ───────────────────────────────────────────────────
  if (textQs.length > 0) {
    const comHeaders = ['Fecha', 'Nombre y apellidos', 'Área', 'Acepta datos', ...textQs.map(q => q.question_text)];
    const comRows = filteredResponses.map(r => {
      const rAns = answers.filter(a => a.response_id === r.id);
      return [
        r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('es-CO') : '',
        r.employee_name || r.respondent_name || '',
        r.work_area || '',
        r.accepts_data_treatment ? 'Sí' : 'No',
        ...textQs.map(q => rAns.find(a => a.question_id === q.id)?.value_text || ''),
      ];
    }).filter(row => row.slice(4).some(v => v));

    if (comRows.length > 0) {
      const wsCom = XLSX.utils.aoa_to_sheet([comHeaders, ...comRows]);
      wsCom['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, ...textQs.map(() => ({ wch: 70 }))];
      XLSX.utils.book_append_sheet(wb, wsCom, 'Comentarios');
    }
  }

  XLSX.writeFile(wb, `ClimaLaboral_${periodName.replace(/\s+/g, '_')}_${areaLabel.replace(/\s+/g, '_')}_${_today()}.xlsx`);
}

// ── Helper ────────────────────────────────────────────────────────────────────
function _today() {
  return new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
}