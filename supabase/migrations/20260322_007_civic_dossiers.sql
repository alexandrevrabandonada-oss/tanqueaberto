create table if not exists public.audit_station_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  group_type text not null default 'corredor' check (group_type in ('corredor', 'bairro', 'regiao', 'operacional')),
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_station_groups_city_idx on public.audit_station_groups (city);
create index if not exists audit_station_groups_type_idx on public.audit_station_groups (group_type);

create table if not exists public.audit_station_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.audit_station_groups(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (group_id, station_id)
);

create index if not exists audit_station_group_members_group_idx on public.audit_station_group_members (group_id);
create index if not exists audit_station_group_members_station_idx on public.audit_station_group_members (station_id);

create table if not exists public.audit_report_runs (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('region', 'city', 'station', 'group')),
  scope_label text not null,
  city_slug text,
  city_name text,
  station_id uuid references public.stations(id) on delete set null,
  station_name text,
  group_id uuid references public.audit_station_groups(id) on delete set null,
  group_slug text,
  group_name text,
  fuel_type public.fuel_type not null,
  days integer not null check (days in (7, 30, 90)),
  period_start date not null,
  period_end date not null,
  title text not null,
  summary jsonb not null default '{}'::jsonb,
  alerts_count integer not null default 0,
  visibility_status text not null default 'public' check (visibility_status in ('public', 'internal', 'archived')),
  artifact_format text,
  artifact_path text,
  artifact_url text,
  created_by text,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_report_runs_generated_at_idx on public.audit_report_runs (generated_at desc);
create index if not exists audit_report_runs_scope_idx on public.audit_report_runs (scope_type, generated_at desc);
create index if not exists audit_report_runs_city_idx on public.audit_report_runs (city_slug, fuel_type, generated_at desc);
create index if not exists audit_report_runs_group_idx on public.audit_report_runs (group_id, fuel_type, generated_at desc);

create table if not exists public.audit_alert_history (
  id uuid primary key default gen_random_uuid(),
  alert_kind text not null,
  scope_type text not null check (scope_type in ('region', 'city', 'station', 'group')),
  scope_label text not null,
  fuel_type public.fuel_type not null,
  city_slug text,
  city_name text,
  station_id uuid references public.stations(id) on delete set null,
  station_name text,
  group_id uuid references public.audit_station_groups(id) on delete set null,
  group_slug text,
  period_days integer not null check (period_days in (7, 30, 90)),
  period_start date not null,
  period_end date not null,
  intensity numeric(10,2),
  status text not null default 'novo' check (status in ('novo', 'revisado', 'arquivado')),
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_alert_history_generated_at_idx on public.audit_alert_history (generated_at desc);
create index if not exists audit_alert_history_scope_idx on public.audit_alert_history (scope_type, generated_at desc);
create index if not exists audit_alert_history_city_idx on public.audit_alert_history (city_slug, fuel_type, generated_at desc);
create index if not exists audit_alert_history_group_idx on public.audit_alert_history (group_id, fuel_type, generated_at desc);
create index if not exists audit_alert_history_status_idx on public.audit_alert_history (status, generated_at desc);

grant select on public.audit_station_groups to anon, authenticated;
grant select on public.audit_station_group_members to anon, authenticated;
grant select on public.audit_report_runs to anon, authenticated;
grant select on public.audit_alert_history to anon, authenticated;
