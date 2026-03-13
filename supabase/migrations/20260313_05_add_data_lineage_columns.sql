-- Add data lineage tracking columns to artists and venues tables.
-- data_source: who/what produced the current field values ('system' = pipeline/scraper, 'user' = claimed artist, 'admin')
-- updated_by:  UUID of the user or admin who last manually edited the record (NULL = pipeline-owned)

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.artists.data_source IS '資料來源標記：system = 爬蟲/Pipeline 產生, user = 已認領藝術家本人修改, admin = 管理員修改';
COMMENT ON COLUMN public.artists.updated_by  IS '最後手動修改者的 user UUID（NULL 表示尚未被手動修改）';
COMMENT ON COLUMN public.venues.data_source  IS '資料來源標記：system = 爬蟲/Pipeline 產生, user = 場地方修改, admin = 管理員修改';
COMMENT ON COLUMN public.venues.updated_by   IS '最後手動修改者的 user UUID（NULL 表示尚未被手動修改）';
