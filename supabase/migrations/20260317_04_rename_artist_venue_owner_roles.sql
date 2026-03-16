-- Rename role values: artist → artist_manager, venue_owner → venue_manager

-- Update existing rows first
UPDATE public.profiles SET role = 'artist_manager' WHERE role = 'artist';
UPDATE public.profiles SET role = 'venue_manager' WHERE role = 'venue_owner';

-- Replace constraint with new allowed values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('member', 'artist_manager', 'venue_manager', 'admin', 'owner'));
