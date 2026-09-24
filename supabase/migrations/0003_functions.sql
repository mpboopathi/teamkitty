-- TeamKitty: seasons, ledger (maker-checker), games/attendance, and
-- nets/practice cost-splitting -- all as controlled RPC functions.

alter table public.seasons add column per_game_cost numeric(10,2);

-- ============================================================
-- Helper functions (security definer to avoid RLS recursion when
-- used inside policies later)
-- ============================================================

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_team_officer(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_officer_roles
    where team_id = p_team_id and user_id = auth.uid() and end_date is null
  );
$$;

create or replace function public.is_treasurer(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_officer_roles
    where team_id = p_team_id and user_id = auth.uid() and role_key = 'treasurer' and end_date is null
  );
$$;

create or replace function public.is_captain(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_officer_roles
    where team_id = p_team_id and user_id = auth.uid() and role_key = 'captain' and end_date is null
  );
$$;

create or replace function public.season_team_id(p_season_id uuid)
returns uuid language sql stable as $$
  select team_id from public.seasons where id = p_season_id;
$$;

create or replace function public.game_team_id(p_game_id uuid)
returns uuid language sql stable as $$
  select s.team_id from public.games g join public.seasons s on s.id = g.season_id where g.id = p_game_id;
$$;

-- ============================================================
-- Seasons: opening balance is automatically pulled from the prior
-- season's closing balance.
-- ============================================================

create or replace function public.season_closing_balance(p_season_id uuid)
returns numeric language sql stable as $$
  select s.opening_balance + coalesce(sum(
    case when lc.kind = 'income' then le.amount else -le.amount end
  ), 0)
  from public.seasons s
  left join public.ledger_entries le on le.season_id = s.id and le.status = 'acknowledged'
  left join public.ledger_categories lc on lc.id = le.category_id
  where s.id = p_season_id
  group by s.id, s.opening_balance;
$$;

create or replace function public.create_season(
  p_team_id uuid,
  p_name text,
  p_league_id uuid default null,
  p_league_division text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_registration_fee_amount numeric default 250,
  p_league_fee_amount numeric default 2000,
  p_planned_game_count int default 10
)
returns public.seasons
language plpgsql security definer set search_path = public as $$
declare
  v_prev_season_id uuid;
  v_opening numeric := 0;
  v_season public.seasons;
begin
  if not public.is_team_officer(p_team_id) then
    raise exception 'Only a team officer can create a season';
  end if;

  select id into v_prev_season_id
  from public.seasons
  where team_id = p_team_id
  order by coalesce(end_date, start_date, created_at) desc
  limit 1;

  if v_prev_season_id is not null then
    v_opening := public.season_closing_balance(v_prev_season_id);
  end if;

  insert into public.seasons (
    team_id, league_id, league_division, name, start_date, end_date,
    opening_balance, registration_fee_amount, league_fee_amount, planned_game_count, created_by
  ) values (
    p_team_id, p_league_id, p_league_division, p_name, p_start_date, p_end_date,
    v_opening, p_registration_fee_amount, p_league_fee_amount, p_planned_game_count, auth.uid()
  ) returning * into v_season;

  return v_season;
end;
$$;

-- ============================================================
-- Ledger: maker-checker. Rule (hardcoded per your call): a treasurer's
-- submissions need a captain to acknowledge; everyone else's need the
-- treasurer to acknowledge.
-- ============================================================

create or replace function public.submit_ledger_entry(
  p_season_id uuid,
  p_category_key text,
  p_amount numeric,
  p_player_id uuid default null,
  p_game_id uuid default null,
  p_payee_name text default null,
  p_note text default null,
  p_occurred_on date default current_date
)
returns public.ledger_entries
language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_category_id uuid;
  v_entry public.ledger_entries;
begin
  select team_id into v_team_id from public.seasons where id = p_season_id;
  if v_team_id is null then
    raise exception 'Season not found';
  end if;
  if not public.is_team_member(v_team_id) then
    raise exception 'Not a member of this team';
  end if;

  select id into v_category_id
  from public.ledger_categories
  where key = p_category_key and (team_id = v_team_id or team_id is null)
  order by team_id nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'Unknown ledger category: %', p_category_key;
  end if;

  insert into public.ledger_entries (
    season_id, category_id, amount, player_id, game_id, payee_name, note, occurred_on, created_by, status
  ) values (
    p_season_id, v_category_id, p_amount, p_player_id, p_game_id, p_payee_name, p_note, p_occurred_on, auth.uid(), 'pending'
  ) returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.acknowledge_ledger_entry(p_entry_id uuid)
returns public.ledger_entries
language plpgsql security definer set search_path = public as $$
declare
  v_entry public.ledger_entries;
  v_team_id uuid;
  v_creator_is_treasurer boolean;
  v_ok boolean;
begin
  select * into v_entry from public.ledger_entries where id = p_entry_id;
  if v_entry.id is null then
    raise exception 'Entry not found';
  end if;
  if v_entry.status <> 'pending' then
    raise exception 'Entry is not pending';
  end if;
  if auth.uid() = v_entry.created_by then
    raise exception 'You cannot acknowledge your own entry';
  end if;

  v_team_id := public.season_team_id(v_entry.season_id);

  select exists (
    select 1 from public.team_officer_roles
    where team_id = v_team_id and user_id = v_entry.created_by and role_key = 'treasurer' and end_date is null
  ) into v_creator_is_treasurer;

  if v_creator_is_treasurer then
    v_ok := public.is_captain(v_team_id);
  else
    v_ok := public.is_treasurer(v_team_id);
  end if;

  if not v_ok then
    raise exception 'You are not authorized to acknowledge this entry';
  end if;

  update public.ledger_entries
  set status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_at = now()
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.reject_ledger_entry(p_entry_id uuid, p_reason text default null)
returns public.ledger_entries
language plpgsql security definer set search_path = public as $$
declare
  v_entry public.ledger_entries;
  v_team_id uuid;
  v_creator_is_treasurer boolean;
  v_ok boolean;
begin
  select * into v_entry from public.ledger_entries where id = p_entry_id;
  if v_entry.id is null then
    raise exception 'Entry not found';
  end if;
  if v_entry.status <> 'pending' then
    raise exception 'Entry is not pending';
  end if;

  v_team_id := public.season_team_id(v_entry.season_id);

  select exists (
    select 1 from public.team_officer_roles
    where team_id = v_team_id and user_id = v_entry.created_by and role_key = 'treasurer' and end_date is null
  ) into v_creator_is_treasurer;

  if v_creator_is_treasurer then
    v_ok := public.is_captain(v_team_id);
  else
    v_ok := public.is_treasurer(v_team_id);
  end if;

  if not v_ok then
    raise exception 'You are not authorized to reject this entry';
  end if;

  update public.ledger_entries
  set status = 'rejected', acknowledged_by = auth.uid(), acknowledged_at = now(),
      note = coalesce(p_reason, note)
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

-- Per-player registration paid / games played / suggested return, for the dashboard.
create or replace function public.season_player_summary(p_season_id uuid)
returns table (
  player_id uuid,
  full_name text,
  registration_paid numeric,
  games_played bigint,
  suggested_return numeric,
  returned_so_far numeric
)
language sql stable as $$
  with team as (
    select team_id from public.seasons where id = p_season_id
  ),
  roster as (
    select tm.user_id as player_id, p.full_name
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.team_id = (select team_id from team) and tm.user_id is not null
  ),
  paid as (
    select le.player_id, sum(le.amount) as amt
    from public.ledger_entries le
    join public.ledger_categories lc on lc.id = le.category_id
    where le.season_id = p_season_id and le.status = 'acknowledged' and lc.key = 'registration_fee'
    group by le.player_id
  ),
  returned as (
    select le.player_id, sum(le.amount) as amt
    from public.ledger_entries le
    join public.ledger_categories lc on lc.id = le.category_id
    where le.season_id = p_season_id and le.status = 'acknowledged' and lc.key = 'fee_return'
    group by le.player_id
  ),
  played as (
    select ga.player_id, count(*) filter (where ga.played) as cnt
    from public.game_attendance ga
    join public.games g on g.id = ga.game_id
    where g.season_id = p_season_id
    group by ga.player_id
  )
  select
    r.player_id,
    r.full_name,
    coalesce(pd.amt, 0) as registration_paid,
    coalesce(pl.cnt, 0) as games_played,
    coalesce(pd.amt, 0) - coalesce(pl.cnt, 0) * coalesce((select per_game_cost from public.seasons where id = p_season_id), 0) as suggested_return,
    coalesce(rt.amt, 0) as returned_so_far
  from roster r
  left join paid pd on pd.player_id = r.player_id
  left join played pl on pl.player_id = r.player_id
  left join returned rt on rt.player_id = r.player_id
  order by r.full_name;
