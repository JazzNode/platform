-- Add sender_role and sender_artist_id to venue_comments
-- Allows users to choose which identity they post as (member, artist, venue, admin).

ALTER TABLE public.venue_comments ADD COLUMN sender_role text;
-- null = member (default), 'venue_manager', 'artist', 'admin'

ALTER TABLE public.venue_comments ADD COLUMN sender_artist_id text;
-- When sender_role = 'artist', records which specific artist.
-- References artists(artist_id) logically; not enforced via FK
-- because artists PK is text (slug), not uuid.
