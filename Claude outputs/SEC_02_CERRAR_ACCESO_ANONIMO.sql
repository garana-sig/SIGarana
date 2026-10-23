-- ═══════════════════════════════════════════════════════════════════
-- SEC_02 · Cerrar acceso anónimo (23 oct 2026, ejecutado por Claude)
-- Hallazgo: con la llave pública (anon) de la app, cualquiera en internet
-- podía leer vw_users_complete (13 usuarios con sus datos) y
-- vw_sst_matriz_peligros, y llamar 68 funciones SECURITY DEFINER
-- (asignar permisos, crear notificaciones, crear usuarios…).
-- Las encuestas públicas (survey_*) NO usan nada de esto y siguen igual.
-- ⚠ Si en el futuro una página pública necesita una función RPC, hay que
--   darle GRANT EXECUTE ... TO anon a esa función en particular.
-- ═══════════════════════════════════════════════════════════════════
ALTER VIEW public.vw_users_complete      SET (security_invoker = on);
ALTER VIEW public.vw_sst_matriz_peligros SET (security_invoker = on);
REVOKE ALL ON public.vw_users_complete, public.vw_sst_matriz_peligros, public.vw_permissions_audit, public.vw_user_permissions_summary FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.vw_users_complete, public.vw_sst_matriz_peligros, public.vw_permissions_audit, public.vw_user_permissions_summary FROM authenticated;

DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
