alter table public.stations
  add column if not exists duplicate_of_station_id uuid;

do $$
begin
  alter table public.stations
    add constraint stations_duplicate_of_station_id_fkey
    foreign key (duplicate_of_station_id) references public.stations(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists stations_duplicate_of_station_id_idx
  on public.stations (duplicate_of_station_id);
