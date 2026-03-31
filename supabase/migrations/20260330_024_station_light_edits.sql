create table if not exists public.station_light_edits (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  station_name text not null,
  editor_id uuid not null references auth.users(id) on delete cascade,
  editor_email text not null,
  change_kind text not null default 'light_edit' check (change_kind in ('light_edit', 'manual_review', 'duplicate_link')),
  status text not null default 'saved' check (status in ('saved', 'manual_review', 'duplicate_linked')),
  duplicate_of_station_id uuid references public.stations(id) on delete set null,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  diff jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists station_light_edits_station_idx on public.station_light_edits (station_id, created_at desc);
create index if not exists station_light_edits_editor_idx on public.station_light_edits (editor_email, created_at desc);
create index if not exists station_light_edits_status_idx on public.station_light_edits (status, created_at desc);

alter table public.station_light_edits enable row level security;

drop policy if exists "Admins can read station light edits" on public.station_light_edits;
create policy "Admins can read station light edits"
on public.station_light_edits
for select
using (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));

drop policy if exists "Admins can insert station light edits" on public.station_light_edits;
create policy "Admins can insert station light edits"
on public.station_light_edits
for insert
with check (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));
