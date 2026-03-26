ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS intent_type text
  CHECK (intent_type IS NULL OR intent_type IN ('booking', 'lesson', 'collaboration'));
