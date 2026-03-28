-- Add Stripe Connect account ID to venues (for ticketing)
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_venues_stripe_connect ON public.venues (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
