-- Push notification webhook trigger
-- Fires on every INSERT to notifications table, calling the Vercel webhook
-- via pg_net to send a Web Push notification to the user's devices.
--
-- Prerequisites:
--   1. pg_net extension enabled (Supabase enables it by default)
--   2. Supabase vault secrets set:
--      - PUSH_WEBHOOK_URL: e.g. https://jazznode.com/api/push/on-notification
--      - PUSH_WEBHOOK_SECRET: shared secret (same as PUSH_WEBHOOK_SECRET env var in Vercel)
--
-- To set vault secrets (run once in Supabase SQL Editor):
--   SELECT vault.create_secret('https://jazznode.com/api/push/on-notification', 'PUSH_WEBHOOK_URL');
--   SELECT vault.create_secret('your-secret-here', 'PUSH_WEBHOOK_SECRET');

-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: POST notification payload to Vercel webhook
CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url text;
  v_webhook_secret text;
BEGIN
  -- Only process notifications that have a user target
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read webhook config from vault
  SELECT decrypted_secret INTO v_webhook_url
  FROM vault.decrypted_secrets WHERE name = 'PUSH_WEBHOOK_URL' LIMIT 1;

  SELECT decrypted_secret INTO v_webhook_secret
  FROM vault.decrypted_secrets WHERE name = 'PUSH_WEBHOOK_SECRET' LIMIT 1;

  -- Skip if webhook not configured (graceful degradation)
  IF v_webhook_url IS NULL OR v_webhook_secret IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST via pg_net
  PERFORM net.http_post(
    url := v_webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    body := jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'type', NEW.type,
      'reference_type', NEW.reference_type,
      'reference_id', NEW.reference_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to notifications table
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;
CREATE TRIGGER on_notification_insert_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.push_on_notification();
