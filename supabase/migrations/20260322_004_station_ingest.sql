alter table public.stations
  add column if not exists cnpj text,
  add column if not exists source text not null default 'manual',
  add column if not exists source_id text,
  add column if not exists official_status text not null default 'unknown',
  add column if not exists sigaf_status text,
  add column if not exists products jsonb not null default '[]'::jsonb,
  add column if not exists distributor_name text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists import_notes text,
  add column if not exists geo_source text not null default 'manual',
  add column if not exists geo_confidence text not null default 'low',
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists stations_cnpj_key on public.stations (cnpj) where cnpj is not null;
create unique index if not exists stations_source_key on public.stations (source, source_id) where source_id is not null;
