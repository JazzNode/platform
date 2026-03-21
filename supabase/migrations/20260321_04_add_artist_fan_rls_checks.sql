-- Fix: Add artist_fan + claimed_artist_ids checks to ALL RLS policies
-- This mirrors the existing venue_fan + claimed_venue_ids pattern
-- Without this, artists cannot view/send/read messages in artist_fan conversations

-- =====================================================
-- 1. CONVERSATIONS TABLE - Update all policies
-- =====================================================

-- SELECT: Artists can view artist_fan conversations for their claimed artists
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
      type = 'artist_fan'
      AND artist_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            artist_id = ANY(p.claimed_artist_ids)
            OR p.role = 'admin'
          )
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

-- UPDATE: Artists can update artist_fan conversations (archive, last_message_at)
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
      type = 'artist_fan'
      AND artist_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            artist_id = ANY(p.claimed_artist_ids)
            OR p.role = 'admin'
          )
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

-- DELETE: Artists can delete artist_fan conversations
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
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
      type = 'artist_fan'
      AND artist_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            artist_id = ANY(p.claimed_artist_ids)
            OR p.role = 'admin'
          )
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

-- =====================================================
-- 2. MESSAGES TABLE - Update all policies
-- =====================================================

-- SELECT: Artists can view messages in artist_fan conversations
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
            c.type = 'artist_fan'
            AND c.artist_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  c.artist_id = ANY(p.claimed_artist_ids)
                  OR p.role = 'admin'
                )
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

-- INSERT: Artists can send messages in artist_fan conversations
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
            c.type = 'artist_fan'
            AND c.artist_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  c.artist_id = ANY(p.claimed_artist_ids)
                  OR p.role = 'admin'
                )
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

-- UPDATE: Artists can mark messages as read in artist_fan conversations
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
            c.type = 'artist_fan'
            AND c.artist_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  c.artist_id = ANY(p.claimed_artist_ids)
                  OR p.role = 'admin'
                )
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
