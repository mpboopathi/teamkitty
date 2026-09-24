-- TeamKitty: self-serve "join an existing team" via a short join code,
-- instead of every new sign-in being forced into "create a new team".
--
-- Design: each team gets a short, unique, human-typeable code. An officer
-- shares it (text, WhatsApp, etc.) with a player; the player enters it on
-- first sign-in and is added as an active member immediately -- no
-- approval step, consistent with how pre-added-by-email invites already
-- auto-claim on sign-in. Officers can still pre-add players by email too;
-- both paths are supported side by side.

-- ============================================================
-- Code generator (internal helper, not callable directly by clients)
-- ============================================================

create or replace function public.generate_team_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Uppercase letters/digits only, with visually-ambiguous characters
  -- (0/O, 1/I/L) removed so codes are easy to read aloud and retype.
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.teams where join_code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke all on function public.generate_team_join_code() from public;

-- ============================================================
-- teams.join_code column
-- ============================================================

alter table public.teams add column join_code text;

update public.teams set join_code = public.generate_team_join_code() where join_code is null;

alter table public.teams alter column join_code set not null;
alter table public.teams add constraint teams_join_code_unique unique (join_code);

-- ============================================================
-- create_team: now also generates a join code for the new team.
-- ============================================================

create or replace function public.create_team(p_name text, p_sport text default 'cricket', p_city text default null)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to create a team';
  end if;

  insert into public.teams (name, sport, city, created_by, join_code)
  values (p_name, p_sport, p_city, auth.uid(), public.generate_team_join_code())
  returning * into v_team;

  insert into public.team_members (team_id, user_id, status)
  values (v_team.id, auth.uid(), 'active');

  insert into public.team_officer_roles (team_id, user_id, role_key)
  values
    (v_team.id, auth.uid(), 'treasurer'),
    (v_team.id, auth.uid(), 'captain'),
    (v_team.id, auth.uid(), 'vice_captain'),
    (v_team.id, auth.uid(), 'board_member');

  return v_team;
end;
$$;

revoke all on function public.create_team(text, text, text) from public;
grant execute on function public.create_team(text, text, text) to authenticated;

-- ============================================================
-- join_team_by_code: self-serve join. If the signed-in user's email
-- matches a pending invite row on that team, claim it; otherwise add
-- them as a brand new active member.
-- ============================================================

create or replace function public.join_team_by_code(p_code text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams;
  v_email text;
  v_claimed_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to join a team';
  end if;

  select * into v_team from public.teams where join_code = upper(trim(p_code));
  if v_team.id is null then
    raise exception 'That join code was not found. Double-check it with your team officer.';
  end if;

  if exists (select 1 from public.team_members where team_id = v_team.id and user_id = auth.uid()) then
    return v_team; -- already a member, nothing to do
  end if;

  select email into v_email from public.profiles where id = auth.uid();

  update public.team_members
  set user_id = auth.uid(), status = 'active'
  where team_id = v_team.id
    and user_id is null
    and invite_email is not null
    and lower(invite_email) = lower(v_email)
  returning id into v_claimed_id;

  if v_claimed_id is null then
    insert into public.team_members (team_id, user_id, status)
    values (v_team.id, auth.uid(), 'active');
  end if;

  return v_team;
end;
$$;

revoke all on function public.join_team_by_code(text) from public;
grant execute on function public.join_team_by_code(text) to authenticated;
