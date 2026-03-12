-- Extend profiles table with user fields migrated from Airtable Users table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text UNIQUE,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'artist', 'venue_owner', 'admin')),
  ADD COLUMN IF NOT EXISTS legal_first_name text,
  ADD COLUMN IF NOT EXISTS legal_last_name text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS airtable_user_id text UNIQUE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles (handle);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_airtable_user_id ON public.profiles (airtable_user_id)
  WHERE airtable_user_id IS NOT NULL;

-- Update trigger to populate display_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can update any profile (e.g. set role)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
