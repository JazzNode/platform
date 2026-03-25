-- Google Search Console: daily search analytics data warehouse
-- Stores daily GSC metrics by date/country/device/page/query

CREATE TABLE IF NOT EXISTS gsc_search_analytics (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date          DATE         NOT NULL,
  country       TEXT         NOT NULL DEFAULT '',   -- 3-letter ISO code
  device        TEXT         NOT NULL DEFAULT '',   -- DESKTOP, MOBILE, TABLET
  page          TEXT         NOT NULL DEFAULT '',   -- full URL
  query         TEXT         NOT NULL DEFAULT '',   -- search query
  clicks        INTEGER      NOT NULL DEFAULT 0,
  impressions   INTEGER      NOT NULL DEFAULT 0,
  ctr           REAL         NOT NULL DEFAULT 0,    -- 0.0 ~ 1.0
  position      REAL         NOT NULL DEFAULT 0,    -- average position
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Prevent duplicate rows for the same date/country/device/page/query
CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_unique_row
  ON gsc_search_analytics (date, country, device, page, query);

-- Fast lookups by date range
CREATE INDEX IF NOT EXISTS idx_gsc_date
  ON gsc_search_analytics (date DESC);

-- Fast lookups by page (for joining with venue/artist URLs)
CREATE INDEX IF NOT EXISTS idx_gsc_page
  ON gsc_search_analytics (page);

-- Enable RLS (service role bypasses, no public access needed)
ALTER TABLE gsc_search_analytics ENABLE ROW LEVEL SECURITY;

-- Sync status tracking
CREATE TABLE IF NOT EXISTS gsc_sync_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  synced_date   DATE         NOT NULL,              -- which GSC date was synced
  rows_upserted INTEGER      NOT NULL DEFAULT 0,
  duration_ms   INTEGER      NOT NULL DEFAULT 0,
  error         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsc_sync_date
  ON gsc_sync_logs (synced_date DESC);

COMMENT ON TABLE gsc_search_analytics IS 'Daily Google Search Console search performance data';
COMMENT ON TABLE gsc_sync_logs IS 'GSC data sync run logs for monitoring';
