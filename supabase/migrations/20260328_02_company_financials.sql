-- Company Expenses table
CREATE TABLE public.company_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('cloud', 'ai', 'workspace', 'domain', 'virtual_office', 'phone', 'marketing', 'personnel', 'other')),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_recurring boolean NOT NULL DEFAULT true,
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage expenses" ON public.company_expenses
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));

-- Company Revenue table
CREATE TABLE public.company_revenue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('stripe', 'manual', 'sponsorship', 'other')),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  revenue_date date NOT NULL,
  stripe_payment_id text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.company_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage revenue" ON public.company_revenue
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));

-- Prefill expenses
INSERT INTO public.company_expenses (category, name, amount, currency, is_recurring, billing_cycle, start_date, notes) VALUES
  ('cloud', 'Vercel Pro', 20.00, 'USD', true, 'monthly', '2026-03-01', NULL),
  ('cloud', 'Supabase Pro', 25.00, 'USD', true, 'monthly', '2026-03-01', NULL),
  ('cloud', 'Supabase Custom Domain', 10.00, 'USD', true, 'monthly', '2026-03-01', NULL),
  ('ai', 'Claude Code (5x Max)', 25.00, 'USD', true, 'monthly', '2026-03-01', NULL),
  ('workspace', 'Google Workspace (Business Plus)', 16.50, 'USD', true, 'monthly', '2026-03-01', '2026/07 後回復原價 $22.00'),
  ('virtual_office', 'Stable (Virtual Address)', 24.50, 'USD', true, 'monthly', '2026-03-01', '年繳攤提，前3個月免費'),
  ('phone', 'Quo (US Phone)', 19.00, 'USD', true, 'monthly', '2026-03-01', '前3個月免費'),
  ('other', 'Apple Developer Program', 99.00, 'USD', true, 'yearly', '2026-03-01', NULL),
  ('other', 'Stripe Atlas Registered Agent', 100.00, 'USD', true, 'yearly', '2027-01-01', '首年含在 Atlas 費用中'),
  ('other', 'Stripe Atlas (公司設立)', 500.00, 'USD', false, 'one_time', '2026-03-01', '一次性費用');
