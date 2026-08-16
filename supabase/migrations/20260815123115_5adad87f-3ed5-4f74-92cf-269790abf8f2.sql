CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_txn_status_key UNIQUE (transaction_id, status)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_events TO anon, authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "server only payment_events"
  ON public.payment_events FOR ALL
  USING (public.app_server_secret_ok())
  WITH CHECK (public.app_server_secret_ok());