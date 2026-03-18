-- Allow users to withdraw their own approved claims
-- and admins to revoke approved claims.
-- Also revert entity verification_status when last manager leaves.

-- 1. RLS: users can set their own approved claims to 'withdrawn'
CREATE POLICY "Users can withdraw their own approved claims"
  ON public.claims FOR UPDATE
  USING (auth.uid() = user_id AND status = 'approved')
  WITH CHECK (status = 'withdrawn');

-- 2. Extend sync_claim_approval to revert entity when last manager leaves
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

  -- Claim revoked / withdrawn / rejected (status moves away from approved)
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

    -- Revert entity verification_status if no remaining approved claims for this entity
    IF NOT EXISTS (
      SELECT 1 FROM public.claims
      WHERE target_type = OLD.target_type
        AND target_id = OLD.target_id
        AND status = 'approved'
        AND id != OLD.id
    ) THEN
      IF OLD.target_type = 'artist' THEN
        UPDATE public.artists
        SET verification_status = 'Unverified', tier = 0
        WHERE artist_id = OLD.target_id;
      ELSIF OLD.target_type = 'venue' THEN
        UPDATE public.venues
        SET verification_status = 'Unverified', tier = 0
        WHERE venue_id = OLD.target_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
