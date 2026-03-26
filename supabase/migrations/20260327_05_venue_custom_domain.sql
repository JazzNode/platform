-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Add custom_domain to venues (Elite tier feature)          ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE venues ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS custom_domain_verified boolean NOT NULL DEFAULT false;

-- Unique constraint: no two venues can have the same custom domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_custom_domain
  ON venues (custom_domain) WHERE custom_domain IS NOT NULL;

-- Fast lookup by custom domain (used in proxy.ts on every request)
CREATE INDEX IF NOT EXISTS idx_venues_custom_domain_lookup
  ON venues (custom_domain) WHERE custom_domain IS NOT NULL AND custom_domain_verified = true;
