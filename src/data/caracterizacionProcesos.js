// src/data/caracterizacionProcesos.js
// v2 (oct 2026) — Contenido del "ANEXO 1 CARACTERIZACIÓN DE PROCESOS" (Manual MC-DP-01):
// objetivo, alcance, responsable, entradas, actividades PHVA, salidas, requisitos,
// seguimiento y medición, recursos y documentos externos de los 7 procesos.
//
// Los documentos internos (procedimientos, manuales, guías, instructivos, planes y
// registros) NO se toman del anexo: Home.jsx los consulta EN VIVO en Gestión
// Documental (solo publicados), así el cliente ve únicamente lo que realmente existe.
// "documentosExternos" sí viene del anexo (leyes, normas, reglamentos sin código).

export const CARACTERIZACION_PROCESOS = {
  DP: {
    nombre: "Gestión de Dirección y Planeación Estratégica",
    area: "Proceso Estratégico",
    responsable: "Gerente",
    objetivo: "Definir el direccionamiento estratégico y su evaluación, manteniendo el sistema de gestión integrado con los requisitos legales, BASC, ISO 9001, SST, del cliente y demás que INDECON considere.",
    alcance: "Desde la evaluación de los criterios iso 9001, BASC, SST y la planificación para su cimplimiento a lo largo de toda la organzacion",
    entradas: [
      "ENTES: leyes, decretos, normas",
      "G. Clientes: Estudio de necesidades y expectativas del cliente; Informe de satisfacción del cliente, informe de ventas. Informe de QRSF, Novedades de exportación.",
      "G. administrativa y financiera: Estado de cxc y cxp, Estados financieros de la vigencia, novedades de seguridad física, riesgos, novedades en carga, cumpliemiento BASC, Evaluacion proveedores críticos, incidentes en ciberseguridad, conocimiento de asociado critico. cumplimiento del plan de mantenimiento de equipos de computo.; Matriz de criticidad de la información; Manual de seguridad física; Control de incidentes de ciberseguridad; Cronograma de mantenimiento de la información",
      "G. de Calidad y SST: Gestión de copast, comité investigador, Cumplimiento del plan de sst, indicadores de incidentes accidentes, ausentismo laboral, acciones de mejoramiento, novedades de: control de documentos, actos inseguros, control y uso de epp, inspecciones de sst y simulacros, plan de trabajo anual",
      "G. de Proveedores: Informe de evaluación de proveedores, consumos promedios por insumo y proveedor, cumplimiento del plan de mantenimiento maquinaria e infraestructura.",
      "G. Talento humano: Informe de evaluación de competencias, Participación y consulta, Informe de gestión comité de bienestar y de convivencia. Informe del clima laboral. cumplimiento de visitas domiciliarias y exámenes alcohol y drogas, plan de inducción, cumplimeinto de capacitación y formación de auditores. Relación de Sugerencias"
    ],
    actividades: {
      planear: [
        "Planear presupuesto",
        "Planear seguimiento al sistema (auditorias y revisión de indicadores, revisión por direccion)",
        "Planear cambios del sistema",
        "Planear cumplimeiento de legislación"
      ],
      hacer: [
        "Analizar informes, encuestas y evaluaciones.",
        "Hacer análisis DOFA",
        "Definir la misión, la visión, los valores, objetivos, políticas y estrategias",
        "Definir las metas, indicadores y la frecuencia de revisión",
        "Definir y proyectar el presupuesto y las inversiones",
        "Analizar, actualizar matriz legal y dar cumplimiento a ella.",
        "Revisar resultados de satisfacción del cliente, evaluación de proveedores, evaluación del personal, quejas y reclamos, incidentes, plan de emergencias, participación y consulta",
        "Apoyar los procesos en la construcción de mapas de riesgos en la cadena de suministros para exportaciones, riesgos de procesos y riesgos de seguridad y salud"
      ],
      verificar: [
        "Hacer seguimiento periódico al desempeño del sistema una vez al año",
        "Hacer auditorías internas una vez al año",
        "Hacer seguimiento procesos trimestralmente",
        "Aplicar evaluación de requisitos ISO Y BASC"
      ],
      actuar: [
        "Implementar acciones de mejora (estandarización de procesos)",
        "Asegurar la generación y cierre de planes de mejoramiento con análisis de causas"
      ]
    },
    salidas: [
      "Todos los procesos",
      "Plataforma estratégica, estructura de procesos (contexto empresarial)",
      "Políticas internas",
      "Cuadro de mando integral",
      "Reglamento interno de trabajo",
      "Manual integrado de sig",
      "Red de proceso Actulizado",
      "Manual de funciones",
      "Matriz de riesgos de procesos",
      "Matriz de partes interesadas",
      "Junta directiva: Informe anual gerencial; Rendición de cuentas; Plan de acción; Actas de revisión por la direccion; Resultados de auditorias, Matriz legal, Plan de auditorias; Plan anual de dirección"
    ],
    requisitos: [
      "ISO 9001: 4,5,6,9",
      "NORMA BASC: 4, 5,6,8",
      "LEGALES: Matriz de legalidad",
      "CLIENTES: expectativas. Necesidades"
    ],
    seguimientoMedicion: [
      "Cumplimiento plan de dirección",
      "Cumplimiento del plan de indicadores",
      "Cumplimiento matriz de legalidad",
      "No conformidad del sistema",
      "Cumplimientos objetivos BASC"
    ],
    recursos: [
      "El Gerente aprueba el presupuesto de ingresos, gastos, inversiones y de capital humano"
    ],
    documentosExternos: [
      "Reglamento interno de trabajo",
      "Lesiglacion colombiana",
      "Codigo sustantivo de trabajo"
    ]
  },
  GS: {
    nombre: "Gestión de Calidad y Seguridad y Salud en el Trabajo",
    area: "Proceso Estratégico",
    responsable: "Profesional en SG-SST",
    objetivo: "Mejorar continuamente la eficacia del Sistema de Gestión Integrado, mediante la aplicación de las políticas y los objetivos de la organización manteniendo actualizada la documentación, implementando acciones de mejoramiento, disminuyendo la accidentalidad, y el ausentismo laboral y previniendo enfermedades.",
    alcance: "Aplica desde la evaluación de los criterios sst decreto 1072, hasta su planificación y ejecución del mismo aplcia para todos los procesos de la empresa",
    entradas: [
      "Gestión de Dirección: Plataforma estratégica, estructura de procesos (contexto empresarial); Políticas internas; Cuadro de mando integral; Reglamento interno de trabajo; Manual integrado de sig; Red de proceso Actulizado; Manual de funciones; Matriz de riesgos de procesos; Matriz de partes interesadas",
      "Gestión de T Humano: Manual de induccion",
      "Gestión de producción: Instructivos de operacion",
      "Gestión de proveedores: Ficha técnica de insumos /EPP",
      "Todos los procesos: Reporte de acciones de mejoramiento; Reporte de actos inseguros; Reporte de incidentes/accidentes",
      "Gestión administración y financiera: Matriz de criticidad de la información; Manual de seguridad física; Control de incidentes de ciberseguridad; Cronograma de mantenimiento de la información"
    ],
    actividades: {
      planear: [
        "Planear las actividades de implementación y mejora del sistema de gestión integrado",
        "Planificar programas de seguridad y salud en el trabajo"
      ],
      hacer: [
        "Administrar los documentos del sistema de gestión (controlar los registros y documentos)",
        "Generar informe de desempeño del proceso",
        "Consolidar informes de gestión para evaluar la eficiencia.",
        "Desarrollar el programa de seguridad y salud en el trabajo",
        "Mantener activos los diferentes comités",
        "Hacer seguimiento a las acciones de mejora de toda la empresa",
        "Hacer evaluación de requisitos SST"
      ],
      verificar: [
        "El cumplimiento del plan de calidad y el programa de seguridad y salud en el trabajo",
        "Cumplimiento de actividades de copasst y comité de investigación de accidentes e incidentes.",
        "Cumplimiento de la utilización correcta de la documentación controlada del SIG"
      ],
      actuar: [
        "Establecer acciones de mejora",
        "Generar necesidad de capacitación y actualización de los subprogramas de seguridad y salud en el trabajo",
        "Apoyar la formulación de acciones de mejora hasta el cierre de los mismo."
      ]
    },
    salidas: [
      "Gestión de la Dirección: Gestión de copast, comité investigador, Cumplimiento del plan de sst, indicadores de incidentes accidentes, ausentismo laboral, acciones de mejoramiento, novedades de: control de documentos, actos inseguros, control y uso de epp, inspecciones de sst y simulacros; Plan de trabajo anual.",
      "Todos los procesos: Matriz de peligros; Plan de capacitación; Plan de emergencia; Retroalimentación de simulacros; Conformacion de brigadas; Reglamento de higiene y seguridad",
      "Gestión de t Humano: Necesidades de capacitación; Examenes ocupacionales",
      "Gestion de produccion: Protocolos por operación; Plan de calidad",
      "Personal: Entrega de EPP, conformación de brigadas y capacitación; ARL; Evidencias de implementación SIG"
    ],
    requisitos: [
      "ISO 9001: 10, 7.5",
      "Norma BASC: 7, 9",
      "LEGALES: Matriz de legalidad (Decreto 1072 sgsst)"
    ],
    seguimientoMedicion: [],
    recursos: [
      "Apoyo de calidad, auxiliar administrativo, Presupuesto para el mejoramiento continuo."
    ],
    documentosExternos: [
      "Manual Integrado de gestión",
      "Reglamento de Higiene y seguridad industria"
    ]
  },
  GP: {
    nombre: "Gestión de Producción",
    area: "Proceso Misional",
    responsable: "Subgerente",
    objetivo: "Garantizar la productividad, calidad, y suministro oportuno a través del diseño, planeación, programación, ejecución y control de los procesos productivos, seguridad en toda la cadena de suministro, cumpliendo las especificaciones técnicas y expectativa de los clientes.",
    alcance: "Aplica desde la toma de expectativas de nuevos mercados y tendencias, necesidad de bodega hasta la entrega de las prendas terminadas y empacadas.",
    entradas: [
      "Gestión de Dirección: Plataforma estratégica, estructura de procesos (contexto empresarial); Políticas internas; Cuadro de mando integral; Reglamento interno de trabajo; Manual integrado de sig; Red de proceso Actulizado; Manual de funciones; Matriz de riesgos de procesos; Matriz de partes interesadas",
      "Gestión de calidad y SST",
      "Protocolos por operación",
      "Plan de calidad",
      "Matriz de peligros",
      "Plan de capacitación",
      "Plan de emergencia",
      "Retroalimentación de simulacros",
      "Conformacion de brigadas",
      "Reglamento de higiene y seguridad",
      "Gestión de clientes: Estudio de necesidades y expectativas del cliente.; Consolidado de pedidos; Inventario de producto terminado; Catalogo y fotos de inventario disponible",
      "Gestión de proveedores: Insumos, maquinaria y equipo e infraesructura; Plan de mantenimiento",
      "Gestión Humana",
      "Personal competente",
      "Gestion administrativa y financiera: Matriz de criticidad de la información; Manual de seguridad física; Control de incidentes de ciberseguridad; Cronograma de mantenimiento de la información"
    ],
    actividades: {
      planear: [
        "Planear la colección de cada periodo (revisión, verificación y validación)",
        "Planear y programar la producción de prehormado, de sublimación de corte y confección.",
        "Planear la necesidad de insumos y materia prima, maquinaria, personal."
      ],
      hacer: [
        "Hacer los moldes y escalarlos",
        "Sacar prototipos- muestras físicas",
        "Escalar los moldes",
        "Realizar fichas técnicas",
        "Realiza costeo del producto",
        "Crear diseños graficos",
        "Prehormar copas",
        "Realizar corte de telas",
        "Sublimar telas",
        "Confeccionar las prendas",
        "Revisar y empacar prendas",
        "Generar informe de desempeño de proceso",
        "Manterner el sistema actualizado",
        "Dar inspección especifica del cargo"
      ],
      verificar: [
        "Ficha técnica de producto",
        "Cumplimiento del programa de producción",
        "Actividades subcontratadas",
        "Instructivos de trabajo y normas de seguridad",
        "Revisar, verificar y validar el diseño y el desarrollo",
        "Controlar los cambios del diseño y desarrollo",
        "Controlar el producto no conforme"
      ],
      actuar: [
        "Implementar acciones de mejora en moldes y proceso de confección",
        "Reprogramar la producción"
      ]
    },
    salidas: [
      "Gestión administrativa y financiera: Inventario de producto en proceso; Relación de horas extras y permisos, ausencia, Novedades de nomina",
      "Gestión Humana: Necesidad de capacitación y de personal; Solicitud de llamados de atención; Cumplimiento inducción especifica",
      "Gestión de proveedores: Requerimientos de insumos, de maquinaria y equipos, y de mantenimiento.",
      "Gestión de clientes: Muestras físicas; Producción; Listado de precios",
      "Gestión de dirección: Informe de gestión y cumplimiento de indicadores"
    ],
    requisitos: [
      "ISO9001:8,7.1",
      "Estandares BASC: 2,3",
      "LEGALES: Matriz de legalidad",
      "Clientes: en las encuestas de satisfaccion, sugerencias y orden de pedido"
    ],
    seguimientoMedicion: [
      "% de eficiencia",
      "% de producto no conforme"
    ],
    recursos: [
      "Apoyo operativo, líder de producción, apoyo logístico, líder de calidad, presupuesto de inversión en instalación, maquinaria y herramienta."
    ],
    documentosExternos: [
      "Manual integrado de gestion",
      "Procedimientos",
      "Fichas técnicas",
      "Tendencias año vigente",
      "Manual busint"
    ]
  },
  GC: {
    nombre: "Gestión de Clientes",
    area: "Proceso Misional",
    responsable: "Gerente",
    objetivo: "Promocionar y comercializar eficientemente los trajes de baño, asegurando la satisfacción del cliente y el cumplimiento de requisitos nacionales e internacionales y los objetivos comerciales",
    alcance: "Va desde el análisis del mercado hasta la evaluación de satisfacción del cliente asegurando siempre la cadena de suministro hasta la entrega al cliente",
    entradas: [
      "Cliente: necesidad y expectativa",
      "Gestión de Dirección: Plataforma estratégica, estructura de procesos (contexto empresarial); Políticas internas; Cuadro de mando integral; Reglamento interno de trabajo; Manual integrado de sig; Red de proceso Actulizado; Manual de funciones; Matriz de riesgos de procesos; Matriz de partes interesadas",
      "Gestión de calidad y SST: Matriz de peligros; Plan de capacitación; Plan de emergencia; Retroalimentación de simulacros; Conformacion de brigadas; Reglamento de higiene y seguridad",
      "Gestión de producción: Muestras físicas; Producción; Listado de precios",
      "Gestión de proveedores: Custodia y disponibilidad de material de empaque; Seguridad en la estantería y canastan en excelente estado",
      "Gestión administrativa y financiera: Matriz de criticidad de la información; Manual de seguridad física; Control de incidentes de ciberseguridad; Cronograma de mantenimiento de la información; Notas contables; Instrucciones para controlar la carga de exportación; Instrucciones para la seguirdad"
    ],
    actividades: {
      planear: [
        "Planear ventas en el año",
        "Planear estrategias de mercadeo y ventas",
        "Planear la entrega de pedidos",
        "Planear inclusion en nuevos mercados"
      ],
      hacer: [
        "Analizar la percepción del cliente aplicando la encuesta",
        "Gestionar quejas y reclamos -DEVOLUCIONES",
        "Entregar de pedidos al cliente",
        "Generar informe de desempeño de proceso",
        "Realizar catalogo y mantener actualizado.",
        "Mantener inventario producto terminado",
        "Hacer lista de empaque, y asegurar la carga hasta el cliente internacional",
        "Coordinar transportadora de mercancía"
      ],
      verificar: [
        "Seguimiento a las órdenes de pedido",
        "Seguimiento a las devoluciones",
        "Grado de satisfacción del cliente",
        "Inspeccionar vehiculo y carga hasta el fin"
      ],
      actuar: [
        "Tomar acciones de mejoramiento",
        "Reportar inconsistencia en carga"
      ]
    },
    salidas: [
      "Gestión de Dirección: Informe de Satisfacción del cliente, Estudio de necesidades y expectativas del cliente, informe de ventas. Informe de QRSF, Novedades de exportación",
      "Gestion de producción",
      "Estudio de necesidades y expectativas del cliente.",
      "Consolidado de pedidos",
      "Inventario de producto terminado",
      "Catalogo y fotos de inventario disponible",
      "Gestion administrativa y financiera: Inventario de producto terminado; Orden de salida; devoluciones; lista de empaque de exportación; inspección de vehiculo y despacho seguro",
      "Clientes y asesores comerciales: Catalogo de disponibles; Estado de pedidos; Encuesta de satisfacción; Plan de mercadeo"
    ],
    requisitos: [
      "ISO 9001:4.2, 8.2,8.5,9.1.2",
      "ESTANDARES BASC: 2",
      "CLIENTE: Encuestas de satisfacción, QRSF",
      "LEGALES: Matriz de legalidad"
    ],
    seguimientoMedicion: [
      "Índice de satisfacción del cliente",
      "Crecimiento en ventas",
      "% de no despachados",
      "% de devoluciones",
      "Conformidad de unidades de carga"
    ],
    recursos: [
      "Líder de gestión, apoyo logístico, apoyo en ventas, presupuesto para estrategias de mercadeo, transporte, comisiones, encuestas de satisfacción, estanterías de bodega, material de embalaje, computador con base de datos para clientes y manejo de kárdex de producto terminado"
    ],
    documentosExternos: [
      "Manual integrado de gestión",
      "Matriz de partes interesadas",
      "Reglamentos internos"
    ]
  },
  GR: {
    nombre: "Gestión de Proveedores",
    area: "Proceso de Apoyo",
    responsable: "Gerente",
    objetivo: "Seleccionar, evaluar, y contratar proveedores confiables y negociaciones rentables y seguras que garanticen la disposición de insumos, bienes, materiales y servicios para el desarrollo diario de las actividades de la empresa.",
    alcance: "Aplica para materia prima, insumos, elementos de dotación y protección, material de empaque, maquinaria, equipos, softaware, infraestructura, transporte y su mantenimiento.",
    entradas: [
      "Gestión de Dirección: Plataforma estratégica, estructura de procesos (contexto empresarial); Políticas internas; Cuadro de mando integral; Reglamento interno de trabajo; Manual integrado de sig; Red de proceso Actulizado; Manual de funciones; Matriz de riesgos de procesos",
      "Gestión de calidad y SST: Matriz de peligros; Plan de capacitación; Plan de emergencia; Retroalimentación de simulacros; Conformacion de brigadas; Reglamento de higiene y seguridad",
      "Gestión de producción: Requerimientos de insumos, de maquinaria y equipos, de mantenimiento.",
      "Gestión de calidad y sst: Matriz de requisitos de seguridad y salud en el trabajo de productos, bienes y servicios",
      "Gestión administrativa y financiera: Matriz de criticidad de la información; Manual de seguridad física; Control de incidentes de ciberseguridad; Cronograma de mantenimiento de la información"
    ],
    actividades: {
      planear: [
        "Planear y programar las compras",
        "Planear y Programar la evaluación de proveedores",
        "Planear y Programar mantenimiento maquinaria, equipo e infraestructura."
      ],
      hacer: [
        "Recibir, identificar y almacenar bienes e insumos y verificar el cumplimento de requisitos de matriz de sst",
        "Recibir producto propiedad del cliente, Inspeccionar, Identificar, distribuir y conservar",
        "Realizar mantenimiento rutinario y preventivo",
        "Hacer y actualizar hoja de vida de maquinaria, herramienta y equipos",
        "Realizar inventario de insumos y materia prima, maquinaria y herramienta.",
        "Entregar insumos",
        "Realizar selección y evaluación de proveedores",
        "Realizar revisión periódica de infraestructura y tomar acciones."
      ],
      verificar: [
        "Verificar el pedido realizado con la mercancía recibida (factura, precio, cantidad, calidad)",
        "Verificar condiciones comerciales",
        "Verificar existencia de insumos y cumplimiento del stock mínimo",
        "Aplicar inspección de insumo si es critico",
        "Verificar cumplimiento de planes de compras, mantenimiento",
        "Realizar evaluación de proveedores"
      ],
      actuar: [
        "Realizar ajuste a las negociaciones con proveedores.",
        "Rechazar los insumos y bienes que no cumplan con las especificaciones generando pnc.",
        "Realizar acciones de mejoramiento"
      ]
    },
    salidas: [
      "Gestión de dirección: Informe de selección y evaluación de proveedores, necesidad de mantenimeinto maquinaria e infraestructura",
      "Gestión calidad y sst: EPP; Ficha técnica de insumo",
      "Gestión administrativa y financiera: Plan de compras e inversiones; Inventarios de insumos, activos fijos; Orden de pedido; Plan de mantenimiento; Elementos de seguridad, cámaras, carnet",
      "Gestión de producción: Novedad en insumo; Insumos, maquinaria y equipo e infraestructura disponible",
      "Gestión humana: Necesidades de capacitación; Dotacion del personal",
      "Proveedores: Orden de compras, especificación de insumo"
    ],
    requisitos: [
      "ISO 9001: 7.1.3, 8.4.",
      "ESTANDARES BASC: 2,3",
      "LEGALES: Matriz de legalidad",
      "EXTERNOS: Condiciones comerciales"
    ],
    seguimientoMedicion: [
      "Grado de Confiabilidad de proveedores",
      "Cumplimiento plan de compras",
      "Cumplmiento plan de mantenimiento de maquinaria e infraestructura"
    ],
    recursos: [
      "Humanos: Líder de proceso, Apoyo logístico.",
      "Financieros: Presupuesto de compras e inversiones",
      "Fisicos y tecnologicos: Bodega de insumos, estantería para almacenamiento, computador con base de datos de proveedores y manejo de kárdex para control de inventarios"
    ],
    documentosExternos: [
      "Manual integrado de gestion"
    ]
  },
  GH: {
    nombre: "Gestión de Talento Humano",
    area: "Proceso de Apoyo",
    responsable: "Asistente administrativo",
    objetivo: "Tener personal confiable, competente, motivado y con la toma de conciencia necesaria para el óptimo desempeño garantizando la confiabilidad de nuestros clientes.",
    alcance: "Aplica a todo el personal que labora en INDECON, visitantes y contratistas",
    entradas: [
      "Gestión de Dirección: Plataforma estratégica, estructura de procesos (contexto empresarial); Políticas internas; Cuadro de mando integral; Reglamento interno de trabajo; Manual integrado de sig; Red de proceso Actulizado; Manual de funciones; Matriz de riesgos de procesos",
      "Gestión de calidad y SST: Matriz de peligros; Plan de capacitación; Plan de emergencia; Retroalimentación de simulacros; Conformacion de brigadas; Reglamento de higiene y seguridad; Necesidades de capacitación; Examenes ocupacionales",
      "Todos los procesos: Necesidades de capacitación",
      "Gestión de calidad y sst: Reglamento de higiene y seguridad; Examenes ocupacionales; Matriz de peligros",
      "Gestión administrativa y financiera: Matriz de criticidad de la información; Manual de seguridad física; Control de incidentes de ciberseguridad; Cronograma de mantenimiento de la información"
    ],
    actividades: {
      planear: [
        "Programar capacitaciones",
        "Programar evaluación del desempeño",
        "Identificar los medios de comunicación, participación y consulta",
        "Planear contratación de aprendiz SENA"
      ],
      hacer: [
        "Realziar contratación y afiliaciones del personal y aprendiz sena",
        "Capacitar el personal",
        "Evaluar el desempeño Y competencias del personal",
        "Evaluar clima laboral",
        "Ejecutar actividades de bienestar",
        "Realizar el informe de desempeño del proceso",
        "Actualizar manual de funciones",
        "Mantener los comités de bienestar",
        "Mantener hojas de vida"
      ],
      verificar: [
        "Evaluación de desempeño, clima laboral y la inducción del personal",
        "Cumplimiento comité de convivencia",
        "Cumplimiento de comité de bienestar social",
        "Realizacion de visitas domiciliarias"
      ],
      actuar: [
        "Retroalimentar al personal",
        "Retroalimentar el programa de capacitación",
        "Implementar planes de mejoramiento con análisis de causas"
      ]
    },
    salidas: [
      "Gestión administrativa y financiera: Novedades de nomina; Planilla de pago",
      "Gestión de Dirección: Informe de evaluación de competencias, Participación y consulta, Informe de gestión comité de bienestar y de convivencia. Informe del clima laboral. cumplimiento de visitas domiciliarias y exámenes alcohol y drogas, plan de inducción, cumplimeinto de capacitación y formación de auditores. Relación de Sugerencias",
      "Todos",
      "Plan de capacitación",
      "Comité de convivencia",
      "Comité de bienestar social",
      "Buzon de sugerencias",
      "Matriz de criticidad de cargo",
      "Gestion de calidad y SST: Manual de funciones.; Manual de inducción; Encuesta patológica; Solicitud examens de alcohol y drogas",
      "UGPP",
      "Reporte de nomina",
      "Personal: Desprendible de nomina; Dotacion; Cartas laborales; Listado de documentos necesarios para hacer hv"
    ],
    requisitos: [
      "ISO 9001: 5, 7.2,7.3,7.4",
      "ESTANDARES BASC: 4",
      "LEGALES: Matriz de legalidad"
    ],
    seguimientoMedicion: [
      "Cumplimiento del plan de capacitación",
      "Nivel de competencia y desempeño",
      "Nivel de satisfacción laboral",
      "Cobertura capacitación BASC",
      "Eficacia capacitación"
    ],
    recursos: [
      "Líder de gestión humana, apoyo logístico",
      "Presupuesto de nómina, de capacitaciones, de salud ocupacional, dotación y elementos de seguridad",
      "Puestos de trabajo instalados y adecuados a las condiciones de salud ocupacional.",
      "Señalización y elementos de protección y seguridad industrial"
    ],
    documentosExternos: [
      "Manual de inducción",
      "Reglamento interno de trabajo",
      "Reglamento de higiene y seguridad industrial"
    ]
  },
  GF: {
    nombre: "Gestión Administrativa y Financiera",
    area: "Proceso de Apoyo",
    responsable: "Asistente administrativo",
    objetivo: "Integrar la gestión presupuestal, contable y de tesorería, los recursos financieros",
    alcance: "Registro y control contable de todos los hechos financieros, económicos y sociales originados en el desarrollo de actividad de INDECON.",
    entradas: [
      "Gestión de Dirección: Plataforma estratégica, estructura de procesos (contexto empresarial); Políticas internas; Cuadro de mando integral; Reglamento interno de trabajo; Manual integrado de sig; Red de proceso Actulizado; Manual de funciones; Matriz de riesgos de procesos",
      "Gestión de calidad y SST: Matriz de peligros; Plan de capacitación; Plan de emergencia; Retroalimentación de simulacros; Conformacion de brigadas; Reglamento de higiene y seguridad; Examenes de alcohol y drogra",
      "Gestión de proveedores: Plan de compras; Inventario de insumos; Facturas de compra; Plan de mantenimiento",
      "Gestión de clientes: Inventario de producto terminado; Orden de salida y recepción de devoluciones; Lista de chequeo de exportación",
      "Gestion de producción: Inventario de producto en proceso; Novedades de nomina",
      "Gestion huamana: Novedades de nomina; Planilla de pago",
      "Bancos: Extractos bancarios de cada Cuenta"
    ],
    actividades: {
      planear: [
        "Planificar el presupuesto de inversiones",
        "Planificación de gastos fijos y pagos",
        "Planear mantenimiento a los equipos",
        "Planear el control al acceso de la planta",
        "Planear la prevención de lavado de activos y terrorismo"
      ],
      hacer: [
        "Ejecutar el presupuesto",
        "Realizar actividades para el cumplimiento de legislación tributaria",
        "Realizar notas contables de ajuste",
        "Llevar libros contables (actas, inventarios y mayor y balances)",
        "Realizar informe de desempeño del proceso",
        "Pagar nomina, proveedores, terceros según contratos y convenios.",
        "Realizar control a visitantes",
        "Relizar control a exportaciones",
        "Controlar ingresos a paginas en los diferentes computadores",
        "Inspeccionar unidades de carga, y sellos de seguridad",
        "Programar capacitaciones y formación BASC",
        "Evaluar proveedores criticos"
      ],
      verificar: [
        "Verificar cuentas por pagar y cuentas por cobrar con terceros",
        "Verificar el comportamiento de pago de los clientes conforme a lo pactado.",
        "Verificar la carga desde inicio a fin",
        "Verificar paginas de acceso en diferentes computadores"
      ],
      actuar: [
        "Analizar la información mediante indicadores financieros para toma de decisiones",
        "Tomar decisiones frente al comportamiento de pago de los clientes.",
        "Tomar acciones de mejord apor alguna irregularidad en proceso de exportación"
      ]
    },
    salidas: [
      "Todos",
      "Matriz de criticidad de la información",
      "Manual de seguridad física",
      "Control de incidentes de ciberseguridad",
      "Cronograma de mantenimiento de la información",
      "Gestion de talento humano: Necedsidad de capacitación BASC; Reforma tributaria",
      "Gestión de dirección: Estado de cxc y cxp, Estados financieros de la vigencia, novedades de seguridad física, riesgos, novedades en carga, cumpliemiento BASC, Evaluacion proveedores críticos, incidentes en ciberseguridad, conocimiento de asociado critico",
      "Gestión de clientes: Notas contables; Instrucciones para controlar la carga de exportación; Instrucciones para la seguirdad",
      "DIAN: Declaraciones de liquidación de impuestos",
      "Clientes y proveedores, personal: Retenciones; Pagos oportunos según compromisos adquiridos; Facturación",
      "."
    ],
    requisitos: [
      ".ISO9001:7.1",
      "Estansares BASC: 1, 5,6.",
      "Normas técnicas, parámetros y criterios del Sistema Nacional de Contabilidad Pública"
    ],
    seguimientoMedicion: [
      "% de rentabilidad",
      "% de rotacion de cartera",
      "% de ingresos por maquila",
      "Cobertura de Asociados Críticos evaluado",
      "Oportunidad en Atención de Eventos"
    ],
    recursos: [
      "HUMANOS: AUXILIAR CONTABLE, CONTADOR, FISICOS Y TECNOLOGICOS SOFWARE CONTABLE, COMPUTADORES FINANCIEROS RECURSOS PARA EL PERSONAL"
    ],
    documentosExternos: [
      "Reforma tributaria ley 1607 de 26 diciembre de 2012",
      "Decreto 2649 de 1993",
      "Estatuto tributario",
      "Norma BASC"
    ]
  }
};

// Etiquetas de los tipos de documento (coinciden con document_type.code en Supabase)
export const DOC_TYPE_LABELS = {
  MN: { label: 'Manuales', emoji: '📚' },
  PR: { label: 'Procedimientos', emoji: '📑' },
  PL: { label: 'Planes', emoji: '🗓️' },
  GU: { label: 'Guías', emoji: '📖' },
  IN: { label: 'Instructivos', emoji: '📘' },
  RE: { label: 'Registros', emoji: '📝' },
  FO: { label: 'Formatos', emoji: '📋' },
};

// Columnas de "Documentos asociados", igual que en el Anexo 1
export const DOC_COLUMNAS = [
  { key: 'procedimientos', label: 'Procedimientos',          tipos: ['PR'] },
  { key: 'especificos',    label: 'Documentos específicos',  tipos: ['MN', 'PL', 'GU', 'IN'] },
  { key: 'registros',      label: 'Registros',               tipos: ['RE', 'FO'] },
];
