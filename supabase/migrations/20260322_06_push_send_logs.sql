-- Log each push notification cron run for observability
CREATE TABLE IF NOT EXISTS push_send_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at timestamptz DEFAULT now(),
  dry_run boolean NOT NULL DEFAULT false,
  events_tonight integer NOT NULL DEFAULT 0,
  audience_size integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  cleaned integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error text
);

-- Only service-role writes; no public access needed
ALTER TABLE push_send_logs ENABLE ROW LEVEL SECURITY;
