-- ╔══════════════════════════════════════════════════════════════╗
-- ║  venue_merchandise — product catalog for venues (Phase 1)  ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS venue_merchandise (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     text NOT NULL,
  name         text NOT NULL,
  description  text,
  price        integer,          -- smallest currency unit; currency derived from venue region
  image_url    text,
  external_url text,             -- external purchase link (Phase 1)
  available    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_merchandise_venue
  ON venue_merchandise (venue_id, available, sort_order);

-- ── RLS ──
ALTER TABLE venue_merchandise ENABLE ROW LEVEL SECURITY;

-- Public: read available products
CREATE POLICY "venue_merchandise_select_available"
  ON venue_merchandise FOR SELECT
  USING (available = true);

-- Owner/admin: read all (including unavailable)
CREATE POLICY "venue_merchandise_select_owner"
  ON venue_merchandise FOR SELECT
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

-- Owner/admin: insert
CREATE POLICY "venue_merchandise_insert"
  ON venue_merchandise FOR INSERT
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

-- Owner/admin: update
CREATE POLICY "venue_merchandise_update"
  ON venue_merchandise FOR UPDATE
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

-- Owner/admin: delete
CREATE POLICY "venue_merchandise_delete"
  ON venue_merchandise FOR DELETE
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
