-- Add archived_at column for soft-delete (archive) instead of hard delete.
-- This preserves notification records so dedup triggers (e.g. badge_earned) still work.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Drop the DELETE policy — we no longer hard-delete notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
