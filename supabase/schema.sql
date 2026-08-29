-- Loopify schema: run in the Supabase SQL editor (Dashboard → SQL).
-- Then run seed.sql. Create public Storage buckets listing-photos and event-photos.

create extension if not exists pgcrypto;

-- Profiles: real users have id = auth.users.id. Seed community accounts have no auth_id.
create table if not exists public.profiles (
  id uuid primary key,
  auth_id uuid unique references auth.users (id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_url text,
  is_org boolean not null default false,
  verified boolean not null default false,
  city text not null default 'Yangon, Myanmar',
  rating_avg numeric(3, 2) not null default 5.00,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('clothes', 'books', 'electronics', 'furniture', 'food', 'other')),
  listing_type text not null default 'donate' check (listing_type in ('donate', 'exchange')),
  condition text not null default 'good',
  availability text not null default 'now' check (availability in ('now', 'today', 'tomorrow', 'weekend')),
  area_label text not null,
  lat double precision not null,
  lng double precision not null,
  collection_notes text,
  status text not null default 'open' check (status in ('open', 'promised', 'completed')),
  estimated_kg numeric(8, 2) not null default 1,
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0
);

create table if not exists public.donation_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (listing_id, requester_id)
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  donor_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, donor_id, recipient_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  category text not null default 'cleanup',
  starts_at timestamptz not null,
  area_label text not null,
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table if not exists public.event_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (listing_id, from_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

-- Auto-create a profile when someone signs up (kept off the exposed public schema)
create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, auth_id, display_name, avatar_url)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Neighbor'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set auth_id = excluded.auth_id;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin, postgres, service_role;
grant execute on function private.handle_new_user() to supabase_auth_admin, postgres, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.is_own_profile(pid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = pid and p.auth_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.donation_requests enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_updates enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.saves enable row level security;
alter table public.notifications enable row level security;

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
  with check (id = auth.uid() and auth_id = auth.uid());

-- Listings
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings for select using (true);

drop policy if exists "listings_insert" on public.listings;
create policy "listings_insert" on public.listings for insert
  with check (public.is_own_profile(user_id));

drop policy if exists "listings_update" on public.listings;
create policy "listings_update" on public.listings for update
  using (public.is_own_profile(user_id));

drop policy if exists "listings_delete" on public.listings;
create policy "listings_delete" on public.listings for delete
  using (public.is_own_profile(user_id));

drop policy if exists "photos_select" on public.listing_photos;
create policy "photos_select" on public.listing_photos for select using (true);

drop policy if exists "photos_insert" on public.listing_photos;
create policy "photos_insert" on public.listing_photos for insert
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_id and public.is_own_profile(l.user_id)
  ));

-- Requests
drop policy if exists "requests_select" on public.donation_requests;
create policy "requests_select" on public.donation_requests for select
  using (
    public.is_own_profile(requester_id)
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and public.is_own_profile(l.user_id)
    )
  );

drop policy if exists "requests_insert" on public.donation_requests;
create policy "requests_insert" on public.donation_requests for insert
  with check (public.is_own_profile(requester_id));

drop policy if exists "requests_update" on public.donation_requests;
create policy "requests_update" on public.donation_requests for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and public.is_own_profile(l.user_id)
    )
  );

-- Threads / messages
drop policy if exists "threads_select" on public.threads;
create policy "threads_select" on public.threads for select
  using (public.is_own_profile(donor_id) or public.is_own_profile(recipient_id));

drop policy if exists "threads_insert" on public.threads;
create policy "threads_insert" on public.threads for insert
  with check (public.is_own_profile(donor_id) or public.is_own_profile(recipient_id));

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (exists (
    select 1 from public.threads t
    where t.id = thread_id and (public.is_own_profile(t.donor_id) or public.is_own_profile(t.recipient_id))
  ));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    public.is_own_profile(sender_id)
    and exists (
      select 1 from public.threads t
      where t.id = thread_id and (public.is_own_profile(t.donor_id) or public.is_own_profile(t.recipient_id))
    )
  );

-- Events
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select using (true);

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert
  with check (public.is_own_profile(host_id));

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events for update
  using (public.is_own_profile(host_id));

drop policy if exists "rsvps_select" on public.event_rsvps;
create policy "rsvps_select" on public.event_rsvps for select using (true);

drop policy if exists "rsvps_insert" on public.event_rsvps;
create policy "rsvps_insert" on public.event_rsvps for insert
  with check (public.is_own_profile(profile_id));

drop policy if exists "rsvps_delete" on public.event_rsvps;
create policy "rsvps_delete" on public.event_rsvps for delete
  using (public.is_own_profile(profile_id));

drop policy if exists "updates_select" on public.event_updates;
create policy "updates_select" on public.event_updates for select using (true);

drop policy if exists "updates_insert" on public.event_updates;
create policy "updates_insert" on public.event_updates for insert
  with check (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_own_profile(e.host_id)
  ));

drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings for select using (true);

drop policy if exists "ratings_insert" on public.ratings;
create policy "ratings_insert" on public.ratings for insert
  with check (public.is_own_profile(from_id));

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports for insert
  with check (public.is_own_profile(reporter_id));

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select
  using (public.is_own_profile(reporter_id));

drop policy if exists "saves_select" on public.saves;
create policy "saves_select" on public.saves for select
  using (public.is_own_profile(profile_id));

drop policy if exists "saves_insert" on public.saves;
create policy "saves_insert" on public.saves for insert
  with check (public.is_own_profile(profile_id));

drop policy if exists "saves_delete" on public.saves;
create policy "saves_delete" on public.saves for delete
  using (public.is_own_profile(profile_id));

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select
  using (public.is_own_profile(profile_id));

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update
  using (public.is_own_profile(profile_id));

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert
  with check (auth.uid() is not null);

grant execute on function public.is_own_profile(uuid) to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.notifications to authenticated;

