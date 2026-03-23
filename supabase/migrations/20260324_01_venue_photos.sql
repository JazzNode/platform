-- Venue Photo Gallery
-- Allows claimed venue owners (tier >= 1) to upload and manage gallery photos.

CREATE TABLE IF NOT EXISTS venue_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id text NOT NULL,
  photo_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_photos_venue_id ON venue_photos(venue_id, sort_order);

ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can view venue photos
CREATE POLICY "venue_photos_select" ON venue_photos
  FOR SELECT USING (true);

-- Owner insert: authenticated users who have claimed the venue
CREATE POLICY "venue_photos_insert" ON venue_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND venue_id = ANY(claimed_venue_ids)
    )
  );

-- Owner update: can update own photos for venues they've claimed
CREATE POLICY "venue_photos_update" ON venue_photos
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND venue_id = ANY(claimed_venue_ids)
    )
  );

-- Owner delete: can delete own photos for venues they've claimed
CREATE POLICY "venue_photos_delete" ON venue_photos
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND venue_id = ANY(claimed_venue_ids)
    )
  );
