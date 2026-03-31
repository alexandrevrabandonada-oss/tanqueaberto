create table if not exists public.territorial_coverage_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  snapshot_kind text not null default 'daily' check (snapshot_kind in ('daily', 'weekly')),
  coverage_window_days integer not null default 30,
  city text not null,
  city_slug text not null,
  neighborhood text not null,
  stations integer not null default 0,
  stations_with_recent_price integer not null default 0,
  stations_without_price integer not null default 0,
  stations_in_review integer not null default 0,
  stations_without_update integer not null default 0,
  seed_requests integer not null default 0,
  seed_needs_review integer not null default 0,
  seed_duplicates integer not null default 0,
  light_edits integer not null default 0,
  duplicate_signals integer not null default 0,
  recent_reports integer not null default 0,
  coverage_ratio numeric(6,4) not null default 0,
  coverage_state text not null check (coverage_state in ('boa', 'fraca', 'vazia')),
  priority integer not null default 0,
  signals jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  job_run_id uuid references public.ops_job_runs(id) on delete set null,
  created_by text
);

create unique index if not exists territorial_coverage_snapshots_unique_idx
  on public.territorial_coverage_snapshots (snapshot_kind, snapshot_date, coverage_window_days, city_slug, neighborhood);

create index if not exists territorial_coverage_snapshots_date_idx
  on public.territorial_coverage_snapshots (snapshot_kind, coverage_window_days, snapshot_date desc);

create index if not exists territorial_coverage_snapshots_city_idx
  on public.territorial_coverage_snapshots (city_slug, neighborhood, snapshot_date desc);

alter table public.territorial_coverage_snapshots enable row level security;

drop policy if exists "Admins can read territorial coverage snapshots" on public.territorial_coverage_snapshots;
create policy "Admins can read territorial coverage snapshots"
on public.territorial_coverage_snapshots
for select
using (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));
