create extension if not exists "pgcrypto";

create type public.fuel_type as enum (
  'gasolina_comum',
  'gasolina_aditivada',
  'etanol',
  'diesel_s10',
  'diesel_comum',
  'gnv'
);

create type public.report_status as enum (
  'pending',
  'approved',
  'rejected',
  'flagged'
);

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  address text not null,
  city text not null,
  neighborhood text not null,
  lat double precision not null,
  lng double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.price_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel_type public.fuel_type not null,
  price numeric(6, 3) not null check (price > 0),
  photo_url text not null,
  photo_taken_at timestamptz,
  reported_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  reporter_nickname text,
  status public.report_status not null default 'pending',
  moderation_note text
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists stations_city_idx on public.stations(city);
create index if not exists stations_neighborhood_idx on public.stations(neighborhood);
create index if not exists stations_geo_idx on public.stations(lat, lng);
create index if not exists price_reports_station_reported_idx on public.price_reports(station_id, reported_at desc);
create index if not exists price_reports_status_idx on public.price_reports(status);

alter table public.stations enable row level security;
alter table public.price_reports enable row level security;
alter table public.admin_users enable row level security;

create policy "Public can read active stations"
on public.stations
for select
using (is_active = true);

create policy "Public can read approved or flagged reports"
on public.price_reports
for select
using (status in ('approved', 'flagged'));

create policy "Public can submit pending reports"
on public.price_reports
for insert
with check (status = 'pending');

create policy "Admins can read admin registry"
on public.admin_users
for select
using (auth.uid() = user_id);

create policy "Admins can moderate reports"
on public.price_reports
for update
using (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admin where admin.user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'price-report-photos',
  'price-report-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Public can view report photos"
on storage.objects
for select
using (bucket_id = 'price-report-photos');

create policy "Public can upload report photos"
on storage.objects
for insert
with check (bucket_id = 'price-report-photos');
