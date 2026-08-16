CREATE OR REPLACE FUNCTION public.app_server_secret_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-app-server-secret',
    ''
  ) = 'fm-mickNSUPkTbK00aaBRdZAAe9mnzgdysTIEC6883s'
$$;

GRANT EXECUTE ON FUNCTION public.app_server_secret_ok() TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fb_settings TO anon;

DROP POLICY IF EXISTS "server_secret_full_access" ON public.leads;
CREATE POLICY "server_secret_full_access" ON public.leads
  FOR ALL TO anon, authenticated
  USING (public.app_server_secret_ok())
  WITH CHECK (public.app_server_secret_ok());

DROP POLICY IF EXISTS "server_secret_full_access" ON public.fb_settings;
CREATE POLICY "server_secret_full_access" ON public.fb_settings
  FOR ALL TO anon, authenticated
  USING (public.app_server_secret_ok())
  WITH CHECK (public.app_server_secret_ok());