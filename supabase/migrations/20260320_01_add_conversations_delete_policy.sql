-- Allow users to delete conversations they participate in
-- Messages are automatically deleted via ON DELETE CASCADE on conversation_id FK
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
