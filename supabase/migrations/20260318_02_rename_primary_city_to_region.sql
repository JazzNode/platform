-- Rename primary_city → region and expand allowed values
-- Region is now required for onboarding (but nullable for existing users)

ALTER TABLE public.profiles
  RENAME COLUMN primary_city TO region;

DROP INDEX IF EXISTS idx_profiles_primary_city;

COMMENT ON COLUMN public.profiles.region IS '使用者所在地區。營運市場：taiwan, hong_kong, singapore, malaysia, japan, south_korea, thailand, indonesia, philippines。大洲兜底：asia_other, north_america, europe, oceania, other。用於預設篩選活動與場館，以及市場分佈分析';

CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles (region)
  WHERE region IS NOT NULL;
