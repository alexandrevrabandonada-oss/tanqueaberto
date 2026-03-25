-- Phase 30: Go/No-Go Beta Decision Framework

-- Table for historical decision snapshots
create table if not exists public.beta_decision_snapshots (
  id uuid primary key default gen_random_uuid(),
  readiness_score integer not null check (readiness_score >= 0 and readiness_score <= 100),
  status text not null check (status in ('GO', 'CAUTION', 'NO_GO')),
  metrics jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  recommendation text,
  created_at timestamptz not null default timezone('utc', now()),
  actor_id uuid references auth.users(id) on delete set null
);

-- RLS
alter table public.beta_decision_snapshots enable row level security;

create policy "Admins can manage decision snapshots"
on public.beta_decision_snapshots
for all
using (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));

-- Grant
grant select, insert on table public.beta_decision_snapshots to authenticated;

-- Index for history browse
create index if not exists beta_decision_snapshots_created_at_idx on public.beta_decision_snapshots(created_at desc);
