-- Extend profiles table with display_name, bio, website
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS website text;

-- Make profiles publicly readable (for public profile pages)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT
  USING (true);
