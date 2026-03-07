// src/pages/HomePublico.jsx
// Página pública de Garana SIG — sin login requerido
// Muestra: info empresa, encuestas, botón de ingreso al sistema

import { useState, useEffect } from 'react';

const C = {
  green:  '#2e5244',
  mint:   '#6dbd96',
  olive:  '#6f7b2c',
  sand:   '#dedecc',
  dark:   '#1a2e25',
};

export default function HomePublico() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
  };

  const goToApp = () => { window.location.href = '/app'; };

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ ...s.nav, ...(scrolled ? s.navScrolled : {}) }}>
        <div style={s.navInner}>
          <div style={s.navBrand}>
            <img src="/garana1.png" alt="Garana Art" style={s.navLogo} />
            <div>
              <span style={s.navName}>Garana Art</span>
              <span style={s.navTag}>SIG</span>
            </div>
          </div>
          <div style={s.navLinks}>
            {['nosotros', 'mision', 'encuestas'].map(sec => (
              <button key={sec} style={{ ...s.navLink, ...(activeSection === sec ? s.navLinkActive : {}) }}
                onClick={() => scrollTo(sec)}>
                {sec.charAt(0).toUpperCase() + sec.slice(1)}
              </button>
            ))}
          </div>
          <button style={s.navBtn} onClick={goToApp}>
            Ingresar al sistema →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="inicio" style={s.hero}>
        <div style={s.heroBg} />
        <div style={s.heroContent}>
          <div style={s.heroEyebrow}>Sistema de Gestión Integral</div>
          <h1 style={s.heroTitle}>
            Calidad que<br />
            <span style={s.heroAccent}>transforma</span>
          </h1>
          <p style={s.heroSub}>
            Garana Art gestiona sus procesos, documentos, indicadores y mejoramiento
            continuo desde una plataforma unificada.
          </p>
          <div style={s.heroBtns}>
            <button style={s.heroMainBtn} onClick={goToApp}>
              Ingresar al SIG
            </button>
            <button style={s.heroSecBtn} onClick={() => scrollTo('nosotros')}>
              Conocer más ↓
            </button>
          </div>
        </div>
        {/* Decorativo */}
        <div style={s.heroDecor}>
          <img src="/garana1.png" alt="" style={s.heroDecorImg} />
        </div>
      </section>

      {/* ── ENCUESTAS (destacado) ── */}
      <section id="encuestas" style={s.surveysSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Participa</div>
          <h2 style={s.sectionTitle}>Tus encuestas activas</h2>
          <p style={s.sectionSub}>Tu opinión es clave para el mejoramiento continuo de Garana Art</p>

          <div style={s.surveyCards}>
            {/* Satisfacción Cliente */}
            <div style={s.surveyCard} className="survey-card">
              <div style={{ ...s.surveyCardIcon, backgroundColor: `${C.green}15` }}>
                <span style={{ fontSize: 36 }}>⭐</span>
              </div>
              <h3 style={{ ...s.surveyCardTitle, color: C.green }}>
                Satisfacción del Cliente
              </h3>
              <p style={s.surveyCardDesc}>
                Cuéntanos cómo fue tu experiencia con nuestros productos y servicio.
                Tu evaluación nos ayuda a mejorar.
              </p>
              <div style={s.surveyCardMeta}>
                <span style={s.surveyBadge}>📋 I Semestre 2026</span>
                <span style={s.surveyBadge}>⏱ 5 min</span>
              </div>
              <a href="/encuesta/satisfaccion-cliente" style={{ ...s.surveyBtn, backgroundColor: C.green }}>
                Diligenciar encuesta →
              </a>
            </div>

            {/* Clima Laboral */}
            <div style={s.surveyCard} className="survey-card">
              <div style={{ ...s.surveyCardIcon, backgroundColor: `${C.olive}15` }}>
                <span style={{ fontSize: 36 }}>🌱</span>
              </div>
              <h3 style={{ ...s.surveyCardTitle, color: C.olive }}>
                Clima Laboral
              </h3>
              <p style={s.surveyCardDesc}>
                Comparte tu percepción sobre el ambiente de trabajo, liderazgo
                y condiciones laborales en Garana Art.
              </p>
              <div style={s.surveyCardMeta}>
                <span style={s.surveyBadge}>📋 I Semestre 2026</span>
                <span style={s.surveyBadge}>⏱ 8 min</span>
                <span style={{ ...s.surveyBadge, backgroundColor: '#fef3c7', color: '#92400e' }}>🔒 Confidencial</span>
              </div>
              <a href="/encuesta/clima-laboral" style={{ ...s.surveyBtn, backgroundColor: C.olive }}>
                Diligenciar encuesta →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── NOSOTROS ── */}
      <section id="nosotros" style={s.aboutSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Quiénes somos</div>
          <h2 style={{ ...s.sectionTitle, color: '#fff' }}>Garana Art</h2>
          <p style={{ ...s.sectionSub, color: 'rgba(255,255,255,0.7)' }}>
            Empresa colombiana especializada en confección y diseño de prendas de vestir,
            comprometida con la calidad y el mejoramiento continuo.
          </p>

          <div style={s.aboutCards}>
            <div style={s.aboutCard}>
              <div style={s.aboutCardNum}>01</div>
              <h3 style={s.aboutCardTitle}>Fundada en Colombia</h3>
              <p style={s.aboutCardText}>
                Con años de experiencia en el sector textil, fabricando prendas
                con los más altos estándares de calidad.
              </p>
            </div>
            <div style={s.aboutCard}>
              <div style={s.aboutCardNum}>02</div>
              <h3 style={s.aboutCardTitle}>Certificación de calidad</h3>
              <p style={s.aboutCardText}>
                Implementamos y mantenemos un Sistema de Gestión de Calidad
                que garantiza la excelencia en todos nuestros procesos.
              </p>
            </div>
            <div style={s.aboutCard}>
              <div style={s.aboutCardNum}>03</div>
              <h3 style={s.aboutCardTitle}>Mejoramiento continuo</h3>
              <p style={s.aboutCardText}>
                Cada colaborador, cliente y proveedor es parte activa de
                nuestra cultura de mejora permanente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISIÓN / VISIÓN ── */}
      <section id="mision" style={s.mvSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Identidad corporativa</div>
          <h2 style={s.sectionTitle}>Misión y Visión</h2>

          <div style={s.mvGrid}>
            <div style={s.mvCard}>
              <div style={s.mvIcon}>🎯</div>
              <h3 style={s.mvTitle}>Misión</h3>
              <div style={s.mvDivider} />
              <p style={s.mvText}>
                Somos una empresa colombiana dedicada a la confección y comercialización
                de prendas de vestir de alta calidad, comprometidos con satisfacer las
                necesidades de nuestros clientes mediante procesos eficientes,
                un equipo humano competente y una cultura de mejoramiento continuo
                que genere valor para todas las partes interesadas.
              </p>
            </div>

            <div style={{ ...s.mvCard, borderColor: C.olive }}>
              <div style={{ ...s.mvIcon, backgroundColor: `${C.olive}18` }}>🔭</div>
              <h3 style={{ ...s.mvTitle, color: C.olive }}>Visión</h3>
              <div style={{ ...s.mvDivider, backgroundColor: C.olive }} />
              <p style={s.mvText}>
                Para el 2028, ser reconocidos como una empresa líder en el sector
                textil colombiano por la calidad de nuestros productos, la innovación
                en nuestros procesos y el bienestar de nuestro equipo, con presencia
                en los principales mercados nacionales e internacionales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALORES ── */}
      <section style={s.valuesSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Cultura organizacional</div>
          <h2 style={s.sectionTitle}>Nuestros valores</h2>

          <div style={s.valuesGrid}>
            {[
              { icon: '🤝', title: 'Integridad',     desc: 'Actuamos con transparencia y honestidad en cada interacción' },
              { icon: '⚡', title: 'Excelencia',     desc: 'Buscamos superar los estándares en todo lo que hacemos' },
              { icon: '🌿', title: 'Sostenibilidad', desc: 'Cuidamos el medio ambiente y generamos impacto social positivo' },
              { icon: '💡', title: 'Innovación',     desc: 'Adoptamos nuevas formas de hacer mejor las cosas' },
              { icon: '🎯', title: 'Compromiso',     desc: 'Cumplimos nuestra palabra con clientes, colaboradores y comunidad' },
              { icon: '👥', title: 'Trabajo en equipo', desc: 'Crecemos juntos reconociendo el aporte de cada persona' },
            ].map((v, i) => (
              <div key={i} style={s.valueCard} className="value-card">
                <div style={s.valueIcon}>{v.icon}</div>
                <h4 style={s.valueTitle}>{v.title}</h4>
                <p style={s.valueDesc}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORGANIGRAMA ── */}
      <section style={s.orgSection}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Estructura organizacional</div>
          <h2 style={{ ...s.sectionTitle, color: '#fff' }}>Organigrama</h2>

          <div style={s.orgChart}>
            {/* Nivel 1 */}
            <div style={s.orgRow}>
              <OrgBox title="Gerencia General" color={C.mint} highlight />
            </div>
            {/* Línea vertical */}
            <div style={s.orgVLine} />
            {/* Nivel 2 */}
            <div style={s.orgRow}>
              <OrgBox title="Gestión de Calidad" color="#fff" sub="Sistema de Gestión" />
              <OrgBox title="Gestión Administrativa" color="#fff" sub="Administración y RRHH" />
            </div>
            <div style={s.orgVLine} />
            {/* Nivel 3 */}
            <div style={s.orgRow}>
              <OrgBox title="Producción" color="#fff" sub="Operaciones" small />
              <OrgBox title="Diseño" color="#fff" sub="Moda y creación" small />
              <OrgBox title="Comercial" color="#fff" sub="Ventas y clientes" small />
              <OrgBox title="SST" color="#fff" sub="Seguridad y salud" small />
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            * Estructura simplificada para visualización
          </p>
        </div>
      </section>

      {/* ── CTA INGRESO ── */}
      <section style={s.ctaSection}>
        <div style={{ ...s.sectionInner, textAlign: 'center' }}>
          <h2 style={s.ctaTitle}>¿Eres colaborador de Garana Art?</h2>
          <p style={s.ctaSub}>
            Accede al Sistema de Gestión Integral con tu usuario y contraseña corporativos
          </p>
          <button style={s.ctaBtn} onClick={goToApp}>
            Ingresar al sistema →
          </button>
          <p style={s.ctaHint}>Solo para colaboradores autorizados</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerBrand}>
            <img src="/garana1.png" alt="Garana Art" style={s.footerLogo} />
            <div>
              <div style={s.footerName}>Garana Art</div>
              <div style={s.footerTagline}>Sistema de Gestión Integral</div>
            </div>
          </div>
          <div style={s.footerLinks}>
            <a href="/encuesta/satisfaccion-cliente" style={s.footerLink}>Encuesta Satisfacción</a>
            <a href="/encuesta/clima-laboral" style={s.footerLink}>Encuesta Clima Laboral</a>
            <button onClick={goToApp} style={s.footerLink}>Ingresar</button>
          </div>
          <div style={s.footerCopy}>
            © 2026 Garana Art · Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-componente OrgBox ──────────────────────────────────────────────────────
function OrgBox({ title, color, sub, highlight, small }) {
  return (
    <div style={{
      ...s.orgBox,
      ...(highlight ? s.orgBoxHighlight : {}),
      ...(small ? s.orgBoxSmall : {}),
      borderColor: highlight ? C.mint : 'rgba(255,255,255,0.2)',
      color: highlight ? C.dark : '#fff',
      backgroundColor: highlight ? C.mint : 'rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontWeight: 700, fontSize: small ? 12 : 14 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = {
  root: {
    fontFamily: "'Segoe UI', Georgia, sans-serif",
    backgroundColor: C.sand,
    overflowX: 'hidden',
  },

  // Navbar
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    padding: '16px 24px',
    transition: 'all 0.3s',
  },
  navScrolled: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 1px 24px rgba(46,82,68,0.1)',
    padding: '10px 24px',
  },
  navInner: {
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', alignItems: 'center', gap: 32,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10, flex: 1 },
  navLogo:  { height: 40, objectFit: 'contain' },
  navName:  { color: C.green, fontWeight: 800, fontSize: 16, fontFamily: 'Georgia, serif', display: 'block' },
  navTag:   { color: C.olive, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 },
  navLinks: { display: 'flex', gap: 4 },
  navLink:  {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 12px', borderRadius: 8, fontSize: 13,
    color: C.green, fontWeight: 500,
  },
  navLinkActive: { backgroundColor: `${C.mint}25`, fontWeight: 700 },
  navBtn: {
    padding: '8px 20px', borderRadius: 8, border: 'none',
    backgroundColor: C.green, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // Hero
  hero: {
    minHeight: '100vh',
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex', alignItems: 'center',
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute', inset: 0,
    background: `linear-gradient(135deg, rgba(46,82,68,0.90) 0%, rgba(26,46,37,0.85) 50%, rgba(111,123,44,0.7) 100%)`,
  },
  heroContent: {
    position: 'relative', zIndex: 1,
    maxWidth: 1100, margin: '0 auto', padding: '120px 24px 80px',
    flex: 1,
  },
  heroEyebrow: {
    color: C.mint, fontSize: 12, fontWeight: 700,
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20,
  },
  heroTitle: {
    color: '#fff', fontSize: 'clamp(48px, 7vw, 86px)',
    fontWeight: 900, fontFamily: 'Georgia, serif',
    lineHeight: 1.05, margin: '0 0 24px',
  },
  heroAccent: { color: C.mint },
  heroSub: {
    color: 'rgba(255,255,255,0.75)', fontSize: 18,
    lineHeight: 1.65, maxWidth: 520, margin: '0 0 40px',
  },
  heroBtns: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  heroMainBtn: {
    padding: '16px 36px', borderRadius: 10, border: 'none',
    backgroundColor: C.mint, color: C.dark,
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
    boxShadow: `0 8px 32px rgba(109,189,150,0.4)`,
  },
  heroSecBtn: {
    padding: '16px 36px', borderRadius: 10,
    border: '2px solid rgba(255,255,255,0.3)',
    backgroundColor: 'transparent', color: '#fff',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  heroDecor: {
    position: 'absolute', right: '8%', bottom: '10%',
    zIndex: 1, opacity: 0.12,
  },
  heroDecorImg: { height: 320, objectFit: 'contain' },

  // Sections base
  sectionInner: { maxWidth: 1100, margin: '0 auto', padding: '80px 24px' },
  sectionLabel: {
    color: C.olive, fontSize: 11, fontWeight: 700,
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12,
  },
  sectionTitle: {
    color: C.green, fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 800, fontFamily: 'Georgia, serif',
    margin: '0 0 16px', lineHeight: 1.15,
  },
  sectionSub: { color: '#666', fontSize: 16, lineHeight: 1.6, margin: '0 0 48px' },

  // Encuestas
  surveysSection: { backgroundColor: '#fff' },
  surveyCards: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 24,
  },
  surveyCard: {
    padding: '32px', borderRadius: 16, border: '2px solid #f0f0e8',
    backgroundColor: '#fafaf6', display: 'flex', flexDirection: 'column', gap: 14,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  surveyCardIcon: {
    width: 64, height: 64, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  surveyCardTitle: { fontSize: 20, fontWeight: 800, fontFamily: 'Georgia, serif', margin: 0 },
  surveyCardDesc: { color: '#666', fontSize: 14, lineHeight: 1.65, margin: 0, flex: 1 },
  surveyCardMeta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  surveyBadge: {
    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
    backgroundColor: `${C.sand}`, color: C.green,
  },
  surveyBtn: {
    display: 'block', textAlign: 'center', padding: '12px 20px',
    borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
    textDecoration: 'none', marginTop: 6,
  },

  // Nosotros
  aboutSection: {
    backgroundImage: 'url(/imgfondo.webp)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    position: 'relative',
  },
  aboutCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 },
  aboutCard: {
    padding: '28px', borderRadius: 14,
    backgroundColor: 'rgba(9, 167, 49, 0.08)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  aboutCardNum: {
    fontSize: 36, fontWeight: 900, color: C.mint,
    fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 12,
  },
  aboutCardTitle: { color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 8px' },
  aboutCardText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.6, margin: 0 },

  // Misión / Visión
  mvSection: { backgroundColor: '#fff' },
  mvGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 },
  mvCard: {
    padding: '36px', borderRadius: 16,
    border: `2px solid ${C.green}25`,
    display: 'flex', flexDirection: 'column', gap: 12,
    backgroundColor: '#fafaf6',
  },
  mvIcon: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: `${C.green}15`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26,
  },
  mvTitle: { color: C.green, fontSize: 20, fontWeight: 800, fontFamily: 'Georgia, serif', margin: 0 },
  mvDivider: { height: 3, width: 40, backgroundColor: C.green, borderRadius: 2 },
  mvText: { color: '#555', fontSize: 14, lineHeight: 1.75, margin: 0 },

  // Valores
  valuesSection: { backgroundColor: C.sand },
  valuesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  valueCard: {
    padding: '24px', borderRadius: 14, backgroundColor: '#fff',
    border: '1.5px solid #e8e8dc',
    display: 'flex', flexDirection: 'column', gap: 8,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  valueIcon: { fontSize: 28 },
  valueTitle: { color: C.green, fontSize: 14, fontWeight: 700, margin: 0 },
  valueDesc: { color: '#777', fontSize: 13, lineHeight: 1.55, margin: 0 },

  // Organigrama
  orgSection: {
    backgroundColor: C.dark,
  },
  orgChart: { maxWidth: 700, margin: '0 auto' },
  orgRow: {
    display: 'flex', justifyContent: 'center',
    gap: 12, flexWrap: 'wrap',
  },
  orgVLine: {
    width: 2, height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    margin: '4px auto',
  },
  orgBox: {
    padding: '12px 20px', borderRadius: 10,
    border: '1.5px solid', textAlign: 'center',
    minWidth: 130,
  },
  orgBoxHighlight: {
    padding: '14px 28px',
    boxShadow: `0 4px 20px rgba(109,189,150,0.3)`,
  },
  orgBoxSmall: { minWidth: 110, padding: '10px 14px' },

  // CTA
  ctaSection: {
    backgroundColor: C.green,
    padding: '80px 24px',
  },
  ctaTitle: {
    color: '#fff', fontSize: 'clamp(24px, 3vw, 36px)',
    fontWeight: 800, fontFamily: 'Georgia, serif', margin: '0 0 16px',
  },
  ctaSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: '0 0 36px' },
  ctaBtn: {
    padding: '16px 48px', borderRadius: 10, border: 'none',
    backgroundColor: C.mint, color: C.dark,
    fontSize: 16, fontWeight: 800, cursor: 'pointer',
    boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
    display: 'inline-block',
  },
  ctaHint: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 16 },

  // Footer
  footer: { backgroundColor: C.dark, padding: '32px 24px' },
  footerInner: {
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', alignItems: 'center', gap: 32,
    flexWrap: 'wrap', justifyContent: 'space-between',
  },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  footerLogo:  { height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.7 },
  footerName:  { color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 14 },
  footerTagline: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  footerLinks: { display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' },
  footerLink: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  },
  footerCopy: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
};

// CSS para animaciones y hovers
const css = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .survey-card:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 12px 40px rgba(46,82,68,0.12) !important;
  }

  .value-card:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 8px 24px rgba(46,82,68,0.1) !important;
    border-color: #6dbd96 !important;
  }

  a[href]:hover, button:hover:not(:disabled) { opacity: 0.88; }
`;