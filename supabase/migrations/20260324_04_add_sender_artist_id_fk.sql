-- Add foreign key on sender_artist_id so Supabase PostgREST can resolve
-- the `sender_artist:artists!sender_artist_id(...)` embed in venue comment queries.
-- Without this FK the entire select fails and no comments are returned.

ALTER TABLE public.venue_comments
  ADD CONSTRAINT venue_comments_sender_artist_id_fkey
  FOREIGN KEY (sender_artist_id) REFERENCES public.artists(artist_id)
  ON DELETE SET NULL;
