-- Fix: Message notification trigger fails because 'message' is not in notifications_type_check
-- and the trigger only handles artist_fan conversations, not member_member/venue_fan/member_hq.
-- This causes ALL message sending to fail with:
--   "new row for relation notifications violates check constraint notifications_type_check"

-- 1. Add 'message' to the notifications type CHECK constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'follow_update', 'claim_status', 'system', 'new_member', 'badge', 'message'));

-- 2. Rewrite trigger to handle all conversation types
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_convo RECORD;
  v_recipient_id uuid;
  v_sender_name text;
BEGIN
  -- Get conversation details
  SELECT type, artist_id, venue_id, fan_user_id, user_b_id INTO v_convo
  FROM conversations WHERE id = NEW.conversation_id;

  -- Get sender display name
  SELECT COALESCE(display_name, handle, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- Determine recipient based on conversation type
  IF v_convo.type = 'member_member' THEN
    -- DM between members: notify the other party
    IF NEW.sender_id = v_convo.fan_user_id THEN
      v_recipient_id := v_convo.user_b_id;
    ELSE
      v_recipient_id := v_convo.fan_user_id;
    END IF;

  ELSIF v_convo.type = 'artist_fan' THEN
    IF NEW.sender_id = v_convo.fan_user_id THEN
      -- Fan sent message → notify the artist owner
      SELECT id INTO v_recipient_id
      FROM profiles
      WHERE v_convo.artist_id = ANY(claimed_artist_ids)
      LIMIT 1;
    ELSE
      -- Artist sent message → notify the fan
      v_recipient_id := v_convo.fan_user_id;
    END IF;

  ELSIF v_convo.type = 'venue_fan' THEN
    IF NEW.sender_id = v_convo.fan_user_id THEN
      -- Fan sent message → notify the venue owner
      SELECT id INTO v_recipient_id
      FROM profiles
      WHERE v_convo.venue_id = ANY(claimed_venue_ids)
      LIMIT 1;
    ELSE
      -- Venue sent message → notify the fan
      v_recipient_id := v_convo.fan_user_id;
    END IF;

  ELSIF v_convo.type = 'member_hq' THEN
    IF NEW.sender_role = 'admin' THEN
      -- Admin replied → notify the member
      v_recipient_id := v_convo.fan_user_id;
    ELSE
      -- Member sent message → notify first admin (optional, skip if no admin)
      SELECT id INTO v_recipient_id
      FROM profiles
      WHERE role = 'admin'
      LIMIT 1;
    END IF;
  END IF;

  -- Don't notify yourself
  IF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.sender_id THEN
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id, status)
    VALUES (
      v_recipient_id,
      v_sender_name || ' sent you a message',
      LEFT(NEW.body, 100),
      'message',
      'conversation',
      NEW.conversation_id,
      'sent'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
