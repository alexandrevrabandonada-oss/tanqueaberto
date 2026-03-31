alter table public.report_submission_rate_limits
  add column if not exists scope_kind text not null default 'ip' check (scope_kind in ('ip', 'device', 'session', 'surface')),
  add column if not exists device_id text,
  add column if not exists session_id text,
  add column if not exists surface_type text,
  add column if not exists surface_id text;

create index if not exists report_submission_rate_limits_scope_kind_idx
  on public.report_submission_rate_limits (scope_kind, window_start desc);

create index if not exists report_submission_rate_limits_device_idx
  on public.report_submission_rate_limits (device_id, window_start desc);

create index if not exists report_submission_rate_limits_session_idx
  on public.report_submission_rate_limits (session_id, window_start desc);

create index if not exists report_submission_rate_limits_surface_idx
  on public.report_submission_rate_limits (surface_type, surface_id, window_start desc);

create or replace function public.register_submission_rate_limit(
  p_bucket_key text,
  p_ip_hash text,
  p_station_id uuid,
  p_fuel_type public.fuel_type,
  p_window_start timestamptz,
  p_window_minutes integer,
  p_limit integer,
  p_now timestamptz default timezone('utc', now()),
  p_scope_kind text default 'ip',
  p_device_id text default null,
  p_session_id text default null,
  p_surface_type text default null,
  p_surface_id text default null
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
      updated_at,
      scope_kind,
      device_id,
      session_id,
      surface_type,
      surface_id
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
      p_now,
      p_scope_kind,
      p_device_id,
      p_session_id,
      p_surface_type,
      p_surface_id
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
      window_minutes = p_window_minutes,
      scope_kind = p_scope_kind,
      device_id = p_device_id,
      session_id = p_session_id,
      surface_type = p_surface_type,
      surface_id = p_surface_id
  where bucket_key = p_bucket_key
    and window_start = p_window_start;

  return query select next_count <= p_limit, next_count, next_block_until, p_window_start;
end;
$$;
