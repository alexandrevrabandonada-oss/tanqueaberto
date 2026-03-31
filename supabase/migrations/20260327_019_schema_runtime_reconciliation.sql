create table if not exists public.sys_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.sys_config (key, value)
values (
  'kill_switches',
  jsonb_build_object(
    'disable_mission_mode', false,
    'disable_pwa_prompts', false,
    'disable_heavy_territorial_widgets', false,
    'disable_auto_suggestions', false,
    'disable_fast_lane', false
  )
)
on conflict (key) do nothing;

create table if not exists public.operational_logs (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id text,
  actor_email text,
  scope_type text,
  scope_id text,
  severity text not null default 'info',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists operational_logs_created_at_idx
  on public.operational_logs (created_at desc);

create index if not exists operational_logs_event_kind_idx
  on public.operational_logs (event_kind, created_at desc);

alter table public.operational_logs enable row level security;

drop policy if exists "Admins can read operational logs" on public.operational_logs;
create policy "Admins can read operational logs"
on public.operational_logs
for select
using (public.is_admin_email());

grant select on table public.operational_logs to authenticated;

create table if not exists public.price_report_audit_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.price_reports(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'moderated', 'revised', 'exported')),
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists price_report_audit_events_report_idx
  on public.price_report_audit_events (report_id, created_at desc);

create index if not exists price_report_audit_events_type_idx
  on public.price_report_audit_events (event_type, created_at desc);

alter table public.price_report_audit_events enable row level security;

drop policy if exists "Admins can read price report audit events" on public.price_report_audit_events;
create policy "Admins can read price report audit events"
on public.price_report_audit_events
for select
using (public.is_admin_email());

grant select on table public.price_report_audit_events to authenticated;

alter table public.price_reports
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_reason text,
  add column if not exists source_kind text not null default 'community' check (source_kind in ('community', 'seed', 'official_reference', 'import', 'admin')),
  add column if not exists photo_hash text,
  add column if not exists location_distance numeric,
  add column if not exists location_confidence text,
  add column if not exists reconciliation_id text,
  add column if not exists is_confirmation boolean,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1;

create index if not exists price_reports_photo_hash_idx on public.price_reports(photo_hash);
create index if not exists price_reports_reconciliation_id_idx on public.price_reports(reconciliation_id);
create index if not exists price_reports_reported_at_idx on public.price_reports(reported_at desc);

alter table public.stations
  add column if not exists last_reported_at timestamptz;

create index if not exists stations_last_reported_at_idx on public.stations(last_reported_at desc);

create or replace function public.sync_station_last_reported_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stations
  set last_reported_at = greatest(coalesce(last_reported_at, new.reported_at), new.reported_at),
      updated_at = coalesce(updated_at, timezone('utc', now()))
  where id = new.station_id;
  return new;
end;
$$;

drop trigger if exists price_reports_sync_station_last_reported_at on public.price_reports;
create trigger price_reports_sync_station_last_reported_at
after insert or update of station_id, reported_at
on public.price_reports
for each row
execute function public.sync_station_last_reported_at();

update public.stations s
set last_reported_at = agg.last_reported_at
from (
  select station_id, max(reported_at) as last_reported_at
  from public.price_reports
  group by station_id
) agg
where s.id = agg.station_id;

alter table public.collector_trust
  add column if not exists streak_days integer not null default 0,
  add column if not exists missions_completed integer not null default 0,
  add column if not exists is_tester boolean not null default false;

update public.collector_trust
set streak_days = coalesce(streak_days, 0),
    missions_completed = coalesce(missions_completed, 0),
    is_tester = coalesce(is_tester, false);

alter table public.beta_feedback_submissions
  add column if not exists triage_notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());


