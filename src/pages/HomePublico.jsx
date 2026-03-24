// src/pages/HomePublico.jsx
// Home público Garana Art — rediseño completo

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const C = {
  green:  '#2e5244',
  mint:   '#6dbd96',
  olive:  '#6f7b2c',
  sand:   '#dedecc',
  dark:   '#1a2e25',
  cream:  '#faf9f5',
};

// ─── Datos ────────────────────────────────────────────────────────────────────

const VALORES = [
  {
    icon: '🤝',
    title: 'Honestidad',
    text: 'Valor social que genera acciones de beneficio común y se refleja en la congruencia entre lo que se piensa y lo que se hace.',
  },
  {
    icon: '⚖️',
    title: 'Responsabilidad',
    text: 'Asumir las consecuencias de nuestros actos y cumplir con nuestros compromisos y obligaciones ante los demás.',
  },
  {
    icon: '🌿',
    title: 'Respeto',
    text: 'Reconocer, apreciar y valorar a los otros, teniendo en cuenta que todos somos válidos. Implica derechos y deberes para ambas partes.',
  },
  {
    icon: '❤️',
    title: 'Amor',
    text: 'Busca la felicidad de los demás. Las relaciones interpersonales se mantienen en forma de amistad, induciendo bienestar en los otros.',
  },
  {
    icon: '🛡️',
    title: 'Lealtad',
    text: 'Fidelidad en las acciones y comportamientos individuales y sociales para ser dueños de la propia voluntad.',
  },
  {
    icon: '⭐',
    title: 'Excelencia',
    text: 'Búsqueda permanente de la calidad superior en cada prenda, proceso y relación, como expresión de nuestro compromiso con quienes nos eligen.',
  },
];

