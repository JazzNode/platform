-- Helper function for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create tickets_orders table
CREATE TABLE public.tickets_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TWD',
  payment_method text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  external_order_ref text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_orders_user_id ON public.tickets_orders (user_id);
CREATE INDEX idx_orders_event_id ON public.tickets_orders (event_id);
CREATE INDEX idx_orders_status ON public.tickets_orders (status);

-- Auto-update updated_at
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.tickets_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.tickets_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.tickets_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON public.tickets_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
