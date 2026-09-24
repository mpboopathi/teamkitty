-- Close out the remaining advisor warnings: pin search_path on the
-- functions that were missing it, and restrict execution of all our
-- custom RPCs to signed-in users only (anon has no business calling any
-- of them -- everything here requires a real user).

create or replace function public.season_team_id(p_season_id uuid)
returns uuid language sql stable set search_path = public as $$
  select team_id from public.seasons where id = p_season_id;
$$;

create or replace function public.game_team_id(p_game_id uuid)
returns uuid language sql stable set search_path = public as $$
  select s.team_id from public.games g join public.seasons s on s.id = g.season_id where g.id = p_game_id;
$$;

create or replace function public.season_closing_balance(p_season_id uuid)
returns numeric language sql stable set search_path = public as $$
  select s.opening_balance + coalesce(sum(
    case when lc.kind = 'income' then le.amount else -le.amount end
  ), 0)
  from public.seasons s
  left join public.ledger_entries le on le.season_id = s.id and le.status = 'acknowledged'
  left join public.ledger_categories lc on lc.id = le.category_id
  where s.id = p_season_id
  group by s.id, s.opening_balance;
$$;

create or replace function public.season_officer_check(p_season_id uuid)
returns boolean language sql stable set search_path = public as $$
  select public.is_team_officer(public.season_team_id(p_season_id));
$$;

create or replace function public.season_player_summary(p_season_id uuid)
returns table (
  player_id uuid,
  full_name text,
  registration_paid numeric,
  games_played bigint,
  suggested_return numeric,
  returned_so_far numeric
)
language sql stable set search_path = public as $$
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

-- Restrict execution to authenticated users only (revoke default PUBLIC grant).
revoke execute on function public.is_team_member(uuid) from public;
revoke execute on function public.is_team_officer(uuid) from public;
revoke execute on function public.is_treasurer(uuid) from public;
revoke execute on function public.is_captain(uuid) from public;
revoke execute on function public.season_team_id(uuid) from public;
revoke execute on function public.game_team_id(uuid) from public;
revoke execute on function public.season_closing_balance(uuid) from public;
revoke execute on function public.season_officer_check(uuid) from public;
revoke execute on function public.season_player_summary(uuid) from public;
revoke execute on function public.create_team(text, text, text) from public;
revoke execute on function public.add_team_member(uuid, text, text) from public;
revoke execute on function public.reassign_officer_role(uuid, text, uuid) from public;
revoke execute on function public.create_season(uuid, text, uuid, text, date, date, numeric, numeric, int) from public;
revoke execute on function public.submit_ledger_entry(uuid, text, numeric, uuid, uuid, text, text, date) from public;
revoke execute on function public.acknowledge_ledger_entry(uuid) from public;
revoke execute on function public.reject_ledger_entry(uuid, text) from public;
revoke execute on function public.add_game(uuid, int, date, text, text, boolean) from public;
revoke execute on function public.set_attendance(uuid, uuid, boolean) from public;
revoke execute on function public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[]) from public;
revoke execute on function public.claim_practice_payment(uuid) from public;
revoke execute on function public.confirm_practice_payment(uuid) from public;
revoke execute on function public.claim_pending_team_memberships() from public;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_officer(uuid) to authenticated;
grant execute on function public.is_treasurer(uuid) to authenticated;
grant execute on function public.is_captain(uuid) to authenticated;
grant execute on function public.season_team_id(uuid) to authenticated;
grant execute on function public.game_team_id(uuid) to authenticated;
grant execute on function public.season_closing_balance(uuid) to authenticated;
grant execute on function public.season_officer_check(uuid) to authenticated;
grant execute on function public.season_player_summary(uuid) to authenticated;
grant execute on function public.create_team(text, text, text) to authenticated;
grant execute on function public.add_team_member(uuid, text, text) to authenticated;
grant execute on function public.reassign_officer_role(uuid, text, uuid) to authenticated;
grant execute on function public.create_season(uuid, text, uuid, text, date, date, numeric, numeric, int) to authenticated;
grant execute on function public.submit_ledger_entry(uuid, text, numeric, uuid, uuid, text, text, date) to authenticated;
grant execute on function public.acknowledge_ledger_entry(uuid) to authenticated;
grant execute on function public.reject_ledger_entry(uuid, text) to authenticated;
grant execute on function public.add_game(uuid, int, date, text, text, boolean) to authenticated;
grant execute on function public.set_attendance(uuid, uuid, boolean) to authenticated;
grant execute on function public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[]) to authenticated;
grant execute on function public.claim_practice_payment(uuid) to authenticated;
grant execute on function public.confirm_practice_payment(uuid) to authenticated;
