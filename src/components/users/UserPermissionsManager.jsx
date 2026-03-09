// src/components/users/UserPermissionsManager.jsx
// ✅ Módulo → checkbox "Puede ver módulo" (module:view)
// ✅ Submodulos → permisos CRUD específicos
// ✅ Sin grupo "General"

import { useState } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAvailablePermissions } from '@/hooks/useAvailablePermissions';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/app/components/ui/accordion';
import { Shield, Loader2, ChevronRight, Eye } from 'lucide-react';

// ── Nombres legibles ──────────────────────────────────────────────────
const SUBMODULE_NAMES = {
  // Gestión Documental
  documentos:              'Documentos',
  procesos:                'Procesos',
  formatos:                'Formatos',
  procedimientos:          'Procedimientos',
  guias:                   'Guías',
  instructivos:            'Instructivos',
  // Mejoramiento Continuo
  actas:                   'Actas de Reunión',
  acciones_mejora:         'Acciones de Mejora',
  producto_no_conforme:    'Producto No Conforme',
  revision_direccion:      'Revisión por la Dirección',
  informes:                'Informes',
  indicadores:             'Indicadores CMI',
  requisitos_legales:      'Requisitos Legales',
  auditorias_internas:     'Auditorías Internas',
  evaluacion_auditores:    'Evaluación de Auditores',
  matriz_riesgos:          'Matriz de Riesgos',
  reporte_incidentes:      'Reporte de Incidentes',
  clima_laboral:           'Clima Laboral',
  satisfaccion_clientes:   'Satisfacción Clientes',
  evaluacion_competencias: 'Evaluación de Competencias',
  qrsf:                    'QRSF',
  // Planeación Estratégica
  perspectivas:            'Perspectivas',
  objetivos:               'Objetivos Estratégicos',
  indicadores_cmi:         'Indicadores CMI',
  iniciativas:             'Iniciativas',
  // SST y Bienestar
  bienestar_social:        'Bienestar Social',
  sst:                     'Seguridad y Salud',
  epps:                    'EPPs',
  capacitaciones:          'Capacitaciones',
  examenes_medicos:        'Exámenes Médicos',
  // Usuarios
  gestion_usuarios:        'Gestión de Usuarios',
  permisos:                'Permisos',
};

const ACTION_NAMES = {
  view:    'Ver',
  create:  'Crear',
  edit:    'Editar',
  delete:  'Eliminar',
  approve: 'Aprobar',
  manage:  'Administrar',
};

const ACTION_COLORS = {
  view:    { bg: '#f0f7f4', color: '#2e5244' },
  create:  { bg: '#f0fdf4', color: '#16a34a' },
  edit:    { bg: '#eff6ff', color: '#1d4ed8' },
  delete:  { bg: '#fef2f2', color: '#dc2626' },
  approve: { bg: '#fdf4ff', color: '#7c3aed' },
  manage:  { bg: '#fff7ed', color: '#c2410c' },
};

const C = { green: '#2e5244', mint: '#6dbd96', sand: '#dedecc' };

