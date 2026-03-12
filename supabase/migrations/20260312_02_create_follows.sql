-- Create follows table (replaces favorites with richer features)
CREATE TABLE public.follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('artist', 'venue', 'event', 'user')),
  target_id text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_level text NOT NULL DEFAULT 'All'
    CHECK (notification_level IN ('All', 'Important', 'None')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, target_type, target_id)
);

-- Indexes
CREATE INDEX idx_follows_user_id ON public.follows (user_id);
CREATE INDEX idx_follows_target ON public.follows (target_type, target_id);
CREATE INDEX idx_follows_target_user ON public.follows (target_user_id)
  WHERE target_user_id IS NOT NULL;

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are publicly viewable"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follows"
  ON public.follows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
  ON public.follows FOR DELETE
  USING (auth.uid() = user_id);

-- Migrate existing favorites data into follows
INSERT INTO public.follows (user_id, target_type, target_id, notification_level, created_at)
SELECT user_id, item_type, item_id, 'All', created_at
FROM public.favorites
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

-- Mark favorites as deprecated
COMMENT ON TABLE public.favorites IS 'DEPRECATED: migrated to follows table. Will be dropped after stabilization.';
