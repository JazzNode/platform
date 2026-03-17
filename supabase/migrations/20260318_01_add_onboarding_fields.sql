-- Add onboarding fields: primary_city and user_type
-- These are collected via progressive profiling after first login

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_city text,
  ADD COLUMN IF NOT EXISTS user_type text
    CHECK (user_type IN ('fan', 'industry'));

COMMENT ON COLUMN public.profiles.primary_city IS '使用者的主場城市（如 taipei, kaohsiung, hong_kong, singapore），用於預設篩選活動與場館';
COMMENT ON COLUMN public.profiles.user_type IS '使用者身分類型：fan（爵士愛好者）或 industry（樂手/經紀人/場館經營者/產業人員），用於區分 To-C 與 To-B 體驗';

CREATE INDEX IF NOT EXISTS idx_profiles_primary_city ON public.profiles (primary_city)
  WHERE primary_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles (user_type)
  WHERE user_type IS NOT NULL;
