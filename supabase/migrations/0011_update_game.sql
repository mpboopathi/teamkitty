-- Allow officers to edit a game after it's been entered (opponent, date,
-- venue, playoff flag, notes, game number) -- previously add_game had no
-- corresponding update, so a typo or TBD-at-the-time detail was stuck.

create or replace function public.update_game(
  p_game_id uuid,
  p_game_number int default null,
  p_game_date date default null,
  p_opponent text default null,
  p_venue text default null,
  p_is_playoff boolean default null,
  p_notes text default null
)
returns public.games language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_game public.games;
begin
  v_team_id := public.game_team_id(p_game_id);
  if not public.is_team_officer(v_team_id) then
    raise exception 'Only a team officer can edit games';
  end if;

  update public.games set
    game_number = coalesce(p_game_number, game_number),
    game_date = coalesce(p_game_date, game_date),
    opponent = coalesce(p_opponent, opponent),
    venue = coalesce(p_venue, venue),
    is_playoff = coalesce(p_is_playoff, is_playoff),
    notes = coalesce(p_notes, notes)
  where id = p_game_id
  returning * into v_game;

  if v_game.id is null then
    raise exception 'Game not found';
  end if;

  return v_game;
end;
$$;

revoke execute on function public.update_game(uuid, int, date, text, text, boolean, text) from public, anon;
grant execute on function public.update_game(uuid, int, date, text, text, boolean, text) to authenticated;
