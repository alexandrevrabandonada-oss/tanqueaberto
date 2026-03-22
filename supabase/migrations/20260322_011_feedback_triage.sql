alter table public.beta_feedback_submissions
  add column if not exists screen_group text not null default 'outros',
  add column if not exists triage_tags text[] not null default '{}'::text[],
  add column if not exists triage_status text not null default 'novo' check (triage_status in ('novo', 'em_analise', 'resolvido'));

create index if not exists beta_feedback_submissions_screen_group_idx
  on public.beta_feedback_submissions (screen_group, created_at desc);

create index if not exists beta_feedback_submissions_triage_status_idx
  on public.beta_feedback_submissions (triage_status, created_at desc);

create index if not exists beta_feedback_submissions_triage_tags_idx
  on public.beta_feedback_submissions using gin (triage_tags);
