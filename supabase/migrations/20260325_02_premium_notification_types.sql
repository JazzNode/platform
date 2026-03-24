-- Add premium feature notification types: fan_insights, post_show_recap, weekly_digest
alter table notifications
  drop constraint if exists notifications_type_check;

alter table notifications
  add constraint notifications_type_check
  CHECK (type IN (
    'general', 'follow_update', 'claim_status', 'system', 'new_member',
    'badge', 'message', 'comment_reply', 'claim_review',
    'fan_insights', 'post_show_recap', 'weekly_digest'
  ));
