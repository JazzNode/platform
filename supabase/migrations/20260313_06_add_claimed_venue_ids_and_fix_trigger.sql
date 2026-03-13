-- 1. Add claimed_venue_ids column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS claimed_venue_ids text[] DEFAULT '{}';

-- 2. Fix sync_claim_approval trigger to handle venues separately
-- (Previously venues were incorrectly written to claimed_artist_ids)
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
        role = CASE WHEN role = 'member' THEN 'artist' ELSE role END,
        updated_at = now()
      WHERE id = NEW.user_id;
    ELSIF NEW.target_type = 'venue' THEN
      UPDATE public.profiles
      SET
        claimed_venue_ids = array_append(
          array_remove(claimed_venue_ids, NEW.target_id),
          NEW.target_id
        ),
        role = CASE WHEN role = 'member' THEN 'venue_owner' ELSE role END,
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
      AND role IN ('artist', 'venue_owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RLS policy for venue owners to update their venues
CREATE POLICY "Claimed users can update their venues"
  ON public.venues FOR UPDATE
  USING (
    venue_id = ANY (
      SELECT unnest(claimed_venue_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );
