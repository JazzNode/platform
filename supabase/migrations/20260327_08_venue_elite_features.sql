-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Elite venue features: custom_slug, seo, ai summary        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Custom URL slug (e.g. jazznode.com/blue-note instead of jazznode.com/venues/rec123)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS custom_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_custom_slug
  ON venues (custom_slug) WHERE custom_slug IS NOT NULL;
