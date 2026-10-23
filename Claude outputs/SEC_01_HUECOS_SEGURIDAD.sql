-- ═══════════════════════════════════════════════════════════════════
-- SEC_01 · Fase 1 de la revisión de permisos: cerrar huecos en la BD
-- (23 oct 2026, lo ejecuta Claude con apply_migration)
--
-- Regla nueva: escribir exige el permiso del módulo. Leer queda igual.
-- Antes de cambiar se verificó que cada usuario que hoy escribe en estas
-- tablas YA tiene el permiso correspondiente → nadie pierde lo que usa.
-- Solo se usa ALTER POLICY / CREATE (sin DROP).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Función central de permisos ────────────────────────────────
-- admin activo = todo. Resto: permiso asignado, activo y no vencido.
-- (Gerencia NO tiene pase libre: "ve todo, edita lo asignado".)
CREATE OR REPLACE FUNCTION public.tiene_permiso(p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profile WHERE id = auth.uid() AND role = 'admin' AND is_active)
      OR EXISTS (
        SELECT 1 FROM user_permission up
        JOIN permission p ON p.id = up.permission_id
        JOIN profile pr   ON pr.id = up.user_id AND pr.is_active
        WHERE up.user_id = auth.uid() AND p.code = p_code AND up.is_active
          AND (up.expires_at IS NULL OR up.expires_at > now()));
$$;

CREATE OR REPLACE FUNCTION public.tiene_algun_permiso(p_codes text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profile WHERE id = auth.uid() AND role = 'admin' AND is_active)
      OR EXISTS (
        SELECT 1 FROM user_permission up
        JOIN permission p ON p.id = up.permission_id
        JOIN profile pr   ON pr.id = up.user_id AND pr.is_active
        WHERE up.user_id = auth.uid() AND p.code = ANY (p_codes) AND up.is_active
          AND (up.expires_at IS NULL OR up.expires_at > now()));
$$;
GRANT EXECUTE ON FUNCTION public.tiene_permiso(text), public.tiene_algun_permiso(text[]) TO authenticated;

-- ── 2. user_has_permission (Planes de trabajo): respetaba permisos revocados
CREATE OR REPLACE FUNCTION public.user_has_permission(perm_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tiene_permiso(perm_code);
$$;

-- is_admin: un admin desactivado deja de ser admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profile WHERE id = user_id AND role = 'admin' AND is_active);
$$;

