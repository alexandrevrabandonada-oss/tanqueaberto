create table if not exists public.station_editor_invites (
  id uuid primary key default gen_random_uuid(),
  invite_token text not null unique,
  invite_code text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'revogado', 'expirado')),
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  expires_at timestamptz not null,
  created_by_id uuid,
  created_by_email text,
  accepted_at timestamptz,
  accepted_name text,
  accepted_session_id uuid,
  accepted_by_user_agent text,
  revoked_at timestamptz,
  revoked_by_id uuid,
  revoked_by_email text,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists station_editor_invites_status_idx
  on public.station_editor_invites (status, created_at desc);

create index if not exists station_editor_invites_expires_idx
  on public.station_editor_invites (expires_at, created_at desc);

create table if not exists public.station_editor_sessions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.station_editor_invites(id) on delete cascade,
  token_hash text not null unique,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  role text not null default 'station_editor' check (role in ('station_editor')),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by_id uuid,
  revoked_by_email text
);

create index if not exists station_editor_sessions_status_idx
  on public.station_editor_sessions (status, expires_at);

create index if not exists station_editor_sessions_invite_idx
  on public.station_editor_sessions (invite_id, created_at desc);

alter table public.station_light_edits
  drop constraint if exists station_light_edits_editor_id_fkey;
