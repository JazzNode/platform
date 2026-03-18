-- Allow multiple users to claim the same artist/venue (multiple managers)
-- Previously only ONE approved claim was allowed per entity.

-- 1. Drop the old unique constraint (one approved claim per entity)
DROP INDEX IF EXISTS idx_claims_unique_approved;

-- 2. Add a new unique constraint: same USER cannot have multiple approved claims
--    for the same entity, but different users CAN.
CREATE UNIQUE INDEX idx_claims_unique_user_approved
  ON public.claims (user_id, target_type, target_id)
  WHERE status = 'approved';

-- 3. Also prevent duplicate pending claims from the same user for the same entity
CREATE UNIQUE INDEX idx_claims_unique_user_pending
  ON public.claims (user_id, target_type, target_id)
  WHERE status = 'pending';
