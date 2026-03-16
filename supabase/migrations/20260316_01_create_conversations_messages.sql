-- Create conversations table (unified: artist_fan, member_hq, member_member)
CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL DEFAULT 'artist_fan'
    CHECK (type IN ('artist_fan', 'member_hq', 'member_member')),
  artist_id text,                -- for artist_fan type
  fan_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- for member_member type
  last_message_at timestamptz DEFAULT now(),
  artist_archived boolean DEFAULT false,
  fan_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_conversations_type ON public.conversations (type);
CREATE INDEX idx_conversations_artist_id ON public.conversations (artist_id)
  WHERE artist_id IS NOT NULL;
CREATE INDEX idx_conversations_fan_user_id ON public.conversations (fan_user_id);
CREATE INDEX idx_conversations_user_b_id ON public.conversations (user_b_id)
  WHERE user_b_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message ON public.conversations (last_message_at DESC);

-- Unique constraints to prevent duplicate conversations
CREATE UNIQUE INDEX idx_conversations_artist_fan_unique
  ON public.conversations (artist_id, fan_user_id)
  WHERE type = 'artist_fan' AND artist_id IS NOT NULL;
CREATE UNIQUE INDEX idx_conversations_member_hq_unique
  ON public.conversations (fan_user_id)
  WHERE type = 'member_hq';
CREATE UNIQUE INDEX idx_conversations_member_member_unique
  ON public.conversations (LEAST(fan_user_id, user_b_id), GREATEST(fan_user_id, user_b_id))
  WHERE type = 'member_member';

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Members can view conversations they participate in
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = fan_user_id
    OR auth.uid() = user_b_id
    OR (
      type = 'member_hq'
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- Members can create conversations they participate in
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = fan_user_id);

-- Members can update their own conversations (archive, last_message_at)
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (
    auth.uid() = fan_user_id
    OR auth.uid() = user_b_id
    OR (
      type = 'member_hq'
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- =====================================================
-- Create messages table
-- =====================================================
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role text,  -- records sender's role at send time ('admin'/'member'/etc)
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX idx_messages_created_at ON public.messages (conversation_id, created_at);
CREATE INDEX idx_messages_unread ON public.messages (conversation_id, sender_id)
  WHERE read_at IS NULL;

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_user_id = auth.uid()
          OR c.user_b_id = auth.uid()
          OR (
            c.type = 'member_hq'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'admin'
            )
          )
        )
    )
  );

-- Users can send messages in conversations they participate in
CREATE POLICY "Users can send messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_user_id = auth.uid()
          OR c.user_b_id = auth.uid()
          OR (
            c.type = 'member_hq'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'admin'
            )
          )
        )
    )
  );

-- Users can mark messages as read in their conversations
CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_user_id = auth.uid()
          OR c.user_b_id = auth.uid()
          OR (
            c.type = 'member_hq'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'admin'
            )
          )
        )
    )
  );
