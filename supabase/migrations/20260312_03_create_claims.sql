-- Create claims table for artist/venue ownership claims
CREATE TABLE public.claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('artist', 'venue')),
  target_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_text text,
  evidence_files jsonb DEFAULT '[]',
  submitted_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_claims_status ON public.claims (status);
CREATE INDEX idx_claims_user_id ON public.claims (user_id);
CREATE INDEX idx_claims_target ON public.claims (target_type, target_id);

-- RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims"
  ON public.claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Approved claims are public"
  ON public.claims FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can submit claims"
  ON public.claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update claims"
  ON public.claims FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
