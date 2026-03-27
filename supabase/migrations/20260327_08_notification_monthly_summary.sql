-- Add 'monthly_summary' to notification type constraint for Elite monthly digest
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'general', 'follow_update', 'claim_status', 'system', 'new_member',
    'badge', 'message', 'comment_reply', 'claim_review',
    'fan_insights', 'post_show_recap', 'weekly_digest',
    'shoutout', 'shoutout_pinned', 'epk_download',
    'monthly_summary'
  ));
