create table if not exists public.beta_feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  feedback_type text not null check (feedback_type in ('problema', 'sugestao', 'confusa', 'faltou_posto')),
  message text not null,
  page_path text not null,
  page_title text,
  page_context text,
  tester_nickname text,
  station_id uuid references public.stations(id) on delete set null,
  city text,
  fuel_type public.fuel_type,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'archived')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists beta_feedback_submissions_created_at_idx
  on public.beta_feedback_submissions (created_at desc);

create index if not exists beta_feedback_submissions_type_idx
  on public.beta_feedback_submissions (feedback_type, created_at desc);

create index if not exists beta_feedback_submissions_city_idx
  on public.beta_feedback_submissions (city, created_at desc);

alter table public.beta_feedback_submissions enable row level security;

drop policy if exists "Admins can read beta feedback" on public.beta_feedback_submissions;
create policy "Admins can read beta feedback"
on public.beta_feedback_submissions
for select
using (public.is_admin_email());

grant select on table public.beta_feedback_submissions to authenticated;
