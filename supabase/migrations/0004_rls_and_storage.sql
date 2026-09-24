-- TeamKitty: turn on Row Level Security everywhere, now that the
-- controlled RPC write-paths exist. Direct table writes are blocked by
-- default (no policy = denied); all writes happen through the security
-- definer functions from migration 0003, which enforce the real
-- authorization rules themselves.

create or replace function public.season_officer_check(p_season_id uuid)
returns boolean language sql stable as $$
  select public.is_team_officer(public.season_team_id(p_season_id));
$$;

-- ---------------- profiles ----------------
alter table public.profiles enable row level security;

create policy "profiles readable by any authenticated user"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ---------------- teams ----------------
alter table public.teams enable row level security;

create policy "members can view their teams"
  on public.teams for select
  using (public.is_team_member(id));

-- (no insert/update policy: creation only via create_team RPC)

-- ---------------- team_members ----------------
alter table public.team_members enable row level security;

create policy "members can view team roster"
  on public.team_members for select
  using (public.is_team_member(team_id));

-- (writes only via add_team_member / reassign_officer_role RPCs and the
-- claim_pending_team_memberships trigger, all security definer)

-- ---------------- team_officer_roles ----------------
alter table public.team_officer_roles enable row level security;

create policy "members can view officer roles"
  on public.team_officer_roles for select
  using (public.is_team_member(team_id));

-- ---------------- leagues ----------------
alter table public.leagues enable row level security;

create policy "authenticated users can view leagues"
  on public.leagues for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can add leagues"
  on public.leagues for insert
  with check (auth.role() = 'authenticated');

-- ---------------- seasons ----------------
alter table public.seasons enable row level security;

create policy "members can view seasons"
  on public.seasons for select
  using (public.is_team_member(team_id));

-- (insert only via create_season RPC)

-- ---------------- ledger_categories ----------------
alter table public.ledger_categories enable row level security;

create policy "members can view categories"
  on public.ledger_categories for select
  using (team_id is null or public.is_team_member(team_id));

create policy "officers can add team categories"
  on public.ledger_categories for insert
  with check (team_id is not null and public.is_team_officer(team_id));

-- ---------------- games ----------------
alter table public.games enable row level security;

create policy "members can view games"
  on public.games for select
  using (public.is_team_member(public.season_team_id(season_id)));

create policy "officers can add games"
  on public.games for insert
  with check (public.season_officer_check(season_id));

create policy "officers can update games"
  on public.games for update
  using (public.season_officer_check(season_id));

-- ---------------- game_attendance ----------------
alter table public.game_attendance enable row level security;

create policy "members can view attendance"
  on public.game_attendance for select
  using (public.is_team_member(public.game_team_id(game_id)));

-- (writes only via set_attendance RPC)

-- ---------------- ledger_entries ----------------
alter table public.ledger_entries enable row level security;

create policy "members can view ledger entries"
  on public.ledger_entries for select
  using (public.is_team_member(public.season_team_id(season_id)));

-- (insert/update only via submit_ledger_entry / acknowledge_ledger_entry /
-- reject_ledger_entry RPCs)

-- ---------------- attachments ----------------
alter table public.attachments enable row level security;

create policy "members can view attachments"
  on public.attachments for select
  using (
    (entity_type = 'ledger_entry' and public.is_team_member(
      public.season_team_id((select season_id from public.ledger_entries where id = entity_id))
    ))
    or
    (entity_type = 'practice_session' and public.is_team_member(
      (select team_id from public.practice_sessions where id = entity_id)
    ))
  );

create policy "uploader can record their own attachment"
  on public.attachments for insert
  with check (uploaded_by = auth.uid());

-- ---------------- practice_sessions ----------------
alter table public.practice_sessions enable row level security;

create policy "members can view practice sessions"
  on public.practice_sessions for select
  using (public.is_team_member(team_id));

-- (insert only via create_practice_session RPC)

-- ---------------- practice_participants ----------------
alter table public.practice_participants enable row level security;

create policy "members can view practice participants"
  on public.practice_participants for select
  using (public.is_team_member(
    (select team_id from public.practice_sessions where id = practice_session_id)
  ));

-- (writes only via claim_practice_payment / confirm_practice_payment RPCs)

-- ---------------- storage: receipts bucket ----------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Kept simple for now: any signed-in teammate can read/upload receipts.
-- Fine for a small trusted club app; can be tightened to per-team folders later.
create policy "authenticated can read receipts"
  on storage.objects for select
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "authenticated can upload receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');
