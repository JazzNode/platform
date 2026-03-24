-- Featured performance wall: artists can pin their best gigs to profile
create table if not exists artist_featured_performances (
  id uuid primary key default gen_random_uuid(),
  artist_id text not null,
  event_id text not null,
  sort_order int not null default 0,
  note text,  -- optional artist commentary on this performance
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, event_id)
);

-- Indexes
create index idx_afp_artist on artist_featured_performances (artist_id, sort_order);

-- RLS
alter table artist_featured_performances enable row level security;

-- Anyone can read featured performances (public profile)
create policy "Public read featured performances"
  on artist_featured_performances for select
  using (true);

-- Only the owner (via service role in API) can insert/update/delete
-- Mutations go through the API route which verifies artist claim token
