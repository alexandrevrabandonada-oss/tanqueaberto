create table if not exists public.station_seed_requests (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations(id) on delete set null,
  creator_id uuid not null,
  creator_email text not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  status text not null default 'created' check (status in ('created', 'needs_review', 'duplicate'))
);

alter table public.admin_users
  add column if not exists role text not null default 'admin' check (role in ('admin', 'station_editor'));

update public.admin_users
set role = 'admin'
where role is null;

create index if not exists admin_users_role_idx on public.admin_users (role);
create index if not exists station_seed_requests_creator_idx on public.station_seed_requests (creator_id, created_at desc);
create index if not exists station_seed_requests_status_idx on public.station_seed_requests (status);
