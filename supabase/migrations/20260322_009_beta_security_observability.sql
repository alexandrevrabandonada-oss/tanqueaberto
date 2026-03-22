create table if not exists public.report_submission_rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null unique,
  ip_hash text not null,
  station_id uuid references public.stations(id) on delete set null,
  fuel_type public.fuel_type,
  window_minutes integer not null default 15 check (window_minutes > 0),
  window_start timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists report_submission_rate_limits_window_start_idx
  on public.report_submission_rate_limits (window_start desc);

create index if not exists report_submission_rate_limits_station_idx
  on public.report_submission_rate_limits (station_id, window_start desc);

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  scope_type text,
  scope_id text,
  actor_id uuid,
  actor_email text,
  station_id uuid references public.stations(id) on delete set null,
  report_id uuid references public.price_reports(id) on delete set null,
  city text,
  fuel_type public.fuel_type,
  ip_hash text,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists operational_events_created_at_idx
  on public.operational_events (created_at desc);

create index if not exists operational_events_event_type_idx
  on public.operational_events (event_type, created_at desc);

create index if not exists operational_events_scope_idx
  on public.operational_events (scope_type, scope_id, created_at desc);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  action_kind text not null,
  actor_id uuid,
  actor_email text,
  target_type text,
  target_id text,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_action_logs_created_at_idx
  on public.admin_action_logs (created_at desc);

create index if not exists admin_action_logs_action_kind_idx
  on public.admin_action_logs (action_kind, created_at desc);

alter table public.report_submission_rate_limits enable row level security;
alter table public.operational_events enable row level security;
alter table public.admin_action_logs enable row level security;

drop policy if exists "Admins can read rate limits" on public.report_submission_rate_limits;
drop policy if exists "Admins can read operational events" on public.operational_events;
drop policy if exists "Admins can read admin action logs" on public.admin_action_logs;

create policy "Admins can read rate limits"
on public.report_submission_rate_limits
for select
using (public.is_admin_email());

create policy "Admins can read operational events"
on public.operational_events
for select
using (public.is_admin_email());

create policy "Admins can read admin action logs"
on public.admin_action_logs
for select
using (public.is_admin_email());

grant select on table public.report_submission_rate_limits to authenticated;
grant select on table public.operational_events to authenticated;
grant select on table public.admin_action_logs to authenticated;

create or replace function public.register_submission_rate_limit(
  p_bucket_key text,
  p_ip_hash text,
  p_station_id uuid,
  p_fuel_type public.fuel_type,
  p_window_start timestamptz,
  p_window_minutes integer,
  p_limit integer,
  p_now timestamptz default timezone('utc', now())
)
returns table (
  allowed boolean,
  attempt_count integer,
  blocked_until timestamptz,
  window_start timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.report_submission_rate_limits%rowtype;
  next_count integer;
  next_block_until timestamptz;
begin
  select *
  into current_row
  from public.report_submission_rate_limits
  where bucket_key = p_bucket_key
    and window_start = p_window_start
  for update;

  if not found then
    insert into public.report_submission_rate_limits (
      bucket_key,
      ip_hash,
      station_id,
      fuel_type,
      window_minutes,
      window_start,
      attempt_count,
      blocked_until,
      last_attempt_at,
      updated_at
    )
    values (
      p_bucket_key,
      p_ip_hash,
      p_station_id,
      p_fuel_type,
      p_window_minutes,
      p_window_start,
      1,
      null,
      p_now,
      p_now
    );

    return query select true, 1, null, p_window_start;
    return;
  end if;

  if current_row.blocked_until is not null and current_row.blocked_until > p_now then
    return query select false, current_row.attempt_count, current_row.blocked_until, current_row.window_start;
    return;
  end if;

  next_count := current_row.attempt_count + 1;

  if next_count > p_limit then
    next_block_until := p_window_start + make_interval(mins => p_window_minutes);
  else
    next_block_until := null;
  end if;

  update public.report_submission_rate_limits
  set attempt_count = next_count,
      blocked_until = next_block_until,
      last_attempt_at = p_now,
      updated_at = p_now,
      ip_hash = p_ip_hash,
      station_id = p_station_id,
      fuel_type = p_fuel_type,
      window_minutes = p_window_minutes
  where bucket_key = p_bucket_key
    and window_start = p_window_start;

  return query select next_count <= p_limit, next_count, next_block_until, p_window_start;
end;
$$;
