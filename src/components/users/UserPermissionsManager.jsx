// src/components/users/UserPermissionsManager.jsx
// ✅ v2026-04-07 — evaluacion_competencias habilitado + fix auto-save evaluadores
// ✅ Accordion controlado (no colapsa al asignar permisos)
// ✅ loadPermissions silent=true (no desmonta el panel)
// ✅ Proveedores agregado (catalogo, evaluacion, seleccion)

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
  'requisitos_legales',
  'auditorias_internas',
  'evaluacion_auditores',
  'reporte_incidentes',
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
  'bienestar_social',
  'epps',
  'examenes_medicos',
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
  'informes':               'Informes de Gestión',
  // Proveedores — nuevo ✅
  catalogo:                 'Catálogo de Proveedores',
  evaluacion:               'Evaluación de Proveedores',
  seleccion:                'Selección de Proveedores',
  // CMI / Planeación Estratégica — activo
  indicadores:              'Indicadores CMI',
  // SST / Bienestar — activos (implementados)
  capacitaciones:           'Capacitaciones',
  planes_programas:         'Planes y Programas',
  estandares:               'Estándares Mínimos',
  bienestar:                'Plan de Bienestar',
  convivencia:              'Comité de Convivencia',
  copasst:                  'COPASST',
  sst:                      'Plan SST',
  promocion_prevencion:     'Promoción y Prevención',
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

  const [openModules, setOpenModules] = React.useState([]);

  const handleToggle = async (code, currentlyHas) => {
    if (savingCode) return;
    if (currentlyHas) await revokePermissions([code]);
    else              await assignPermissions([code]);
  };

  const modules = Object.entries(permissionsByModule)
    .filter(([code]) => !HIDDEN_MODULES.includes(code))
    .map(([moduleCode, { module, permissions }]) => {
      const visiblePerms = permissions.filter(p => {
        const parsed = parsePermission(p.code);
        if (!parsed) return false;
        if (parsed.type === 'submodule' && HIDDEN_SUBMODULES.has(parsed.submodule)) return false;
        return true;
      });
      return { moduleCode, module, permissions: visiblePerms };
    })
    .filter(({ permissions }) => permissions.length > 0);

  const isLoading = loadingUser || loadingAvailable;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2" style={{ color: C.green }}>
            <Shield className="h-5 w-5" style={{ color: C.mint }} />
            Permisos — {userName}
          </SheetTitle>
          {userRole && (
            <p className="text-xs text-gray-400 mt-1">
              Rol: <span className="font-semibold capitalize">{userRole}</span>
              {(userRole === 'admin' || userRole === 'gerencia') && (
                <span className="ml-2 text-amber-600">· Acceso total automático</span>
              )}
            </p>
          )}
          {saveError && (
            <p className="text-xs text-red-500 mt-1">{saveError}</p>
          )}
        </SheetHeader>

        <div className="py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: C.mint }} />
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={openModules}
              onValueChange={setOpenModules}
              className="space-y-2"
            >
              {modules.map(({ moduleCode, module, permissions }) => {
                const activeCount = permissions.filter(p => permissionCodes.includes(p.code)).length;

                const moduleViewPerm   = permissions.find(p => {
                  const parsed = parsePermission(p.code);
                  return parsed?.type === 'module' && parsed?.action === 'view';
                });
                const moduleViewActive = moduleViewPerm ? permissionCodes.includes(moduleViewPerm.code) : false;

                const submoduleMap = {};
                permissions.forEach(p => {
                  const parsed = parsePermission(p.code);
                  if (parsed?.type === 'submodule') {
                    if (!submoduleMap[parsed.submodule]) submoduleMap[parsed.submodule] = [];
                    submoduleMap[parsed.submodule].push(p);
                  }
                });

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