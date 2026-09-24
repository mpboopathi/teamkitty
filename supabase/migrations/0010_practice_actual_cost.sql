-- Let whoever books a practice session enter the actual total they paid
-- the nets facility, instead of always being forced through
-- hours_booked * team default_practice_hourly_rate (which was hardcoded
-- to $30/hr and rarely matched what was actually charged).
--
-- New optional p_total_cost: when given, it's used as-is as the total,
-- and hourly_rate is back-derived (hours_booked stays purely informational
-- record-keeping). When omitted, behavior is unchanged (rate * hours,
-- falling back to the team default rate).

drop function if exists public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[]);

create function public.create_practice_session(
  p_team_id uuid,
  p_season_id uuid default null,
  p_session_date date default current_date,
  p_location text default null,
  p_hourly_rate numeric default null,
  p_hours_booked numeric default 1,
  p_paid_by uuid default null,
  p_notes text default null,
  p_participant_ids uuid[] default '{}',
  p_total_cost numeric default null
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

  if p_total_cost is not null then
    if p_total_cost <= 0 then
      raise exception 'Amount paid must be greater than zero';
    end if;
    v_total := p_total_cost;
    v_rate := case when p_hours_booked > 0 then round(v_total / p_hours_booked, 2) else v_total end;
  else
    select coalesce(p_hourly_rate, default_practice_hourly_rate) into v_rate
    from public.teams where id = p_team_id;
    v_total := v_rate * p_hours_booked;
  end if;

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

revoke execute on function public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[], numeric) from public, anon;
grant execute on function public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[], numeric) to authenticated;
