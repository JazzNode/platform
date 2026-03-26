-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Add brand theming fields to venues (Elite tier)           ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_theme_id text;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS brand_accent_color text;
