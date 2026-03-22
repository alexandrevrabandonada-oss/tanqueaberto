create or replace function public.is_admin_email(p_email text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users admin
    where lower(admin.email) = lower(coalesce(p_email, auth.jwt() ->> 'email'))
  );
$$;

alter table public.admin_users
  add column if not exists email text;

create unique index if not exists admin_users_email_key on public.admin_users (lower(email));

update public.admin_users admin
set email = lower(coalesce(admin.email, auth_user.email))
from auth.users auth_user
where admin.email is null
  and admin.user_id = auth_user.id
  and auth_user.email is not null;

drop policy if exists "Admins can read admin registry" on public.admin_users;
drop policy if exists "Admins can read their own registry row" on public.admin_users;
drop policy if exists "Users can read own admin registry row" on public.admin_users;
drop policy if exists "Admins can moderate reports" on public.price_reports;
drop policy if exists "Admins can read reports" on public.price_reports;
drop policy if exists "Public can read approved or flagged reports" on public.price_reports;
drop policy if exists "Public can read approved reports" on public.price_reports;
drop policy if exists "Public can submit pending reports" on public.price_reports;
drop policy if exists "Public can read active stations" on public.stations;
drop policy if exists "Admins can read stations" on public.stations;
drop policy if exists "Public can view report photos" on storage.objects;
drop policy if exists "Public can upload report photos" on storage.objects;
drop policy if exists "Admins can manage report photos" on storage.objects;

create policy "Public can read active stations"
on public.stations
for select
using (is_active = true);

create policy "Admins can read stations"
on public.stations
for select
using (public.is_admin_email());

create policy "Public can read approved reports"
on public.price_reports
for select
using (status = 'approved');

create policy "Authenticated users can submit pending reports"
on public.price_reports
for insert
with check (status = 'pending' and auth.role() = 'authenticated');

create policy "Admins can read reports"
on public.price_reports
for select
using (public.is_admin_email());

create policy "Admins can update reports"
on public.price_reports
for update
using (public.is_admin_email())
with check (public.is_admin_email());

create policy "Admins can delete reports"
on public.price_reports
for delete
using (public.is_admin_email());

create policy "Users can read own admin registry row"
on public.admin_users
for select
using (lower(email) = lower(auth.jwt() ->> 'email'));

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

create policy "Admins can manage report photos"
on storage.objects
for all
using (bucket_id = 'price-report-photos' and public.is_admin_email())
with check (bucket_id = 'price-report-photos' and public.is_admin_email());
