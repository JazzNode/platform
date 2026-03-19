-- Venue micro-reviews: short ratings + optional text, with anonymous posting support.

CREATE TABLE public.venue_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text CHECK (char_length(text) <= 200),
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, venue_id)
);

CREATE INDEX idx_venue_reviews_venue ON public.venue_reviews(venue_id);
CREATE INDEX idx_venue_reviews_user ON public.venue_reviews(user_id);

ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly viewable"
  ON public.venue_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON public.venue_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.venue_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.venue_reviews FOR DELETE
  USING (auth.uid() = user_id);
