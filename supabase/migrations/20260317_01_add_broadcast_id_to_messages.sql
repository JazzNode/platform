-- Add broadcast_id to messages table to link broadcast messages to their source broadcast
ALTER TABLE public.messages
  ADD COLUMN broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE SET NULL;

CREATE INDEX idx_messages_broadcast_id ON public.messages (broadcast_id)
  WHERE broadcast_id IS NOT NULL;
