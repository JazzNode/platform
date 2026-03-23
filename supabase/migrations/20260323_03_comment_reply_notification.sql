-- Add comment_reply to notification type CHECK constraint
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'follow_update', 'claim_status', 'system', 'new_member', 'badge', 'message', 'comment_reply'));
