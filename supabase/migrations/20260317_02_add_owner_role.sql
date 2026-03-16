-- Add 'owner' role to profiles role constraint
-- Owner has all admin privileges + can manage admin roles

-- Drop old constraint and add new one with 'owner'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('member', 'artist', 'venue_owner', 'admin', 'owner'));

-- Update RLS: "Admins can update any profile" → include owner
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')
    )
  );

-- Set fish00123@gmail.com as owner
UPDATE public.profiles
SET role = 'owner'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'fish00123@gmail.com' LIMIT 1
);
