-- TeamKitty initial schema
-- Step 2 of the build: core tables, no RLS policies yet (that's the next migration).

create extension if not exists "pgcrypto";

-- ============================================================
-- People
-- ============================================================

-- One row per signed-in user. Mirrors auth.users so we have a
-- foreign-key-able identity to hang everything else off of.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Teams (tenants) and membership
-- ============================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'cricket',
  city text,
  default_practice_hourly_rate numeric(10,2) not null default 30,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Every person on a team, including officers (an officer is still a
-- member/player row; office-holding is layered on separately below).
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('invited', 'active', 'inactive')),
  jersey_number text,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- Who holds which office, and when. end_date null = currently holds it.
-- v1 decision: one active holder per office per team (enforced below).
create table public.team_officer_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null check (role_key in ('treasurer', 'captain', 'vice_captain', 'board_member')),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now()
);

-- Only one *active* (end_date is null) holder of a given office per team.
create unique index team_officer_roles_active_unique
  on public.team_officer_roles (team_id, role_key)
  where (end_date is null);

-- ============================================================
-- Leagues (shared reference data, not owned by any one team)
-- ============================================================

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- e.g. SDCA, SDCC, SDTapTennis
  sport text,
  region text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Seasons
-- ============================================================

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  league_id uuid references public.leagues(id),
  league_division text,
  name text not null,                        -- e.g. "2026 Spring"
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  opening_balance numeric(10,2) not null default 0,   -- copied from prior season's closing balance
  registration_fee_amount numeric(10,2) not null default 250,
  league_fee_amount numeric(10,2) not null default 2000,
  planned_game_count int not null default 10,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

-- ============================================================
-- Ledger (the actual accounting)
-- ============================================================

-- Data-driven transaction categories instead of a hardcoded enum, so any
-- team/sport can add its own (Main Umpire, Leg Umpire, Match Drinks, Gear...).
-- team_id null = a global default category seeded for every new team.
create table public.ledger_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  key text not null,
  label text not null,
  kind text not null check (kind in ('income', 'expense')),
  receipts_recommended boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (team_id, key)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  game_number int,
  game_date date,
  opponent text,
  venue text,
  is_playoff boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- Who actually played each game -- drives the per-player fee-return math.
create table public.game_attendance (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  played boolean not null default true,
  unique (game_id, player_id)
);

-- The transaction log. Mirrors your spreadsheet rows one-for-one.
-- Maker-checker: status starts 'pending' and only counts toward balances
-- once 'acknowledged'. Who is allowed to acknowledge whom is enforced later
-- by RLS policy (hardcoded rule, see next migration), not a config table --
-- you asked for it strict: treasurer's submissions need captain to
-- acknowledge, everyone else's submissions need treasurer to acknowledge.
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category_id uuid not null references public.ledger_categories(id),
  amount numeric(10,2) not null check (amount > 0),   -- always positive; category.kind gives the sign
  player_id uuid references public.profiles(id),      -- who paid in / who's being reimbursed, if applicable
  game_id uuid references public.games(id),
  payee_name text,                                    -- free text for external payees (umpire names etc.)
  note text,
  occurred_on date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'rejected')),
  created_by uuid not null references public.profiles(id),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint acknowledger_not_creator check (acknowledged_by is null or acknowledged_by <> created_by)
);

create index ledger_entries_season_idx on public.ledger_entries (season_id);
create index ledger_entries_player_idx on public.ledger_entries (player_id);
create index ledger_entries_status_idx on public.ledger_entries (status);

-- Receipt photos etc. Polymorphic-lite: points at either a ledger entry or
-- a practice session.
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('ledger_entry', 'practice_session')),
  entity_id uuid not null,
  storage_path text not null,
  file_name text,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create index attachments_entity_idx on public.attachments (entity_type, entity_id);

-- ============================================================
-- Nets / practice cost-splitting (peer-to-peer, separate from the kitty)
-- ============================================================

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id),   -- optional link, practice can happen off-season
  session_date date not null default current_date,
  location text,
  hourly_rate numeric(10,2) not null,
  hours_booked numeric(5,2) not null,
  total_cost numeric(10,2) not null,
  paid_by uuid not null references public.profiles(id),   -- who fronted the court cost
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- One row per attendee. Settlement is a peer confirmation (paid_by
-- confirms), not an officer-role approval.
create table public.practice_participants (
  id uuid primary key default gen_random_uuid(),
  practice_session_id uuid not null references public.practice_sessions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(10,2) not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'claimed_paid', 'confirmed')),
  claimed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  unique (practice_session_id, player_id)
);

create index practice_participants_player_idx on public.practice_participants (player_id);

-- ============================================================
-- Seed: global default ledger categories (every new team starts with these)
-- ============================================================

insert into public.ledger_categories (team_id, key, label, kind, receipts_recommended, is_system) values
  (null, 'opening_balance',   'Opening Balance',        'income',  false, true),
  (null, 'registration_fee',  'Player Registration Fee','income',  false, true),
  (null, 'league_fee',        'League Fee',             'expense', true,  true),
  (null, 'main_umpire',       'Main Umpire Fee',        'expense', false, true),
  (null, 'leg_umpire',        'Leg Umpire Fee',         'expense', false, true),
  (null, 'match_drinks',      'Match Drinks / Water',   'expense', true,  true),
  (null, 'team_gear',         'Team Gear / Sportswear', 'expense', true,  true),
  (null, 'fee_return',        'Season Fee Return',      'expense', false, true),
  (null, 'adjustment',        'Adjustment',              'expense', false, true);
