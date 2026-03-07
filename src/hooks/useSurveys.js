// src/hooks/useSurveys.js
// Hook interno para admin/gerencia
// Gestiona: períodos, preguntas, y lectura de respuestas para dashboards

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── useSurveys ───────────────────────────────────────────────────────────────
// Carga tipos, períodos y preguntas. CRUD de períodos y preguntas.
export function useSurveys(surveyTypeCode) {
  const [surveyType,  setSurveyType]  = useState(null);
  const [periods,     setPeriods]     = useState([]);
  const [questions,   setQuestions]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── Cargar todo ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!surveyTypeCode) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Tipo
      const { data: typeData, error: typeError } = await supabase
        .from('survey_type')
        .select('id, code, name, description, is_active')
        .eq('code', surveyTypeCode)
        .single();
      if (typeError) throw typeError;
      setSurveyType(typeData);

      // 2. Períodos (todos, ordenados por año desc y semestre desc)
      const { data: periodsData, error: periodsError } = await supabase
        .from('survey_period')
        .select('id, name, semester, year, is_active, start_date, end_date, created_at')
        .eq('survey_type_id', typeData.id)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });
      if (periodsError) throw periodsError;
      setPeriods(periodsData || []);

      // 3. Preguntas (todas, activas e inactivas para gestión)
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_question')
        .select('id, category, order_index, question_text, question_type, is_required, is_active, created_at')
        .eq('survey_type_id', typeData.id)
        .order('order_index');
      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

    } catch (err) {
      console.error('useSurveys load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [surveyTypeCode]);

  useEffect(() => { load(); }, [load]);

  // ── CRUD Períodos ────────────────────────────────────────────────────────────

  const createPeriod = async (formData) => {
    try {
      const { error } = await supabase
        .from('survey_period')
        .insert({
          survey_type_id: surveyType.id,
          name:           formData.name,
          semester:       Number(formData.semester),
          year:           Number(formData.year),
          is_active:      formData.is_active || false,
          start_date:     formData.start_date || null,
          end_date:       formData.end_date   || null,
        });
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updatePeriod = async (id, formData) => {
    try {
      const { error } = await supabase
        .from('survey_period')
        .update({
          name:       formData.name,
          semester:   Number(formData.semester),
          year:       Number(formData.year),
          start_date: formData.start_date || null,
          end_date:   formData.end_date   || null,
        })
        .eq('id', id);
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Activar un período — el trigger de BD desactiva el anterior automáticamente
  const activatePeriod = async (id) => {
    try {
      const { error } = await supabase
        .from('survey_period')
        .update({ is_active: true })
        .eq('id', id);
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deletePeriod = async (id) => {
    try {
      // Verificar que no tenga respuestas antes de eliminar
      const { count, error: countError } = await supabase
        .from('survey_response')
        .select('id', { count: 'exact', head: true })
        .eq('survey_period_id', id);
      if (countError) throw countError;
      if (count > 0) {
        return { success: false, error: `No se puede eliminar: tiene ${count} respuesta(s) registrada(s)` };
      }
      const { error } = await supabase.from('survey_period').delete().eq('id', id);
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── CRUD Preguntas ───────────────────────────────────────────────────────────

  const createQuestion = async (formData) => {
    try {
      const { error } = await supabase
        .from('survey_question')
        .insert({
          survey_type_id: surveyType.id,
          category:       formData.category    || null,
          order_index:    Number(formData.order_index) || questions.length + 1,
          question_text:  formData.question_text,
          question_type:  formData.question_type || 'scale',
          is_required:    formData.is_required !== false,
          is_active:      true,
        });
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateQuestion = async (id, formData) => {
    try {
      const { error } = await supabase
        .from('survey_question')
        .update({
          category:      formData.category      || null,
          order_index:   Number(formData.order_index),
          question_text: formData.question_text,
          question_type: formData.question_type,
          is_required:   formData.is_required !== false,
        })
        .eq('id', id);
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Desactivar pregunta (soft delete — no borra respuestas históricas)
  const toggleQuestion = async (id, currentActive) => {
    try {
      const { error } = await supabase
        .from('survey_question')
        .update({ is_active: !currentActive })
        .eq('id', id);
      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    surveyType,
    periods,
    questions,
    loading,
    error,
    reload: load,
    // Períodos
    createPeriod,
    updatePeriod,
    activatePeriod,
    deletePeriod,
    // Preguntas
    createQuestion,
    updateQuestion,
    toggleQuestion,
  };
}

// ─── useSurveyResponses ───────────────────────────────────────────────────────
// Carga respuestas y answers para el dashboard de análisis
export function useSurveyResponses(surveyTypeCode, periodId = null) {
  const [responses,  setResponses]  = useState([]);
  const [answers,    setAnswers]    = useState([]);
  const [questions,  setQuestions]  = useState([]);
  const [periods,    setPeriods]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const load = useCallback(async () => {
    if (!surveyTypeCode) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Tipo
      const { data: typeData, error: typeError } = await supabase
        .from('survey_type').select('id').eq('code', surveyTypeCode).single();
      if (typeError) throw typeError;

      // 2. Todos los períodos del tipo
      const { data: periodsData, error: periodsError } = await supabase
        .from('survey_period')
        .select('id, name, semester, year, is_active')
        .eq('survey_type_id', typeData.id)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });
      if (periodsError) throw periodsError;
      setPeriods(periodsData || []);

      // 3. Preguntas activas (para el dashboard)
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_question')
        .select('id, category, order_index, question_text, question_type')
        .eq('survey_type_id', typeData.id)
        .eq('is_active', true)
        .order('order_index');
      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // 4. Respuestas — filtrar por período si se especifica
      let responsesQuery = supabase
        .from('survey_response')
        .select('id, survey_period_id, company_name, respondent_name, city, employee_name, work_area, accepts_data_treatment, submitted_at')
        .order('submitted_at', { ascending: false });

      if (periodId) {
        responsesQuery = responsesQuery.eq('survey_period_id', periodId);
      } else {
        // Sin filtro: traer solo del período activo
        const activePeriod = (periodsData || []).find(p => p.is_active);
        if (activePeriod) {
          responsesQuery = responsesQuery.eq('survey_period_id', activePeriod.id);
        }
      }

      const { data: responsesData, error: responsesError } = await responsesQuery;
      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      // 5. Answers de esas respuestas
      if (responsesData && responsesData.length > 0) {
        const responseIds = responsesData.map(r => r.id);
        const { data: answersData, error: answersError } = await supabase
          .from('survey_answer')
          .select('id, response_id, question_id, value_number, value_text')
          .in('response_id', responseIds);
        if (answersError) throw answersError;
        setAnswers(answersData || []);
      } else {
        setAnswers([]);
      }

    } catch (err) {
      console.error('useSurveyResponses error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [surveyTypeCode, periodId]);

  useEffect(() => { load(); }, [load]);

  // ── Estadísticas calculadas ──────────────────────────────────────────────────

  // Promedio general de todas las respuestas scale
  const overallAverage = (() => {
    const scaleAnswers = answers.filter(a => a.value_number !== null);
    if (!scaleAnswers.length) return 0;
    const sum = scaleAnswers.reduce((acc, a) => acc + a.value_number, 0);
    return (sum / scaleAnswers.length).toFixed(2);
  })();

  // % de respuestas con valor >= 4 (satisfechos)
  const satisfactionRate = (() => {
    const scaleAnswers = answers.filter(a => a.value_number !== null);
    if (!scaleAnswers.length) return 0;
    const satisfied = scaleAnswers.filter(a => a.value_number >= 4).length;
    return Math.round((satisfied / scaleAnswers.length) * 100);
  })();

  // Promedio por pregunta { question_id: { avg, count, distribution: {1:n,2:n,...} } }
  const statsByQuestion = (() => {
    const stats = {};
    questions.filter(q => q.question_type === 'scale').forEach(q => {
      const qAnswers = answers.filter(a => a.question_id === q.id && a.value_number !== null);
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      qAnswers.forEach(a => { dist[a.value_number] = (dist[a.value_number] || 0) + 1; });
      const sum = qAnswers.reduce((acc, a) => acc + a.value_number, 0);
      stats[q.id] = {
        avg:          qAnswers.length ? (sum / qAnswers.length).toFixed(2) : null,
        count:        qAnswers.length,
        distribution: dist,
      };
    });
    return stats;
  })();

  // Promedio por categoría (para clima laboral RadarChart)
  const statsByCategory = (() => {
    const cats = {};
    questions.filter(q => q.category && q.question_type === 'scale').forEach(q => {
      if (!cats[q.category]) cats[q.category] = { sum: 0, count: 0 };
      const qAnswers = answers.filter(a => a.question_id === q.id && a.value_number !== null);
      qAnswers.forEach(a => {
        cats[q.category].sum   += a.value_number;
        cats[q.category].count += 1;
      });
    });
    return Object.entries(cats).map(([category, data]) => ({
      category,
      avg: data.count ? parseFloat((data.sum / data.count).toFixed(2)) : 0,
    }));
  })();

  // Sugerencias (campo text)
  const suggestions = answers
    .filter(a => a.value_text && a.value_text.trim())
    .map(a => {
      const response = responses.find(r => r.id === a.response_id);
      return {
        id:         a.id,
        text:       a.value_text,
        company:    response?.company_name    || '',
        respondent: response?.respondent_name || response?.employee_name || '',
        city:       response?.city            || '',
        submitted:  response?.submitted_at,
      };
    });

  // Semáforo de estado { good | warning | critical }
  const getStatus = (avg) => {
    if (!avg) return 'no_data';
    const n = parseFloat(avg);
    if (n >= 4)   return 'good';
    if (n >= 3)   return 'warning';
    return 'critical';
  };

  return {
    responses,
    answers,
    questions,
    periods,
    loading,
    error,
    reload: load,
    // Estadísticas
    overallAverage,
    satisfactionRate,
    statsByQuestion,
    statsByCategory,
    suggestions,
    getStatus,
  };
}
// ─── useAllPeriodsStats ──────────────────────────────────────────────────────
// Trae promedios de TODOS los períodos para graficar tendencia histórica.
// Carga UNA VEZ todas las respuestas y answers, agrupa por período en memoria.
export function useAllPeriodsStats(surveyTypeCode) {
  const [data,    setData]    = useState([]); // [{ periodId, periodName, semLabel, avg, count, categoryAvgs }]
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!surveyTypeCode) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Tipo
      const { data: typeData, error: typeError } = await supabase
        .from('survey_type').select('id').eq('code', surveyTypeCode).single();
      if (typeError) throw typeError;

      // 2. Todos los períodos ordenados cronológicamente (asc para el eje X)
      const { data: periods, error: pErr } = await supabase
        .from('survey_period')
        .select('id, name, semester, year, is_active')
        .eq('survey_type_id', typeData.id)
        .order('year',     { ascending: true })
        .order('semester', { ascending: true });
      if (pErr) throw pErr;
      if (!periods?.length) { setData([]); return; }

      // 3. Preguntas activas (para categorías en clima)
      const { data: questions } = await supabase
        .from('survey_question')
        .select('id, category, question_type')
        .eq('survey_type_id', typeData.id)
        .eq('is_active', true);

      const scaleQIds = (questions || [])
        .filter(q => q.question_type === 'scale')
        .map(q => q.id);

      // 4. Todas las respuestas (sin filtro de período)
      const periodIds = periods.map(p => p.id);
      const { data: responses, error: rErr } = await supabase
        .from('survey_response')
        .select('id, survey_period_id, work_area')
        .in('survey_period_id', periodIds);
      if (rErr) throw rErr;
      if (!responses?.length) { setData([]); return; }

      // 5. Todos los answers de esas respuestas (solo scale)
      const responseIds = responses.map(r => r.id);
      const { data: answers, error: aErr } = await supabase
        .from('survey_answer')
        .select('response_id, question_id, value_number')
        .in('response_id', responseIds)
        .in('question_id', scaleQIds)
        .not('value_number', 'is', null);
      if (aErr) throw aErr;

      // 6. Agrupar por período en memoria
      const result = periods.map(period => {
        const periodResponses = responses.filter(r => r.survey_period_id === period.id);
        const periodResponseIds = new Set(periodResponses.map(r => r.id));
        const periodAnswers = (answers || []).filter(a => periodResponseIds.has(a.response_id));

        // Promedio general
        const avg = periodAnswers.length
          ? parseFloat((periodAnswers.reduce((s, a) => s + a.value_number, 0) / periodAnswers.length).toFixed(2))
          : null;

        // % satisfacción (≥4)
        const satisfactionRate = periodAnswers.length
          ? Math.round((periodAnswers.filter(a => a.value_number >= 4).length / periodAnswers.length) * 100)
          : null;

        // Promedios por categoría (para clima laboral)
        const catMap = {};
        (questions || []).filter(q => q.category && q.question_type === 'scale').forEach(q => {
          if (!catMap[q.category]) catMap[q.category] = { sum: 0, count: 0 };
          const qAnswers = periodAnswers.filter(a => a.question_id === q.id);
          qAnswers.forEach(a => { catMap[q.category].sum += a.value_number; catMap[q.category].count++; });
        });
        const categoryAvgs = Object.entries(catMap).reduce((acc, [cat, v]) => {
          acc[cat] = v.count ? parseFloat((v.sum / v.count).toFixed(2)) : null;
          return acc;
        }, {});

        return {
          periodId:       period.id,
          periodName:     period.name,
          semLabel:       `${period.semester === 1 ? 'I' : 'II'} Sem ${period.year}`,
          isActive:       period.is_active,
          avg,
          satisfactionRate,
          count:          periodResponses.length,
          categoryAvgs,
        };
      }).filter(d => d.count > 0); // solo períodos con datos

      setData(result);
    } catch (err) {
      console.error('useAllPeriodsStats error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [surveyTypeCode]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}