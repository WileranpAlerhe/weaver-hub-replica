ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS src text,
  ADD COLUMN IF NOT EXISTS sck text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utmify_status text,
  ADD COLUMN IF NOT EXISTS utmify_paid_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS utmify_refunded_sent_at timestamptz;