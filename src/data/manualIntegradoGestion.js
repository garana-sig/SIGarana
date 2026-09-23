// src/data/manualIntegradoGestion.js
// ═══════════════════════════════════════════════════════════════════
// MC-DP-01 · Manual Integrado de Gestión (SGC ISO 9001 + SG-SST + BASC)
// Contenido estructurado a partir del documento oficial (Sep/2026).
//
// Tipos de bloque soportados por el visor (Manuales.jsx):
//   { type: 'p',        text }
//   { type: 'list',     items: [] }
//   { type: 'quote',    text, author? }          → declaración destacada
//   { type: 'callout',  text }                   → "Ver …" / referencia
//   { type: 'table',    headers: [], rows: [[]] }
//   { type: 'image',    src, alt, caption? }
//   { type: 'timeline', items: [{ year, text }] }
//   { type: 'cards',    items: [{ title, text }] }
//   { type: 'subtitle', text }
// ═══════════════════════════════════════════════════════════════════

const OBJETIVOS_ESTRATEGICOS = [
  'Mantener el margen de rentabilidad',
  'Aumentar ingresos',
  'Mantener la satisfacción de los clientes',
  'Disminuir los costos de fabricación',
  'Mejorar el sistema integrado de gestión (reducir accidentes, incapacidades y ausentismo, disminuir PQRS, controlando el PNC)',
  'Mantener la productividad',
  'Mantener la satisfacción laboral',
  'Mantener el nivel de competencia',
];

