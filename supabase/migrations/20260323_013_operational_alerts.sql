-- Migration: 20260323_013_operational_alerts.sql
-- Description: Adds a table for active and historical operational alerts.

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_kind text not null, -- 'performance', 'moderation', 'territorial'
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  status text not null default 'active' check (status in ('active', 'resolved', 'acknowledged')),
  city text,
  scope_id text, -- group slug if applicable
  message text not null,
  suggested_action text,
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Index for active alerts search
create index if not exists operational_alerts_status_idx
  on public.operational_alerts (status, severity);

create index if not exists operational_alerts_created_at_idx
  on public.operational_alerts (created_at desc);

-- RLS
alter table public.operational_alerts enable row level security;

drop policy if exists "Admins can read operational alerts" on public.operational_alerts;
create policy "Admins can read operational alerts"
on public.operational_alerts
for select
using (public.is_admin_email());

drop policy if exists "Admins can insert/update operational alerts" on public.operational_alerts;
create policy "Admins can insert/update operational alerts"
on public.operational_alerts
for all
using (public.is_admin_email());

-- Grant
grant select, insert, update on table public.operational_alerts to authenticated;
grant select, insert, update on table public.operational_alerts to service_role;
