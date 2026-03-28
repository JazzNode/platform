-- Add Stripe subscription fields to artists and venues
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text;

CREATE INDEX IF NOT EXISTS idx_artists_stripe_customer ON public.artists (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venues_stripe_customer ON public.venues (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_stripe_sub ON public.artists (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venues_stripe_sub ON public.venues (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