const HIDDEN_MODULES = ['clientes_ventas', 'inventario'];

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export function UserPermissionsManager({ userId, userName, userRole, onSuccess }) {
  const [saving, setSaving] = useState(null); // guardamos el code que está siendo guardado

  const {
    permissionCodes,
    loading: loadingUser,
    assignPermissions,
    revokePermissions,
  } = useUserPermissions(userId);

  const {
    permissionsByModule,
    loading: loadingAvailable,
  } = useAvailablePermissions();

  // ── Toggle individual ──────────────────────────────────────────────
  const handleToggle = async (code, currentlyHas) => {
    setSaving(code);
    try {
      if (currentlyHas) {
        await revokePermissions([code]);
      } else {
        await assignPermissions([code]);
      }
      if (onSuccess) onSuccess();
    } finally {
      setSaving(null);
    }
  };

  if (loadingUser || loadingAvailable) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.mint }} />
      </div>
    );
  }

  if (userRole === 'admin') {
    return (
      <div className="p-6 text-center">
        <Shield className="h-14 w-14 mx-auto mb-3" style={{ color: C.mint }} />
        <h3 className="text-base font-bold mb-1" style={{ color: C.green }}>Administrador</h3>
        <p className="text-sm text-gray-500">
          Los administradores tienen acceso completo. No es necesario asignar permisos.
        </p>
      </div>
    );
  }

  // ── Separar permisos de módulo (:view) de permisos de submodulo ────
  const parsePermission = (code) => {
    const parts = code.split(':');
    if (parts.length === 2) return { type: 'module', module: parts[0], action: parts[1] };
    if (parts.length === 3) return { type: 'submodule', module: parts[0], submodule: parts[1], action: parts[2] };
    return null;
  };

  const modules = Object.entries(permissionsByModule)
    .filter(([code]) => !HIDDEN_MODULES.includes(code))
    .sort((a, b) => (a[1].module?.display_order || 99) - (b[1].module?.display_order || 99));

  const totalActive = permissionCodes.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ backgroundColor: '#f0f7f4', border: `1px solid ${C.mint}30` }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: C.green }}>Permisos de {userName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{totalActive} permisos activos asignados</p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}
        >
          {userRole === 'gerencia' ? 'Gerencia' : 'Usuario'}
        </span>
      </div>

      {/* Info gerencia */}
      {userRole === 'gerencia' && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-xs"
          style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
        >
          <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Gerencia ya tiene acceso total automático. Los permisos aquí son opcionales y solo aplican si se implementan restricciones específicas en el futuro.</span>
        </div>
      )}

      {/* Módulos */}
      <Accordion type="multiple" className="space-y-2">
        {modules.map(([moduleCode, { module, permissions }]) => {
          // Separar: permiso de vista del módulo vs permisos de submodulos
          const moduleViewPerm = permissions.find(p => {
            const parsed = parsePermission(p.code);
            return parsed?.type === 'module' && parsed?.action === 'view';
          });

          // Agrupar permisos de submodulo
          const submoduleMap = {};
          permissions.forEach(p => {
            const parsed = parsePermission(p.code);
            if (!parsed) return;
            if (parsed.type === 'submodule') {
              if (!submoduleMap[parsed.submodule]) submoduleMap[parsed.submodule] = [];
              submoduleMap[parsed.submodule].push(p);
            }
          });

          const hasSubmodules    = Object.keys(submoduleMap).length > 0;
          const moduleViewActive = moduleViewPerm ? permissionCodes.includes(moduleViewPerm.code) : false;

          // Contar permisos activos del módulo
          const activeCount = permissions.filter(p => permissionCodes.includes(p.code)).length;

          return (
            <AccordionItem
              key={moduleCode}
              value={moduleCode}
              className="rounded-xl border-2 overflow-hidden"
              style={{ borderColor: activeCount > 0 ? `${C.mint}60` : '#e5e7eb' }}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-3 w-full pr-2">
                  {/* Nombre módulo */}
                  <span className="font-semibold text-sm" style={{ color: C.green }}>
                    {module?.name || moduleCode}
                  </span>
                  {/* Badge activos */}
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

              <AccordionContent className="px-4 pb-4 pt-1 space-y-4">

                {/* ── Permiso VER MÓDULO ─────────────────────────────── */}
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
                        disabled={saving === moduleViewPerm.code}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" style={{ color: C.mint }} />
                          <span className="text-sm font-semibold" style={{ color: C.green }}>
                            Puede ver el módulo
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Permite acceder y navegar a {module?.name || moduleCode}
                        </p>
                      </div>
                    </div>
                    {saving === moduleViewPerm.code && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                )}

                {/* ── Submodulos ─────────────────────────────────────── */}
                {hasSubmodules && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
                      Permisos por submódulo
                    </p>
                    <Accordion type="multiple" className="space-y-1.5">
                      {Object.entries(submoduleMap)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([subCode, subPerms]) => {
                          const subActive = subPerms.filter(p => permissionCodes.includes(p.code)).length;

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
                                      const order = ['view','create','edit','delete','approve','manage'];
                                      const aIdx  = order.indexOf(a.code.split(':')[2]) ?? 9;
                                      const bIdx  = order.indexOf(b.code.split(':')[2]) ?? 9;
                                      return aIdx - bIdx;
                                    })
                                    .map(perm => {
                                      const action    = perm.code.split(':')[2];
                                      const isActive  = permissionCodes.includes(perm.code);
                                      const isSaving  = saving === perm.code;
                                      const colors    = ACTION_COLORS[action] || ACTION_COLORS.view;
                                      const actionLabel = ACTION_NAMES[action] || action;

                                      return (
                                        <button
                                          key={perm.id}
                                          onClick={() => handleToggle(perm.code, isActive)}
                                          disabled={isSaving}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                                          style={{
                                            backgroundColor: isActive ? colors.bg : '#f9fafb',
                                            color:           isActive ? colors.color : '#9ca3af',
                                            borderColor:     isActive ? `${colors.color}40` : '#e5e7eb',
                                            opacity:         isSaving ? 0.6 : 1,
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
    </div>
  );
}