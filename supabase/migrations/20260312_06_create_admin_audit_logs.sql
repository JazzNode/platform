-- Create admin audit logs table for tracking all admin edits
CREATE TABLE public.admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_audit_admin ON public.admin_audit_logs (admin_user_id);
CREATE INDEX idx_audit_entity ON public.admin_audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.admin_audit_logs (created_at);

-- RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
