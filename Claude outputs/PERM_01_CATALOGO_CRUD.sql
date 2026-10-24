-- ═══════════════════════════════════════════════════════════════════
-- PERM_01 · Fase 2: catálogo módulo › submódulo › CRUD (23 oct 2026)
-- Ejecutado por Claude con apply_migration.
--   1. Permisos que faltaban para completar el CRUD de cada submódulo
--   2. Planes de trabajo y Capacitaciones: escribir/borrar con su permiso
--      (antes SST y Promoción y Prevención solo los podía tocar admin, y
--       los permisos revocados seguían valiendo en Capacitaciones)
--   3. Actas: "ver todas" (la política tenía el código mal escrito)
--   4. Mantenimiento: infraestructura en mant_can
--   5. copiar_permisos(origen, destino) — solo admin
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Permisos nuevos ────────────────────────────────────────────
INSERT INTO public.permission (module_id, code, name, description, action, resource)
SELECT m.id, v.code, v.name, v.descr, v.action, v.resource
FROM (VALUES
  ('mantenimiento', 'mantenimiento:infraestructura:view',   'Ver infraestructura',      'Ver hojas de vida y mantenimientos de infraestructura', 'view',   'infraestructura'),
  ('mantenimiento', 'mantenimiento:infraestructura:create', 'Crear infraestructura',    'Registrar espacios/instalaciones y sus mantenimientos', 'create', 'infraestructura'),
  ('mantenimiento', 'mantenimiento:infraestructura:edit',   'Editar infraestructura',   'Editar espacios/instalaciones y sus mantenimientos',    'edit',   'infraestructura'),
  ('mantenimiento', 'mantenimiento:infraestructura:delete', 'Eliminar infraestructura', 'Eliminar espacios/instalaciones y sus mantenimientos',  'delete', 'infraestructura'),
  ('mantenimiento', 'mantenimiento:infraestructura:export', 'Exportar infraestructura', 'Imprimir / exportar hojas de vida de infraestructura',  'export', 'infraestructura'),
  ('auditorias',    'auditorias:actas:view_all',            'Ver todas las actas',      'Ver actas en borrador o revisión de otras personas',    'view',   'actas'),
  ('sst_bienestar', 'sst_bienestar:capacitaciones:delete',       'Eliminar capacitaciones',  'Eliminar capacitaciones del plan',        'delete', 'capacitaciones'),
  ('sst_bienestar', 'sst_bienestar:convivencia:delete',          'Eliminar plan Convivencia','Eliminar actividades del plan',           'delete', 'convivencia'),
  ('sst_bienestar', 'sst_bienestar:copasst:delete',              'Eliminar plan COPASST',    'Eliminar actividades del plan',           'delete', 'copasst'),
  ('sst_bienestar', 'sst_bienestar:bienestar:delete',            'Eliminar plan Bienestar',  'Eliminar actividades del plan',           'delete', 'bienestar'),
  ('sst_bienestar', 'sst_bienestar:sst:delete',                  'Eliminar plan SST',        'Eliminar actividades del plan',           'delete', 'sst'),
  ('sst_bienestar', 'sst_bienestar:promocion_prevencion:delete', 'Eliminar plan P&P',        'Eliminar actividades del plan',           'delete', 'promocion_prevencion')
) AS v(modulo, code, name, descr, action, resource)
JOIN public.module m ON m.code = v.modulo
ON CONFLICT (code) DO NOTHING;

-- ── 2. Planes de trabajo (work_plan / work_plan_item) ─────────────
-- Permiso = 'sst_bienestar:' || plan_type || ':accion'  (los 5 planes)
CREATE OR REPLACE FUNCTION public.plan_puede(p_plan_type text, p_accion text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_plan_type IN ('convivencia','copasst','bienestar','sst','promocion_prevencion')
     AND tiene_permiso('sst_bienestar:' || p_plan_type || ':' || p_accion);
$$;
CREATE OR REPLACE FUNCTION public.plan_item_puede(p_plan_id uuid, p_accion text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT plan_puede(plan_type, p_accion) FROM work_plan WHERE id = p_plan_id), false);
$$;
GRANT EXECUTE ON FUNCTION public.plan_puede(text, text), public.plan_item_puede(uuid, text) TO authenticated;

