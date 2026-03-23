create table if not exists public.beta_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  batch_label text not null default ''beta fechado'',
  batch_note text,
  tester_note text,
  created_by_id uuid,
  created_by_email text,
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  disabled_at timestamptz,
  disabled_by_email text,
  created_at timestamptz not null default timezone(''utc'', now()),
  updated_at timestamptz not null default timezone(''utc'', now())
);

create index if not exists beta_invite_codes_active_idx
  on public.beta_invite_codes (is_active, created_at desc);

create index if not exists beta_invite_codes_expires_at_idx
  on public.beta_invite_codes (expires_at, created_at desc);

create index if not exists beta_invite_codes_batch_label_idx
  on public.beta_invite_codes (batch_label, created_at desc);

alter table public.beta_invite_codes enable row level security;

drop policy if exists ''Admins can read beta invite codes'' on public.beta_invite_codes;
create policy ''Admins can read beta invite codes''
on public.beta_invite_codes
for select
using (public.is_admin_email());

drop policy if exists ''Admins can manage beta invite codes'' on public.beta_invite_codes;
create policy ''Admins can manage beta invite codes''
on public.beta_invite_codes
for all
using (public.is_admin_email())
with check (public.is_admin_email());

grant select, insert, update, delete on table public.beta_invite_codes to authenticated;

alter table public.beta_feedback_submissions
  add column if not exists triage_topic text not null default ''outros'',
  add column if not exists triage_priority text not null default ''media'' check (triage_priority in (''baixa'', ''media'', ''alta''));

create index if not exists beta_feedback_submissions_triage_topic_idx
  on public.beta_feedback_submissions (triage_topic, created_at desc);

create index if not exists beta_feedback_submissions_triage_priority_idx
  on public.beta_feedback_submissions (triage_priority, created_at desc);
