create table if not exists public.station_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  issue_type text not null,
  issue_summary text not null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid
);

alter table public.stations
  add column if not exists name_official text,
  add column if not exists name_public text,
  add column if not exists geo_review_status text not null default 'pending',
  add column if not exists priority_score numeric(5,2) not null default 0,
  add column if not exists visibility_status text not null default 'public',
  add column if not exists curation_note text,
  add column if not exists coordinate_reviewed_at timestamptz;

create index if not exists stations_geo_review_status_idx on public.stations (geo_review_status);
create index if not exists stations_priority_score_idx on public.stations (priority_score desc);
create index if not exists stations_visibility_status_idx on public.stations (visibility_status);
create index if not exists station_quality_reviews_status_idx on public.station_quality_reviews (status);
create index if not exists station_quality_reviews_station_idx on public.station_quality_reviews (station_id);
