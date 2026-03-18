-- Fix sync_claim_approval trigger to use renamed role values
-- (artist → artist_manager, venue_owner → venue_manager)
-- The constraint profiles_role_check was updated in 20260317_04 but the trigger was not.

CREATE OR REPLACE FUNCTION public.sync_claim_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Claim approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    IF NEW.target_type = 'artist' THEN
      UPDATE public.profiles
      SET
        claimed_artist_ids = array_append(
          array_remove(claimed_artist_ids, NEW.target_id),
          NEW.target_id
        ),
        role = CASE WHEN role = 'member' THEN 'artist_manager' ELSE role END,
        updated_at = now()
      WHERE id = NEW.user_id;
    ELSIF NEW.target_type = 'venue' THEN
      UPDATE public.profiles
      SET
        claimed_venue_ids = array_append(
          array_remove(claimed_venue_ids, NEW.target_id),
          NEW.target_id
        ),
        role = CASE WHEN role = 'member' THEN 'venue_manager' ELSE role END,
        updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  -- Claim revoked
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF OLD.target_type = 'artist' THEN
      UPDATE public.profiles
      SET
        claimed_artist_ids = array_remove(claimed_artist_ids, OLD.target_id),
        updated_at = now()
      WHERE id = OLD.user_id;
    ELSIF OLD.target_type = 'venue' THEN
      UPDATE public.profiles
      SET
        claimed_venue_ids = array_remove(claimed_venue_ids, OLD.target_id),
        updated_at = now()
      WHERE id = OLD.user_id;
    END IF;

    -- Downgrade role if no remaining approved claims
    UPDATE public.profiles
    SET role = 'member', updated_at = now()
    WHERE id = OLD.user_id
      AND (claimed_artist_ids IS NULL OR array_length(claimed_artist_ids, 1) IS NULL)
      AND (claimed_venue_ids IS NULL OR array_length(claimed_venue_ids, 1) IS NULL)
      AND role IN ('artist_manager', 'venue_manager');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
