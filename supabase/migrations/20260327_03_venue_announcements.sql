-- ╔══════════════════════════════════════════════════════════════╗
-- ║  venue_announcements — public announcements for venues     ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS venue_announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  pinned      boolean NOT NULL DEFAULT false,
  published   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz  -- optional auto-hide date
);

-- Index for fast venue lookups (published first, newest first)
CREATE INDEX idx_venue_announcements_venue
  ON venue_announcements (venue_id, published, created_at DESC);

-- ── RLS ──
ALTER TABLE venue_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read published announcements (public venue page)
CREATE POLICY "venue_announcements_select_published"
  ON venue_announcements FOR SELECT
  USING (published = true);

-- Venue owner or admin can read all (including drafts)
CREATE POLICY "venue_announcements_select_owner"
  ON venue_announcements FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'owner')
          OR venue_id = ANY(claimed_venue_ids)
        )
    )
  );

-- Venue owner or admin can insert
CREATE POLICY "venue_announcements_insert"
  ON venue_announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'owner')
          OR venue_id = ANY(claimed_venue_ids)
        )
    )
  );

-- Venue owner or admin can update
CREATE POLICY "venue_announcements_update"
  ON venue_announcements FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'owner')
          OR venue_id = ANY(claimed_venue_ids)
        )
    )
  );

-- Venue owner or admin can delete
CREATE POLICY "venue_announcements_delete"
  ON venue_announcements FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'owner')
          OR venue_id = ANY(claimed_venue_ids)
        )
    )
  );
