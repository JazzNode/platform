-- Add venue_fan conversation type and venue_id column to support venue inbox messaging
-- Mirrors the artist_fan pattern: venue owners can message fans who follow their venue

-- 1. Add venue_id column to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS venue_id text;

-- 2. Update the type CHECK constraint to include venue_fan
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_type_check
  CHECK (type IN ('artist_fan', 'member_hq', 'member_member', 'venue_fan'));

-- 3. Add index for venue_id
CREATE INDEX IF NOT EXISTS idx_conversations_venue_id ON public.conversations (venue_id)
  WHERE venue_id IS NOT NULL;

-- 4. Unique constraint: one conversation per venue-fan pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_venue_fan_unique
  ON public.conversations (venue_id, fan_user_id)
  WHERE type = 'venue_fan' AND venue_id IS NOT NULL;

-- 5. Add venue_archived column (parallel to artist_archived)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS venue_archived boolean DEFAULT false;

-- 6. Update RLS policies to include venue_fan conversations
--    Venue owners need to access conversations where venue_id is in their claimed_venue_ids

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
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
    OR (
      type = 'venue_fan'
      AND venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            venue_id = ANY(p.claimed_venue_ids)
            OR p.role = 'admin'
          )
      )
    )
  );

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = fan_user_id);

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
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
    OR (
      type = 'venue_fan'
      AND venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            venue_id = ANY(p.claimed_venue_ids)
            OR p.role = 'admin'
          )
      )
    )
  );

-- 7. Update messages RLS to allow venue owners to read/write messages in venue_fan conversations
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
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
          OR (
            c.type = 'venue_fan'
            AND c.venue_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  c.venue_id = ANY(p.claimed_venue_ids)
                  OR p.role = 'admin'
                )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can send messages in own conversations" ON public.messages;
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
          OR (
            c.type = 'venue_fan'
            AND c.venue_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  c.venue_id = ANY(p.claimed_venue_ids)
                  OR p.role = 'admin'
                )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
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
          OR (
            c.type = 'venue_fan'
            AND c.venue_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  c.venue_id = ANY(p.claimed_venue_ids)
                  OR p.role = 'admin'
                )
            )
          )
        )
    )
  );

-- 8. Extend broadcasts table to support venue broadcasts
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS venue_id text;
CREATE INDEX IF NOT EXISTS idx_broadcasts_venue_id ON public.broadcasts (venue_id)
  WHERE venue_id IS NOT NULL;