export const MANUAL_INTEGRADO_GESTION = {
  id: 'manual-integrado-gestion',
  code: 'MC-DP-01',
  title: 'Manual Integrado de Gestión',
  shortDesc: 'Estructura del Sistema Integrado de Gestión: calidad (ISO 9001), SG-SST (Decreto 1072) y requisitos BASC.',
  category: 'Sistema Integrado de Gestión',
  process: 'Gestión de Dirección',
  version: '03',
  date: 'Sep/2026',
  owner: 'Margarita Milena Ramírez',
  normas: ['ISO 9001', 'Decreto 1072', 'BASC'],

  sections: [
    // ───────────────────────────────────────────────────────────────
    {
      id: 'presentacion',
      num: '',
      title: 'Presentación del manual',
      blocks: [
        { type: 'p', text: 'La Gerencia de INDECON S.A.S. manifiesta su apoyo incondicional y permanente para el desarrollo, implementación y mejoramiento continuo del Sistema de Gestión Integrado SIG. Este compromiso se evidencia en la ejecución de las revisiones que garantizan la eficacia del mismo, y en el liderazgo y acompañamiento para el fomento de una cultura de calidad y seguridad en el trabajo entre todos los colaboradores, que conlleva a la satisfacción de las necesidades de nuestros clientes, los requisitos legales y de la sociedad y la permanencia de la empresa en el tiempo.' },
        { type: 'p', text: 'El Sistema de Seguridad y Salud en el Trabajo SG-SST representa actualmente una de las herramientas de gestión más importantes para mejorar la calidad de vida laboral en las empresas y con ella su competitividad. La sincronización con el Sistema de Gestión de Calidad bajo los planes de calidad, el mejoramiento de los procesos y puestos de trabajo, la productividad, el desarrollo del talento humano y la reducción de los costos de producción hacen que se hable del SIG: un Sistema de Gestión Integrado que representa a toda la organización, convirtiéndose en una herramienta fundamental de trabajo en las tareas que diariamente ejecutan todos los procesos. Esto ha generado en nuestros miembros una cultura hacia la calidad, la seguridad y la salud en el trabajo y el deseo de mejorar continuamente para ser más competitivos y alcanzar liderazgo.' },
        { type: 'p', text: 'Todos los procesos, procedimientos y actividades descritos o relacionados en este manual están implementados con la cultura del enfoque basado en procesos, que consiste en determinar y gestionar de manera eficaz una serie de actividades relacionadas entre sí, con la ventaja del control continuo que proporciona sobre los vínculos entre los procesos.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'identificacion',
      num: '1',
      title: 'Identificación de la empresa',
      blocks: [
        { type: 'p', text: 'INDECON es una sociedad por acciones simplificada, constituida en el año 2006 en el municipio de Riosucio, Caldas (Colombia), con dirección carrera 13 # 6-105, barrio El Carmen. Se dedica al diseño, producción y comercialización de trajes de baño, y a la prestación de servicios de prehormado de copa, sublimación y maquila de prendas. Regida por el Ministerio de Industria y Comercio.' },
        { type: 'p', text: 'Desarrolla sus labores de lunes a viernes, cumpliendo con las horas de ley distribuidas según el programa de producción.' },
        { type: 'p', text: 'Sus colaboradores son en un 80 % mujeres cabeza de hogar y jóvenes; el 20 % son hombres que desarrollan actividades de corte y calandrado. Todos son del municipio de Riosucio (casco urbano y zona rural); el 100 % son bachilleres, un 5 % profesionales y un 5 % técnicos. El 90 % devenga el salario básico y el 10 % restante supera los 2 SMLV; los estratos del personal están entre 2 y 3. El 95 % son indígenas y pertenecen a un resguardo indígena.' },
        { type: 'subtitle', text: '1.1 Historia' },
        {
          type: 'timeline',
          items: [
            { year: '2006', text: 'En mayo inician labores Lina María Ruiz y Margarita Milena Ramírez, dos ingenieras industriales egresadas de la Universidad Nacional que llevaron sus trabajos de universidad a la vida real. 3 operarias de máquinas (Aleyda, Edilma y María) y 4 clientes: 1 en Bogotá y 3 en Medellín.' },
            { year: '2007', text: 'Primer cliente en Ecuador. 6 empleados; producción de 1.700 unidades mensuales.' },
            { year: '2008', text: 'Códigos de barra, producción de 2.500 unidades, 10 empleados. Se construye la primera planta de producción propia.' },
            { year: '2009', text: 'Aumento de producción a 3.400 unidades/mes; planta con 13 colaboradores.' },
            { year: '2010', text: 'Registro de la marca Garana Art. Exportación a Miami. Se construye la segunda planta de producción.' },
            { year: '2011', text: 'Participación en ruedas de negocio; se vincula el proceso de sublimación y la decoración manual de trajes de baño.' },
            { year: '2012', text: 'Certificación de calidad NTC 6001.' },
            { year: '2013', text: 'Modernización de equipos con apoyo del DPS: software de diseño de corte, plotter, sublimadora, motores ahorradores. Producción de 5.000 unidades mensuales, 16 empleados y dos vendedores.' },
            { year: '2015', text: 'Adquisición del software contable World Office.' },
            { year: '2017', text: 'Nueva sede: bodega de 600 m².' },
            { year: '2020', text: 'Pandemia COVID-19: nos reinventamos con tapabocas y trajes; alianza estratégica de maquila de fajas; cambio de la misión y la visión.' },
            { year: '2021', text: 'Apertura del área de diseño e impresión de hojas para sublimar y personalizar los trajes de baño, con diseñador y plotter. Modernización con maquinaria electrónica nueva.' },
            { year: '2022', text: 'Implementación de paneles solares que transforman la energía solar en energía eléctrica para toda la planta, dejando de emitir dióxido de carbono.' },
            { year: '2023', text: 'Inicia el proyecto "Ella Exporta África"; fortalecimiento exportador con formación en la Universidad de los Andes como empresa de excelencia. Se adquiere la calandra, que mejora productividad, calidad y puesto de trabajo.' },
          ],
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'direccionamiento',
      num: '2',
      title: 'Direccionamiento estratégico',
      blocks: [
        { type: 'subtitle', text: '2.1 Misión, visión, valores y propuesta de valor' },
        {
          type: 'cards',
          items: [
            { title: 'Misión', text: 'Confeccionar y comercializar trajes de baño cómodos e innovadores, en una empresa consolidada, versátil, competente y con capacidad de adaptación, enfocada en la satisfacción de sus clientes, el bienestar y la seguridad de sus colaboradores, apoyados en la mejora continua de procesos y la competencia laboral.' },
            { title: 'Visión', text: 'INDECON tendrá una rentabilidad sostenible, mediante el posicionamiento de su marca "Garana Art" y mayor participación en el mercado nacional e internacional, con un ambiente extraordinario de trabajo, un equipo humano altamente motivado y una cultura de excelencia operativa que garanticen la fidelización de sus clientes.' },
            { title: 'Propuesta de valor', text: 'Desarrollar y ofrecer vestidos de baño que se adaptan perfectamente al cuerpo de la mujer, combinando seguridad y comodidad. Empoderamos a nuestras clientas a través de prendas que realzan su estilo único, brindándoles confianza y bienestar. Además, garantizamos a nuestros clientes y distribuidores versatilidad, excelencia en cada diseño y puntualidad en la entrega de nuestros productos.' },
          ],
        },
        {
          type: 'table',
          headers: ['Valor', 'Significado'],
          rows: [
            ['Honestidad', 'Valor social que genera acciones de beneficio común y se refleja en la congruencia entre lo que se piensa y lo que se hace.'],
            ['Responsabilidad', 'Asumir las consecuencias de nuestros actos y cumplir con nuestros compromisos y obligaciones ante los demás.'],
            ['Respeto', 'Capacidad de reconocer, apreciar y valorar a los otros teniendo en cuenta que todos somos válidos. Requiere reciprocidad: derechos y deberes para ambas partes.'],
            ['Amor', 'Busca la felicidad de los demás. Las relaciones interpersonales se mantienen en forma de amistad; induce el bienestar en los otros.'],
            ['Lealtad', 'Fidelidad en las acciones y comportamientos.'],
          ],
        },
        { type: 'subtitle', text: '2.2 Objetivos estratégicos' },
        { type: 'list', items: OBJETIVOS_ESTRATEGICOS },
        { type: 'callout', text: 'Los objetivos se despliegan por perspectiva en el Cuadro de Mando Integral (módulo Planeación Estratégica).' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'procesos',
      num: '3',
      title: 'Enfoque de procesos',
      blocks: [
        { type: 'subtitle', text: '3.1 Red de procesos' },
        { type: 'p', text: 'Los procesos del Sistema de Gestión Integrado se clasifican en estratégicos, misionales y de apoyo.' },
        { type: 'image', src: '/Estructura_de_proceso.jpg', alt: 'Red de procesos Garana Art', caption: 'Red de procesos — puedes ver la caracterización de cada proceso desde la página de Inicio.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'contexto',
      num: '4',
      title: 'Contexto de la organización',
      blocks: [
        { type: 'subtitle', text: '4.1 Comprensión de la organización y su contexto' },
        { type: 'p', text: 'INDECON aplica la metodología DOFA, con la que analiza su entorno interno y externo, permitiéndole planificar maximizando las oportunidades. Se realiza análisis de competencia y de los productos con mejor aceptación de los clientes. Desde la gerencia, este análisis es fundamental al inicio de cada año para determinar los planes de acción y metas que regirán el siguiente periodo.' },
        { type: 'subtitle', text: '4.2 Comprensión de las necesidades y expectativas de las partes interesadas' },
        { type: 'p', text: 'Las partes interesadas en el SIG son nuestros empleados, clientes, proveedores, contratistas y entidades gubernamentales. Por esto, para INDECON es fundamental mantener condiciones de trabajo seguras y saludables en el desarrollo de las diferentes actividades productivas, a través de la promoción de la salud y de la identificación, evaluación y control de los riesgos ocupacionales, evitando accidentes de trabajo, enfermedades laborales y otras situaciones que afecten la calidad de vida de los trabajadores. Además, mantener la satisfacción de nuestros clientes con el mejoramiento continuo de los procesos fortalece las capacidades organizacionales, la simplificación de procesos y la mejora continua del desempeño empresarial; por todo esto la empresa se compromete con la implementación del SIG.' },
        { type: 'p', text: 'Se desarrollan actividades como la evaluación de clientes, la evaluación de clima laboral y la evaluación de proveedores, que permiten identificar necesidades y opciones de mejora. La evaluación de los requisitos del SG-SST y la matriz legal permiten identificar los requisitos a cumplir en el desarrollo de nuestras actividades.' },
        { type: 'subtitle', text: '4.3 Alcance del Sistema Integrado de Gestión' },
        { type: 'p', text: 'El SIG contempla como alcance la producción y comercialización de trajes de baño y fajas y la prestación del servicio de maquila. Aplica a todos los trabajadores vinculados directamente o a través de contratos temporales, contratos de aprendizaje y aquellos otros que la ley establezca, en los diferentes puestos de trabajo y en todos sus procesos estratégicos, misionales y de apoyo.' },
        { type: 'subtitle', text: '4.3.1 Alcance BASC' },
        { type: 'p', text: 'INDECON S.A.S. garantiza la seguridad, integridad y control de toda la cadena de suministro, desde la recepción de materias primas hasta el despacho del producto terminado, con el objetivo de prevenir actividades ilícitas como el contrabando, el narcotráfico, el terrorismo y el lavado de activos.' },
        { type: 'subtitle', text: '4.4 Sistema de Gestión Integrado — caracterización' },
        { type: 'p', text: 'INDECON S.A.S. ha establecido y documentado su Sistema de Gestión Integrado bajo la norma ISO 9001, el SG-SST (Decreto 1072) y los requisitos BASC, asegurando su mantenimiento y control a través de los procesos que se desarrollan al interior de la organización, así como la implementación de acciones que mejoren la eficacia de los procesos, basado en el ciclo PHVA.' },
        { type: 'p', text: 'El Sistema de Seguridad y Salud en el Trabajo hace parte del SIG al unirse al Sistema de Gestión de la Calidad, con requisitos compartidos como la determinación de funciones, responsabilidad, autoridad y competencias del personal; el control y mantenimiento de la documentación; la gestión de auditorías internas; la gestión del riesgo y la formulación de acciones correctivas; los esquemas de seguimiento a resultados y de revisión por la dirección; así como las actividades propias de los procesos y sus controles.' },
        { type: 'p', text: 'El SIG armoniza los procesos del SG-SST y del SGC, que de manera interrelacionada garantizan, a través de su planeación, ejecución y control, el cumplimiento de todos los requisitos externos, internos y legales que aplican a la empresa, logrando permanentemente el mejoramiento del desempeño.' },
        {
          type: 'table',
          headers: ['Tipo', 'Proceso', 'Procedimiento', 'Código'],
          rows: [
            ['Estratégico', 'Gestión de Dirección', 'Auditorías internas', 'PR-DP-01'],
            ['Estratégico', 'Gestión de Dirección', 'Planeación estratégica', 'PR-DP-02'],
            ['Estratégico', 'Gestión de Dirección', 'Acciones de mejoramiento', 'PR-DP-03'],
            ['Estratégico', 'Gestión de Dirección', 'Control de legislación', 'PR-DP-04'],
            ['Estratégico', 'Gestión de Dirección', 'Revisión por la dirección', 'PR-DP-05'],
            ['Estratégico', 'Gestión de Dirección', 'Control de documentos', 'PR-DP-06'],
            ['Estratégico', 'Gestión de Dirección', 'Gestión del cambio', '—'],
            ['Estratégico', 'Gestión de Calidad y SST', 'Planeación de seguridad y salud en el trabajo', 'PR-GS-01'],
            ['Estratégico', 'Gestión de Calidad y SST', 'Identificación de peligros, evaluación de riesgos y determinación de controles', 'PR-GS-02'],
            ['Estratégico', 'Gestión de Calidad y SST', 'Preparación y respuesta ante la emergencia', 'PR-GS-03'],
            ['Estratégico', 'Gestión de Calidad y SST', 'Investigación de accidentes', 'PR-GS-04'],
            ['Estratégico', 'Gestión de Calidad y SST', 'Control de producto no conforme', 'PR-GS-05'],
            ['Misional', 'Gestión de Clientes', 'Satisfacción del cliente', 'PR-GC-01'],
            ['Misional', 'Gestión de Clientes', 'Ventas y mercadeo', 'PR-GC-02'],
            ['Misional', 'Gestión de Clientes', 'Control de bodega de producto terminado', 'PR-GC-03'],
            ['Misional', 'Gestión de Producción', 'Planeación y programación', 'PR-GP-01'],
            ['Misional', 'Gestión de Producción', 'Producción', 'PR-GP-02'],
            ['Misional', 'Gestión de Producción', 'Diseño y desarrollo', 'PR-GP-03'],
            ['Misional', 'Gestión de Producción', 'Control de producto no conforme', 'PR-GS-05'],
            ['Misional', 'Gestión de Proveedores', 'Aseguramiento de proveedores', 'PR-GR-01'],
            ['Misional', 'Gestión de Proveedores', 'Compras', 'PR-GR-02'],
            ['Misional', 'Gestión de Proveedores', 'Mantenimiento', 'PR-GP-03'],
            ['Apoyo', 'Gestión de Talento Humano', 'Desarrollo del talento humano', 'PR-GH-01'],
            ['Apoyo', 'Gestión de Talento Humano', 'Comunicación, participación y consulta', 'PR-GH-02'],
            ['Apoyo', 'Gestión Contable y Financiera', '—', '—'],
          ],
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'liderazgo',
      num: '5',
      title: 'Liderazgo y participación de los trabajadores',
      blocks: [
        { type: 'subtitle', text: '5.1 Liderazgo y compromiso' },
        { type: 'p', text: 'El liderazgo y compromiso de la implementación del SIG está a cargo de la junta directiva, cuyas responsabilidades están definidas en la Matriz de Responsabilidad y Autoridad.' },
        { type: 'p', text: 'Se designa al gerente como líder del SIG, al profesional de seguridad y salud en el trabajo para el SG-SST y un apoyo logístico en calidad, creando liderazgo y dinamización de la gestión con la participación de todos los líderes de procesos.' },
        { type: 'p', text: 'La gerencia demuestra liderazgo y compromiso con el SIG asumiendo la responsabilidad y rendición de cuentas en cuanto a la prevención de lesiones y el deterioro de la salud relacionados con el trabajo, así como la provisión de actividades y lugares de trabajo seguros y saludables, reduciendo los productos no conformes y mejorando continuamente los procesos.' },
        { type: 'p', text: 'La gerencia demuestra liderazgo y compromiso con la implementación de la política y los objetivos del SIG, alineándose con el direccionamiento misional, la visión social, el contexto y los ámbitos de actuación estratégicos y misionales de la organización.' },
        { type: 'subtitle', text: '5.2 Políticas' },
        { type: 'p', text: 'INDECON S.A.S. revisa anualmente sus políticas en la revisión de la planeación estratégica y las socializa. En este manual se presenta la política integral de calidad y SST.' },
        { type: 'quote', text: 'INDECON S.A.S. confecciona prendas con calidad, elaboradas por personal idóneo y capacitado mediante procesos en mejora continua, reduciendo los riesgos y promoviendo la salud en el trabajo, cumpliendo con los requisitos legales y superando las expectativas de nuestros clientes, con una dirección comprometida con el medio ambiente y el bienestar de sus colaboradores.', author: 'Política Integral de Calidad y Seguridad y Salud en el Trabajo' },
        { type: 'p', text: 'INDECON asume la responsabilidad de proteger la salud y la seguridad de todos los trabajadores, independientemente de su vinculación laboral, en los diferentes ambientes de trabajo; por tanto, mantiene condiciones seguras y saludables en los lugares de trabajo.' },
        { type: 'p', text: 'El responsable asignado por la empresa para liderar el desarrollo del sistema de seguridad y salud en el trabajo cuenta con el apoyo de la alta gerencia, el COPASST y los trabajadores en general, mediante su compromiso con las actividades de seguridad y salud en el trabajo.' },
        { type: 'p', text: 'Existe un firme compromiso de cumplir con la legislación colombiana en seguridad y salud en el trabajo establecida por el Ministerio del Trabajo y de otra índole que haya suscrito INDECON.' },
        { type: 'p', text: 'Para el cumplimiento de esta política y el logro de los objetivos, la alta dirección orientará permanentemente sus esfuerzos y destinará los recursos físicos, económicos y de talento humano requeridos para la oportuna identificación, valoración e intervención de los peligros que puedan generar accidentes de trabajo, enfermedades laborales y emergencias, así como los necesarios para el desarrollo efectivo de actividades y programas que fortalezcan la eficiencia de los trabajadores, la competitividad y la buena imagen organizacional.' },
        { type: 'callout', text: 'Firma: Margarita Milena Ramírez — Representante legal · Revisión y actualización: 25/01/2025. Consulta todas las políticas en el acceso "Políticas" del Inicio.' },

        { type: 'subtitle', text: '5.3 Roles, responsabilidades y autoridad en la organización' },
        { type: 'p', text: '5.3.1 Responsable del SIG. La gerencia, a través de acta de gerencia, asigna al profesional de SG-SST como responsable de liderar el sistema de gestión de seguridad y salud en el trabajo, y al apoyo de calidad para el sistema de gestión de calidad, definiendo funciones, responsabilidades y estrategias orientadas a afianzar la misión, el aseguramiento de la sostenibilidad, la modernización y la calidad en el modelo sistémico, a través de una gestión de control, aprovisionamiento de recursos y seguimiento a la gestión.' },
        { type: 'p', text: 'Las funciones, responsabilidades, autoridades, rendición de cuentas, formación y competencias para cada rol se encuentran definidas en la Matriz de rendición de cuentas del SIG, donde se especifican las relacionadas con el SG-SST y demás procesos de gestión.' },
        { type: 'p', text: '5.3.2 Estructura organizacional. La responsabilidad y autoridad de todas las personas vinculadas está establecida en los perfiles de cargo descritos en el PROFESIOGRAMA IN-GH-01. La interrelación y las líneas de autoridad de todas las áreas aparecen en el organigrama.' },
        { type: 'image', src: '/organigrama-indecon.png', alt: 'Organigrama INDECON S.A.S.', caption: 'Organigrama INDECON S.A.S.' },

        { type: 'subtitle', text: '5.4 Consulta y participación de los trabajadores — Comunicación' },
        { type: 'p', text: '5.4.1 Se definen los medios de comunicación interna y externa, además de la participación y consulta de los trabajadores frente a los riesgos, controles e investigación de incidentes y accidentes, en el procedimiento de comunicación. INDECON cuenta con diferentes estrategias de consulta y participación:' },
        {
          type: 'list',
          items: [
            'Reporte de incidentes de trabajo, condiciones y actos inseguros mediante: formato de registro de situación de emergencia, formato de reporte de condiciones y actos inseguros y el correo SSSTINDECON.SAS@GMAIL.COM.',
            'Reporte de situaciones relacionadas con acoso laboral ante el Comité de Convivencia.',
            'Comunicaciones pertinentes a las partes interesadas como PQRS.',
            'Las PQRS se direccionan al responsable de SST, gerente o líder de producción; se clasifican y asignan según el caso, identificando la solicitud, el responsable de dar curso y respuesta, fecha y hora de recibida y resuelta, y el tratamiento dado.',
            'La comunicación externa con contratistas se realiza según lo declarado en el instructivo de requisitos en seguridad y salud en el trabajo y condiciones de contratación.',
            'Los cambios efectuados en relación con las condiciones de salud y seguridad del trabajo se actualizan.',
          ],
        },
        { type: 'p', text: '5.4.2 Investigación de accidente de trabajo. INDECON diseñó una GUÍA COMITÉ INVESTIGADOR de reporte de incidentes y accidentes de trabajo, cuyo objetivo es orientar sobre la forma de reportar oportuna y debidamente los incidentes de trabajo. Para todos los accidentes de trabajo se establecen acciones preventivas, correctivas y de mejora, con seguimiento mediante la herramienta ACCIONES DE MEJORA para los incidentes considerados graves según la Resolución 1401 de 2007, artículo 3.' },
        { type: 'callout', text: 'Ver indicadores de accidentalidad y enfermedad laboral · Ver instructivo de reporte de investigación de incidentes.' },
        { type: 'p', text: '5.4.3 Reporte de actos y condiciones inseguras. Se cuenta con el formato de reporte de actos y condiciones inseguras, cuyo objetivo es que el personal reporte las condiciones inseguras identificadas en el área de trabajo que puedan generar accidentes y enfermedades. Cualquier persona que identifique el riesgo puede realizar este reporte diligenciando el formato.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'planificacion',
      num: '6',
      title: 'Planificación',
      blocks: [
        { type: 'p', text: 'La planificación se garantiza con la definición de los procesos estratégicos, misionales y operativos, que dan respuesta a cada uno de los requisitos de la norma ISO 9001, el Decreto 1072, los requisitos BASC, la legislación, los requisitos del cliente y los establecidos por la organización.' },
        { type: 'subtitle', text: '6.1 Acciones para abordar riesgos y oportunidades' },
        { type: 'p', text: 'Para planificar las acciones que abordan los aspectos de seguridad y salud en el trabajo, requisitos legales y otros requisitos, riesgos y oportunidades identificados en el contexto organizacional, INDECON implementa Acciones de Mejora, orientadas por el procedimiento de mejoramiento para la formulación, seguimiento y medición de planes de acción según las siguientes fuentes:' },
        {
          type: 'table',
          headers: ['Fuente de riesgo y oportunidad', 'Herramienta'],
          rows: [
            ['Revisión por la dirección', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Revisión de indicadores de gestión', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Resultados de auditorías internas y externas ISO 9001, BASC', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Resultado de la evaluación de la política y objetivos del SIG', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Identificación de requisitos legales y suscritos', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Evaluación de cumplimiento de la normatividad legal del SG-SST', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Evaluación de cumplimiento de la matriz de rendición de cuentas', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Resultado de la evaluación de los estándares mínimos de SST', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Evaluación y valoración de la matriz de peligros y determinación de controles', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Resultado de la evaluación de los programas del SG-SST', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Calificación de enfermedades laborales y accidentes de trabajo graves', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Resultados de las mediciones higiénicas', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Inspecciones de seguridad y salud en el trabajo', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Resultados de la evaluación de los simulacros', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Gestión del cambio', 'Sistema de seguimiento a Acciones de Mejora'],
            ['Respuesta rápida — revisión de producto no conforme', 'Sistema de seguimiento a Acciones de Mejora'],
          ],
        },
        { type: 'p', text: 'Para la implementación de las acciones de mejora se usa la metodología de matriz de riesgo GTC 45, que permite identificar y evaluar riesgos, y se desarrollan las siguientes matrices: riesgos de procesos, riesgos de requisitos BASC y matriz de riesgos SST.' },

        { type: 'subtitle', text: '6.1.1 Identificación de peligros, valoración de los riesgos y determinación de controles' },
        { type: 'p', text: 'Para prevenir accidentes y enfermedades laborales se ha establecido una metodología para la identificación de peligros, valoración de riesgos y determinación de controles, con el fin de establecer los controles necesarios para su mitigación (ver procedimiento de identificación de peligros). INDECON realizará las medidas de prevención y establecerá controles a:' },
        {
          type: 'list',
          items: [
            'Controles operacionales de mantenimiento a instalaciones, máquinas, equipos y herramientas consideradas críticas (cronograma y/o plan de mantenimiento).',
            'Controles operacionales de gestión de riesgo químico (ver plan de trabajo anual).',
            'Controles operacionales establecidos en la matriz de peligros, resultado de las inspecciones planeadas: infraestructura, elementos de emergencia, botiquines, entre otros.',
            'Controles operacionales asociados al plan estratégico de seguridad vial (ver plan de trabajo anual).',
          ],
        },
        { type: 'subtitle', text: '6.1.2 Evaluación de las oportunidades para el SIG' },
        { type: 'p', text: 'Las oportunidades permiten mejorar el desempeño de la seguridad y salud en el trabajo y el mejoramiento continuo de los procesos, teniendo en cuenta los cambios de la empresa, la política, los procesos o las actividades. INDECON desarrolla la metodología DOFA, con la que realiza el análisis completo de la organización para definir las estrategias de cada periodo.' },
        { type: 'subtitle', text: '6.1.3 Determinación de los requisitos legales y otros requisitos' },
        { type: 'p', text: 'INDECON tiene establecido un procedimiento para la identificación y evaluación de requisitos legales y una matriz de requisitos legales cuya finalidad es identificar, registrar, acceder, actualizar, evaluar y comunicar dichos requisitos, en el formato Matriz de Normatividad Legal.' },
        { type: 'subtitle', text: '6.1.4 Medidas de prevención y control del SG-SST' },
        { type: 'p', text: 'De acuerdo con la normatividad vigente, se implementan medidas de prevención y control de la seguridad y salud en el trabajo con énfasis en higiene y seguridad industrial para una adecuada gestión del riesgo, y se desarrollan acciones de vigilancia de la salud que garantizan condiciones de salud y seguridad. Su objeto es la identificación, reconocimiento, evaluación y control de los factores laborales y de salud que se originen en los lugares de trabajo y puedan afectar la salud de los trabajadores (Ley 1016 de 1989).' },
        { type: 'subtitle', text: '6.1.5 Diagnóstico de condiciones de salud' },
        { type: 'p', text: 'Mediante la aplicación de exámenes médicos ocupacionales, en triangulación con el reporte de ausentismos por incapacidad, accidentes y enfermedad laboral, y diagnósticos con énfasis psicosocial y desórdenes músculo-esqueléticos, entre otros, se diagnostican las condiciones de salud y se definen los programas de intervención a nivel de promoción y prevención (ver programa de promoción y prevención).' },
        { type: 'p', text: 'Los exámenes médicos ocupacionales de ingreso, periódicos y de egreso se realizan a todo el personal vinculado de tiempo completo y medio tiempo, y al personal con contrato a término fijo. Su realización está a cargo de la líder de SG-SST. Los contratistas deben realizarse los exámenes de ingreso y asumir su costo, de conformidad con el Decreto 0723 de 2013 (ver profesiograma).' },
        { type: 'p', text: 'Los exámenes periódicos se realizan cada dos (2) años y los de egreso una vez se desvincule el trabajador, quien tiene cinco (5) días hábiles para realizárselos.' },
        { type: 'p', text: 'Diagnóstico de condiciones de trabajo: se obtiene a través de la elaboración y análisis de la identificación de peligros, evaluación y control de riesgos, con la participación de los trabajadores.' },
        { type: 'subtitle', text: '6.1.6 Reglamento de higiene y seguridad industrial' },
        { type: 'p', text: 'El Reglamento de Higiene y Seguridad Industrial de INDECON S.A.S. se adopta mediante acta de gerencia. INDECON tiene afiliados a sus colaboradores a la ARL Positiva, con clase de riesgo uno (1).' },

        { type: 'subtitle', text: '6.2 Objetivos del SIG' },
        { type: 'p', text: 'INDECON utiliza la metodología Balanced Scorecard (BSC) o Cuadro de Mando Integral, un modelo de gestión estratégica que permite evaluar el desempeño de manera más integral que solo con indicadores financieros. Se basa en cuatro áreas críticas —desempeño financiero, conocimiento del cliente, procesos internos y aprendizaje y crecimiento—, lo que permite tener una visión global, concretar la misión, visión y valores, mejorar la comunicación interna, optimizar los procesos y tomar decisiones proactivas.' },
        { type: 'p', text: 'Objetivos estratégicos:' },
        { type: 'list', items: OBJETIVOS_ESTRATEGICOS },
        { type: 'p', text: 'Objetivos operativos: son los documentados para el seguimiento específico de los procesos, articulados con los objetivos estratégicos. Hacen referencia a los objetivos de cada proceso del SIG según su nivel: estratégico, misional, de evaluación y de apoyo.' },
        { type: 'p', text: 'Objetivos del SG-SST:' },
        {
          type: 'list',
          items: [
            'Prevenir las condiciones de riesgo que puedan dar origen a accidentes y enfermedades laborales.',
            'Asegurar el cumplimiento de la normatividad legal vigente.',
            'Identificar, evaluar, prevenir, intervenir y realizar seguimiento a los factores de riesgo psicosocial.',
            'Identificar, evaluar, prevenir, intervenir y realizar seguimiento a los desórdenes músculo-esqueléticos.',
            'Fomentar una cultura de autocuidado mediante hábitos de vida saludable, promoviendo la salud y previniendo la enfermedad y las conductas de riesgo.',
            'Asegurar las condiciones de SST a través de la gestión efectiva de planes de mejoramiento.',
            'Fomentar la concienciación del personal y partes interesadas en la promoción de la salud y prevención de enfermedades y accidentes laborales, mediante capacitación y divulgación en SST.',
            'Asegurar la continua identificación y control de emergencias mediante la actualización de planes de emergencia, capacitación de brigadistas y ejecución de simulacros.',
            'Asegurar la implementación documental y evaluación de los requisitos del SG-SST definidos en el Decreto 1072 de 2015 y la Resolución 0312 de 2019.',
            'Asegurar la gestión del riesgo locativo, previniendo la accidentalidad asociada, mediante la implementación, mantenimiento y monitoreo de controles específicos.',
            'Contribuir a lineamientos que prevengan riesgos mecánicos en el proceso de mantenimiento de la bodega de producción, previniendo accidentes en actividades con equipos, máquinas y herramientas.',
          ],
        },
        { type: 'subtitle', text: '6.2.1 Planificación para lograr los objetivos del SG-SST' },
        { type: 'p', text: 'A través de la evaluación inicial y la autoevaluación de los estándares mínimos de SST se obtiene el porcentaje de cumplimiento del SG-SST; con esto se define el plan de trabajo anual y los indicadores de gestión del SG-SST. Con la revisión por la dirección, donde se realiza el análisis DOFA y se revisa el resultado de los objetivos estratégicos, se planifican los objetivos del siguiente periodo y el cuadro de indicadores a revisar periódicamente.' },
        { type: 'p', text: 'INDECON S.A.S. define en el Cuadro de Mando Integral, por procesos y objetivos estratégicos, los indicadores a medir; son socializados anualmente y revisados periódicamente.' },
        { type: 'subtitle', text: '6.2.2 Programas de gestión del SG-SST' },
        { type: 'p', text: 'Se desarrollan los siguientes programas para dar cumplimiento a los objetivos del SG-SST:' },
        {
          type: 'table',
          headers: ['Programa', 'Diseñado y operado por'],
          rows: [
            ['Programa de prevención psicosocial "No estrés mal"', 'Comité de Convivencia'],
            ['Programa de prevención de salud visual "Te veo bien"', 'COPASST'],
            ['Programa de prevención de riesgo cardiovascular "Corazón Garana"', 'COPASST'],
            ['Programa de prevención de desórdenes músculo-esqueléticos "La Mueve"', '—'],
            ['Programa de salud pública "Contágiate, pero de amor propio"', 'Comité de Convivencia'],
            ['Programa de gestión de riesgo biológico "Que no te piquen"', 'COPASST'],
            ['Programa de gestión de riesgo mecánico', '—'],
            ['Plan estratégico de seguridad vial "Muévete seguro"', '—'],
            ['Programa de gestión de riesgo locativo "Que nada te toque"', '—'],
            ['Programa de vigilancia epidemiológica en prevención de desórdenes músculo-esqueléticos', 'Comité de Bienestar Social'],
            ['Programa de vigilancia epidemiológica en prevención de riesgo psicosocial', 'Comité de Convivencia'],
          ],
        },
        { type: 'callout', text: 'En el Cuadro de Mando Integral se describen las estrategias para el cumplimiento de los objetivos estratégicos.' },
        { type: 'subtitle', text: '6.3 Planificación del cambio' },
        { type: 'p', text: 'Trimestralmente se hace seguimiento a los cambios que puedan afectar el sistema al revisar el resultado de cada proceso, y se modifican o ajustan, si es necesario, los diferentes planes (presupuestal, de compras, plan de calidad, sistema de gestión, etc.). Se socializan a través de acta de gerencia y se implementan los cambios.' },
        { type: 'p', text: 'INDECON contempla los cambios que puedan tener impacto sobre sus peligros y riesgos de SST —cambios en la estructura, el personal, el sistema de gestión, los procesos, las actividades, el uso de materiales, etc.—, los cuales se evalúan en la identificación de peligros y riesgos.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'apoyo',
      num: '7',
      title: 'Apoyo',
      blocks: [
        { type: 'subtitle', text: '7.1 Recursos' },
        { type: 'p', text: 'INDECON S.A.S. planifica los recursos proyectando el año inmediatamente anterior y las proyecciones de crecimiento planteadas para el siguiente periodo.' },
        {
          type: 'table',
          headers: ['Recurso', 'Descripción'],
          rows: [
            ['Infraestructura', 'Desarrollados por el proceso de gestión de proveedores, específicamente el procedimiento de mantenimiento que interviene la bodega, equipos y tecnología.'],
            ['Financieros', 'El proceso administrativo y financiero, con la revisoría fiscal, realiza el análisis general de la empresa y proyecta el gasto del periodo siguiente. Cada año se aprueba un presupuesto para la implementación y mejora del sistema.'],
            ['Tecnológicos', 'Apoyados en el proceso de gestión de dirección, que coordina el presupuesto para el mejoramiento continuo de equipos de cómputo, redes y software.'],
            ['Técnicos', 'Programas de capacitación, formación e inducción; exámenes médicos ocupacionales; elementos para el manejo de emergencias, brigadas y brigadistas; adecuación de puestos de trabajo; arreglos locativos; implementación del SIG.'],
            ['Locativos', 'Bodega de 700 m² en un nivel para la actividad productiva y área administrativa en un segundo nivel, además de parqueaderos y área de recreación.'],
            ['Físicos y tecnológicos', 'Medios propios o contratados para el desarrollo de las acciones: instalaciones, muebles, equipos para monitoreo biológico y ambiental, ayudas audiovisuales, entre otros.'],
          ],
        },
        { type: 'p', text: 'Ambiente de trabajo: se mantiene dentro de condiciones satisfactorias para los miembros, de modo que realicen las actividades propias de su cargo con un alto grado de compromiso hacia la organización y el cumplimiento de los requisitos del cliente, con apoyo de los diferentes comités para mejorar la satisfacción laboral.' },
        { type: 'subtitle', text: '7.2 Competencia' },
        { type: 'p', text: 'El proceso de recursos humanos desarrolla las actividades de reclutamiento, selección y vinculación de personal. INDECON cuenta con un profesiograma donde se describen las funciones y la formación ideal para cada cargo; en las hojas de vida se archivan los soportes de formación. Se cuenta con:' },
        {
          type: 'list',
          items: [
            'Profesional en seguridad y salud ocupacional (desde 2014).',
            'Ingeniera industrial especialista en sistemas de gestión ISO 9001 (desde 2009).',
            'Grupo de COPASST.',
            'Brigadistas.',
            'ARL POSITIVA Compañía de Seguros S.A., que asume la atención de los trabajadores en una contingencia laboral.',
            'Médico ocupacional por servicio.',
          ],
        },
        { type: 'subtitle', text: '7.3 Toma de conciencia' },
        { type: 'p', text: 'La organización se asegura de que todos los colaboradores involucrados con los procesos y procedimientos del SIG tengan la competencia necesaria mediante la evaluación de competencias, la inducción y las capacitaciones descritas en el procedimiento de desarrollo del talento humano; las evidencias de formación se encuentran en las hojas de vida.' },
        { type: 'p', text: 'La inducción y reinducción reorientan la integración del empleado a la cultura organizacional en virtud de los cambios en la plataforma estratégica (misión, visión, objetivos organizacionales, comités, brigadas, derechos y deberes, reglamento de higiene, políticas, etc.). Las imparte la gerencia y se realizan dos reinducciones al año.' },
        { type: 'subtitle', text: '7.4 Comunicación' },
        { type: 'p', text: 'La comunicación interna del SG-SST se realiza a través de la página del SIG mediante la publicación de procedimientos, formatos, instructivos y el manual del SIG. En el procedimiento de gestión documental se encuentra la relación de todos los medios documentales; adicionalmente, en las reuniones del COPASST, Comité de Convivencia Laboral, Bienestar Social y capacitaciones se transmite el conocimiento e información de interés (ver matriz de comunicaciones).' },
        { type: 'subtitle', text: '7.5 Información documentada' },
        { type: 'p', text: 'El SIG establece documentos, formatos y registros con códigos que permiten identificar cambios y actualizaciones, mediante un proceso de gestión documental que incluye la guía de seguridad de la información.' },
        { type: 'p', text: '7.5.1 Estructura documental:' },
        {
          type: 'table',
          headers: ['Nivel', 'Descripción'],
          rows: [
            ['Manual de gestión integrado', 'Contiene la estructura del sistema de calidad y del sistema SST.'],
            ['Procesos', 'Caracterización de los 7 procesos del sistema: objetivo, alcance, interrelaciones, formatos relacionados e indicadores de medición.'],
            ['Procedimientos', 'Describen el objetivo, alcance y las actividades a desarrollar con sus responsables.'],
            ['Instructivos, guías y fichas técnicas', 'Describen detalladamente las actividades en tareas: el paso a paso de cada actividad.'],
            ['Formatos', 'Evidencias que se diligencian como soporte del cumplimiento de la ejecución de cada proceso.'],
          ],
        },
        { type: 'p', text: '7.5.2 Control de documentos. Para el control de todos los documentos y datos internos y externos del SIG, la organización tiene establecido el procedimiento de Control de Documentos. Los documentos se identifican con un código único que determina el proceso al que pertenecen:' },
        {
          type: 'table',
          headers: ['Proceso', 'Código'],
          rows: [
            ['Dirección', 'DR'], ['Calidad y Seguridad en el Trabajo', 'SS'], ['Producción', 'PR'],
            ['Comercialización', 'CM'], ['Gestión de Proveedores', 'GP'],
            ['Gestión Administrativa y Financiera', 'GA'], ['Gestión de Talento Humano', 'GT'],
          ],
        },
        {
          type: 'table',
          headers: ['Tipo de documento', 'Código'],
          rows: [
            ['Proceso', 'PS'], ['Procedimiento', 'PC'], ['Instructivo', 'IN'], ['Guía', 'GI'], ['Ficha técnica', 'FT'],
          ],
        },
        { type: 'p', text: '7.5.3 Control de los registros. Para garantizar el adecuado control y conservación de los registros del SIG que evidencian el cumplimiento de los requisitos del cliente, del producto y de la organización, se tiene establecido el procedimiento de Control de Registros. Para su almacenamiento, preservación, legibilidad, conservación y disposición se cuenta con el listado maestro de documentos, que también contempla la información documentada de origen externo.' },
        { type: 'p', text: 'El tiempo de conservación documental es de 2 años en el archivo general y 18 años en el archivo central, para una conservación total de 20 años de los documentos definidos en el listado maestro.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'operacion',
      num: '8',
      title: 'Operación',
      blocks: [
        { type: 'p', text: 'INDECON cuenta con una herramienta gerencial: el Sistema de Gestión de Calidad bajo la norma ISO 9001, con el fin de lograr una organización más eficiente y proactiva, dando cumplimiento a la legislación, al sistema de SST y demás requisitos. El sistema está diseñado a partir de 7 procesos.' },
        { type: 'subtitle', text: '8.1 Planificación y control operacional' },
        { type: 'p', text: 'INDECON ha diseñado para su operatividad instructivos operacionales como:' },
        {
          type: 'list',
          items: [
            'Instructivo para la identificación de peligros, valoración del riesgo y determinación de controles',
            'Instructivo para el reporte de investigación de enfermedad laboral',
            'Instructivo para el reporte de investigación de incidente de trabajo',
            'Instructivo para la identificación y evaluación de requisitos legales y otros requisitos en SST',
            'Instructivo de confecciones',
            'Instructivo de sublimación',
            'Instructivo de prehormado',
            'Instructivo de empaque',
          ],
        },
        { type: 'subtitle', text: '8.2 Requisitos para los productos' },
        { type: 'p', text: 'INDECON tiene establecidas y documentadas las actividades de planeación, ejecución y control de los productos en las caracterizaciones, procedimientos e instructivos, que apuntan al cumplimiento de los requisitos del cliente, de la ISO 9001, del Decreto 1072 y los propios del producto: procedimientos de planeación y programación y de producción.' },
        { type: 'p', text: 'Para asegurar la determinación y el cumplimiento de los requisitos del cliente y la entrega de un producto de excelente calidad, INDECON tiene establecidos los procedimientos de ventas (PR-GC-02) y satisfacción del cliente (PR-GC-01).' },
        { type: 'subtitle', text: '8.3 Diseño y desarrollo' },
        { type: 'p', text: 'Las actividades de diseño y desarrollo están documentadas en las caracterizaciones, procedimientos e instructivos, contando con el plan de diseño y ejecución de diseño, donde se describen los elementos de entrada, resultados, revisión, verificación, validación y control de cambios.' },
        { type: 'p', text: 'El proceso de compras se relaciona directamente con el de diseño; por eso INDECON diseñó el proceso de gestión de proveedores, que contempla la selección, evaluación y seguimiento de proveedores, además de las fichas técnicas de insumos y elementos de protección personal.' },
        { type: 'p', text: 'Para adquirir productos que cumplan los requisitos especificados se estableció el procedimiento de gestión de bienes e insumos (PR-GR-02), con la información de la compra y los criterios de aceptación de los insumos de mayor impacto; la confiabilidad de los proveedores se garantiza con el procedimiento de aseguramiento de proveedores (PR-GR-01).' },
        { type: 'subtitle', text: '8.4 Control de procesos, productos y servicios' },
        { type: 'p', text: 'Se establecen los mecanismos para la producción en condiciones controladas, con seguimiento y control a cada producto e identificación y control del producto no conforme. Se tienen instructivos de trabajo con las características del producto, control de equipos y medidas de SST que garantizan el cumplimiento de la política y los objetivos (ver procedimiento de control del producto no conforme).' },
        { type: 'p', text: 'Control de los dispositivos de seguimiento y medición: los dispositivos de INDECON son metros y reglas que permiten una costura uniforme en sesgos y contornos, pero no son un criterio de calidad que afecte la promesa al cliente. La báscula se usa para controlar el peso de la tela en la compra, sin afectar la calidad de la prenda. La moldería se encuentra en el software, por lo que los moldes no pierden su medida.' },
        { type: 'subtitle', text: 'Preparación y respuesta ante emergencias' },
        { type: 'p', text: 'El plan de preparación y respuesta ante emergencias, encaminado a proteger la integridad de las personas y los bienes materiales, se evidencia en:' },
        { type: 'list', items: ['Plan de emergencias', 'Programación de simulacros', 'Registros de situación de emergencia del simulacro', 'Evaluación de simulacros'] },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'evaluacion',
      num: '9',
      title: 'Evaluación del desempeño',
      blocks: [
        { type: 'subtitle', text: '9.1 Seguimiento, medición, análisis y evaluación del desempeño' },
        { type: 'p', text: 'El seguimiento al SIG se realiza verificando el cumplimiento del plan anual de trabajo del SG-SST, donde se consignan las actividades programadas y su gestión, a través del Informe de Gestión por Procesos y los informes de gestión solicitados, con información cuantitativa y cualitativa sobre el funcionamiento del sistema: cumplimiento de objetivos, efectividad de los controles, reporte de incidentes y enfermedad laboral y cumplimiento de la matriz legal.' },
        { type: 'p', text: 'También mediante el seguimiento a las acciones de mejora y al plan de indicadores anual (Balanced Scorecard). Dentro del SIG se realiza una Encuesta de Satisfacción del Cliente para conocer su percepción sobre el cumplimiento de los requisitos y tomar acciones de mejora.' },
        { type: 'p', text: 'Análisis de datos: se realiza a través de los informes de gestión, donde además de medir los indicadores de cada proceso se hace seguimiento a su comportamiento en cada periodo, para verificar su evolución y determinar situaciones de mejora.' },
        { type: 'subtitle', text: '9.2 Auditoría interna' },
        { type: 'p', text: 'La gerencia lidera el grupo de auditores internos, preparándolos para verificar el cumplimiento de todos los requisitos del SIG y su eficacia. Las auditorías internas se ejecutan según el procedimiento de Auditorías Internas, cuyo objetivo es realizar una evaluación sistemática, independiente y documentada para obtener evidencias y determinar el grado de cumplimiento.' },
        { type: 'subtitle', text: '9.3 Revisión por la dirección' },
        { type: 'p', text: 'Cada inicio de año la junta directiva realiza la reunión de rendición de cuentas y evalúa todo el sistema; además, desarrolla la revisión por la dirección evaluando todos los criterios del SIG, partiendo del cumplimiento de los requisitos del SG-SST. Solicita informe a cada proceso y hace partícipes a todos los líderes para evaluar:' },
        {
          type: 'list',
          items: [
            'Política y objetivos del SIG.',
            'Estado de las acciones de revisiones por la dirección previas.',
            'Requisitos legales y otros requisitos.',
            'Riesgos y oportunidades.',
            'Actividades y operaciones relacionadas con los peligros, los riesgos y la determinación de controles.',
            'Progreso en el logro de los objetivos de SST.',
            'Eficacia de los controles operacionales y de otros controles.',
            'Métodos de seguimiento, medición, análisis y evaluación del desempeño.',
            'Criterios frente a los que la organización evaluará el desempeño del SIG.',
            'Seguimiento y medición del SIG.',
          ],
        },
        { type: 'p', text: 'Esta revisión genera acciones correctivas y preventivas para la mejora continua del sistema. La dirección revisa anualmente el SIG determinando su adecuación, conveniencia y eficacia frente a la legislación, los requisitos del SG-SST, del SGC, del cliente y los propios, como se describe en el procedimiento de Revisión por la Dirección.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'mejora',
      num: '10',
      title: 'Mejora',
      blocks: [
        { type: 'subtitle', text: '10.1 Generalidades de la mejora' },
        { type: 'p', text: 'INDECON cuenta con el proceso de Mejoramiento Continuo, donde se identifica la oportunidad de mejora, el análisis de causa, el responsable y las acciones a implementar, evidenciando el cierre oportuno o no de cada acción. Los informes para la revisión por la dirección son la base para el mejoramiento continuo: en ellos se recopila y analiza toda la información pertinente a los procesos y al SIG, y con este análisis se determinan los cambios y modificaciones necesarios.' },
        { type: 'subtitle', text: '10.2 Incidentes, no conformidades y acciones correctivas' },
        { type: 'p', text: 'Para reaccionar ante el incumplimiento de un requisito del SG-SST, del SGC o de ley, los incidentes, no conformidades y acciones correctivas se registran en el procedimiento de gestión de mejora, dejando la trazabilidad y evitando que vuelvan a ocurrir por las mismas causas.' },
        { type: 'callout', text: 'Las acciones de mejora se gestionan en el módulo Mejoramiento Continuo del SIG.' },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'comites',
      num: '11',
      title: 'Comités asociados al SIG',
      blocks: [
        {
          type: 'cards',
          items: [
            { title: 'COPASST', text: 'Hace seguimiento al desarrollo del SG-SST; participa en la revisión y aprobación del programa de capacitación y del plan de trabajo anual, en las inspecciones para la identificación de peligros y seguimiento de controles, y en la planificación de la auditoría interna anual; investiga y hace seguimiento a las acciones de los accidentes de trabajo. (Ver guía del COPASST)' },
            { title: 'Comité de Convivencia Laboral', text: 'Tiene como objetivo primordial la prevención y solución de situaciones causadas por conductas de acoso laboral. Busca generar una conciencia colectiva que promueva el trabajo en condiciones dignas y armónicas, con un buen ambiente laboral y respeto por los derechos de los colaboradores. (Ver guía del comité)' },
            { title: 'Comité de Bienestar Social', text: 'Vela por el bienestar de los colaboradores: celebra cumpleaños y fechas especiales y dinamiza la actividad productiva generando calidad de vida para todos los integrantes, buscando sacar lo mejor de cada ser. (Ver guía del comité)' },
          ],
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────
    {
      id: 'cambios',
      num: '12',
      title: 'Control de cambios',
      blocks: [
        {
          type: 'table',
          headers: ['Versión', 'Fecha', 'Cambio', 'Responsable'],
          rows: [
            ['02', '10/02/2015', 'Se unifica el manual de calidad con términos y requisitos de la OHSAS 18001, relacionando los procedimientos obligatorios de esta norma.', 'Margarita Ramírez'],
            ['03', '05/01/2025', 'Unificación del manual de calidad con los requisitos del SG-SST del Decreto 1072, generando el manual integrado de gestión.', 'Margarita Ramírez'],
            ['03', 'Sep/2026', 'Se complementa con requisitos BASC.', 'Margarita Ramírez'],
          ],
        },
        { type: 'callout', text: 'Anexo: Matriz de correlación de normas vs. procesos (archivo de anexos).' },
      ],
    },
  ],
};
