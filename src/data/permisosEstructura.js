// src/data/permisosEstructura.js
// ═══════════════════════════════════════════════════════════════════
// Estructura OFICIAL de permisos: Módulo › (grupo) › Submódulo › CRUD
// Es la que dibuja la pantalla de permisos (Gestión de Usuarios → llave).
//
//  · Cada submódulo define qué código de la BD corresponde a Ver / Crear /
//    Editar / Eliminar (null = esa acción no aplica en esa pantalla).
//  · `extras` = acciones especiales (aprobar, exportar, cerrar…).
//  · `tambien` (en un extra) = códigos que se asignan/quitan junto con él.
//  · `entrada` = permiso que abre el módulo en el menú. La pantalla lo
//    asigna/quita sola según haya o no algún permiso dentro del módulo.
//  · Si agregas una pantalla nueva: crea sus permisos en la BD y añádela aquí.
// ═══════════════════════════════════════════════════════════════════

export const ACCIONES_CRUD = [
  { key: 'ver',      label: 'Ver' },
  { key: 'crear',    label: 'Crear' },
  { key: 'editar',   label: 'Editar' },
  { key: 'eliminar', label: 'Eliminar' },
];

// Atajo: CRUD estándar 'modulo:sub:view|create|edit|delete'
const crud = (base, { ver = true, crear = true, editar = true, eliminar = true } = {}) => ({
  ver:      ver      ? `${base}:view`   : null,
  crear:    crear    ? `${base}:create` : null,
  editar:   editar   ? `${base}:edit`   : null,
  eliminar: eliminar ? `${base}:delete` : null,
});

export const ESTRUCTURA_PERMISOS = [
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'gestion_documental', nombre: 'Gestión Documental', entrada: 'gestion_documental:view',
    grupos: [{
      submodulos: [
        // Ver documentos = tener acceso al módulo (permiso de entrada), por eso ver: null
        { id: 'documentos', nombre: 'Documentos', desc: 'Procedimientos, guías, formatos… (verlos = acceso al módulo)',
          ver: null,
          crear: 'gestion_documental:formatos:create',
          editar: 'gestion_documental:documentos:edit',
          eliminar: 'gestion_documental:documentos:delete',
          extras: [
            { code: 'gestion_documental:documentos:approve', label: 'Aprobar' },
            { code: 'gestion_documental:documentos:archive', label: 'Archivar' },
          ] },
        { id: 'listado_maestro', nombre: 'Listado Maestro', ver: 'gestion_documental:listado_maestro:view' },
        { id: 'por_area',        nombre: 'Documentos por área', ver: 'gestion_documental:areas:view' },
      ],
    }],
  },
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'cmi', nombre: 'Planeación Estratégica', entrada: 'cmi:view',
    grupos: [{
      submodulos: [
        { id: 'indicadores', nombre: 'Indicadores (CMI)', ...crud('cmi:indicadores'),
          extras: [
            { code: 'cmi:indicadores:measure', label: 'Registrar mediciones', tambien: ['cmi:indicadores:register_values'] },
            { code: 'cmi:indicadores:export',  label: 'Exportar' },
          ] },
      ],
    }],
  },
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mejoramiento', nombre: 'Mejoramiento Continuo', entrada: 'auditorias:view',
    grupos: [
      { nombre: 'Gestión', submodulos: [
        { id: 'actas', nombre: 'Actas de reunión', ...crud('auditorias:actas'),
          extras: [
            { code: 'auditorias:actas:view_all', label: 'Ver todas' },
            { code: 'auditorias:actas:edit_all', label: 'Editar todas' },
            { code: 'auditorias:actas:approve',  label: 'Aprobar' },
            { code: 'auditorias:actas:archive',  label: 'Archivar' },
            { code: 'auditorias:actas:download', label: 'Descargar' },
          ] },
        { id: 'acciones_mejora', nombre: 'Acciones correctivas / mejora', ...crud('auditorias:acciones_mejora'),
          extras: [
            { code: 'auditorias:acciones_mejora:edit_all', label: 'Editar todas' },
            { code: 'auditorias:acciones_mejora:close',    label: 'Cerrar' },
            { code: 'auditorias:acciones_mejora:audit',    label: 'Auditar eficacia' },
          ] },
        { id: 'riesgos', nombre: 'Matriz de riesgos', ...crud('auditorias:riesgos'),
          extras: [
            { code: 'auditorias:riesgos:edit_all', label: 'Editar todos' },
            { code: 'auditorias:riesgos:export',   label: 'Exportar' },
          ] },
        // Es un informe consolidado (solo lectura + Excel): no tiene crear/editar
        { id: 'revision_direccion', nombre: 'Revisión por la Dirección', ver: 'auditorias:revision_direccion:view' },
        { id: 'informes', nombre: 'Informes de gestión', ...crud('auditorias:informes', { editar: false }),
          nota: 'Crear incluye editar los propios',
          extras: [
            { code: 'auditorias:informes:review',   label: 'Revisar' },
            { code: 'auditorias:informes:download', label: 'Descargar' },
          ] },
        { id: 'pnc', nombre: 'Producto No Conforme', ...crud('auditorias:producto_no_conforme'),
          extras: [{ code: 'auditorias:producto_no_conforme:export', label: 'Exportar' }] },
        { id: 'qrsf', nombre: 'QRSF y Devoluciones', ...crud('auditorias:qrsf'),
          extras: [
            { code: 'auditorias:qrsf:close',  label: 'Cerrar' },
            { code: 'auditorias:qrsf:export', label: 'Exportar' },
          ] },
        { id: 'requisitos_legales', nombre: 'Matriz legal', ...crud('auditorias:requisitos_legales'),
          extras: [{ code: 'auditorias:requisitos_legales:verify', label: 'Verificar cumplimiento' }] },
      ] },
      { nombre: 'Proveedores', submodulos: [
        { id: 'prov_catalogo',   nombre: 'Catálogo de proveedores',  ...crud('proveedores:catalogo') },
        { id: 'prov_evaluacion', nombre: 'Evaluación de proveedores', ...crud('proveedores:evaluacion'),
          extras: [{ code: 'proveedores:evaluacion:export', label: 'Exportar' }] },
        { id: 'prov_seleccion',  nombre: 'Selección de proveedores',  ...crud('proveedores:seleccion'),
          extras: [{ code: 'proveedores:seleccion:export', label: 'Exportar' }] },
      ] },
      { nombre: 'Evaluaciones', submodulos: [
        { id: 'satisfaccion', nombre: 'Satisfacción de clientes', ver: 'auditorias:satisfaccion_clientes:view',
          extras: [
            { code: 'auditorias:satisfaccion_clientes:manage', label: 'Configurar encuesta' },
            { code: 'auditorias:satisfaccion_clientes:export', label: 'Exportar' },
          ] },
        { id: 'clima', nombre: 'Clima laboral', ver: 'auditorias:clima_laboral:view',
          extras: [
            { code: 'auditorias:clima_laboral:manage', label: 'Configurar encuesta' },
            { code: 'auditorias:clima_laboral:export', label: 'Exportar' },
          ] },
        { id: 'competencias', nombre: 'Evaluación de competencias', ...crud('auditorias:evaluacion_competencias'),
          extras: [{ code: 'auditorias:evaluacion_competencias:manage', label: 'Configurar periodos y preguntas' }] },
        // Registros de "Ayúdanos a mejorar": se manejan como RESPONSABLE del tipo
        { id: 'reg_sugerencias',      nombre: 'Registro Sugerencias (RE-GH-05)',      responsable: 'sugerencia' },
        { id: 'reg_actos_inseguros',  nombre: 'Registro Actos Inseguros (RE-GS-02)',  responsable: 'acto_inseguro' },
        { id: 'reg_operacion_inusual',nombre: 'Registro Operación Inusual (RE-GF-10)',responsable: 'operacion_inusual' },
      ] },
      { nombre: 'Mantenimiento', submodulos: [
        { id: 'mant_equipos',        nombre: 'Equipos de cómputo', ...crud('mantenimiento:computadores'),
          extras: [{ code: 'mantenimiento:computadores:export', label: 'Exportar / imprimir' }] },
        { id: 'mant_maquinaria',     nombre: 'Maquinaria',         ...crud('mantenimiento:maquinaria'), enConstruccion: true,
          extras: [{ code: 'mantenimiento:maquinaria:export', label: 'Exportar / imprimir' }] },
        { id: 'mant_infraestructura',nombre: 'Infraestructura',    ...crud('mantenimiento:infraestructura'), enConstruccion: true,
          extras: [{ code: 'mantenimiento:infraestructura:export', label: 'Exportar / imprimir' }] },
      ] },
    ],
  },
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'sst_bienestar', nombre: 'SST y Bienestar', entrada: 'sst_bienestar:view',
    grupos: [
      { nombre: 'Planes y programas', submodulos: [
        { id: 'plan_capacitacion', nombre: 'Plan de capacitación',     ...crud('sst_bienestar:capacitaciones') },
        { id: 'plan_sst',          nombre: 'Plan SST',                 ...crud('sst_bienestar:sst') },
        { id: 'plan_pyp',          nombre: 'Promoción y Prevención',   ...crud('sst_bienestar:promocion_prevencion') },
        { id: 'plan_copasst',      nombre: 'COPASST',                  ...crud('sst_bienestar:copasst') },
        { id: 'plan_convivencia',  nombre: 'Comité de Convivencia',    ...crud('sst_bienestar:convivencia') },
        { id: 'plan_bienestar',    nombre: 'Bienestar Social',         ...crud('sst_bienestar:bienestar') },
      ] },
      { nombre: 'Seguridad y salud', submodulos: [
        { id: 'estandares',       nombre: 'Estándares mínimos (Res. 0312)', ...crud('sst_bienestar:estandares', { eliminar: false }) },
        { id: 'matriz_peligros',  nombre: 'Matriz de peligros (GTC-45)',    ...crud('sst:matriz_peligros'),
          extras: [
            { code: 'sst:matriz_peligros:manage', label: 'Configurar procesos y secciones' },
            { code: 'sst:matriz_peligros:export', label: 'Exportar' },
          ] },
      ] },
    ],
  },
];

// ── Utilidades ─────────────────────────────────────────────────────
// Todos los códigos de un submódulo (CRUD + extras)
export const codigosSub = (s) =>
  [s.ver, s.crear, s.editar, s.eliminar, ...(s.extras || []).flatMap((e) => [e.code, ...(e.tambien || [])])].filter(Boolean);

// Todos los códigos de un módulo (sin la entrada)
export const codigosModulo = (m) => m.grupos.flatMap((g) => g.submodulos.flatMap(codigosSub));

// Todos los códigos que maneja la pantalla
export const TODOS_LOS_CODIGOS = [
  ...new Set(ESTRUCTURA_PERMISOS.flatMap((m) => [m.entrada, ...codigosModulo(m)])),
];

// Tipos de "Ayúdanos a mejorar" que dan acceso a Mejoramiento Continuo
export const TIPOS_RESPONSABLE = ESTRUCTURA_PERMISOS
  .flatMap((m) => m.grupos.flatMap((g) => g.submodulos))
  .filter((s) => s.responsable)
  .map((s) => s.responsable);