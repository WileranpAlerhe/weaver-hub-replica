ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.leads ALTER COLUMN external_ref DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leads_session_id_key ON public.leads (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);