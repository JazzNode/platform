-- Allow users to delete their own pending claims (cancel claim)
CREATE POLICY "Users can cancel their own pending claims"
  ON public.claims FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');
