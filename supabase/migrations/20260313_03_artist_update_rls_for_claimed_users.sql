-- Claimed users 可以更新自己 claim 的 artist
CREATE POLICY "Claimed users can update their artists"
  ON public.artists FOR UPDATE
  USING (
    artist_id = ANY (
      SELECT unnest(claimed_artist_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    artist_id = ANY (
      SELECT unnest(claimed_artist_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );
