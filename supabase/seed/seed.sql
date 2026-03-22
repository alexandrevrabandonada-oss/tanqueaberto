insert into public.stations (id, name, brand, address, city, neighborhood, lat, lng)
values
  ('6df5a17a-9d2e-4d75-9295-5ee4c32dbbc1', 'Posto Retiro Popular', 'BR', 'Avenida Savio Gama, 1120', 'Volta Redonda', 'Retiro', -22.5233, -44.1041),
  ('8df5f2cb-d3ec-4f92-8ff3-63768040cfd5', 'Posto Vila Santa Cecilia', 'Ipiranga', 'Rua Quatorze, 45', 'Volta Redonda', 'Vila Santa Cecilia', -22.5194, -44.0956),
  ('87dccbdc-69ef-409b-b68e-41d0ea5486d2', 'Posto Centro BM', 'Shell', 'Avenida Domingos Mariano, 301', 'Barra Mansa', 'Centro', -22.5442, -44.1719)
on conflict (id) do nothing;

insert into public.price_reports (
  station_id,
  fuel_type,
  price,
  photo_url,
  photo_taken_at,
  reported_at,
  reporter_nickname,
  status
)
values
  (
    '6df5a17a-9d2e-4d75-9295-5ee4c32dbbc1',
    'gasolina_comum',
    6.149,
    'https://example.supabase.co/storage/v1/object/public/price-report-photos/retiro-1.jpg',
    timezone('utc', now()) - interval '35 minutes',
    timezone('utc', now()) - interval '28 minutes',
    'Morador VR',
    'approved'
  ),
  (
    '8df5f2cb-d3ec-4f92-8ff3-63768040cfd5',
    'diesel_s10',
    6.059,
    'https://example.supabase.co/storage/v1/object/public/price-report-photos/vila-1.jpg',
    timezone('utc', now()) - interval '95 minutes',
    timezone('utc', now()) - interval '80 minutes',
    'Equipe campo',
    'approved'
  ),
  (
    '87dccbdc-69ef-409b-b68e-41d0ea5486d2',
    'gasolina_aditivada',
    6.499,
    'https://example.supabase.co/storage/v1/object/public/price-report-photos/bm-1.jpg',
    timezone('utc', now()) - interval '225 minutes',
    timezone('utc', now()) - interval '200 minutes',
    'Leitor BM',
    'pending'
  );
