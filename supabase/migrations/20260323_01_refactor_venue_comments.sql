-- Refactor venue_reviews → venue_comments
-- Remove star ratings, add tag-based feedback, image upload, and reply support.

-- 1. Rename table
ALTER TABLE public.venue_reviews RENAME TO venue_comments;

-- 2. Drop rating column and one-per-user constraint
ALTER TABLE public.venue_comments DROP COLUMN rating;

-- 3. Drop old text length check, add new one (500 chars)
ALTER TABLE public.venue_comments DROP CONSTRAINT IF EXISTS venue_reviews_text_check;
ALTER TABLE public.venue_comments ADD CONSTRAINT venue_comments_text_check CHECK (char_length(text) <= 500);

-- 4. Add tag array + image columns
ALTER TABLE public.venue_comments ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.venue_comments ADD COLUMN image_url text;

-- 5. Rename indexes
ALTER INDEX IF EXISTS idx_venue_reviews_venue RENAME TO idx_venue_comments_venue;
ALTER INDEX IF EXISTS idx_venue_reviews_user RENAME TO idx_venue_comments_user;

-- 6. Recreate RLS policies with new names
DROP POLICY IF EXISTS "Reviews are publicly viewable" ON public.venue_comments;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.venue_comments;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.venue_comments;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.venue_comments;

CREATE POLICY "Comments are publicly viewable"
  ON public.venue_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments"
  ON public.venue_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.venue_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.venue_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Drop unique constraint (allow multiple comments per user per venue)
ALTER TABLE public.venue_comments DROP CONSTRAINT IF EXISTS venue_reviews_user_id_venue_id_key;

-- ──────────────────────────────────────────────
-- 8. Create replies table
-- ──────────────────────────────────────────────

CREATE TABLE public.venue_comment_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES public.venue_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_role text, -- null=member, 'venue_manager', 'artist', 'admin'
  body text NOT NULL CHECK (char_length(body) <= 500),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_venue_comment_replies_comment ON public.venue_comment_replies(comment_id);
CREATE INDEX idx_venue_comment_replies_user ON public.venue_comment_replies(user_id);

ALTER TABLE public.venue_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are publicly viewable"
  ON public.venue_comment_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert replies"
  ON public.venue_comment_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON public.venue_comment_replies FOR DELETE
  USING (auth.uid() = user_id);
