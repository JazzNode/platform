-- Add admin management columns to badges table
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
