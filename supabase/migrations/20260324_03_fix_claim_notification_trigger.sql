-- Fix: original migration 20260323_04 was never fully applied to the database.
-- Three issues: (1) claim_review missing from notifications type CHECK constraint,
-- (2) trigger on_claim_insert_notify_admins never created,
-- (3) function used non-existent columns (slug, name).

-- 1. Add claim_review to notification type CHECK constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'follow_update', 'claim_status', 'system', 'new_member', 'badge', 'message', 'comment_reply', 'claim_review'));

-- 2. Fix function: use correct column names (venue_id/artist_id, COALESCE name fields)
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_claim()
RETURNS TRIGGER AS $$
DECLARE
  _admin_id uuid;
  _target_name text;
BEGIN
  -- Only fire when a new claim is inserted with 'pending' status
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Try to resolve a human-readable name for the claimed entity
  IF NEW.target_type = 'artist' THEN
    SELECT COALESCE(name_en, name_local, display_name, NEW.target_id)
      INTO _target_name
      FROM public.artists
      WHERE artist_id = NEW.target_id
      LIMIT 1;
  ELSIF NEW.target_type = 'venue' THEN
    SELECT COALESCE(name_en, name_local, display_name, NEW.target_id)
      INTO _target_name
      FROM public.venues
      WHERE venue_id = NEW.target_id
      LIMIT 1;
  END IF;

  _target_name := COALESCE(_target_name, NEW.target_id);

  -- Notify every admin (owner included via separate role check)
  FOR _admin_id IN
    SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status)
    VALUES (
      _admin_id,
      '新認領申請待審核',
      '有用戶申請認領 ' || _target_name || '，請前往審核。',
      'claim_review',
      NEW.target_type,
      NEW.target_id,
      'sent'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger (original migration's trigger was never applied)
DROP TRIGGER IF EXISTS on_claim_insert_notify_admins ON public.claims;
CREATE TRIGGER on_claim_insert_notify_admins
  AFTER INSERT ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_claim();