$$;

-- ============================================================
-- Games and attendance (officer-managed)
-- ============================================================

create or replace function public.add_game(
  p_season_id uuid, p_game_number int default null, p_game_date date default null,
  p_opponent text default null, p_venue text default null, p_is_playoff boolean default false
)
returns public.games language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_game public.games;
begin
  v_team_id := public.season_team_id(p_season_id);
  if not public.is_team_officer(v_team_id) then
    raise exception 'Only a team officer can add games';
  end if;
  insert into public.games (season_id, game_number, game_date, opponent, venue, is_playoff)
  values (p_season_id, p_game_number, p_game_date, p_opponent, p_venue, p_is_playoff)
  returning * into v_game;
  return v_game;
end;
$$;

create or replace function public.set_attendance(p_game_id uuid, p_player_id uuid, p_played boolean)
returns public.game_attendance language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_row public.game_attendance;
begin
  v_team_id := public.game_team_id(p_game_id);
  if not public.is_team_officer(v_team_id) then
    raise exception 'Only a team officer can record attendance';
  end if;
  insert into public.game_attendance (game_id, player_id, played)
  values (p_game_id, p_player_id, p_played)
  on conflict (game_id, player_id) do update set played = excluded.played
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- Nets / practice cost-splitting (peer-to-peer, separate from the kitty)
-- ============================================================

create or replace function public.create_practice_session(
  p_team_id uuid,
  p_season_id uuid default null,
  p_session_date date default current_date,
  p_location text default null,
  p_hourly_rate numeric default null,
  p_hours_booked numeric default 1,
  p_paid_by uuid default null,
  p_notes text default null,
  p_participant_ids uuid[] default '{}'
)
returns public.practice_sessions language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric;
  v_total numeric;
  v_share numeric;
  v_session public.practice_sessions;
  v_paid_by uuid;
  v_pid uuid;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Not a member of this team';
  end if;

  select coalesce(p_hourly_rate, default_practice_hourly_rate) into v_rate
  from public.teams where id = p_team_id;

  v_total := v_rate * p_hours_booked;
  v_paid_by := coalesce(p_paid_by, auth.uid());

  if p_participant_ids is null or array_length(p_participant_ids, 1) is null or array_length(p_participant_ids, 1) = 0 then
    raise exception 'At least one participant is required';
  end if;

  v_share := round(v_total / array_length(p_participant_ids, 1), 2);

  insert into public.practice_sessions (
    team_id, season_id, session_date, location, hourly_rate, hours_booked, total_cost, paid_by, notes, created_by
  ) values (
    p_team_id, p_season_id, p_session_date, p_location, v_rate, p_hours_booked, v_total, v_paid_by, p_notes, auth.uid()
  ) returning * into v_session;

  foreach v_pid in array p_participant_ids loop
    insert into public.practice_participants (practice_session_id, player_id, share_amount, status)
    values (v_session.id, v_pid, v_share, case when v_pid = v_paid_by then 'confirmed' else 'unpaid' end);
  end loop;

  return v_session;
end;
$$;

create or replace function public.claim_practice_payment(p_participant_id uuid)
returns public.practice_participants language plpgsql security definer set search_path = public as $$
declare
  v_row public.practice_participants;
begin
  update public.practice_participants
  set status = 'claimed_paid', claimed_at = now()
  where id = p_participant_id and player_id = auth.uid() and status = 'unpaid'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Not allowed, or this share is not in an unpaid state';
  end if;
  return v_row;
end;
$$;

create or replace function public.confirm_practice_payment(p_participant_id uuid)
returns public.practice_participants language plpgsql security definer set search_path = public as $$
declare
  v_row public.practice_participants;
  v_session public.practice_sessions;
begin
  select ps.* into v_session
  from public.practice_participants pp
  join public.practice_sessions ps on ps.id = pp.practice_session_id
  where pp.id = p_participant_id;

  if v_session.id is null then
    raise exception 'Not found';
  end if;

  if v_session.paid_by <> auth.uid() then
    raise exception 'Only the person who paid for the session can confirm receipt of payment';
  end if;

  update public.practice_participants
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where id = p_participant_id
  returning * into v_row;

  return v_row;
end;
$$;
