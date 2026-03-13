// src/pages/EncuestaSatisfaccionCliente.jsx
// Formulario PÚBLICO — sin login requerido

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const SURVEY_TYPE_CODE = 'customer_satisfaction';

const SCALE_LABELS = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Regular',
  4: 'Satisfecho',
  5: 'Altamente satisfecho',
};

const SCALE_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

export default function EncuestaSatisfaccionCliente() {
  const [step, setStep]           = useState('form');
  const [period, setPeriod]       = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  const [header, setHeader] = useState({
    company_name:           '',
    respondent_name:        '',
    city:                   '',
    accepts_data_treatment: null,
  });

  const [answers, setAnswers] = useState({});
  const [errors, setErrors]   = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('pid');
    if (!pid) { setStep('error'); setLoadingData(false); return; }
    load(pid);
  }, []);

  const load = async (pid) => {
    try {
        // Verificar que el período existe, está activo y corresponde al tipo correcto
        const { data: typeData, error: typeError } = await supabase
          .from('survey_type').select('id').eq('code', SURVEY_TYPE_CODE).single();
        if (typeError || !typeData) throw new Error('Tipo no encontrado');

        const { data: periodData, error: periodError } = await supabase
          .from('survey_period').select('id, name')
          .eq('id', pid)
          .eq('survey_type_id', typeData.id)
          .eq('is_active', true).single();
        if (periodError || !periodData) throw new Error('Período no válido o encuesta inactiva');

        const { data: questionsData, error: questionsError } = await supabase
          .from('survey_question')
          .select('id, order_index, question_text, question_type, is_required')
          .eq('survey_type_id', typeData.id).eq('is_active', true).order('order_index');
        if (questionsError) throw questionsError;

        setPeriod(periodData);
        setQuestions(questionsData || []);
      } catch (err) {
        console.error(err);
        setStep('error');
      } finally {
        setLoadingData(false);
      }
  };

  const clearErr = (key) => setErrors(e => ({ ...e, [key]: null }));

  const validate = () => {
    const e = {};
    if (!header.company_name.trim())    e.company_name    = 'Campo requerido';
    if (!header.respondent_name.trim()) e.respondent_name = 'Campo requerido';
    if (!header.city.trim())            e.city            = 'Campo requerido';
    if (header.accepts_data_treatment === null)
      e.accepts_data_treatment = 'Debe aceptar o rechazar el tratamiento de datos';
    questions.forEach(q => { if (q.is_required && !answers[q.id]) e[q.id] = 'Requerido'; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: responseData, error: responseError } = await supabase
        .from('survey_response')
        .insert({
          survey_period_id:       period.id,
          company_name:           header.company_name.trim(),
          respondent_name:        header.respondent_name.trim(),
          city:                   header.city.trim(),
          accepts_data_treatment: header.accepts_data_treatment,
        }).select('id').single();
      if (responseError) throw responseError;

      const { error: answersError } = await supabase.from('survey_answer').insert(
        questions.map(q => ({
          response_id:  responseData.id,
          question_id:  q.id,
          value_number: q.question_type === 'scale' ? Number(answers[q.id]) : null,
          value_text:   q.question_type === 'text'  ? answers[q.id]         : null,
        }))
      );
      if (answersError) throw answersError;

      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Redirigir al home después de 4 segundos
      setTimeout(() => { window.location.href = '/'; }, 4000);
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Ocurrió un error al enviar. Por favor intenta de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.loadingContainer}>
          {/* LOGO en loading */}
          <img src="/garana1.png" alt="Garana Art" style={styles.loadingLogo} />
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
            <h2 style={{ color: '#2e5244', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Encuesta no disponible
            </h2>
            <p style={{ color: '#666', fontSize: 15 }}>
              No hay una encuesta activa en este momento. Por favor contacta a Garana.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div style={styles.pageWrapper}>
        <div style={{ ...styles.card, maxWidth: 560 }}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>¡Gracias por tu respuesta!</h2>
            <p style={styles.successSubtitle}>
              Tu opinión es muy valiosa para nosotros. Con tu ayuda seguimos mejorando
              cada día para servirte mejor.
            </p>
            <div style={styles.successDivider} />
            <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>
              Serás redirigido en unos segundos...
            </p>
            <p style={styles.successBrand}>
              <strong>Garana Art</strong> — Mejoramiento Continuo
            </p>
          </div>
        </div>
      </div>
    );
  }

  const scaleQuestions = questions.filter(q => q.question_type === 'scale');
  const textQuestions  = questions.filter(q => q.question_type === 'text');

  return (
    <div style={styles.pageWrapper}>

      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={styles.logoRow}>
          {/* LOGO real en lugar de la G */}
          <img src="/garana1.png" alt="Garana Art" style={styles.logo} />
          <div>
            <h1 style={styles.brandName}>Garana Art</h1>
            <p style={styles.brandSub}>Sistema Integrado de Gestión </p>
          </div>
        </div>
        <div style={styles.headerDivider} />
        <h2 style={styles.surveyTitle}>Encuesta de Satisfacción del Cliente</h2>
        <p style={styles.surveyPeriod}>
          Período: <strong>{period?.name}</strong>
        </p>
        <p style={styles.surveyDescription}>
          Tu opinión nos ayuda a mejorar. 
          <p style={styles.surveyDescription}>Por favor califica cada aspecto del 1 al 5,
          donde <strong>1 = Muy insatisfecho</strong> y <strong>5 = Altamente satisfecho</strong>.
        </p>
        </p>
      </div>

      {/* Tarjeta principal */}
      <div style={styles.card}>

        {/* Sección 1: Datos */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionNumber}>1</div>
            <h3 style={styles.sectionTitle}>Información del respondente</h3>
          </div>
          <div style={styles.fieldsGrid}>
            <Field label="Empresa o almacén *" error={errors.company_name} id="company_name">
              <input
                style={{ ...styles.input, ...(errors.company_name ? styles.inputError : {}) }}
                placeholder="Nombre de su empresa o almacén"
                value={header.company_name}
                onChange={e => { setHeader(h => ({ ...h, company_name: e.target.value })); clearErr('company_name'); }}
              />
            </Field>
            <Field label="Nombre de quien diligencia *" error={errors.respondent_name} id="respondent_name">
              <input
                style={{ ...styles.input, ...(errors.respondent_name ? styles.inputError : {}) }}
                placeholder="Nombre completo"
                value={header.respondent_name}
                onChange={e => { setHeader(h => ({ ...h, respondent_name: e.target.value })); clearErr('respondent_name'); }}
              />
            </Field>
            <Field label="Ciudad *" error={errors.city} id="city">
              <input
                style={{ ...styles.input, ...(errors.city ? styles.inputError : {}) }}
                placeholder="Ciudad de ubicación"
                value={header.city}
                onChange={e => { setHeader(h => ({ ...h, city: e.target.value })); clearErr('city'); }}
              />
            </Field>
          </div>

          {/* Tratamiento de datos */}
          <div
            style={{ ...styles.dataBox, ...(errors.accepts_data_treatment ? styles.dataBoxError : {}) }}
            data-error={!!errors.accepts_data_treatment}
          >
            <p style={styles.dataText}>
              <strong>Tratamiento de datos personales (Ley 1581 de 2012)</strong>
              <br />
              Autorizo a <strong>Garana Art</strong> para recolectar, almacenar y usar mis datos
              personales con fines estadísticos y de mejora del servicio. Los datos no serán
              compartidos con terceros.
            </p>
            <div style={styles.dataButtons}>
              <button
                style={{ ...styles.dataBtn, ...(header.accepts_data_treatment === true  ? styles.dataBtnActive : {}) }}
                onClick={() => { setHeader(h => ({ ...h, accepts_data_treatment: true  })); clearErr('accepts_data_treatment'); }}>
                ✓ Acepto
              </button>
              <button
                style={{ ...styles.dataBtn, ...(header.accepts_data_treatment === false ? styles.dataBtnDeny : {}) }}
                onClick={() => { setHeader(h => ({ ...h, accepts_data_treatment: false })); clearErr('accepts_data_treatment'); }}>
                ✗ No acepto
              </button>
            </div>
            {errors.accepts_data_treatment && <p style={styles.errorText}>{errors.accepts_data_treatment}</p>}
          </div>
        </div>

        {/* Sección 2: Escala */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionNumber}>2</div>
            <h3 style={styles.sectionTitle}>Evaluación de nuestros servicios</h3>
          </div>
          <div style={styles.scaleGuide}>
            {Object.entries(SCALE_LABELS).map(([val, label]) => (
              <div key={val} style={styles.scaleGuideItem}>
                <span style={{ ...styles.scaleGuideDot, backgroundColor: SCALE_COLORS[val] }}>{val}</span>
                <span style={styles.scaleGuideLabel}>{label}</span>
              </div>
            ))}
          </div>
          <div style={styles.questionsList}>
            {scaleQuestions.map((q, idx) => (
              <ScaleQuestion
                key={q.id} index={idx + 1} question={q}
                value={answers[q.id]} error={errors[q.id]}
                onChange={val => { setAnswers(a => ({ ...a, [q.id]: val })); clearErr(q.id); }}
              />
            ))}
          </div>
        </div>

        {/* Sección 3: Sugerencias */}
        {textQuestions.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionNumber}>3</div>
              <h3 style={styles.sectionTitle}>Sugerencias y comentarios</h3>
            </div>
            {textQuestions.map(q => (
              <Field key={q.id} label={`${q.question_text} *`} error={errors[q.id]} id={q.id}>
                <textarea
                  style={{ ...styles.textarea, ...(errors[q.id] ? styles.inputError : {}) }}
                  placeholder="Escribe aquí tus comentarios o sugerencias..."
                  rows={5}
                  value={answers[q.id] || ''}
                  onChange={e => { setAnswers(a => ({ ...a, [q.id]: e.target.value })); clearErr(q.id); }}
                />
              </Field>
            ))}
          </div>
        )}

        {errors.submit && <div style={styles.submitError}>⚠️ {errors.submit}</div>}

        <div style={styles.submitRow}>
          <button
            style={{ ...styles.submitBtn, ...(submitting ? styles.submitBtnDisabled : {}) }}
            onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={styles.spinnerSmall} />Enviando...</span>
              : '✓ Enviar encuesta'}
          </button>
        </div>

      </div>

      <div style={styles.footer}>
        <p>© 2026 Garana Art · Todos los derechos reservados</p>
      </div>

    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Field({ label, error, id, children }) {
  return (
    <div style={styles.fieldWrapper} data-error={!!error} id={id}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

function ScaleQuestion({ index, question, value, error, onChange }) {
  return (
    <div style={{ ...styles.questionCard, ...(error ? styles.questionCardError : {}) }} data-error={!!error}>
      <div style={styles.questionHeader}>
        <span style={styles.questionIndex}>{index}</span>
        <p style={styles.questionText}>{question.question_text}</p>
      </div>
      <div style={styles.scaleRow}>
        {[1,2,3,4,5].map(val => (
          <button key={val}
            style={{ ...styles.scaleBtn, ...(Number(value) === val ? { ...styles.scaleBtnActive, backgroundColor: SCALE_COLORS[val] } : {}) }}
            onClick={() => onChange(val)} title={SCALE_LABELS[val]}>
            {val}
          </button>
        ))}
      </div>
      {value && <p style={{ ...styles.scaleSelectedLabel, color: SCALE_COLORS[value] }}>{SCALE_LABELS[value]}</p>}
      {error  && <p style={styles.errorText}>Este campo es requerido</p>}
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const styles = {
  pageWrapper: {
    minHeight: '100vh',
    // Fondo base + imagen muy transparente encima
    backgroundColor: '#dedecc',
    backgroundImage: 'url(/clientes.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundBlendMode: 'overlay',    // mezcla con el color base
    // opacity de la imagen controlada con el blend + el color de fondo
    // resultado: imagen casi imperceptible, fondo sigue siendo #dedecc
    padding: '32px 16px 48px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh', gap: 16,
  },
  // Logo en loading: grande y centrado
  loadingLogo: {
    height: 120,
    objectFit: 'contain',
  },
  spinner: {
    width: 32, height: 32, borderRadius: '50%',
    border: '3px solid #ccc', borderTopColor: '#2e5244',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerSmall: {
    display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: '#2e5244', fontSize: 15 },
  // Header
  pageHeader: {
    maxWidth: 720, margin: '0 auto 24px', textAlign: 'center',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginBottom: 20,
  },
  // LOGO: reemplaza el cuadro con "G" — grande y natural
  logo: {
    height: 88,
    objectFit: 'contain',
  },
  brandName: {
    color: '#2e5244', fontSize: 22, fontWeight: 800, margin: 0,
    fontFamily: 'Georgia, serif',
  },
  brandSub: {
    color: '#6f7b2c', fontSize: 12, margin: 0,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  headerDivider: {
    height: 3,
    background: 'linear-gradient(90deg, #2e5244, #6dbd96, #6f7b2c)',
    borderRadius: 2, marginBottom: 20,
  },
  surveyTitle: {
    color: '#2e5244', fontSize: 26, fontWeight: 800,
    margin: '0 0 8px', fontFamily: 'Georgia, serif',
  },
  surveyPeriod: {
    color: '#6f7b2c', fontSize: 13, margin: '0 0 12px',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  surveyDescription: { color: '#555', fontSize: 14, lineHeight: 1.6, margin: 0 },
  // Card
  card: {
    maxWidth: 720, margin: '0 auto',
    backgroundColor: '#fff', borderRadius: 16,
    boxShadow: '0 4px 40px rgba(46,82,68,0.12)', overflow: 'hidden',
  },
  section: { padding: '32px', borderBottom: '1px solid #f0f0e8' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  sectionNumber: {
    width: 32, height: 32, borderRadius: '50%', backgroundColor: '#2e5244',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  sectionTitle: { color: '#2e5244', fontSize: 17, fontWeight: 700, margin: 0 },
  fieldsGrid: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 },
  fieldWrapper: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#444', fontSize: 13, fontWeight: 600 },
  input: {
    padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd',
    fontSize: 14, color: '#333', outline: 'none', backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fff8f8' },
  textarea: {
    padding: '12px 14px', borderRadius: 8, border: '1.5px solid #ddd',
    fontSize: 14, color: '#333', outline: 'none', resize: 'vertical',
    fontFamily: 'inherit', backgroundColor: '#fafafa',
  },
  errorText: { color: '#ef4444', fontSize: 12, margin: '4px 0 0' },
  dataBox: {
    backgroundColor: '#f8f9f4', border: '1.5px solid #e0e4d8',
    borderRadius: 10, padding: 20,
  },
  dataBoxError: { borderColor: '#ef4444', backgroundColor: '#fff8f8' },
  dataText: { color: '#555', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' },
  dataButtons: { display: 'flex', gap: 12 },
  dataBtn: {
    padding: '8px 24px', borderRadius: 8, border: '1.5px solid #ddd',
    backgroundColor: '#fff', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  dataBtnActive: { backgroundColor: '#2e5244', borderColor: '#2e5244', color: '#fff' },
  dataBtnDeny:   { backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' },
  scaleGuide: {
    display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24,
    padding: '12px 16px', backgroundColor: '#f8f9f4', borderRadius: 8,
  },
  scaleGuideItem: { display: 'flex', alignItems: 'center', gap: 6 },
  scaleGuideDot: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  scaleGuideLabel: { fontSize: 11, color: '#666' },
  questionsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  questionCard: {
    padding: '16px 20px', borderRadius: 10, border: '1.5px solid #eee',
    backgroundColor: '#fafafa',
  },
  questionCardError: { borderColor: '#ef4444', backgroundColor: '#fff8f8' },
  questionHeader: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  questionIndex: {
    minWidth: 24, height: 24, borderRadius: '50%', backgroundColor: '#6dbd96',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  questionText: { color: '#333', fontSize: 14, lineHeight: 1.5, margin: 0, paddingTop: 3 },
  scaleRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  scaleBtn: {
    width: 44, height: 44, borderRadius: 10, border: '1.5px solid #ddd',
    backgroundColor: '#fff', color: '#555', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
  scaleBtnActive: { color: '#fff', border: 'none', transform: 'scale(1.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  scaleSelectedLabel: { fontSize: 12, fontWeight: 600, marginTop: 8 },
  submitError: {
    margin: '0 32px', padding: '12px 16px', backgroundColor: '#fff8f8',
    border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', fontSize: 13,
  },
  submitRow: { padding: '28px 32px', display: 'flex', justifyContent: 'center' },
  submitBtn: {
    padding: '14px 48px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #2e5244, #3d6b59)',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(46,82,68,0.3)', letterSpacing: 0.5,
  },
  submitBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' },
  successContainer: { padding: '56px 40px', textAlign: 'center' },
  successIcon: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2e5244, #6dbd96)',
    color: '#fff', fontSize: 36, display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 24px',
    boxShadow: '0 8px 24px rgba(46,82,68,0.3)',
  },
  successTitle: {
    color: '#2e5244', fontSize: 26, fontWeight: 800,
    margin: '0 0 12px', fontFamily: 'Georgia, serif',
  },
  successSubtitle: { color: '#666', fontSize: 15, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px' },
  successDivider: {
    height: 2, background: 'linear-gradient(90deg, transparent, #6dbd96, transparent)',
    margin: '24px auto', width: 120,
  },
  successBrand: { color: '#aaa', fontSize: 13 },
  footer: { textAlign: 'center', padding: '24px 16px 0', color: '#999', fontSize: 12 },
};

if (typeof document !== 'undefined' && !document.getElementById('survey-sc-styles')) {
  const st = document.createElement('style');
  st.id = 'survey-sc-styles';
  st.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    input:focus, textarea:focus { border-color: #2e5244 !important; box-shadow: 0 0 0 3px rgba(46,82,68,0.1); }
    button:hover:not(:disabled) { opacity: 0.9; }
  `;
  document.head.appendChild(st);
}