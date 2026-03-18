-- Add earned_at timestamp to artist_badges and venue_badges junction tables
ALTER TABLE artist_badges ADD COLUMN IF NOT EXISTS earned_at timestamptz DEFAULT now();
ALTER TABLE venue_badges ADD COLUMN IF NOT EXISTS earned_at timestamptz DEFAULT now();
