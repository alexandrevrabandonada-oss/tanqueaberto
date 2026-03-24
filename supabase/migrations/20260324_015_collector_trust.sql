-- Phase 27: Collector Trust & Reputation Layer

-- Add ip_hash to price_reports for better collector tracking
alter table public.price_reports add column if not exists ip_hash text;
create index if not exists price_reports_ip_hash_idx on public.price_reports(ip_hash);

-- Collector Trust Table
create table if not exists public.collector_trust (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  ip_hash text,
  score integer not null default 50 check (score >= 0 and score <= 100),
  total_reports integer not null default 0,
  approved_reports integer not null default 0,
  rejected_reports integer not null default 0,
  last_report_at timestamptz,
  trust_stage text not null default 'new' check (trust_stage in ('new', 'trusted', 'review_needed', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  
  -- Unique constraint for the collector identifier
  constraint collector_identity_unique unique (nickname, ip_hash)
);

create index if not exists collector_trust_score_idx on public.collector_trust(score desc);

-- RLS
alter table public.collector_trust enable row level security;

create policy "Admins can manage collector trust"
on public.collector_trust
for all
using (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));

-- Grant
grant select, update, insert on table public.collector_trust to authenticated;
grant select on table public.collector_trust to anon;
