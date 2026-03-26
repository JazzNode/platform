-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Extended brand customization for Elite venues              ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Section visibility & ordering (JSON: { "about": true, "gallery": false, ... })
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_sections_visible jsonb DEFAULT '{}';
-- Section order (JSON array: ["hero","featured","upcoming","announcements","about",...])
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_sections_order text[];

-- Font pairing
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_font_pair text; -- e.g. 'playfair-inter', 'cormorant-lato'

-- Hero style
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_hero_style text DEFAULT 'cinematic'; -- 'cinematic' | 'contained' | 'minimal'
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_hero_text_align text DEFAULT 'left'; -- 'left' | 'center' | 'right'
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_hero_overlay_opacity real DEFAULT 0.6; -- 0.0 to 1.0

-- Custom CTA text (replaces default "Follow" button label)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_cta_text text;

-- Custom OG image
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_og_image_url text;

-- Custom favicon (for custom domain)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_favicon_url text;
