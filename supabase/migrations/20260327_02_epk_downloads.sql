-- EPK downloads tracking + guest contact leads
-- Logged-in users get an artist_fan conversation; guests get a notification + row here

-- 1. Create epk_downloads table (tracks all downloads, guest or logged-in)
CREATE TABLE public.epk_downloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  guest_role text CHECK (guest_role IS NULL OR guest_role IN ('venue', 'media', 'promoter', 'musician', 'other')),
  downloaded_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_epk_downloads_artist ON public.epk_downloads (artist_id);
CREATE INDEX idx_epk_downloads_date ON public.epk_downloads (downloaded_at DESC);

-- No RLS — only server-side admin client writes to this table
ALTER TABLE public.epk_downloads ENABLE ROW LEVEL SECURITY;

-- Artists who claimed the profile can view their own downloads
CREATE POLICY "Artists can view own EPK downloads"
  ON public.epk_downloads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.claimed_artist_ids @> ARRAY[artist_id]
    )
  );

-- 2. Add 'epk_download' to message intent_type constraint
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_intent_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_intent_type_check
  CHECK (intent_type IS NULL OR intent_type IN ('booking', 'lesson', 'collaboration', 'epk_download'));

-- 3. Add 'epk_download' to notification type constraint
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'general', 'follow_update', 'claim_status', 'system', 'new_member',
    'badge', 'message', 'comment_reply', 'claim_review',
    'fan_insights', 'post_show_recap', 'weekly_digest',
    'shoutout', 'shoutout_pinned', 'epk_download'
  ));
