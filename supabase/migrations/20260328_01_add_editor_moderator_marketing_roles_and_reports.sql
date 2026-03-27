-- Add editor, moderator, marketing roles + comment reports system

-- 1a. Expand profiles.role CHECK constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('member', 'artist_manager', 'venue_manager', 'editor', 'moderator', 'marketing', 'admin', 'owner'));

-- 1b. Create comment_reports table
CREATE TABLE public.comment_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES public.venue_comments(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'other')),
  details text CHECK (char_length(details) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'actioned')),
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  resolution_action text CHECK (resolution_action IN ('dismissed', 'hidden', 'deleted')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (comment_id, reporter_id)
);

CREATE INDEX idx_comment_reports_status ON public.comment_reports(status);
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON public.comment_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.comment_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "HQ staff can view all reports" ON public.comment_reports
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'owner')
  ));

CREATE POLICY "HQ staff can update reports" ON public.comment_reports
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'owner')
  ));

-- 1c. Add is_hidden to venue_comments
ALTER TABLE public.venue_comments ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
