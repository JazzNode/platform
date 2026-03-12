-- 1. 確保同一 artist/venue 不會有多個 approved claim
CREATE UNIQUE INDEX idx_claims_unique_approved
  ON public.claims (target_type, target_id)
  WHERE status = 'approved';

-- 2. Claim 狀態變更時自動同步 profiles
CREATE OR REPLACE FUNCTION public.sync_claim_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Claim 被 approve
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.profiles
    SET
      claimed_artist_ids = array_append(
        array_remove(claimed_artist_ids, NEW.target_id),
        NEW.target_id
      ),
      role = CASE
        WHEN NEW.target_type = 'artist' AND role = 'member' THEN 'artist'
        WHEN NEW.target_type = 'venue' AND role = 'member' THEN 'venue_owner'
        ELSE role
      END,
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  -- Claim 被撤銷（從 approved 變成其他狀態）
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.profiles
    SET
      claimed_artist_ids = array_remove(claimed_artist_ids, OLD.target_id),
      updated_at = now()
    WHERE id = OLD.user_id;

    -- 如果沒有其他 approved claims，降回 member
    UPDATE public.profiles
    SET role = 'member', updated_at = now()
    WHERE id = OLD.user_id
      AND array_length(claimed_artist_ids, 1) IS NULL
      AND role IN ('artist', 'venue_owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_claim_status_change
  AFTER UPDATE OF status ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.sync_claim_approval();