const CIFRAS = [
  { num: '20',   suffix: ' años', label: 'en el mercado nacional de trajes de baño' },
  { num: '+50',  suffix: '',      label: 'mujeres cabeza de hogar en nuestra planta' },
  { num: '3',    suffix:  '',        label: 'países de exportación: Ecuador, Perú y EE.UU.' },
  { num: '100%', suffix: '',      label: 'energía solar en nuestra planta de producción' },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HomePublico() {
  // ── Modal de acceso a encuestas ────────────────────────────────────────
  const [claveModal, setClaveModal] = useState(null); // 'satisfaccion' | 'clima' | null
  const [claveInput, setClaveInput] = useState('');
  const [claveError, setClaveError] = useState('');
  const [claveLoading, setClaveLoading] = useState(false);
  const claveRef = useRef(null);

  const abrirEncuesta = (tipo) => {
    setClaveModal(tipo);
    setClaveInput('');
    setClaveError('');
    setTimeout(() => claveRef.current?.focus(), 80);
  };

  const cerrarModal = () => {
    setClaveModal(null);
    setClaveInput('');
    setClaveError('');
  };

  const validarClave = async () => {
    if (!claveInput.trim()) { setClaveError('Ingresa el código de acceso.'); return; }
    setClaveLoading(true);
    setClaveError('');
    try {
      const typeCode = claveModal === 'satisfaccion' ? 'customer_satisfaction' : 'workplace_climate';
      // Buscar el survey_type
      const { data: typeData, error: typeErr } = await supabase
        .from('survey_type').select('id').eq('code', typeCode).single();
      if (typeErr || !typeData) throw new Error('Encuesta no disponible.');

      // Buscar período activo con esa clave
      const { data: period, error: periodErr } = await supabase
        .from('survey_period')
        .select('id, access_code')
        .eq('survey_type_id', typeData.id)
        .eq('is_active', true)
        .single();

      if (periodErr || !period) {
        setClaveError('No hay una encuesta activa en este momento.');
        return;
      }
      if (!period.access_code) {
        setClaveError('Esta encuesta no tiene código configurado. Contacta al administrador.');
        return;
      }
      if (period.access_code.trim().toLowerCase() !== claveInput.trim().toLowerCase()) {
        setClaveError('Código incorrecto. Verifica e intenta de nuevo.');
        return;
      }

      // Clave correcta → navegar con el period_id
      const ruta = claveModal === 'satisfaccion'
        ? `/encuesta/satisfaccion-cliente?pid=${period.id}`
        : `/encuesta/clima-laboral?pid=${period.id}`;
      window.location.href = ruta;
    } catch (err) {
      setClaveError(err.message || 'Error al validar. Intenta de nuevo.');
    } finally {
      setClaveLoading(false);
    }
  };
  const [scrolled, setScrolled]       = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
    setMenuOpen(false);
  };

  const goToApp = () => { window.location.href = '/app'; };

  const NAV_LINKS = [
    { id: 'nosotros',  label: 'Nosotros' },
    { id: 'mision',    label: 'Misión y Visión' },
    { id: 'valores',   label: 'Valores' },
    { id: 'encuestas', label: 'Encuestas' },
  ];

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* ══════════════════════════════════════════════════════════════
          NAVBAR — siempre blanco, logo grande
      ══════════════════════════════════════════════════════════════ */}
      <nav style={{ ...s.nav, boxShadow: scrolled ? '0 2px 24px rgba(46,82,68,0.10)' : '0 1px 0 #e8e8de' }}>
        <div style={s.navInner}>

          {/* Brand */}
          <button style={s.navBrand} onClick={() => scrollTo('inicio')}>
            <img src="/garana1.png" alt="Garana Art" style={s.navLogo} />
          </button>

          {/* Links desktop */}
          <div style={s.navLinks}>
            {NAV_LINKS.map(l => (
              <button key={l.id}
                style={{ ...s.navLink, ...(activeSection === l.id ? s.navLinkActive : {}) }}
                onClick={() => scrollTo(l.id)}>
                {l.label}
              </button>
            ))}
          </div>

          {/* CTA + hamburguesa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={s.navBtn} onClick={goToApp}>
              Ingresar al SIG →
            </button>
            <button style={s.hamburger} onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú">
              <span style={{ ...s.ham, transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
              <span style={{ ...s.ham, opacity: menuOpen ? 0 : 1 }} />
              <span style={{ ...s.ham, transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div style={s.mobileMenu}>
            {NAV_LINKS.map(l => (
              <button key={l.id} style={s.mobileLink} onClick={() => scrollTo(l.id)}>
                {l.label}
              </button>
            ))}
            <button style={s.mobileCta} onClick={goToApp}>Ingresar al SIG →</button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          HERO — fondo imgfondo + SIG.png como mockup
      ══════════════════════════════════════════════════════════════ */}
      <section id="inicio" style={s.hero}>
        {/* Fondo textural muy transparente */}
        <div style={s.heroBg} />
        {/* Overlay verde oscuro */}
        <div style={s.heroOverlay} />

        <div style={s.heroInner}>
          {/* Texto lado izquierdo */}
          <div style={s.heroLeft} className="anim-fade-up">
            <div style={s.heroEyebrow}>
              <span style={s.heroDot} />
              Sistema Integrado  de gestión · Garana Art
            </div>
            <h1 style={s.heroTitle}>
              Calidad que<br />
              <em style={s.heroAccent}>transforma</em>
            </h1>
            <p style={s.heroSub}>
              Gestionamos procesos, documentos, indicadores y mejoramiento continuo
              desde una plataforma unificada, diseñada para la excelencia.
            </p>
            <div style={s.heroBtns}>
              <button style={s.heroMainBtn} onClick={goToApp}>
                Ingresar al sistema
              </button>
              <button style={s.heroSecBtn} onClick={() => scrollTo('nosotros')}>
                Conocer más ↓
              </button>
            </div>
          </div>

          {/* Imagen SIG como mockup flotante */}
          <div style={s.heroRight} className="anim-fade-up-delay">
            <div style={s.sigCard}>
              <div style={s.sigCardTop}>
                <span style={s.sigDot1} /><span style={s.sigDot2} /><span style={s.sigDot3} />
                <span style={s.sigTitle}> SIGarana</span>
              </div>
              <img src="/Estructura_de_proceso.jpg" alt="Sistema Integrado de Gestión " style={s.sigImg} />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={s.scrollIndicator} className="scroll-bounce">
          <div style={s.scrollLine} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          QUIÉNES SOMOS
      ══════════════════════════════════════════════════════════════ */}
      <section id="nosotros" style={s.aboutSection}>
        <div style={s.heroBgAbout} />
        <div style={s.sectionInner}>

          <div style={s.aboutGrid}>
            {/* Columna texto principal */}
            <div>
              <div style={s.sectionLabel}>Quiénes somos</div>
              <h2 style={{ ...s.sectionTitle, color: '#fff' }}>Garana Art</h2>
              <p style={s.aboutLead}>
                Ofrecemos a las mujeres de hoy prendas que combinan seguridad y comodidad,
                empoderándolas a través de su estilo. Para nuestros clientes y distribuidores,
                aseguramos versatilidad, excelencia y oportunidad en la entrega.
              </p>
              <p style={s.aboutBody}>
                Llevamos <strong style={{ color: C.mint }}>19 años</strong> en el mercado nacional de trajes de baño,
                con experiencia de exportación en Ecuador, Perú y EE.UU., con nuestra marca propia
                <strong style={{ color: C.mint }}> GARANA ART</strong> — "Garantizando el realce natural de su belleza".
                Nuestra planta cuenta con más de <strong style={{ color: C.mint }}>50 mujeres cabeza de hogar</strong> encargadas
                de diseñar y producir prendas de alta calidad, innovación y horma.
              </p>

              {/* Propuesta de valor */}
              <div style={s.propuestaCard}>
                <div style={s.propuestaTag}>Propuesta de valor</div>
                <p style={s.propuestaText}>
                  Desarrollamos vestidos de baño que se adaptan perfectamente al cuerpo de la mujer,
                  combinando seguridad y comodidad. Empoderamos a nuestras clientas a través de prendas
                  que realzan su estilo único, brindándoles confianza y bienestar.
                </p>
              </div>
            </div>

            {/* Columna impacto */}
            <div style={s.impactCol}>
              {/* Impacto social */}
              <div style={s.impactCard} className="impact-card">
                <div style={s.impactIcon}>🤲</div>
                <div>
                  <h3 style={s.impactTitle}>Impacto Social</h3>
                  <p style={s.impactText}>
                    Generamos empleo directo para madres cabeza de hogar, jóvenes, víctimas del conflicto,
                    población indígena y comunidades diversas. Desarrollamos la iniciativa
                    <em> Navidad Garana</em> y campañas de apoyo a familias de escasos recursos,
                    fortaleciendo el tejido social desde el corazón de nuestra empresa.
                  </p>
                </div>
              </div>

              {/* Impacto ambiental */}
              <div style={{ ...s.impactCard, borderColor: `${C.mint}50` }} className="impact-card">
                <div style={{ ...s.impactIcon, backgroundColor: `${C.mint}20` }}>☀️</div>
                <div>
                  <h3 style={s.impactTitle}>Impacto Ambiental</h3>
                  <p style={s.impactText}>
                    Operamos con <em>energía solar</em> gracias a paneles fotovoltaicos propios.
                    Integramos telas elaboradas con botellas PET recicladas y etiquetas biodegradables.
                    Vestir al mundo también es cuidar el planeta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cifras */}
          <div style={s.cifrasGrid}>
            {CIFRAS.map((c, i) => (
              <div key={i} style={s.cifraCard} className="cifra-card">
                <div style={s.cifraNum}>{c.num}<span style={s.cifraSuffix}>{c.suffix}</span></div>
                <div style={s.cifraLabel}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MISIÓN Y VISIÓN — imagen mision.jpg
      ══════════════════════════════════════════════════════════════ */}
      <section id="mision" style={s.mvSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Identidad corporativa</div>
          <h2 style={s.sectionTitle}>Misión y Visión</h2>
          <p style={s.sectionSub}>El propósito que guía cada decisión en Garana Art</p>

          {/* Imagen de misión/visión (una sola imagen con ambas) */}
          <div style={s.mvImgWrap}>
            <img src="/mision_vision.jpg" alt="Misión y Visión Garana Art" style={s.mvImg} />
            <div style={s.mvImgOverlay} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          VALORES
      ══════════════════════════════════════════════════════════════ */}
      <section id="valores" style={s.valoresSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Cultura organizacional</div>
          <h2 style={s.sectionTitle}>Nuestros valores</h2>
          <p style={s.sectionSub}>Los principios que dan forma a nuestra manera de actuar y relacionarnos</p>

          <div style={s.valoresGrid}>
            {VALORES.map((v, i) => (
              <div key={i} style={s.valorCard} className="valor-card">
                <div style={s.valorIcon}>{v.icon}</div>
                <h3 style={s.valorTitle}>{v.title}</h3>
                <div style={s.valorDivider} />
                <p style={s.valorText}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          ENCUESTAS — al final
      ══════════════════════════════════════════════════════════════ */}
      <section id="encuestas" style={s.encuestasSection}>
        <div style={s.heroBgEncuestas} />
        <div style={{ 
    ...s.sectionInner,
    position: 'relative',
    zIndex: 1,
    maxWidth: 1100,
    margin: '0 auto',
    padding: '80px 24px'}}>
          <div style={s.sectionLabel}>Participa</div>
          <h2 style={{ ...s.sectionTitle, color: '#fff' }}>Tus encuestas activas</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.6, margin: '0 0 48px' }}>
            Tu opinión es clave para el mejoramiento continuo de Garana Art
          </p>

          <div style={s.encuestasGrid}>
            {/* Satisfacción Cliente */}
            <div style={s.encuestaCard} className="encuesta-card">
              <div style={{ ...s.encuestaIconWrap, backgroundColor: `${C.mint}20`, border: `1px solid ${C.mint}40` }}>
                <span style={{ fontSize: 32 }}>⭐</span>
              </div>
              <h3 style={{ ...s.encuestaTitle, color: C.mint }}>Satisfacción del Cliente</h3>
              <p style={s.encuestaDesc}>
                Cuéntanos cómo fue tu experiencia con nuestros productos y servicio.
                Tu evaluación nos ayuda a mejorar cada día.
              </p>
              <div style={s.encuestaMeta}>
                <span style={s.encuestaBadge}>📋 I Semestre 2026</span>
                <span style={s.encuestaBadge}>⏱ 5 min</span>
              </div>
              <button onClick={() => abrirEncuesta('satisfaccion')} style={s.encuestaBtn}>
                Diligenciar encuesta →
              </button>
            </div>

            {/* Clima Laboral */}
            <div style={s.encuestaCard} className="encuesta-card">
              <div style={{ ...s.encuestaIconWrap, backgroundColor: `${C.olive}30`, border: `1px solid ${C.olive}50` }}>
                <span style={{ fontSize: 32 }}>🌱</span>
              </div>
              <h3 style={{ ...s.encuestaTitle, color: '#c8d88a' }}>Clima Laboral</h3>
              <p style={s.encuestaDesc}>
                Comparte tu percepción sobre el ambiente de trabajo, liderazgo
                y condiciones laborales en Garana Art.
              </p>
              <div style={s.encuestaMeta}>
                <span style={s.encuestaBadge}>📋 I Semestre 2026</span>
                <span style={s.encuestaBadge}>⏱ 8 min</span>
                <span style={{ ...s.encuestaBadge, backgroundColor: 'rgba(255,220,100,0.15)', color: '#ffd97d' }}>🔒 Confidencial</span>
              </div>
              <button onClick={() => abrirEncuesta('clima')} style={{ ...s.encuestaBtn, backgroundColor: C.olive }}>
                Diligenciar encuesta →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA INGRESO
      ══════════════════════════════════════════════════════════════ */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <div style={s.ctaTag}>Para el equipo Garana</div>
          <h2 style={s.ctaTitle}>¿Eres parte del equipo?</h2>
          <p style={s.ctaSub}>Accede al Sistema Integrado de Gestión  con tus credenciales</p>
          <button style={s.ctaBtn} onClick={goToApp}>
            Ingresar al SIG
          </button>
          <p style={s.ctaHint}>Acceso exclusivo para colaboradores autorizados</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
    <footer style={s.footer}>
  <div style={s.footerInner}>

    <img src="/garanatext1.png" alt="Garana Art" style={s.footerLogo} />

    <div style={s.footerRedes}>
      <p style={s.footerRedesTitle}>Síguenos</p>
      <div style={s.footerRedesLinks}>
        <a href="https://www.instagram.com/garana_art_swimwear" target="_blank" rel="noopener noreferrer" style={s.redLink}>
          <span style={s.redIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></span>
          @garana_art_swimwear
        </a>
        <a href="https://www.garana.com.co" target="_blank" rel="noopener noreferrer" style={s.redLink}>
          <span style={s.redIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
          garana.com.co
        </a>
      </div>
    </div>

    <div style={s.footerLinks}>
      <p style={s.footerRedesTitle}>Sistema</p>
      <button style={s.footerLink} onClick={goToApp}>Ingresar al SIG</button>
      <button style={s.footerLink} onClick={() => scrollTo('encuestas')}>Encuestas</button>
      <button style={s.footerLink} onClick={() => scrollTo('nosotros')}>Nosotros</button>
    </div>

  </div>

  <div style={s.footerBottom}>
    <span>© {new Date().getFullYear()} Garana Art. Todos los derechos reservados.</span>
    <span style={{ opacity: 0.4 }}>·</span>
    <span>Sistema Integrado de Gestión </span>
  </div>
</footer>

      {/* ── Modal de clave de acceso ─────────────────────────────────── */}
      {claveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={cerrarModal}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 16, padding: '36px 32px',
            maxWidth: 420, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                backgroundColor: claveModal === 'satisfaccion' ? `${C.mint}20` : `${C.olive}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>
                {claveModal === 'satisfaccion' ? '⭐' : '🌱'}
              </div>
              <h3 style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
                {claveModal === 'satisfaccion' ? 'Satisfacción del Cliente' : 'Clima Laboral'}
              </h3>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
                Ingresa el código de acceso para continuar
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.green, marginBottom: 6 }}>
                Código de acceso
              </label>
              <input
                ref={claveRef}
                type="text"
                value={claveInput}
                onChange={e => { setClaveInput(e.target.value); setClaveError(''); }}
                onKeyDown={e => e.key === 'Enter' && !claveLoading && validarClave()}
                placeholder="Ej: GARANA2026"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 16,
                  border: `2px solid ${claveError ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: 8, outline: 'none', boxSizing: 'border-box',
                  letterSpacing: 2, textAlign: 'center', fontWeight: 600,
                }}
              />
              {claveError && (
                <p style={{ color: '#ef4444', fontSize: 13, margin: '6px 0 0', textAlign: 'center' }}>
                  ⚠ {claveError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cerrarModal} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #e5e7eb',
                backgroundColor: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 14,
                cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button
                onClick={validarClave}
                disabled={claveLoading || !claveInput.trim()}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                  backgroundColor: claveLoading ? '#9ca3af' : (claveModal === 'satisfaccion' ? C.mint : C.olive),
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: claveLoading || !claveInput.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {claveLoading ? 'Verificando...' : 'Ingresar →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root: { fontFamily: "'Lato', 'Helvetica Neue', sans-serif", backgroundColor: C.cream, margin: 0, padding: 0 },

  // ── Navbar ──
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: '#fff',
    transition: 'box-shadow 0.3s ease',
  },
  navInner: {
    maxWidth: 1200, margin: '0 auto', padding: '0 24px',
    display: 'flex', alignItems: 'center', gap: 32,
    height: 72,
  },
  navBrand: {
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: 0,
    flexShrink: 0,
  },
  navLogo: { height: 140, objectFit: 'contain' },
  navLinks: {
    display: 'flex', gap: 4, alignItems: 'center', flex: 1,
    '@media(max-width:768px)': { display: 'none' },
  },
  navLink: {
    padding: '8px 14px', borderRadius: 8,
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: '#555',
    transition: 'color 0.2s, background 0.2s',
  },
  navLinkActive: { color: C.green, backgroundColor: `${C.green}10` },
  navBtn: {
    padding: '10px 22px', borderRadius: 8, border: 'none',
    backgroundColor: C.green, color: '#fff',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  hamburger: {
    display: 'none', flexDirection: 'column', gap: 5,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 4,
    '@media(max-width:768px)': { display: 'flex' },
  },
  ham: {
    display: 'block', width: 22, height: 2,
    backgroundColor: C.green, borderRadius: 2,
    transition: 'transform 0.3s, opacity 0.3s',
  },
  mobileMenu: {
    padding: '16px 24px 20px',
    display: 'flex', flexDirection: 'column', gap: 4,
    borderTop: '1px solid #f0f0e8',
    backgroundColor: '#fff',
  },
  mobileLink: {
    padding: '12px 16px', borderRadius: 8, textAlign: 'left',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 600, color: '#444',
  },
  mobileCta: {
    marginTop: 8, padding: '14px 16px', borderRadius: 8, border: 'none',
    backgroundColor: C.green, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },

  // ── Hero ──
  hero: {
    minHeight: '100vh', paddingTop: 72,
    position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center',
  },
  heroBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    opacity: 0.08,   // muy transparente
  },
  heroOverlay: {
    position: 'absolute', inset: 0,
    background: `linear-gradient(135deg, ${C.dark} 0%, ${C.green} 60%, #1e4035 100%)`,
  },
  heroInner: {
    position: 'relative', zIndex: 1,
    maxWidth: 1200, margin: '0 auto', padding: '80px 24px',
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 60, alignItems: 'center',
  },
  heroLeft: {},
  heroEyebrow: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: C.mint, fontSize: 12, fontWeight: 700,
    letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 20,
  },
  heroDot: {
    width: 6, height: 6, borderRadius: '50%',
    backgroundColor: C.mint, flexShrink: 0,
    animation: 'pulse 2s infinite',
  },
  heroTitle: {
    color: '#fff', fontSize: 'clamp(42px, 5.5vw, 76px)',
    fontWeight: 900, fontFamily: "'Georgia', 'Times New Roman', serif",
    lineHeight: 1.05, margin: '0 0 24px', fontStyle: 'normal',
  },
  heroAccent: {
    color: C.mint, fontStyle: 'italic',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)', fontSize: 17,
    lineHeight: 1.7, maxWidth: 480, margin: '0 0 40px',
  },
  heroBtns: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  heroMainBtn: {
    padding: '15px 34px', borderRadius: 10, border: 'none',
    backgroundColor: C.mint, color: C.dark,
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
    boxShadow: `0 8px 32px rgba(109,189,150,0.4)`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  heroSecBtn: {
    padding: '15px 34px', borderRadius: 10,
    border: '2px solid rgba(255,255,255,0.25)',
    backgroundColor: 'transparent', color: '#fff',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  heroRight: {},
  sigCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
  },
  sigCardTop: {
    padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.2)',
    display: 'flex', alignItems: 'center', gap: 6,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  sigDot1: { width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' },
  sigDot2: { width: 10, height: 10, borderRadius: '50%', backgroundColor: '#eab308' },
  sigDot3: { width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e' },
  sigTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 4, fontWeight: 600, letterSpacing: 1 },
  sigImg: { width: '100%', display: 'block', objectFit: 'cover' },
  scrollIndicator: {
    position: 'absolute', bottom: 32, left: '50%',
    transform: 'translateX(-50%)', zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  scrollLine: {
    width: 1.5, height: 48,
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)',
    borderRadius: 2,
  },

  // ── Nosotros ──
  aboutSection: {
    position: 'relative', overflow: 'hidden',
    backgroundColor: C.dark,
  },
  heroBgAbout: {
    position: 'absolute', inset: 0,
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    opacity: 0.06,
  },
  sectionInner: { maxWidth: 1100, margin: '0 auto', padding: '88px 24px', position: 'relative', zIndex: 1 },
  sectionLabel: {
    color: C.mint, fontSize: 11, fontWeight: 700,
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12,
  },
  sectionTitle: {
    color: C.green, fontSize: 'clamp(28px, 4vw, 44px)',
    fontWeight: 900, fontFamily: "'Georgia', serif",
    margin: '0 0 16px', lineHeight: 1.1,
  },
  sectionSub: { color: '#777', fontSize: 16, lineHeight: 1.6, margin: '0 0 48px' },
  aboutGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 56, marginBottom: 56,
  },
  aboutLead: {
    color: 'rgba(255,255,255,0.88)', fontSize: 17,
    lineHeight: 1.75, margin: '0 0 20px',
    fontFamily: "'Georgia', serif",
  },
  aboutBody: {
    color: 'rgba(255,255,255,0.62)', fontSize: 14,
    lineHeight: 1.8, margin: '0 0 28px',
  },
  propuestaCard: {
    padding: '20px 24px', borderRadius: 12,
    backgroundColor: 'rgba(109,189,150,0.1)',
    border: `1px solid ${C.mint}40`,
  },
  propuestaTag: {
    color: C.mint, fontSize: 10, fontWeight: 700,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  propuestaText: {
    color: 'rgba(255,255,255,0.75)', fontSize: 13,
    lineHeight: 1.75, margin: 0,
  },
  impactCol: { display: 'flex', flexDirection: 'column', gap: 20 },
  impactCard: {
    padding: '24px', borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', gap: 16,
    transition: 'background 0.2s, border-color 0.2s',
  },
  impactIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(46,82,68,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0,
  },
  impactTitle: {
    color: '#fff', fontSize: 14, fontWeight: 700,
    margin: '0 0 8px',
  },
  impactText: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13,
    lineHeight: 1.7, margin: 0,
  },
  cifrasGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  cifraCard: {
    padding: '28px 20px', borderRadius: 14, textAlign: 'center',
    backgroundColor: 'rgba(109,189,150,0.07)',
    border: `1px solid ${C.mint}25`,
    transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
  },
  cifraNum: {
    color: C.mint, fontSize: 40, fontWeight: 900,
    fontFamily: "'Georgia', serif", lineHeight: 1,
    marginBottom: 10,
  },
  cifraSuffix: { fontSize: 22, fontWeight: 700 },
  cifraLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5 },

  // ── Misión / Visión ──
  mvSection: { backgroundColor: C.cream },
  mvImgWrap: {
    position: 'relative', borderRadius: 20, overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(46,82,68,0.15)',
    maxHeight: 520,
  },
  mvImg: { width: '80%', display: 'block', objectFit: 'cover', maxHeight: 520 },
  mvImgOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to bottom, transparent 60%, rgba(26,46,37,0.4) 100%)',
  },

  // ── Valores ──
  valoresSection: { backgroundColor: C.sand },
  valoresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
  },
  valorCard: {
    padding: '28px 24px', borderRadius: 16,
    backgroundColor: '#fff', border: '1.5px solid #e8e8dc',
    display: 'flex', flexDirection: 'column', gap: 10,
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
  },
  valorIcon: { fontSize: 30 },
  valorTitle: {
    color: C.green, fontSize: 16, fontWeight: 800,
    fontFamily: "'Georgia', serif", margin: 0,
  },
  valorDivider: { height: 2, width: 32, backgroundColor: C.mint, borderRadius: 2 },
  valorText: { color: '#666', fontSize: 13, lineHeight: 1.65, margin: 0 },

  // ── Encuestas ──
  encuestasSection: {
    position: 'relative', overflow: 'hidden',
    backgroundColor: C.green,
  },
  heroBgEncuestas: {
    position: 'absolute', inset: 0,
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    opacity: 0.06,
  },
  encuestasGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 24,
  },
  encuestaCard: {
    padding: '32px', borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(8px)',
    display: 'flex', flexDirection: 'column', gap: 14,
    transition: 'background 0.2s, transform 0.2s',
  },
  encuestaIconWrap: {
    width: 60, height: 60, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  encuestaTitle: {
    fontSize: 20, fontWeight: 800,
    fontFamily: "'Georgia', serif", margin: 0,
  },
  encuestaDesc: {
    color: 'rgba(255,255,255,0.65)', fontSize: 14,
    lineHeight: 1.65, margin: 0, flex: 1,
  },
  encuestaMeta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  encuestaBadge: {
    fontSize: 11, fontWeight: 600, padding: '4px 10px',
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
  },
  encuestaBtn: {
    display: 'block', textAlign: 'center', padding: '13px 20px',
    borderRadius: 10, backgroundColor: C.mint, color: C.dark,
    fontSize: 14, fontWeight: 800, textDecoration: 'none',
    marginTop: 4, transition: 'opacity 0.2s',
  },

  // ── CTA ──
  ctaSection: {
    backgroundColor: '#fff',
    borderTop: `4px solid ${C.mint}`,
    padding: '80px 24px',
  },
  ctaInner: { maxWidth: 600, margin: '0 auto', textAlign: 'center' },
  ctaTag: {
    display: 'inline-block', padding: '4px 14px', borderRadius: 20,
    backgroundColor: `${C.mint}20`, color: C.green,
    fontSize: 11, fontWeight: 700, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 20,
  },
  ctaTitle: {
    color: C.green, fontSize: 'clamp(26px, 3.5vw, 38px)',
    fontWeight: 900, fontFamily: "'Georgia', serif",
    margin: '0 0 14px',
  },
  ctaSub: { color: '#777', fontSize: 16, margin: '0 0 36px', lineHeight: 1.5 },
  ctaBtn: {
    padding: '16px 52px', borderRadius: 10, border: 'none',
    backgroundColor: C.green, color: '#fff',
    fontSize: 16, fontWeight: 800, cursor: 'pointer',
    boxShadow: `0 8px 32px rgba(46,82,68,0.25)`,
    display: 'inline-block', transition: 'transform 0.2s, box-shadow 0.2s',
  },
  ctaHint: { color: '#bbb', fontSize: 12, marginTop: 16 },

  // ── Footer ──
footer: { backgroundColor: C.dark },
  footerBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    opacity: 0.05,   // muy transparente
  },
footerInner: {
  maxWidth: 1100, margin: '0',
  padding: '0px',
  display: 'flex', alignItems: 'center',
  gap: 80, flexWrap: 'wrap',
},
footerNav: {
  display: 'flex', gap: 60, flexWrap: 'wrap',
  marginTop: 10,
},
 footerBrand: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  footerLogo: { height: 300, width: 'auto', objectFit: 'contain', display: 'block' },
  footerTagline: {
    color: 'rgba(255,255,255,0.4)', fontSize: 18,
    fontStyle: 'italic', margin: 0, lineHeight: 1.6,
    maxWidth: 200,
  },
  footerRedes: {},
  footerRedesTitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11,
    fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
    margin: '0 0 14px',
  },
  footerRedesLinks: { display: 'flex', flexDirection: 'column', gap: 12 },
  redLink: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: 'rgba(255,255,255,0.65)', fontSize: 13,
    textDecoration: 'none', fontWeight: 500,
    transition: 'color 0.2s',
  },
  redIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.mint, flexShrink: 0,
  },
  footerLinks: { display: 'flex', flexDirection: 'column', gap: 4 },
  footerLink: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    background: 'none', border: 'none', cursor: 'pointer',
    textAlign: 'left', padding: '6px 0', fontWeight: 500,
    transition: 'color 0.2s',
  },
  footerBottom: {
    maxWidth: 1100, margin: '0 auto',
    padding: '20px 24px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', gap: 16, alignItems: 'center',
    color: 'rgba(255,255,255,0.25)', fontSize: 12,
    position: 'relative', zIndex: 1,
  },
};

// ─── CSS animaciones ──────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;0,900;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes scrollBounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%       { transform: translateX(-50%) translateY(8px); }
  }

  .anim-fade-up        { animation: fadeInUp 0.8s ease both; }
  .anim-fade-up-delay  { animation: fadeInUp 0.8s 0.2s ease both; }
  .scroll-bounce       { animation: scrollBounce 2s ease-in-out infinite; }

  .valor-card:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 12px 32px rgba(46,82,68,0.12) !important;
    border-color: #6dbd96 !important;
  }
  .impact-card:hover {
    background: rgba(255,255,255,0.07) !important;
    border-color: rgba(109,189,150,0.3) !important;
  }
  .cifra-card:hover {
    background: rgba(109,189,150,0.12) !important;
    border-color: rgba(109,189,150,0.4) !important;
    transform: translateY(-3px);
  }
  .encuesta-card:hover {
    background: rgba(255,255,255,0.1) !important;
    transform: translateY(-4px);
  }

  /* Botones hover */
  button[style*="heroMainBtn"]:hover,
  button[style*="ctaBtn"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(109,189,150,0.5) !important;
  }
  a[href]:hover { opacity: 0.85; }

  /* Responsive */
  @media (max-width: 900px) {
    .hero-inner { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 768px) {
    .nav-links { display: none !important; }
    .hamburger { display: flex !important; }
    .about-grid { grid-template-columns: 1fr !important; }
    .cifras-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .footer-inner { grid-template-columns: 1fr !important; gap: 32px !important; }
  }
`;