-- ── 3. Solo admin asigna / quita permisos ─────────────────────────
CREATE OR REPLACE FUNCTION public.assign_perms(p_user_id uuid, p_permission_codes text[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Solo un administrador puede asignar permisos'; END IF;
  INSERT INTO user_permission (user_id, permission_id, is_active, granted_by, granted_at)
  SELECT p_user_id, id, true, auth.uid(), now() FROM permission WHERE code = ANY (p_permission_codes)
  ON CONFLICT (user_id, permission_id)
  DO UPDATE SET is_active = true, granted_by = auth.uid(), granted_at = now(), expires_at = NULL;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_perms(p_user_id uuid, p_permission_codes text[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Solo un administrador puede quitar permisos'; END IF;
  UPDATE user_permission SET is_active = false
   WHERE user_id = p_user_id AND permission_id IN (SELECT id FROM permission WHERE code = ANY (p_permission_codes));
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END $$;

-- Funciones viejas equivalentes: mismo control
CREATE OR REPLACE FUNCTION public.assign_permissions_to_user(p_user_id uuid, p_permission_codes text[], p_notes text DEFAULT NULL)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.assign_perms(p_user_id, p_permission_codes); $$;
CREATE OR REPLACE FUNCTION public.revoke_permissions_from_user(p_user_id uuid, p_permission_codes text[], p_notes text DEFAULT NULL)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.revoke_perms(p_user_id, p_permission_codes); $$;

-- Escritura directa en user_permission: solo admin (había 2 juegos de políticas con gerencia)
ALTER POLICY admin_gerencia_insert_permissions ON public.user_permission WITH CHECK (is_admin(auth.uid()));
ALTER POLICY user_permission_insert_policy     ON public.user_permission WITH CHECK (is_admin(auth.uid()));
ALTER POLICY admin_gerencia_update_permissions ON public.user_permission USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
ALTER POLICY user_permission_update_policy     ON public.user_permission USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
ALTER POLICY admin_gerencia_delete_permissions ON public.user_permission USING (is_admin(auth.uid()));
ALTER POLICY user_permission_delete_policy     ON public.user_permission USING (is_admin(auth.uid()));

-- ── 4. profile: nadie crea perfiles ajenos ────────────────────────
-- (create-user usa service_role y el trigger de alta es SECURITY DEFINER)
ALTER POLICY profile_insert_authenticated ON public.profile WITH CHECK (id = auth.uid() OR is_admin(auth.uid()));

-- ── 5. Producto No Conforme (5 tablas estaban abiertas) ───────────
-- Lectura: igual que hoy (todo autenticado). Escritura: permisos PNC.
CREATE POLICY pnc_registro_select           ON public.pnc_registro           FOR SELECT TO authenticated USING (true);
CREATE POLICY pnc_item_select               ON public.pnc_item               FOR SELECT TO authenticated USING (true);
CREATE POLICY pnc_defecto_select            ON public.pnc_defecto            FOR SELECT TO authenticated USING (true);
CREATE POLICY pnc_referencia_select         ON public.pnc_referencia         FOR SELECT TO authenticated USING (true);
CREATE POLICY pnc_produccion_mensual_select ON public.pnc_produccion_mensual FOR SELECT TO authenticated USING (true);
ALTER POLICY pnc_registro_auth ON public.pnc_registro
  USING (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:edit','auditorias:producto_no_conforme:delete']) OR (created_by = auth.uid() AND tiene_permiso('auditorias:producto_no_conforme:create')))
  WITH CHECK (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']));
ALTER POLICY pnc_item_auth ON public.pnc_item
  USING (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit','auditorias:producto_no_conforme:delete']))
  WITH CHECK (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']));
ALTER POLICY pnc_produccion_auth ON public.pnc_produccion_mensual
  USING (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']))
  WITH CHECK (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']));
ALTER POLICY pnc_defecto_auth ON public.pnc_defecto
  USING (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']))
  WITH CHECK (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']));
ALTER POLICY pnc_referencia_auth ON public.pnc_referencia
  USING (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']))
  WITH CHECK (tiene_algun_permiso(ARRAY['auditorias:producto_no_conforme:create','auditorias:producto_no_conforme:edit']));

-- ── 6. Proveedores ────────────────────────────────────────────────
ALTER POLICY sup_insert ON public.supplier WITH CHECK (tiene_permiso('proveedores:catalogo:create'));
ALTER POLICY sup_update ON public.supplier USING (deleted_at IS NULL AND tiene_algun_permiso(ARRAY['proveedores:catalogo:edit','proveedores:catalogo:create']));
ALTER POLICY sup_delete ON public.supplier USING (deleted_at IS NULL AND tiene_permiso('proveedores:catalogo:delete'));
ALTER POLICY sup_eval_insert ON public.supplier_evaluation WITH CHECK (tiene_permiso('proveedores:evaluacion:create'));
ALTER POLICY sup_eval_update ON public.supplier_evaluation USING (deleted_at IS NULL AND tiene_algun_permiso(ARRAY['proveedores:evaluacion:create','proveedores:evaluacion:edit','proveedores:evaluacion:delete']));
ALTER POLICY sup_score_insert ON public.supplier_evaluation_score WITH CHECK (tiene_algun_permiso(ARRAY['proveedores:evaluacion:create','proveedores:evaluacion:edit']));
ALTER POLICY sup_score_update ON public.supplier_evaluation_score USING (tiene_algun_permiso(ARRAY['proveedores:evaluacion:create','proveedores:evaluacion:edit']));
ALTER POLICY sup_score_delete ON public.supplier_evaluation_score USING (tiene_algun_permiso(ARRAY['proveedores:evaluacion:create','proveedores:evaluacion:edit','proveedores:evaluacion:delete']));
ALTER POLICY sup_sel_insert ON public.supplier_selection WITH CHECK (tiene_permiso('proveedores:seleccion:create'));
ALTER POLICY sup_sel_update ON public.supplier_selection
  USING (tiene_algun_permiso(ARRAY['proveedores:seleccion:create','proveedores:seleccion:edit','proveedores:seleccion:delete']))
  WITH CHECK (tiene_algun_permiso(ARRAY['proveedores:seleccion:create','proveedores:seleccion:edit','proveedores:seleccion:delete']));
ALTER POLICY sup_sel_delete ON public.supplier_selection USING (tiene_permiso('proveedores:seleccion:delete'));
ALTER POLICY sup_sel_opt_insert ON public.supplier_selection_option WITH CHECK (tiene_algun_permiso(ARRAY['proveedores:seleccion:create','proveedores:seleccion:edit']));
ALTER POLICY sup_sel_opt_update ON public.supplier_selection_option USING (tiene_algun_permiso(ARRAY['proveedores:seleccion:create','proveedores:seleccion:edit']));
ALTER POLICY sup_sel_opt_delete ON public.supplier_selection_option USING (tiene_algun_permiso(ARRAY['proveedores:seleccion:create','proveedores:seleccion:edit','proveedores:seleccion:delete']));

-- ── 7. Informes de gestión ────────────────────────────────────────
-- Editar: su autor o responsable, o quien revisa. Borrar: autor con permiso, o admin.
ALTER POLICY mr_insert ON public.management_report WITH CHECK (created_by = auth.uid() AND tiene_permiso('auditorias:informes:create'));
ALTER POLICY mr_update ON public.management_report
  USING (((created_by = auth.uid() OR responsible_id = auth.uid()) AND tiene_permiso('auditorias:informes:create')) OR tiene_permiso('auditorias:informes:review'))
  WITH CHECK (((created_by = auth.uid() OR responsible_id = auth.uid()) AND tiene_permiso('auditorias:informes:create')) OR tiene_permiso('auditorias:informes:review'));
ALTER POLICY mr_delete ON public.management_report
  USING (is_admin(auth.uid()) OR (created_by = auth.uid() AND tiene_permiso('auditorias:informes:delete')));

CREATE OR REPLACE FUNCTION public.informe_editable(p_report_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM management_report r WHERE r.id = p_report_id AND (
    ((r.created_by = auth.uid() OR r.responsible_id = auth.uid()) AND tiene_permiso('auditorias:informes:create'))
    OR tiene_permiso('auditorias:informes:review')));
$$;
ALTER POLICY mrs_insert ON public.management_report_section   WITH CHECK (informe_editable(report_id));
ALTER POLICY mrs_update ON public.management_report_section   USING (informe_editable(report_id));
ALTER POLICY mri_insert ON public.management_report_indicator WITH CHECK (informe_editable(report_id));
ALTER POLICY mri_delete ON public.management_report_indicator USING (informe_editable(report_id));

-- ── 8. Matriz de riesgos ──────────────────────────────────────────
ALTER POLICY risk_matrix_insert ON public.risk_matrix WITH CHECK (tiene_permiso('auditorias:riesgos:create'));
ALTER POLICY risk_matrix_update ON public.risk_matrix
  USING (tiene_permiso('auditorias:riesgos:edit_all') OR (created_by = auth.uid() AND tiene_algun_permiso(ARRAY['auditorias:riesgos:create','auditorias:riesgos:edit'])))
  WITH CHECK (tiene_permiso('auditorias:riesgos:edit_all') OR (created_by = auth.uid() AND tiene_algun_permiso(ARRAY['auditorias:riesgos:create','auditorias:riesgos:edit'])));

-- ── 9. Valores de indicadores ─────────────────────────────────────
ALTER POLICY "responsable registra valores" ON public.indicator_value
  WITH CHECK (tiene_algun_permiso(ARRAY['cmi:indicadores:measure','cmi:indicadores:register_values']));

-- ── 10. QRSF y Devoluciones: crear exige permiso QRSF ─────────────
ALTER POLICY qrsf_registro_insert_auth ON public.qrsf_registro       WITH CHECK (tiene_permiso('auditorias:qrsf:create'));
ALTER POLICY qrsf_cliente_insert_auth  ON public.qrsf_cliente        WITH CHECK (tiene_permiso('auditorias:qrsf:create'));
ALTER POLICY qrsf_ventas_insert_auth   ON public.qrsf_ventas_mensual WITH CHECK (tiene_permiso('auditorias:qrsf:create'));
ALTER POLICY dev_registro_insert_auth  ON public.dev_registro        WITH CHECK (tiene_permiso('auditorias:qrsf:create'));
ALTER POLICY dev_ventas_insert_auth    ON public.dev_ventas_mensual  WITH CHECK (tiene_permiso('auditorias:qrsf:create'));
