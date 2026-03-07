// src/components/SurveyCodeGate.jsx
// Pantalla de código de acceso para encuestas públicas
// Uso:
//   <SurveyCodeGate surveyCode="customer_satisfaction">
//     <MiFormulario />
//   </SurveyCodeGate>

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c', sand: '#dedecc' };

export default function SurveyCodeGate({ surveyCode, children }) {
  const [status, setStatus]     = useState('loading'); // loading | required | unlocked | open
  const [input, setInput]       = useState('');
  const [error, setError]       = useState('');
  const [shaking, setShaking]   = useState(false);
  const [correctCode, setCorrectCode] = useState(null);

  // ── Al montar: consultar si el período activo tiene código ────────────────
  useEffect(() => {
    const checkCode = async () => {
      // Paso 1: obtener ID del tipo de encuesta
      const { data: typeData } = await supabase
        .from('survey_type')
        .select('id')
        .eq('code', surveyCode)
        .single();

      if (!typeData) { setStatus('open'); return; }

      // Paso 2: obtener período activo y su código
      const { data: periodData } = await supabase
        .from('survey_period')
        .select('access_code')
        .eq('is_active', true)
        .eq('survey_type_id', typeData.id)
        .maybeSingle();

      if (!periodData || !periodData.access_code) {
        setStatus('open');
      } else {
        setCorrectCode(periodData.access_code);
        // Verificar si ya desbloqueó en esta sesión
        const key = `survey_unlocked_${surveyCode}`;
        if (sessionStorage.getItem(key) === periodData.access_code) {
          setStatus('unlocked');
        } else {
          setStatus('required');
        }
      }
    };
    checkCode();
  }, [surveyCode]);

  // ── Validar código ingresado ───────────────────────────────────────────────
  const handleSubmit = () => {
    const trimmed = input.trim().toUpperCase();
    if (trimmed === correctCode.toUpperCase()) {
      // Guardar en sessionStorage para no volver a pedir en esta sesión
      sessionStorage.setItem(`survey_unlocked_${surveyCode}`, correctCode);
      setStatus('unlocked');
    } else {
      setError('Código incorrecto. Verifica e intenta de nuevo.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setInput('');
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  // ── Renderizado ───────────────────────────────────────────────────────────

  // Cargando
  if (status === 'loading') {
    return (
      <div style={s.fullscreen}>
        <div style={s.bg} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={s.spinner} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 16 }}>
            Verificando...
          </p>
        </div>
      </div>
    );
  }

  // Encuesta abierta o ya desbloqueada → mostrar formulario directamente
  if (status === 'open' || status === 'unlocked') {
    return children;
  }

  // Pantalla de código
  return (
    <div style={s.fullscreen}>
      <style>{css}</style>
      <div style={s.bg} />

      <div style={{ ...s.card, ...(shaking ? {} : {}) }} className={shaking ? 'shake' : ''}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <img src="/garana1.png" alt="Garana Art" style={s.logo} />
        </div>

        {/* Ícono candado */}
        <div style={s.lockIcon}>🔒</div>

        <h2 style={s.title}>Acceso a encuesta</h2>
        <p style={s.subtitle}>
          Ingresa el código para participar.
          {surveyCode === 'customer_satisfaction'
            ? ' Fue entregado por nuestro equipo comercial.'
            : ' Fue entregado por el área de Gestión Humana.'}
        </p>

        {/* Input de código */}
        <div style={s.inputWrap}>
          <input
            style={{ ...s.input, ...(error ? s.inputError : {}) }}
            type="text"
            placeholder="CÓDIGO"
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={handleKey}
            maxLength={20}
            autoFocus
            autoCapitalize="characters"
          />
        </div>

        {/* Error */}
        {error && (
          <div style={s.errorMsg}>⚠ {error}</div>
        )}

        {/* Botón */}
        <button
          style={{ ...s.btn, ...(input.trim().length < 3 ? s.btnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={input.trim().length < 3}
        >
          Continuar →
        </button>

        <p style={s.hint}>
          ¿No tienes el código?{' '}
          {surveyCode === 'customer_satisfaction'
            ? 'Contáctanos a través de nuestros canales comerciales.'
            : 'Comunícate con el área de Gestión Humana.'}
        </p>
      </div>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = {
  fullscreen: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    padding: '24px',
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    backgroundColor: C.sand,
    backgroundBlendMode: 'overlay',
  },
  bg: {
    position: 'absolute', inset: 0,
    background: `linear-gradient(135deg, rgba(46,82,68,0.88), rgba(26,46,37,0.92))`,
    zIndex: 0,
  },
  card: {
    position: 'relative', zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    maxWidth: 420, width: '100%',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    textAlign: 'center',
  },
  logoWrap: { marginBottom: -4 },
  logo: { height: 56, objectFit: 'contain' },
  lockIcon: { fontSize: 40, lineHeight: 1 },
  title: {
    color: C.green, fontSize: 22, fontWeight: 800,
    fontFamily: 'Georgia, serif', margin: 0,
  },
  subtitle: {
    color: '#777', fontSize: 14, lineHeight: 1.6, margin: 0,
  },
  inputWrap: { width: '100%' },
  input: {
    width: '100%', padding: '14px 18px',
    border: `2px solid #ddd`, borderRadius: 10,
    fontSize: 18, fontWeight: 700, textAlign: 'center',
    letterSpacing: 4, color: C.green,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'monospace',
    transition: 'border-color 0.2s',
  },
  inputError: { borderColor: '#ef4444' },
  errorMsg: {
    color: '#ef4444', fontSize: 13, fontWeight: 600,
    backgroundColor: '#fff5f5', padding: '8px 16px',
    borderRadius: 8, width: '100%', boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '14px',
    backgroundColor: C.green, color: '#fff',
    border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  hint: { color: '#aaa', fontSize: 12, lineHeight: 1.5, margin: 0 },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: `3px solid rgba(255,255,255,0.2)`,
    borderTopColor: C.mint,
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
};

const css = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-6px); }
    80%       { transform: translateX(6px); }
  }
  .shake { animation: shake 0.4s ease; }
`;