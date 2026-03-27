-- ╔══════════════════════════════════════════════════════════════╗
-- ║  venue_subscriptions — Elite venue subscription requests    ║
-- ║  setup_completed — onboarding wizard tracking               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS venue_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) NOT NULL,
  venue_name    text NOT NULL,
  venue_address text,
  contact_name  text,
  contact_email text NOT NULL,
  contact_phone text,
  plan          text NOT NULL DEFAULT 'elite',
  notes         text,
  status        text NOT NULL DEFAULT 'pending', -- pending | contacted | approved | rejected
  venue_id      text,  -- filled after venue is created
  processed_by  uuid,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_subscriptions_status
  ON venue_subscriptions (status, created_at DESC);

ALTER TABLE venue_subscriptions ENABLE ROW LEVEL SECURITY;

-- User can read their own subscriptions
CREATE POLICY "venue_subscriptions_select_own"
  ON venue_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- User can insert their own
CREATE POLICY "venue_subscriptions_insert_own"
  ON venue_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin can read all
CREATE POLICY "venue_subscriptions_select_admin"
  ON venue_subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Admin can update
CREATE POLICY "venue_subscriptions_update_admin"
  ON venue_subscriptions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Add setup_completed to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false;
