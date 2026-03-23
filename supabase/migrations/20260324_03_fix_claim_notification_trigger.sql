-- Fix: notify_admins_on_new_claim used non-existent columns (slug, name)
-- Correct columns: venue_id / artist_id, and COALESCE(name_en, name_local, display_name)

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
