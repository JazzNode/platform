-- Fix: prevent duplicate badge_earned notifications
-- Root cause: sync_artist_badges cron can DELETE then RE-INSERT the same badge,
-- firing the INSERT trigger each time without checking if a notification already exists.

-- ============================================================
-- Artist badge notification trigger — with dedup
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_artist_badge_earned()
RETURNS trigger AS $$
DECLARE
  _owner_id uuid;
  _badge_name text;
BEGIN
  SELECT COALESCE(name_zh, name_en) INTO _badge_name
  FROM public.badges WHERE badge_id = NEW.badge_id;

  FOR _owner_id IN
    SELECT id FROM public.profiles
    WHERE NEW.artist_id = ANY(claimed_artist_ids)
  LOOP
    -- Only insert if no matching notification already exists
    INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status)
    SELECT
      _owner_id,
      '🏆 獲得新成就',
      COALESCE(_badge_name, NEW.badge_id),
      'badge_earned',
      'artist',
      NEW.artist_id,
      'sent'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = _owner_id
        AND n.type = 'badge_earned'
        AND n.reference_type = 'artist'
        AND n.reference_id = NEW.artist_id
        AND n.body = COALESCE(_badge_name, NEW.badge_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Venue badge notification trigger — with dedup
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
    SELECT
      _owner_id,
      '🏆 獲得新成就',
      COALESCE(_badge_name, NEW.badge_id),
      'badge_earned',
      'venue',
      NEW.venue_id,
      'sent'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = _owner_id
        AND n.type = 'badge_earned'
        AND n.reference_type = 'venue'
        AND n.reference_id = NEW.venue_id
        AND n.body = COALESCE(_badge_name, NEW.badge_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Clean up existing duplicate notifications
-- Keep only the earliest notification per (user, badge, entity)
-- ============================================================
DELETE FROM public.notifications n1
WHERE n1.type = 'badge_earned'
  AND EXISTS (
    SELECT 1 FROM public.notifications n2
    WHERE n2.user_id = n1.user_id
      AND n2.type = n1.type
      AND n2.reference_type = n1.reference_type
      AND n2.reference_id = n1.reference_id
      AND n2.body = n1.body
      AND n2.created_at < n1.created_at
  );
