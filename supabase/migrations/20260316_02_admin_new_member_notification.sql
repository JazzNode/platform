-- Expand notifications type to include 'new_member'
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'follow_update', 'claim_status', 'system', 'new_member'));

-- Allow service-role / trigger to insert notifications (for handle_new_user)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Update handle_new_user() to also notify all admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _display_name text;
  _admin_id uuid;
BEGIN
  -- 1. Create profile for the new user
  _display_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    _display_name,
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Notify all admin users about the new member
  FOR _admin_id IN
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status)
    VALUES (
      _admin_id,
      '新會員註冊',
      COALESCE(_display_name, '匿名用戶') || ' 剛加入了 JazzNode',
      'new_member',
      'profile',
      new.id::text,
      'sent'
    );
  END LOOP;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
