-- Guest contact form submissions (from non-authenticated users)
create table if not exists guest_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Allow public insert (no auth required)
alter table guest_contacts enable row level security;

create policy "Anyone can insert guest contacts"
  on guest_contacts for insert
  with check (true);

-- Only service role (admin API) can read/update
-- No select/update policy = only accessible via service_role key
