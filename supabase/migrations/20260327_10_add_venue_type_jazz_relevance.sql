-- Add venue_type and jazz_relevance for multi-genre venue support
-- venue_type: 'jazz' (pure jazz, all events auto-confirmed) | 'multi_genre' (needs classification)
-- jazz_relevance: 'confirmed' | 'likely' | 'unrelated' | 'pending'

ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_type text NOT NULL DEFAULT 'jazz'
  CHECK (venue_type IN ('jazz', 'multi_genre'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS jazz_relevance text NOT NULL DEFAULT 'confirmed'
  CHECK (jazz_relevance IN ('confirmed', 'likely', 'unrelated', 'pending'));

CREATE INDEX IF NOT EXISTS idx_events_jazz_relevance ON events (jazz_relevance);

COMMENT ON COLUMN venues.venue_type IS 'jazz = pure jazz venue (all events auto-confirmed), multi_genre = mixed programming (events need classification)';
COMMENT ON COLUMN events.jazz_relevance IS 'confirmed = definitely jazz, likely = jazz-adjacent, unrelated = not jazz, pending = awaiting classification';
