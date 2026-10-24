-- ═══════════════════════════════════════════════════════════════════
-- PERM_02 · Fase 3 (BD): gerencia ve todo y aprueba; crear/editar/eliminar
-- con permiso. (23 oct 2026 — ejecutado por Claude)
--
-- 1. En TODAS las políticas de escritura de public se quita el pase libre
--    de gerencia (ARRAY['admin','gerencia'] → ARRAY['admin'], is_gerencia → false).
--    Se respeta el resto de la lógica de cada política tal cual.
--    Excepción: aprobación de documentos (gerencia sigue aprobando).
-- 2. A las políticas que solo dejaban escribir a admin/gerencia se les suma
--    el permiso correspondiente, para que funcione lo que se asigna en la pantalla.
-- 3. ml_can (Matriz legal): gerencia solo ve.
-- 4. Los chequeos "a mano" contra user_permission (sin revisar is_active)
--    se cambian por tiene_permiso() (respeta revocados y vencidos).
-- Nota: hoy no hay usuarios con rol gerencia, así que nadie pierde acceso.
-- Respaldo: respaldo.politicas_20261023 guarda el ALTER POLICY original de
-- cada política (para volver atrás: ejecutar la columna sql_original).
-- ═══════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS respaldo;
REVOKE ALL ON SCHEMA respaldo FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS respaldo.politicas_20261023 AS
SELECT tablename, policyname, cmd,
       format('ALTER POLICY %I ON public.%I', policyname, tablename)
       || CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END
       || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';' AS sql_original
FROM pg_policies WHERE schemaname = 'public' AND cmd <> 'SELECT';

DO $$
DECLARE
  r record; q text; c text; nq text; nc text; extra text;
  -- EXISTS (SELECT 1 FROM user_permission up JOIN permission p ... WHERE up.user_id = auth.uid() AND p.code = 'x')
  rx constant text := 'EXISTS \( SELECT 1\s+FROM \(user_permission up\s+JOIN permission (\w+) ON \(\(\1\.id = up\.permission_id\)\)\)\s+WHERE \(\(up\.user_id = auth\.uid\(\)\) AND (?:\(up\.is_active = true\) AND )?\(\1\.code = (''[^'']+'')::text\)(?: AND \(up\.is_active = true\))?\)\)';
BEGIN
  FOR r IN SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
           WHERE schemaname = 'public' AND cmd <> 'SELECT'
             AND policyname <> 'Only admin and gerencia can update approvals'
  LOOP
    q := r.qual; c := r.with_check;
    nq := replace(replace(replace(q, 'ARRAY[''admin''::text, ''gerencia''::text]', 'ARRAY[''admin''::text]'),
                          'ARRAY[''gerencia''::text, ''admin''::text]', 'ARRAY[''admin''::text]'),
                  'is_gerencia(auth.uid())', 'false');
    nc := replace(replace(replace(c, 'ARRAY[''admin''::text, ''gerencia''::text]', 'ARRAY[''admin''::text]'),
                          'ARRAY[''gerencia''::text, ''admin''::text]', 'ARRAY[''admin''::text]'),
                  'is_gerencia(auth.uid())', 'false');

    -- Permiso que habilita escribir donde antes solo podía admin/gerencia
    extra := CASE
      WHEN r.tablename IN ('survey_type','survey_question','survey_period','survey_response','survey_answer')
           AND r.policyname LIKE '%\_admin'   -- no tocar las de inserción pública (anon)
        THEN 'tiene_algun_permiso(ARRAY[''auditorias:satisfaccion_clientes:manage'',''auditorias:clima_laboral:manage''])'
      WHEN r.tablename IN ('sst_actividad','sst_proceso','sst_seccion') AND r.cmd IN ('INSERT','UPDATE')
        THEN 'tiene_permiso(''sst:matriz_peligros:manage'')'
      WHEN r.policyname IN ('ec_config_eval_manage','ec_periodo_manage','ec_empleado_insert','ec_empleado_update')
        THEN 'tiene_permiso(''auditorias:evaluacion_competencias:manage'')'
      WHEN r.policyname = 'ec_evaluacion_delete'      THEN 'tiene_permiso(''auditorias:evaluacion_competencias:delete'')'
      WHEN r.policyname = 'ia_delete'                 THEN 'tiene_permiso(''auditorias:acciones_mejora:delete'')'
      WHEN r.policyname = 'ia_update'                 THEN 'tiene_permiso(''auditorias:acciones_mejora:edit_all'')'
      WHEN r.policyname = 'risk_matrix_delete'        THEN 'tiene_permiso(''auditorias:riesgos:delete'')'
      WHEN r.policyname IN ('acta_update_policy','attendee_insert_policy','attendee_update_policy','attendee_delete_policy',
                            'commitment_insert_policy','commitment_update_policy','commitment_delete_policy')
        THEN 'tiene_permiso(''auditorias:actas:edit_all'')'
      WHEN r.policyname LIKE 'Users can update their own drafts%' THEN 'tiene_permiso(''gestion_documental:documentos:edit'')'
      WHEN r.policyname = 'Only admin can delete documents'      THEN 'tiene_permiso(''gestion_documental:documentos:delete'')'
      WHEN r.policyname = 'Users with edit permission can create versions'
        THEN 'tiene_algun_permiso(ARRAY[''gestion_documental:documentos:edit'',''gestion_documental:formatos:create''])'
      WHEN r.policyname = 'Users with permission can request approval'
        THEN 'tiene_algun_permiso(ARRAY[''gestion_documental:formatos:create'',''gestion_documental:documentos:edit''])'
      WHEN r.policyname IN ('qrsf_cliente_update_admin','qrsf_ventas_update_admin','dev_ventas_update_admin','dev_registro_update_auth')
        THEN 'tiene_permiso(''auditorias:qrsf:edit'')'
      WHEN r.policyname IN ('qrsf_ventas_delete_admin','dev_ventas_delete_admin')
        THEN 'tiene_permiso(''auditorias:qrsf:delete'')'
    END;

    nq := regexp_replace(nq, rx, 'tiene_permiso(\2)', 'g');
    nc := regexp_replace(nc, rx, 'tiene_permiso(\2)', 'g');

    IF extra IS NOT NULL THEN
      IF nq IS NOT NULL THEN nq := '(' || nq || ') OR ' || extra; END IF;
      IF nc IS NOT NULL THEN nc := '(' || nc || ') OR ' || extra; END IF;
    END IF;

    IF nq IS DISTINCT FROM q OR nc IS DISTINCT FROM c THEN
      EXECUTE format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename)
        || CASE WHEN nq IS NOT NULL THEN ' USING (' || nq || ')' ELSE '' END
        || CASE WHEN nc IS NOT NULL THEN ' WITH CHECK (' || nc || ')' ELSE '' END;
      RAISE NOTICE 'ALTER % . %', r.tablename, r.policyname;
    END IF;
  END LOOP;
END $$;

-- Matriz legal: gerencia ve; escribir con permiso
CREATE OR REPLACE FUNCTION public.ml_can(p_action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF p_action = 'view' AND is_gerencia(auth.uid()) THEN RETURN true; END IF;
  RETURN tiene_permiso('auditorias:requisitos_legales:' || p_action);
END $$;
