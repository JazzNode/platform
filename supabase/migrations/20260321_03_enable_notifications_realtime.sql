-- Enable Realtime on the notifications table so clients can subscribe to
-- INSERT / UPDATE events and refresh unread counts instantly.
ALTER publication supabase_realtime ADD TABLE public.notifications;
