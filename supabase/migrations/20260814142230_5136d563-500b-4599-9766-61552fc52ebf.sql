CREATE TABLE public.fb_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pixel_id text,
  access_token text,
  test_event_code text,
  admin_password_hash text,
  webhook_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.fb_settings TO service_role;
ALTER TABLE public.fb_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref text UNIQUE,
  pinpay_id text,
  name text,
  email text,
  phone text,
  cpf text,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  fbp text,
  fbc text,
  client_ip text,
  user_agent text,
  event_source_url text,
  checkout_event_id text,
  purchase_event_id text,
  purchase_sent_at timestamptz,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_pinpay_id_idx ON public.leads (pinpay_id);
CREATE UNIQUE INDEX leads_session_id_key ON public.leads (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX leads_created_at_idx ON public.leads (created_at DESC);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "server_secret_full_access" ON public.leads
  FOR ALL TO anon, authenticated
  USING (public.app_server_secret_ok())
  WITH CHECK (public.app_server_secret_ok());

CREATE POLICY "server_secret_full_access" ON public.fb_settings
  FOR ALL TO anon, authenticated
  USING (public.app_server_secret_ok())
  WITH CHECK (public.app_server_secret_ok());