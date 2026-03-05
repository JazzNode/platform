-- Allow public read access to favorites (for public profile pages)
create policy "Favorites are publicly viewable"
  on public.favorites for select using (true);
