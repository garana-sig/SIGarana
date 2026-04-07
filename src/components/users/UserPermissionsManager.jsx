// src/components/users/UserPermissionsManager.jsx
// ✅ v2026-04-07 — evaluacion_competencias habilitado + fix auto-save evaluadores
// ✅ Accordion controlado (no colapsa al asignar permisos)
// ✅ loadPermissions silent=true (no desmonta el panel)

import { useUserPermissions }      from '@/hooks/useUserPermissions';
import React from 'react';
import { useAvailablePermissions } from '@/hooks/useAvailablePermissions';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/app/components/ui/sheet';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/app/components/ui/accordion';
import { Shield, Loader2, ChevronRight, Eye, X } from 'lucide-react';

// ── Módulos completos ocultos (no implementados en UI) ───────────────
const HIDDEN_MODULES = ['clientes_ventas', 'inventario', 'configuracion'];

// ── Submódulos ocultos — borrar de aquí cuando implementes cada uno ──
const HIDDEN_SUBMODULES = new Set([
  // ── Mejoramiento Continuo — pendientes ──
  // 'revision_direccion', ← YA IMPLEMENTADO ✅
  'informes',
  'requisitos_legales',
  'auditorias_internas',
  'evaluacion_auditores',
  'reporte_incidentes',
  // 'evaluacion_competencias', ← YA IMPLEMENTADO ✅
  // ── Planeación Estratégica — solo indicadores activo ──
  'perspectivas',
  'objetivos',
  'iniciativas',
  // ── Gestión Documental — pendientes ──
  'documentos',
  'procesos',
  'instructivos',
  // ── Usuarios — permisos internos ──
  'gestion_usuarios',
  // ── SST / Bienestar — solo NO implementados ──
  'bienestar_social',   // pendiente
  'epps',               // pendiente
  'examenes_medicos',   // pendiente
  // 'sst' ← implementado ✅
]);

// ── Nombres legibles (códigos exactos de BD) ─────────────────────────
const SUBMODULE_NAMES = {
  // Gestión Documental — activos
  formatos:                 'Formatos',
  procedimientos:           'Procedimientos',
  guias:                    'Guías',
  listado_maestro:          'Listado Maestro',
  areas:                    'Por Área',
  // Mejoramiento Continuo — activos
  actas:                    'Actas de Reunión',
  acciones_mejora:          'Acciones de Mejora',
  riesgos:                  'Matriz de Riesgos',
  satisfaccion_clientes:    'Satisfacción Clientes',
  clima_laboral:            'Clima Laboral',
  producto_no_conforme:     'Producto No Conforme',
  qrsf:                     'QRSF',
  evaluacion_competencias:  'Evaluación de Competencias',
  revision_direccion:       'Revisión por la Dirección',
  // CMI / Planeación Estratégica — activo
  indicadores:              'Indicadores CMI',
  // SST / Bienestar — activos (implementados)
  capacitaciones:           'Capacitaciones',
  planes_programas:         'Planes y Programas',
  estandares:               'Estándares Mínimos',
  // SST — planes implementados (código exacto de BD confirmado)
  bienestar:                'Plan de Bienestar',
  convivencia:              'Comité de Convivencia',
  copasst:                  'COPASST',
  sst:                      'Plan SST',
  promocion_prevencion:     'Promoción y Prevención',
  // SST — pendientes (ocultos, nombrados para cuando se implementen)
  bienestar_social:         'Bienestar Social',
  epps:                     'EPPs',
  examenes_medicos:         'Exámenes Médicos',
  // Usuarios
  permisos:                 'Permisos',
};

const ACTION_NAMES = {
  view:              'Ver',
  manage:            'Gestionar',
  close:             'Cerrar',
  export:            'Exportar',
  download:          'Descargar',
  approve:           'Aprobar',
  archive:           'Archivar',
  measure:           'Registrar valores',
  register_values:   'Registrar valores',
  manage_periods:    'Gestionar periodos',
  manage_questions:  'Gestionar preguntas',
  view_responses:    'Ver respuestas',
  edit_all:          'Editar todos',
  assign:            'Asignar',
  revoke:            'Revocar',
  deactivate:        'Desactivar',
  register_findings: 'Registrar hallazgos',
  audit:             'Auditar',
  create:            'Crear',
  edit:              'Editar',
  delete:            'Eliminar',
};

