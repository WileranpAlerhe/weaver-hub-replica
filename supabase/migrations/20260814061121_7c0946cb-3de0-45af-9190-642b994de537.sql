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
  external_ref text UNIQUE NOT NULL,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_pinpay_id_idx ON public.leads (pinpay_id);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;