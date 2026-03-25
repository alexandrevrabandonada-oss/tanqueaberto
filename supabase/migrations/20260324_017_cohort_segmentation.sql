-- Phase 29: Tester Cohorts & Segmentation

-- Add cohort column to collector_trust
alter table public.collector_trust 
add column if not exists cohort text not null default 'NEWBIE';

-- Add index for cohort filtering performance
create index if not exists collector_trust_cohort_idx on public.collector_trust(cohort);

-- Create a history table for cohort changes (Promotion/Demotion audit)
create table if not exists public.cohort_change_log (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  ip_hash text not null,
  old_cohort text,
  new_cohort text not null,
  reason text,
  actor_id text,
  created_at timestamptz not null default timezone('utc', now())
);

-- RLS for log
alter table public.cohort_change_log enable row level security;

create policy "Admins can view and create logs"
on public.cohort_change_log
for all
using (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));

-- Grant
grant select, insert on table public.cohort_change_log to authenticated;
