-- Add 'badge_earned' to notification type check constraint
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'follow_update', 'claim_status', 'system', 'new_member', 'badge_earned'));

-- ============================================================
-- Trigger: notify artist owners when an artist badge is earned
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_artist_badge_earned()
RETURNS trigger AS $$
DECLARE
  _owner_id uuid;
  _badge_name text;
BEGIN
  -- Look up badge display name (zh first, fallback en)
  SELECT COALESCE(name_zh, name_en) INTO _badge_name
  FROM public.badges WHERE badge_id = NEW.badge_id;

  -- Notify each user who has claimed this artist
  FOR _owner_id IN
    SELECT id FROM public.profiles
    WHERE NEW.artist_id = ANY(claimed_artist_ids)
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status)
    VALUES (
      _owner_id,
      '🏆 獲得新成就',
      COALESCE(_badge_name, NEW.badge_id),
      'badge_earned',
      'artist',
      NEW.artist_id,
      'sent'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_artist_badge_earned
  AFTER INSERT ON public.artist_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_artist_badge_earned();

-- ============================================================
-- Trigger: notify venue owners when a venue badge is earned
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_venue_badge_earned()
RETURNS trigger AS $$
DECLARE
  _owner_id uuid;
  _badge_name text;
BEGIN
  SELECT COALESCE(name_zh, name_en) INTO _badge_name
  FROM public.badges WHERE badge_id = NEW.badge_id;

  FOR _owner_id IN
    SELECT id FROM public.profiles
    WHERE NEW.venue_id = ANY(claimed_venue_ids)
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status)
    VALUES (
      _owner_id,
      '🏆 獲得新成就',
      COALESCE(_badge_name, NEW.badge_id),
      'badge_earned',
      'venue',
      NEW.venue_id,
      'sent'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_venue_badge_earned
  AFTER INSERT ON public.venue_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_venue_badge_earned();