ALTER POLICY work_plan_insert ON public.work_plan WITH CHECK (plan_puede(plan_type, 'create'));
ALTER POLICY work_plan_update ON public.work_plan USING (plan_puede(plan_type, 'edit'));
ALTER POLICY work_plan_delete ON public.work_plan USING (plan_puede(plan_type, 'delete'));
ALTER POLICY work_plan_item_insert ON public.work_plan_item WITH CHECK (plan_item_puede(plan_id, 'create') OR plan_item_puede(plan_id, 'edit'));
ALTER POLICY work_plan_item_update ON public.work_plan_item USING (plan_item_puede(plan_id, 'edit'));
ALTER POLICY work_plan_item_delete ON public.work_plan_item USING (plan_item_puede(plan_id, 'delete') OR plan_item_puede(plan_id, 'edit'));

-- ── Capacitaciones (training_plan / training_item) ────────────────
ALTER POLICY training_plan_insert ON public.training_plan WITH CHECK (tiene_permiso('sst_bienestar:capacitaciones:create'));
ALTER POLICY training_plan_update ON public.training_plan USING (tiene_permiso('sst_bienestar:capacitaciones:edit'));
ALTER POLICY training_plan_delete ON public.training_plan USING (tiene_permiso('sst_bienestar:capacitaciones:delete'));
ALTER POLICY training_item_insert ON public.training_item WITH CHECK (tiene_algun_permiso(ARRAY['sst_bienestar:capacitaciones:create','sst_bienestar:capacitaciones:edit']));
ALTER POLICY training_item_update ON public.training_item USING (tiene_permiso('sst_bienestar:capacitaciones:edit'));
ALTER POLICY training_item_delete ON public.training_item USING (tiene_algun_permiso(ARRAY['sst_bienestar:capacitaciones:edit','sst_bienestar:capacitaciones:delete']));

-- ── 3. Actas: ver todas ───────────────────────────────────────────
ALTER POLICY acta_select_policy ON public.acta
  USING (status = 'approved' OR created_by = auth.uid() OR tiene_permiso('auditorias:actas:view_all')
         OR EXISTS (SELECT 1 FROM profile WHERE id = auth.uid() AND role IN ('admin','gerencia') AND is_active));

-- ── 4. Mantenimiento: infraestructura ─────────────────────────────
CREATE OR REPLACE FUNCTION public.mant_can(p_tipo text, p_action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  v_sub := CASE p_tipo WHEN 'computador' THEN 'computadores'
                       WHEN 'maquinaria' THEN 'maquinaria'
                       WHEN 'infraestructura' THEN 'infraestructura' END;
  IF v_sub IS NULL THEN RETURN false; END IF;
  -- Gerencia ve todo; para escribir necesita el permiso (decisión 23-oct)
  IF p_action = 'view' AND is_gerencia(auth.uid()) THEN RETURN true; END IF;
  RETURN tiene_permiso('mantenimiento:' || v_sub || ':' || p_action);
END $$;

-- ── 5. Copiar permisos de un usuario a otro (solo admin) ──────────
-- Deja al destino EXACTAMENTE con los permisos activos del origen
-- (+ opcionalmente las responsabilidades de "Ayúdanos a mejorar").
CREATE OR REPLACE FUNCTION public.copiar_permisos(p_origen uuid, p_destino uuid, p_incluir_responsables boolean DEFAULT true)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Solo un administrador puede copiar permisos'; END IF;
  IF p_origen = p_destino THEN RAISE EXCEPTION 'Elige un usuario distinto'; END IF;

  UPDATE user_permission SET is_active = false WHERE user_id = p_destino;
  INSERT INTO user_permission (user_id, permission_id, is_active, granted_by, granted_at, notes)
  SELECT p_destino, up.permission_id, true, auth.uid(), now(), 'Copiado de otro usuario'
    FROM user_permission up
   WHERE up.user_id = p_origen AND up.is_active AND (up.expires_at IS NULL OR up.expires_at > now())
  ON CONFLICT (user_id, permission_id)
  DO UPDATE SET is_active = true, granted_by = auth.uid(), granted_at = now(), expires_at = NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF p_incluir_responsables THEN
    INSERT INTO reporte_tipo_responsable (tipo_codigo, user_id)
    SELECT tipo_codigo, p_destino FROM reporte_tipo_responsable WHERE user_id = p_origen
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object('success', true, 'permisos', v_n);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END $$;
REVOKE ALL ON FUNCTION public.copiar_permisos(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copiar_permisos(uuid, uuid, boolean) TO authenticated;

-- ── 6. (perm_01b) Ver planes: SST y Promoción y Prevención eran invisibles ──
ALTER POLICY work_plan_select ON public.work_plan
  USING (plan_puede(plan_type, 'view') OR is_gerencia(auth.uid()));
ALTER POLICY work_plan_item_select ON public.work_plan_item
  USING (plan_item_puede(plan_id, 'view') OR is_gerencia(auth.uid()));
