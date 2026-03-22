-- Operational runs and coverage scaffolding for recurring civic dossiers.
create table if not exists public.ops_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('audit_refresh', 'audit_dossiers', 'coverage_snapshot', 'group_seed')),
  cadence text not null check (cadence in ('manual', 'cron_daily', 'cron_weekly', 'cron_monthly')),
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by text,
  payload jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ops_job_runs_job_type_started_at_idx
  on public.ops_job_runs (job_type, started_at desc);

create index if not exists ops_job_runs_status_started_at_idx
  on public.ops_job_runs (status, started_at desc);

grant select, insert, update on table public.ops_job_runs to authenticated;
grant select on table public.ops_job_runs to anon;
