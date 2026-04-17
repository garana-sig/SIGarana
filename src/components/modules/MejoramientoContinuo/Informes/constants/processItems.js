// ═══════════════════════════════════════════════════════════════════
// Mapa proceso → items del informe (IDs reales de Supabase)
// ═══════════════════════════════════════════════════════════════════

export const PROCESS_ITEMS = {

  'eee58e28-1db5-49fe-97a1-f0f254b63f87': {
    label: 'Gestión de Clientes',
    color: '#6dbd96',
    icon:  '🛍️',
    items: [
      { key: 'gc_unidades_asesor',      name: 'UNIDADES VENDIDAS POR ASESOR Y MES',          order: 1 },
      { key: 'gc_pedidas_despachadas',  name: 'UNIDADES PEDIDAS VS UNIDADES DESPACHADAS',     order: 2 },
      { key: 'gc_qrsf',                 name: 'ANÁLISIS QRSF',                                order: 3 },
      { key: 'gc_particion_cliente',    name: 'PARTICIPACIÓN DE CLIENTE EN VENTAS',           order: 4 },
      { key: 'gc_venta_categoria',      name: 'VENTA POR CATEGORÍA',                         order: 5 },
    ],
  },

  '984765bb-ca80-4d79-819b-75b82f664bbb': {
    label: 'Gestión de Producción',
    color: '#2e5244',
    icon:  '🏭',
    items: [
      { key: 'gp_unidades_modulo',  name: 'UNIDADES CONFECCIONADAS X MÓDULO',                       order: 1 },
      { key: 'gp_eficiencia',       name: 'EFICIENCIA DE CONFECCIÓN TRIMESTRE COMPARATIVO',          order: 2 },
      { key: 'gp_pnc_causa',        name: 'PRODUCTO NO CONFORME VS CAUSA',                          order: 3 },
      { key: 'gp_bodega',           name: 'UNIDADES INGRESADAS A BODEGA TRIMESTRE COMPARATIVO',     order: 4 },
      { key: 'gp_defectuosas',      name: 'UNIDADES DEFECTUOSAS VS OPERACIÓN',                      order: 5 },
    ],
  },

  'f4d94ce0-17db-4200-8e69-28bd62c6508a': {
    label: 'Gestión de Proveedores',
    color: '#6f7b2c',
    icon:  '📦',
    items: [
      { key: 'gprov_consumo_telas',   name: 'ANÁLISIS DE CONSUMO POR TELAS',   order: 1, category: 'Insumos'       },
      { key: 'gprov_compras_insumo',  name: 'ANÁLISIS DE COMPRAS POR INSUMO',  order: 2, category: 'Insumos'       },
      { key: 'gprov_ahorro',          name: 'AHORRO EN COMPRAS',               order: 3, category: 'Insumos'       },
      { key: 'gprov_calandra',        name: 'INSUMO DE CALANDRA X M²',         order: 4, category: 'Insumos'       },
      { key: 'gprov_devoluciones',    name: 'DEVOLUCIONES IMPERFECTOS',         order: 5, category: 'Insumos'       },
      { key: 'gprov_infraestructura', name: 'INFRAESTRUCTURA',                 order: 6, category: 'Mantenimiento' },
      { key: 'gprov_equipos',         name: 'EQUIPOS',                         order: 7, category: 'Mantenimiento' },
      { key: 'gprov_muebles',         name: 'MUEBLES Y ENSERES',               order: 8, category: 'Mantenimiento' },
    ],
  },

  '78f47837-2d79-4ee1-9826-f73a8d87010b': {
    label: 'Gestión de Calidad y SST',
    color: '#d97706',
    icon:  '🦺',
    items: [
      { key: 'gsst_plan_sst',        name: 'PLAN DE TRABAJO SST',       order: 1 },
      { key: 'gsst_inspecciones',    name: 'PLAN DE INSPECCIONES',       order: 2 },
      { key: 'gsst_copasst',         name: 'PLAN DE TRABAJO COPASST',    order: 3 },
      { key: 'gsst_convivencia',     name: 'PLAN DE TRABAJO CONVIVENCIA',order: 4 },
      { key: 'gsst_capacitaciones',  name: 'PLAN DE CAPACITACIONES',     order: 5 },
      { key: 'gsst_bienestar',       name: 'BIENESTAR SOCIAL',           order: 6 },
    ],
  },

  'f5184637-0387-479a-85e4-f5febe7edc32': {
    label: 'Gestión Administrativa y Financiera',
    color: '#2e5244',
    icon:  '💰',
    items: [
      { key: 'gaf_ventas',   name: 'REPORTE DE VENTAS',    order: 1 },
      { key: 'gaf_ingresos', name: 'INGRESOS',             order: 2 },
      { key: 'gaf_compras',  name: 'COMPRAS',              order: 3 },
      { key: 'gaf_nomina',   name: 'NÓMINA',               order: 4 },
      { key: 'gaf_gastos',   name: 'GASTOS FINANCIEROS',   order: 5 },
      { key: 'gaf_saldos',   name: 'SALDOS Y RECAUDOS',    order: 6 },
    ],
  },

  '1f0ab6eb-7e12-4ad2-917e-d803d36c6f9e': {
    label: 'Gestión de Dirección',
    color: '#2e5244',
    icon:  '🎯',
    items: [
      { key: 'gd_inversion',   name: 'INVERSIÓN',               order: 1 },
      { key: 'gd_estrategias', name: 'ESTRATEGIAS',             order: 2 },
      { key: 'gd_cumplimiento',name: 'CUMPLIMIENTO DEL PLAN',   order: 3 },
      { key: 'gd_formacion',   name: 'FORMACIÓN DE PERSONAL',   order: 4 },
      { key: 'gd_eventos',     name: 'EVENTOS',                 order: 5 },
    ],
  },

  'b45f3bd9-05a4-4779-a79d-b6657e65676f': {
    label: 'Gestión Talento Humano',
    color: '#6dbd96',
    icon:  '👥',
    items: [
      { key: 'gth_induccion',    name: 'INDUCCIÓN',                order: 1 },
      { key: 'gth_conocimiento', name: 'GESTIÓN DEL CONOCIMIENTO', order: 2 },
      { key: 'gth_contratacion', name: 'CONTRATACIÓN',             order: 3 },
      { key: 'gth_clima',        name: 'CLIMA LABORAL',            order: 4 },
    ],
  },
};

// Helper: obtener items de un proceso
export const getProcessItems = (processId) =>
  PROCESS_ITEMS[processId]?.items ?? [];

// Helper: obtener config de un proceso
export const getProcessConfig = (processId) =>
  PROCESS_ITEMS[processId] ?? null;

// Helper: total de items de un proceso
export const countProcessItems = (processId) =>
  PROCESS_ITEMS[processId]?.items?.length ?? 0;