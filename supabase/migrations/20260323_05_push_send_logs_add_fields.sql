-- Add env and error_code columns to push_send_logs for better observability.
-- Aligns with pipeline logger fields (run_id, env, error_code).

ALTER TABLE push_send_logs
  ADD COLUMN IF NOT EXISTS env text,
  ADD COLUMN IF NOT EXISTS error_code text;

-- env: 'production' | 'preview' | 'development' — set by the cron handler
-- error_code: structured error code (e.g. 'VAPID_MISSING', 'NO_EVENTS', 'SEND_PARTIAL')
--   complementing the free-text `error` column for easier filtering

COMMENT ON COLUMN push_send_logs.env IS 'Vercel deployment environment (production/preview/development)';
COMMENT ON COLUMN push_send_logs.error_code IS 'Structured error code for filtering (e.g. VAPID_MISSING, SEND_PARTIAL)';
