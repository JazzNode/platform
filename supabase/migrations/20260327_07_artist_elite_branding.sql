-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Add Elite branding fields to artists                      ║
-- ║  theme, CTA, vanity slug, OG image, custom domain          ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS brand_theme_id text,
  ADD COLUMN IF NOT EXISTS custom_cta_label text,
  ADD COLUMN IF NOT EXISTS custom_cta_url text,
  ADD COLUMN IF NOT EXISTS custom_slug text,
  ADD COLUMN IF NOT EXISTS brand_og_image_url text,
  ADD COLUMN IF NOT EXISTS brand_custom_domain text;

-- Vanity slug must be unique (partial index — only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_custom_slug
  ON public.artists (custom_slug) WHERE custom_slug IS NOT NULL;

-- Custom domain must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_custom_domain
  ON public.artists (brand_custom_domain) WHERE brand_custom_domain IS NOT NULL;
