create materialized view if not exists public.audit_daily_station_prices as
select
  pr.station_id,
  pr.fuel_type,
  (timezone('America/Sao_Paulo', coalesce(pr.observed_at, pr.reported_at)))::date as day,
  count(*)::int as observations,
  min(pr.price)::numeric(10, 2) as min_price,
  max(pr.price)::numeric(10, 2) as max_price,
  percentile_cont(0.5) within group (order by pr.price)::numeric(10, 2) as median_price,
  avg(pr.price)::numeric(10, 2) as average_price,
  max(pr.reported_at) as latest_reported_at,
  min(pr.reported_at) as first_reported_at
from public.price_reports pr
inner join public.stations s on s.id = pr.station_id
where pr.status = 'approved'
  and s.is_active = true
group by pr.station_id, pr.fuel_type, (timezone('America/Sao_Paulo', coalesce(pr.observed_at, pr.reported_at)))::date;

create unique index if not exists audit_daily_station_prices_station_fuel_day_idx
  on public.audit_daily_station_prices (station_id, fuel_type, day);

create index if not exists audit_daily_station_prices_day_idx
  on public.audit_daily_station_prices (day desc);

create materialized view if not exists public.audit_daily_city_prices as
select
  s.city,
  pr.fuel_type,
  (timezone('America/Sao_Paulo', coalesce(pr.observed_at, pr.reported_at)))::date as day,
  count(*)::int as observations,
  min(pr.price)::numeric(10, 2) as min_price,
  max(pr.price)::numeric(10, 2) as max_price,
  percentile_cont(0.5) within group (order by pr.price)::numeric(10, 2) as median_price,
  avg(pr.price)::numeric(10, 2) as average_price,
  max(pr.reported_at) as latest_reported_at,
  min(pr.reported_at) as first_reported_at
from public.price_reports pr
inner join public.stations s on s.id = pr.station_id
where pr.status = 'approved'
  and s.is_active = true
group by s.city, pr.fuel_type, (timezone('America/Sao_Paulo', coalesce(pr.observed_at, pr.reported_at)))::date;

create unique index if not exists audit_daily_city_prices_city_fuel_day_idx
  on public.audit_daily_city_prices (city, fuel_type, day);

create index if not exists audit_daily_city_prices_day_idx
  on public.audit_daily_city_prices (day desc);

create materialized view if not exists public.audit_latest_station_prices as
select distinct on (pr.station_id, pr.fuel_type)
  pr.station_id,
  pr.fuel_type,
  pr.price,
  pr.photo_url,
  pr.photo_taken_at,
  pr.observed_at,
  pr.submitted_at,
  pr.reported_at,
  pr.reporter_nickname,
  pr.source_kind,
  pr.status
from public.price_reports pr
inner join public.stations s on s.id = pr.station_id
where pr.status = 'approved'
  and s.is_active = true
order by pr.station_id, pr.fuel_type, pr.reported_at desc, pr.created_at desc;

create unique index if not exists audit_latest_station_prices_station_fuel_idx
  on public.audit_latest_station_prices (station_id, fuel_type);

grant select on public.audit_daily_station_prices to anon, authenticated;
grant select on public.audit_daily_city_prices to anon, authenticated;
grant select on public.audit_latest_station_prices to anon, authenticated;

