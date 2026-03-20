-- Add is_public column to profiles for profile visibility control.
-- Default true so existing profiles remain publicly visible.

ALTER TABLE public.profiles
  ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Replace the blanket public-read policy with one that respects is_public.
-- Users can always read their own profile regardless of visibility.
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;

CREATE POLICY "Profiles are viewable when public or own"
  ON public.profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

-- Admins can still read all profiles (service-role bypasses RLS).