const ACTION_COLORS = {
  view:    { bg: '#f0f7f4', color: '#2e5244' },
  create:  { bg: '#f0fdf4', color: '#16a34a' },
  edit:    { bg: '#eff6ff', color: '#1d4ed8' },
  delete:  { bg: '#fef2f2', color: '#dc2626' },
  approve: { bg: '#fdf4ff', color: '#7c3aed' },
  manage:  { bg: '#fff7ed', color: '#c2410c' },
  measure: { bg: '#fff7ed', color: '#c2410c' },
  export:  { bg: '#f8fafc', color: '#475569' },
  audit:   { bg: '#ede9fe', color: '#6d28d9' },
};

const C = { green: '#2e5244', mint: '#6dbd96' };

const parsePermission = (code) => {
  const parts = code.split(':');
  if (parts.length === 2) return { type: 'module',    module: parts[0], action: parts[1] };
  if (parts.length === 3) return { type: 'submodule', module: parts[0], submodule: parts[1], action: parts[2] };
  return null;
};

// ══════════════════════════════════════════════════════════════════════
export function UserPermissionsManager({ open, onClose, userId, userName, userRole }) {
  const {
    permissionCodes,
    loading:  loadingUser,
    saving:   savingCode,
    error:    saveError,
    assignPermissions,
    revokePermissions,
  } = useUserPermissions(userId);

  const {
    permissionsByModule,
    loading: loadingAvailable,
  } = useAvailablePermissions();

  // Accordion controlado — persiste el estado abierto/cerrado entre refreshes
  const [openModules, setOpenModules] = React.useState([]);

  // Toggle individual — panel queda ABIERTO
  const handleToggle = async (code, currentlyHas) => {
    if (savingCode) return;
    if (currentlyHas) await revokePermissions([code]);
    else              await assignPermissions([code]);
  };

  // Filtrar módulos y submódulos ocultos
  const modules = Object.entries(permissionsByModule)
    .filter(([code]) => !HIDDEN_MODULES.includes(code))
    .map(([moduleCode, { module, permissions }]) => {
      const visiblePerms = permissions.filter(p => {
        const parsed = parsePermission(p.code);
        if (!parsed) return false;
        if (parsed.type === 'submodule' && HIDDEN_SUBMODULES.has(parsed.submodule)) return false;
        return true;
      });
      return [moduleCode, { module, permissions: visiblePerms }];
    })
    .filter(([, { permissions }]) => permissions.length > 0)
    .sort((a, b) => (a[1].module?.display_order || 99) - (b[1].module?.display_order || 99));

  const totalActive = permissionCodes.length;
  const isLoading   = loadingUser || loadingAvailable;

  // Abrir todos los módulos al cargar por primera vez
  React.useEffect(() => {
    if (!isLoading && openModules.length === 0 && modules.length > 0) {
      setOpenModules(modules.map(([code]) => code));
    }
  }, [isLoading, modules.length]); // eslint-disable-line

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0"
        style={{ padding: 0 }}
      >
        {/* Header fijo */}
        <SheetHeader
          className="sticky top-0 z-10 px-5 py-4 border-b flex-shrink-0"
          style={{ backgroundColor: C.green }}
        >
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-white text-base font-bold leading-tight">
                Permisos — {userName}
              </SheetTitle>
              <p className="text-xs mt-1" style={{ color: '#6dbd96' }}>
                {userRole === 'gerencia' ? 'Gerencia' : 'Usuario'} · {totalActive} permisos activos
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* Admin */}
          {userRole === 'admin' && (
            <div className="p-8 text-center">
              <Shield className="h-14 w-14 mx-auto mb-3" style={{ color: C.mint }} />
              <h3 className="text-base font-bold mb-1" style={{ color: C.green }}>Administrador</h3>
              <p className="text-sm text-gray-500">
                Los administradores tienen acceso completo. No es necesario asignar permisos.
              </p>
            </div>
          )}

          {/* Info gerencia */}
          {userRole === 'gerencia' && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
            >
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Gerencia tiene acceso total automático. Los permisos aquí son adicionales y opcionales.
              </span>
            </div>
          )}

          {/* Error al guardar */}
          {saveError && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            >
              <span>⚠️ Error al guardar: {saveError}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && userRole !== 'admin' && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.mint }} />
            </div>
          )}

          {/* Acordeón de módulos */}
          {!isLoading && userRole !== 'admin' && (
            <Accordion
              type="multiple"
              value={openModules}
              onValueChange={setOpenModules}
              className="space-y-2"
            >
              {modules.map(([moduleCode, { module, permissions }]) => {

                const moduleViewPerm = permissions.find(p => {
                  const parsed = parsePermission(p.code);
                  return parsed?.type === 'module' && parsed?.action === 'view';
                });

                const submoduleMap = {};
                permissions.forEach(p => {
                  const parsed = parsePermission(p.code);
                  if (parsed?.type === 'submodule') {
                    if (!submoduleMap[parsed.submodule]) submoduleMap[parsed.submodule] = [];
                    submoduleMap[parsed.submodule].push(p);
                  }
                });

                const moduleViewActive = moduleViewPerm
                  ? permissionCodes.includes(moduleViewPerm.code)
                  : false;

                const activeCount   = permissions.filter(p => permissionCodes.includes(p.code)).length;
                const hasSubmodules = Object.keys(submoduleMap).length > 0;

                return (
                  <AccordionItem
                    key={moduleCode}
                    value={moduleCode}
                    className="rounded-xl border-2 overflow-hidden"
                    style={{ borderColor: activeCount > 0 ? `${C.mint}60` : '#e5e7eb' }}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                      <div className="flex items-center gap-3 w-full pr-2">
                        <span className="font-semibold text-sm" style={{ color: C.green }}>
                          {module?.name || moduleCode}
                        </span>
                        {activeCount > 0 && (
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${C.mint}25`, color: C.green }}
                          >
                            {activeCount} activos
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 pt-1 space-y-3">

                      {/* Permiso ver módulo */}
                      {moduleViewPerm && (
                        <div
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{
                            backgroundColor: moduleViewActive ? '#f0f7f4' : '#fafafa',
                            border: `1.5px solid ${moduleViewActive ? C.mint : '#e5e7eb'}`,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={moduleViewActive}
                              onCheckedChange={() => handleToggle(moduleViewPerm.code, moduleViewActive)}
                              disabled={savingCode}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4" style={{ color: C.mint }} />
                                <span className="text-sm font-semibold" style={{ color: C.green }}>
                                  Puede ver el módulo
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Acceso a {module?.name || moduleCode}
                              </p>
                            </div>
                          </div>
                          {savingCode && permissionCodes.includes(moduleViewPerm?.code) !== moduleViewActive && (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          )}
                        </div>
                      )}

                      {/* Submódulos */}
                      {hasSubmodules && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
                            Permisos por submódulo
                          </p>
                          <Accordion type="multiple" className="space-y-1.5">
                            {Object.entries(submoduleMap)
                              .sort((a, b) => a[0].localeCompare(b[0]))
                              .map(([subCode, subPerms]) => {
                                const subActive = subPerms.filter(p =>
                                  permissionCodes.includes(p.code)
                                ).length;

                                return (
                                  <AccordionItem
                                    key={subCode}
                                    value={subCode}
                                    className="rounded-lg border"
                                    style={{ borderColor: subActive > 0 ? `${C.mint}50` : '#f0f0f0' }}
                                  >
                                    <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 text-sm">
                                      <div className="flex items-center gap-2">
                                        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="font-medium" style={{ color: C.green }}>
                                          {SUBMODULE_NAMES[subCode] || subCode}
                                        </span>
                                        {subActive > 0 && (
                                          <span
                                            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: `${C.mint}20`, color: C.green }}
                                          >
                                            {subActive}/{subPerms.length}
                                          </span>
                                        )}
                                      </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="px-3 pb-3 pt-1">
                                      <div className="flex flex-wrap gap-2">
                                        {subPerms
                                          .sort((a, b) => {
                                            const order = ['view','create','edit','delete','approve','manage','measure','export','audit'];
                                            return (
                                              order.indexOf(a.code.split(':')[2]) -
                                              order.indexOf(b.code.split(':')[2])
                                            );
                                          })
                                          .map(perm => {
                                            const action      = perm.code.split(':')[2];
                                            const isActive    = permissionCodes.includes(perm.code);
                                            const isSaving    = savingCode;
                                            const colors      = ACTION_COLORS[action] || ACTION_COLORS.view;
                                            const actionLabel = ACTION_NAMES[action] || action;

                                            return (
                                              <button
                                                key={perm.id}
                                                onClick={() => handleToggle(perm.code, isActive)}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                                                style={{
                                                  backgroundColor: isActive ? colors.bg    : '#f9fafb',
                                                  color:           isActive ? colors.color : '#9ca3af',
                                                  borderColor:     isActive ? `${colors.color}40` : '#e5e7eb',
                                                  opacity:         isSaving ? 0.6 : 1,
                                                  cursor:          isSaving ? 'not-allowed' : 'pointer',
                                                }}
                                                title={perm.description || perm.name}
                                              >
                                                {isSaving
                                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                                  : (
                                                    <span
                                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                                      style={{ backgroundColor: isActive ? colors.color : '#d1d5db' }}
                                                    />
                                                  )
                                                }
                                                {actionLabel}
                                              </button>
                                            );
                                          })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                          </Accordion>
                        </div>
                      )}

                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          <div className="h-6" />
        </div>
      </SheetContent>
    </Sheet>
  );
}