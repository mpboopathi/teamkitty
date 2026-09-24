create or replace function public.update_season_settings(
  p_season_id uuid,
  p_per_game_cost numeric default null,
  p_registration_fee_amount numeric default null,
  p_league_fee_amount numeric default null,
  p_planned_game_count int default null,
  p_status text default null
)
returns public.seasons
language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_season public.seasons;
begin
  v_team_id := public.season_team_id(p_season_id);
  if not public.is_team_officer(v_team_id) then
    raise exception 'Only a team officer can update season settings';
  end if;

  update public.seasons set
    per_game_cost = coalesce(p_per_game_cost, per_game_cost),
    registration_fee_amount = coalesce(p_registration_fee_amount, registration_fee_amount),
    league_fee_amount = coalesce(p_league_fee_amount, league_fee_amount),
    planned_game_count = coalesce(p_planned_game_count, planned_game_count),
    status = coalesce(p_status, status)
  where id = p_season_id
  returning * into v_season;

  return v_season;
end;
$$;

revoke execute on function public.update_season_settings(uuid, numeric, numeric, numeric, int, text) from public;
grant execute on function public.update_season_settings(uuid, numeric, numeric, numeric, int, text) to authenticated;
