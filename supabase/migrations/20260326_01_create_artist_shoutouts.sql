-- ═══ Artist Shoutouts (mirrors venue_comments + pin) ═══

CREATE TABLE IF NOT EXISTS public.artist_shoutouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text varchar(500),
  tags text[] DEFAULT '{}',
  image_url text,
  sender_role text,
  sender_artist_id text,
  sender_venue_id text,
  is_pinned boolean DEFAULT false,
  pin_order smallint,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_shoutouts_artist ON public.artist_shoutouts(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_shoutouts_user ON public.artist_shoutouts(user_id);

-- RLS
ALTER TABLE public.artist_shoutouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_shoutouts_select" ON public.artist_shoutouts
  FOR SELECT USING (true);

CREATE POLICY "artist_shoutouts_insert" ON public.artist_shoutouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artist_shoutouts_update_own" ON public.artist_shoutouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "artist_shoutouts_delete_own" ON public.artist_shoutouts
  FOR DELETE USING (auth.uid() = user_id);

-- Allow artist owners to update pin status
CREATE POLICY "artist_shoutouts_pin_by_owner" ON public.artist_shoutouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND artist_id = ANY(claimed_artist_ids)
    )
  );

-- Replies
CREATE TABLE IF NOT EXISTS public.artist_shoutout_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shoutout_id uuid NOT NULL REFERENCES public.artist_shoutouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role text,
  body varchar(500) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_shoutout_replies_shoutout ON public.artist_shoutout_replies(shoutout_id);
CREATE INDEX IF NOT EXISTS idx_artist_shoutout_replies_user ON public.artist_shoutout_replies(user_id);

ALTER TABLE public.artist_shoutout_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_shoutout_replies_select" ON public.artist_shoutout_replies
  FOR SELECT USING (true);

CREATE POLICY "artist_shoutout_replies_insert" ON public.artist_shoutout_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artist_shoutout_replies_delete_own" ON public.artist_shoutout_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Add 'shoutout' to notification type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'follow_update', 'claim_status', 'system', 'new_member', 'badge', 'message', 'comment_reply', 'claim_review', 'fan_insights', 'post_show_recap', 'weekly_digest', 'shoutout', 'shoutout_pinned'));
