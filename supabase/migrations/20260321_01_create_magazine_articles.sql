-- Magazine articles table for JazzNode Magazine
-- Supports 6-language content, linked artists/venues, and editorial workflow

CREATE TABLE IF NOT EXISTS magazine_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  category text NOT NULL DEFAULT 'artist-feature' CHECK (category IN ('artist-feature', 'venue-spotlight', 'scene-report', 'culture')),
  is_featured boolean NOT NULL DEFAULT false,

  -- Titles (6 languages)
  title_en text,
  title_zh text,
  title_ja text,
  title_ko text,
  title_th text,
  title_id text,

  -- Excerpts / SEO descriptions (AI-generated, optionally overridden)
  excerpt_en text,
  excerpt_zh text,
  excerpt_ja text,
  excerpt_ko text,
  excerpt_th text,
  excerpt_id text,

  -- Full article body in Markdown (6 languages)
  body_en text,
  body_zh text,
  body_ja text,
  body_ko text,
  body_th text,
  body_id text,

  -- Images
  cover_image_url text,
  gallery_urls jsonb DEFAULT '[]'::jsonb,

  -- Linked entities
  linked_artist_ids uuid[] DEFAULT '{}',
  linked_venue_ids uuid[] DEFAULT '{}',
  linked_city_ids uuid[] DEFAULT '{}',

  -- Metadata
  author_name text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Source language (which language the editor wrote in)
  source_lang text NOT NULL DEFAULT 'zh' CHECK (source_lang IN ('en', 'zh', 'ja', 'ko', 'th', 'id'))
);

-- Index for public queries
CREATE INDEX idx_magazine_status_published ON magazine_articles (status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_magazine_featured ON magazine_articles (is_featured, published_at DESC) WHERE is_featured = true AND status = 'published';
CREATE INDEX idx_magazine_category ON magazine_articles (category, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_magazine_slug ON magazine_articles (slug);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_magazine_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_magazine_updated_at
  BEFORE UPDATE ON magazine_articles
  FOR EACH ROW EXECUTE FUNCTION update_magazine_updated_at();

-- RLS: public can read published articles, admins can do everything
ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON magazine_articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all articles"
  ON magazine_articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );
