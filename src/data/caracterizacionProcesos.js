// src/data/caracterizacionProcesos.js
// 🆕 Contenido completo de "CARACTERIZACION DE PROCESOS 2026.docx" (INDECON / Garana Art)
// Extraído de las 7 tablas del documento oficial: objetivo, alcance, entradas,
// actividades (ciclo PHVA), salidas, requisitos, seguimiento y medición, recursos.
//
// Se guarda como dato estático porque la tabla `process` en Supabase solo tiene
// id/code/name/is_active — no columnas para todo este contenido. Si más adelante
// se quiere administrar esto desde la app, habría que agregar esas columnas (o una
// tabla `process_characterization`) y migrar este contenido allá.
//
// La lista de "Documentos asociados" del Word (nombres sueltos, sin código) NO se
// usa para el modal — en su lugar, Home.jsx consulta en vivo la tabla `document`
// de Supabase filtrando por process_id, para mostrar los documentos reales que
// existen hoy en Gestión Documental (con su código) y poder abrirlos con un clic.

export const CARACTERIZACION_PROCESOS = {
  DP: {
    nombre: 'Gestión de Dirección y Planeación Estratégica',
    area: 'Proceso Estratégico',
    responsable: 'Gerente',
    objetivo:
      'Definir el direccionamiento estratégico y su evaluación, manteniendo el sistema de gestión integrado con los requisitos legales, BASC, ISO 9000, SST, del cliente y demás que INDECON considere.',
    alcance:
      'Aplica desde la planificación estratégica y asignación presupuestal hasta la evaluación, auditorías y seguimiento de indicadores del sistema.',
    entradas: [
      'Entes: leyes, decretos, normas',
      'G. Clientes: estudio de necesidades y expectativas del cliente (QRS), informe de satisfacción del cliente, informe de ventas',
      'G. Administrativa y Financiera: estado de CxC y CxP, estados financieros de la vigencia, novedades de seguridad física',
      'G. de Calidad y SST: gestión de comités, cumplimiento del SST, informe de investigación de incidentes/accidentes y ausentismo laboral',
      'G. de Proveedores: informe de evaluación de proveedores',
      'G. Talento Humano: informe de evaluación de competencias, participación y consulta; informe de gestión comité de bienestar y convivencia; informe del clima laboral',
    ],
    actividades: {
      planear: [
        'Planear presupuesto',
        'Planificación de seguimiento al sistema (auditorías y revisión de indicadores)',
        'Planear cambios del sistema',
        'Planear cumplimiento de legislación',
      ],
      hacer: [
        'Analizar informes, encuestas y evaluaciones; hacer análisis DOFA',
        'Definir la misión, la visión, los valores, objetivos, políticas y estrategias',
        'Definir las metas, indicadores y la frecuencia de revisión',
        'Definir y proyectar el presupuesto y las inversiones',
        'Analizar, actualizar matriz legal y dar cumplimiento a ella',
        'Revisar resultados de satisfacción del cliente, evaluación de proveedores, evaluación del personal, quejas y reclamos, incidentes, plan de emergencias, participación y consulta',
        'Apoyar los procesos en la construcción de mapas de riesgos e indicadores de gestión',
      ],
      verificar: [
        'Hacer seguimiento periódico al desempeño del sistema una vez al año',
        'Hacer auditorías internas una vez al año',
        'Hacer seguimiento a procesos trimestralmente',
      ],
      actuar: [
        'Implementar acciones de mejora (estandarización de procesos)',
        'Asegurar la generación y cierre de planes de mejoramiento con análisis de causas',
      ],
    },
    salidas: [
      'Plataforma estratégica, estructura de procesos',
      'Políticas internas',
      'Cuadro de mando integral',
      'Informe anual gerencial',
      'Rendición de cuentas',
      'Plan de acción',
      'Actas de junta directiva',
      'Resultados de auditorías, matriz legal, plan de auditorías',
      'Plan anual de dirección',
      'Reglamento interno de trabajo',
      'Matriz de riesgos de procesos',
    ],
    requisitos: ['ISO 9001: matriz de correlación', 'Legales: matriz de legalidad', 'Clientes: expectativas y necesidades'],
    seguimientoMedicion: ['Cumplimiento plan de dirección', 'Cumplimiento del plan de indicadores', 'Cumplimiento matriz de legalidad'],
    recursos: ['El Gerente aprueba el presupuesto de ingresos, gastos, inversiones y de capital humano'],
  },

  GS: {
    nombre: 'Gestión de Calidad y Seguridad y Salud en el Trabajo',
    area: 'Proceso Estratégico',
    responsable: 'Profesional en SG-SST',
    objetivo:
      'Mejorar continuamente la eficacia del Sistema de Gestión Integrado mediante la aplicación de las políticas y los objetivos de la organización, disminuyendo la accidentalidad y el ausentismo laboral y previniendo enfermedades.',
    alcance:
      'Va desde la verificación de las acciones, el análisis de datos, hasta la toma de acciones de mejoramiento.',
    entradas: [
      'Gestión de Dirección: direccionamiento estratégico, procesos y procedimientos, actas de revisión por la dirección, matriz legal, plan anual de dirección',
      'Gestión de T. Humano: profesiograma, manual de inducción',
      'Gestión de Producción: ficha técnica de producto',
      'Gestión de Proveedores: ficha técnica de insumos, EPP',
      'Todos los procesos: productos no conformes',
    ],
    actividades: {
      planear: [
        'Planear las actividades de implementación y mejora del sistema de gestión integrado',
        'Planificar programas de seguridad y salud en el trabajo',
      ],
      hacer: [
        'Administrar los documentos del sistema de gestión (controlar registros y documentos)',
        'Generar informe de desempeño del proceso',
        'Consolidar informes de gestión para evaluar la eficiencia',
        'Desarrollar el programa de seguridad y salud en el trabajo',
        'Mantener activos los diferentes comités',
      ],
      verificar: [
        'El cumplimiento del plan de calidad y el programa de seguridad y salud en el trabajo',
        'Cumplimiento de actividades de COPASST y comité de incidentes',
      ],
      actuar: [
        'Establecer acciones de mejora',
        'Generar necesidad de capacitación y actualización de los subprogramas de seguridad y salud en el trabajo',
        'Apoyar la formulación de acciones de mejora',
      ],
    },
    salidas: [
      'Gestión de la Dirección: informe de gestión, plan de trabajo anual SIG, necesidades de inversión, informe de investigación de incidentes/accidentes y ausentismo laboral',
      'Gestión de T. Humano: necesidades de capacitación',
      'Todos los procesos: plan de calidad, matriz de peligros, plan de emergencias, reglamento de higiene y seguridad, protocolos por operación',
      'Gestión administrativa y financiera: ausentismo por empleado',
      'Personal: entrega de EPP, ARL',
      'Evidencias de implementación del SIG',
    ],
    requisitos: ['ISO 9001: matriz de correlación', 'Legales: matriz de legalidad'],
    seguimientoMedicion: [],
    recursos: ['Apoyo de calidad, auxiliar administrativo, presupuesto para el mejoramiento continuo'],
  },

  GC: {
    nombre: 'Gestión de Clientes',
    area: 'Proceso Misional',
    responsable: 'Líder de Gestión de Clientes',
    objetivo:
      'Promocionar y comercializar eficientemente los trajes de baño y el servicio de maquila, asegurando la satisfacción del cliente y el cumplimiento de los objetivos comerciales nacionales e internacionales.',
    alcance:
      'Va desde el análisis del mercado nacional y oportunidades internacionales hasta la evaluación de satisfacción del cliente.',
    entradas: [
      'G. Dirección: direccionamiento estratégico, procedimiento, acta de revisión por la dirección, matriz de riesgos de procesos',
      'G. SST: plan de calidad, matriz de peligros, plan de emergencia, reglamento de higiene',
      'G. Producción: muestras físicas, producción, lista de precios',
    ],
    actividades: {
      planear: ['Planear la entrega de pedidos', 'Proyectar las ventas', 'Planear estrategias de mercadeo y ventas'],
      hacer: [
        'Analizar la percepción del cliente',
        'Gestionar quejas y reclamos (devoluciones)',
        'Gestionar la entrega de pedidos al cliente',
        'Generar informe de desempeño del proceso',
        'Implementar estrategias de mercadeo y ventas para incursionar con nuevos productos',
        'Aplicar encuestas de satisfacción del cliente',
        'Realizar catálogo y mantenerlo actualizado',
        'Mantener inventario de producto terminado',
      ],
      verificar: ['Seguimiento a las órdenes de pedido', 'Seguimiento a las devoluciones', 'Grado de satisfacción del cliente'],
      actuar: ['Tomar acciones de mejoramiento'],
    },
    salidas: [
      'G. SST: producto no conforme',
      'Dirección: informe de satisfacción del cliente, informe de ventas, informe de gestión',
      'G. Producción: estudio de necesidades y expectativas del cliente, consolidado de pedidos, inventario de producto terminado, catálogo y fotos de inventario disponible',
      'G. Administrativa y Financiera: inventario de producto terminado, orden de salida / devoluciones',
      'Clientes y vendedores: catálogo y fotos de inventario disponible',
    ],
    requisitos: ['ISO 9001: matriz de correlación', 'Legales: matriz de legalidad', 'Cliente: encuestas de satisfacción, QRS'],
    seguimientoMedicion: [
      'Índice de satisfacción del cliente',
      'Crecimiento en ventas',
      '% de cumplimiento en cantidad',
      '% de oportunidad en la entrega',
    ],
    recursos: [
      'Líder de gestión, apoyo logístico, apoyo en ventas, presupuesto para estrategias de mercadeo, transporte, comisiones, encuestas de satisfacción, estanterías de bodega, material de embalaje, computador con base de datos de clientes y manejo de kárdex de producto terminado',
    ],
  },

  GR: {
    nombre: 'Gestión de Proveedores',
    area: 'Proceso Misional',
    responsable: 'Líder de Compras',
    objetivo:
      'Seleccionar, evaluar y contratar proveedores confiables y negociaciones rentables que garanticen la disposición de insumos, bienes y materiales para el desarrollo diario de las actividades de la empresa.',
    alcance:
      'Aplica para materia prima, insumos, elementos de dotación y protección, material de empaque, maquinaria, equipos, software, infraestructura y su mantenimiento.',
    entradas: [
      'Gestión de Dirección: direccionamiento estratégico, procesos y procedimientos, actas de revisión por la dirección, plan presupuestal',
      'Gestión de Producción: requerimientos de insumos, de maquinaria y equipos, de mantenimiento',
      'Gestión de Calidad y SST: matriz de requisitos de seguridad y salud en el trabajo de productos, bienes y servicios',
    ],
    actividades: {
      planear: [
        'Planear y programar las compras',
        'Planear y programar la evaluación de proveedores',
        'Planear y programar mantenimiento de maquinaria, equipo e infraestructura',
      ],
      hacer: [
        'Recibir, identificar y almacenar bienes e insumos, verificando el cumplimiento de requisitos de la matriz de SST',
        'Recibir producto propiedad del cliente: inspeccionar, identificar, distribuir y conservar',
        'Realizar mantenimiento rutinario y preventivo',
        'Hacer y actualizar hoja de vida de maquinaria, herramienta y equipos',
        'Realizar inventario de insumos, materia prima, maquinaria y herramienta',
        'Entregar insumos',
        'Realizar selección y evaluación de proveedores',
        'Realizar revisión periódica de infraestructura y tomar acciones',
      ],
      verificar: [
        'Verificar el pedido realizado con la mercancía recibida (factura, precio, cantidad, calidad)',
        'Verificar condiciones comerciales',
        'Verificar existencia de insumos y cumplimiento del stock mínimo',
        'Verificar cumplimiento de planes de compras y mantenimiento',
        'Realizar evaluación de proveedores',
      ],
      actuar: [
        'Realizar ajuste a las negociaciones con proveedores',
        'Rechazar los insumos y bienes que no cumplan con las especificaciones, generando PNC',
      ],
    },
    salidas: [
      'Gestión de dirección: informe de selección y evaluación de proveedores, informe de gestión',
      'Gestión de calidad y SST: producto no conforme, EPP, ficha técnica de insumo',
      'Gestión administrativa y financiera: plan de compras, inventarios de insumos, facturas de compra, plan de mantenimiento',
      'Gestión de producción: insumos, maquinaria y equipo e infraestructura',
      'Gestión humana: necesidades de capacitación',
      'Proveedores: orden de compras',
      'Personal: dotación',
    ],
    requisitos: [
      'ISO 9001 / NTC 6001: manual de calidad, matriz de relación de requisitos',
      'Legales: matriz de legalidad',
      'Externos: condiciones comerciales',
    ],
    seguimientoMedicion: [
      'Grado de confiabilidad de proveedores (calidad, servicio, precio)',
      'Porcentaje de descuentos obtenidos',
      'Disminución del tiempo de paro de máquina',
      'Cumplimiento del plan de compras',
      'Cumplimiento del plan de mantenimiento',
      'Control de infraestructura',
    ],
    recursos: [
      'Humanos: líder de proceso, apoyo logístico',
      'Financieros: presupuesto de compras e inversiones',
      'Físicos y tecnológicos: bodega de insumos, estantería para almacenamiento, computador con base de datos de proveedores y manejo de kárdex para control de inventarios',
    ],
  },

  GP: {
    nombre: 'Gestión de Producción',
    area: 'Proceso Misional',
    responsable: 'Líder de Producción',
    objetivo:
      'Garantizar la productividad, calidad y suministro oportuno a través del diseño, planeación, programación, ejecución y control de los procesos productivos, cumpliendo las especificaciones técnicas y las expectativas de los clientes.',
    alcance:
      'Aplica desde la toma de expectativas de nuevos mercados y tendencias, y necesidad de bodega, hasta la entrega de las prendas terminadas y empacadas.',
    entradas: [
      'Gestión de Dirección: direccionamiento estratégico, procesos y procedimientos, actas de revisión por la dirección',
      'Gestión de Calidad y SST: plan de calidad, matriz de peligros, plan de emergencias, reglamento de higiene y seguridad, protocolos por operación',
      'Gestión de Clientes: estudio de necesidades y expectativas del cliente, consolidado de pedidos, inventario de producto terminado, catálogo y fotos de inventario disponible',
      'Gestión de Proveedores: insumos, maquinaria y equipo e infraestructura, plan de mantenimiento',
      'Gestión Humana: personal competente',
    ],
    actividades: {
      planear: [
        'Planear la colección de cada periodo (revisión, verificación y validación)',
        'Planear y programar la producción',
        'Planear la necesidad de insumos y materia prima, maquinaria, personal',
      ],
      hacer: [
        'Hacer los moldes y escalarlos',
        'Sacar prototipos / muestras físicas',
        'Realizar fichas técnicas',
        'Realizar costeo del producto',
        'Producir copas',
        'Hacer diseños de hojas para sublimar',
        'Realizar corte de telas',
        'Confeccionar las prendas',
        'Pulir las prendas y copas',
        'Generar informe de desempeño del proceso',
        'Hacer inventario de producto en proceso',
      ],
      verificar: [
        'Verificar ficha técnica de producto',
        'Cumplimiento del programa de producción',
        'Actividades subcontratadas',
        'Instructivos de trabajo y normas de seguridad',
        'Revisar, verificar y validar el diseño y desarrollo',
        'Controlar los cambios del diseño y desarrollo',
      ],
      actuar: ['Implementar acciones de mejora en moldes y proceso de confección', 'Reprogramar la producción'],
    },
    salidas: [
      'Gestión administrativa y financiera: inventario de producto en proceso, plan de incentivos y relación de horas extras y permisos',
      'Gestión Humana: necesidad de capacitación',
      'Gestión de Proveedores: requerimientos de insumos, de maquinaria y equipos, de mantenimiento',
      'Gestión de Calidad y SST: producto no conforme, fichas técnicas',
      'Gestión de Clientes: muestras físicas, producción, listado de precios',
      'Gestión de Dirección: informe de gestión, necesidad de personal',
      'Personal: fichas técnicas, muestra física e instructivos de trabajo',
    ],
    requisitos: [
      'Ver matriz de legalidad',
      'Ver matriz de correlación de normas',
      'Clientes: en las encuestas de satisfacción, sugerencias y orden de pedido',
      'Fichas técnicas',
    ],
    seguimientoMedicion: ['% de productividad', '% de producto no conforme', '% de desperdicio', '% de incremento de ventas de nuevos productos'],
    recursos: ['Apoyo operativo, líder de producción, apoyo logístico, líder de calidad, presupuesto de inversión en instalación, maquinaria y herramienta'],
  },

  GH: {
    nombre: 'Gestión de Talento Humano',
    area: 'Proceso de Apoyo',
    responsable: 'Gerente',
    objetivo:
      'Asegurar que la organización tenga personal competente, motivado y con la toma de conciencia necesaria para el óptimo desempeño.',
    alcance: 'Aplica a todo el personal que labora en INDECON, visitantes y contratistas.',
    entradas: [
      'Gestión de Dirección: direccionamiento estratégico, procesos y procedimientos, actas de revisión por la dirección, necesidad de personal',
      'Todos los procesos: necesidades de capacitación',
      'Gestión de Calidad y SST: necesidad de capacitación, reglamento de higiene y seguridad',
    ],
    actividades: {
      planear: [
        'Programar capacitaciones',
        'Programar evaluación del desempeño',
        'Definir cargos y responsabilidades',
        'Identificar los medios de comunicación, participación y consulta',
      ],
      hacer: [
        'Ejecutar actividades de ingreso de personal nuevo',
        'Capacitar al personal',
        'Evaluar el desempeño y competencias del personal',
        'Evaluar clima laboral',
        'Ejecutar actividades de bienestar',
        'Hacer matriz de comunicación',
        'Realizar el informe de desempeño del proceso',
        'Actualizar manual de funciones',
        'Mantener los comités de bienestar',
        'Mantener hojas de vida',
      ],
      verificar: [
        'Evaluación de desempeño, clima laboral y la inducción del personal',
        'Cumplimiento del comité de convivencia',
        'Cumplimiento del comité de bienestar social',
      ],
      actuar: [
        'Retroalimentar al personal',
        'Retroalimentar el programa de capacitación',
        'Implementar planes de mejoramiento con análisis de causas',
      ],
    },
    salidas: [
      'Gestión administrativa y financiera: contratos del personal y afiliaciones a seguridad social, hojas de vida actualizadas',
      'Gestión de Dirección: informe de evaluación de competencias, participación y consulta; informe de gestión comité de bienestar y convivencia; informe del clima laboral; informe de gestión del proceso',
      'Todos: plan de capacitación, matriz de comunicación, comité de convivencia, comité de bienestar social, personal competente',
      'Gestión de calidad y SST: manual de funciones, manual de inducción',
    ],
    requisitos: ['ISO 9001: matriz de correlación', 'Legales: matriz de legalidad'],
    seguimientoMedicion: ['Cumplimiento del plan de capacitación', 'Nivel de competencia y desempeño', 'Nivel de satisfacción laboral'],
    recursos: [
      'Líder de gestión humana, apoyo logístico',
      'Presupuesto de nómina, capacitaciones, salud ocupacional, dotación y elementos de seguridad',
      'Puestos de trabajo instalados y adecuados a las condiciones de salud ocupacional',
      'Señalización y elementos de protección y seguridad industrial',
    ],
  },

  GF: {
    nombre: 'Gestión Administrativa y Financiera',
    area: 'Proceso de Apoyo',
    responsable: 'Asistente Administrativo',
    objetivo:
      'Administrar, conforme a la normatividad vigente y con la óptima integración entre la gestión presupuestal, contable y de tesorería, los recursos financieros.',
    alcance:
      'Registro y control contable de todos los hechos financieros, económicos y sociales originados en el desarrollo de la actividad de INDECON.',
    entradas: [
      'Gestión de Dirección: direccionamiento estratégico, actas de revisión por la dirección, matriz legal',
      'Gestión de Proveedores: plan de compras, inventario de insumos, facturas de compra, plan de mantenimiento',
      'Gestión de Clientes: inventario de producto terminado, orden de salida / devoluciones',
      'Gestión de Producción: inventario de producto en proceso, plan de incentivos y relación de horas extras y permisos',
      'Gestión de Calidad y SST: ausentismo por empleado',
      'Gestión Humana: contratos del personal y afiliaciones a seguridad social, hojas de vida actualizadas',
      'Bancos: extractos bancarios de cada cuenta',
    ],
    actividades: {
      planear: ['Planificar el presupuesto de inversiones', 'Planificación de gastos fijos y pagos'],
      hacer: [
        'Ejecutar el presupuesto',
        'Realizar actividades para el cumplimiento de la legislación tributaria',
        'Realizar notas contables de ajuste',
        'Llevar libros contables (actas, inventarios, mayor y balances)',
        'Realizar informe de desempeño del proceso',
        'Pagar nómina, proveedores y terceros según contratos y convenios',
      ],
      verificar: [
        'Verificar cuentas por pagar y cuentas por cobrar con terceros',
        'Verificar el comportamiento de pago de los clientes conforme a lo pactado',
      ],
      actuar: [
        'Analizar la información mediante indicadores financieros para toma de decisiones',
        'Tomar decisiones frente al comportamiento de pago de los clientes',
      ],
    },
    salidas: [
      'Gestión de Dirección: informe de gestión contable, estados financieros de la vigencia, estado de cuentas por pagar y por cobrar conciliadas',
      'Gestión de calidad y SST: producto no conforme',
      'Gestión humana: necesidades de capacitación',
      'DIAN: declaraciones de liquidación de impuestos',
      'Clientes, proveedores y personal: retenciones, pagos oportunos según compromisos adquiridos, facturación',
    ],
    requisitos: ['Normas técnicas, parámetros y criterios del Sistema Nacional de Contabilidad Pública'],
    seguimientoMedicion: [],
    recursos: [
      'Humanos: auxiliar contable, contador',
      'Físicos y tecnológicos: software contable, computadores',
      'Recursos financieros para el personal',
    ],
  },
};

// Etiquetas de los tipos de documento (coinciden con document_type.code en Supabase)
export const DOC_TYPE_LABELS = {
  PR: { label: 'Procedimientos', emoji: '📑' },
  IN: { label: 'Instructivos', emoji: '📘' },
  FO: { label: 'Formatos', emoji: '📋' },
  GU: { label: 'Guías', emoji: '📖' },
  MN: { label: 'Manuales', emoji: '📚' },
  RE: { label: 'Registros', emoji: '📝' },
};