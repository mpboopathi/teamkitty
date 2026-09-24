-- TeamKitty: team creation, roster (incl. not-yet-signed-in players), and
-- officer role assignment/handoff.

-- ============================================================
-- Allow "pending" roster spots for players who haven't signed in yet
-- ============================================================

alter table public.team_members
  alter column user_id drop not null,
  add column invite_email text,
  add column display_name text;

alter table public.team_members
  add constraint team_members_identity_check
  check (user_id is not null or invite_email is not null);

-- One pending invite per email per team (once claimed, user_id is set and
-- this partial index no longer applies to that row).
create unique index team_members_pending_invite_unique
  on public.team_members (team_id, lower(invite_email))
  where (user_id is null);

-- When someone signs in for the first time and their profile is created,
-- automatically link them to any roster spot that was pre-created for
-- their email.
create or replace function public.claim_pending_team_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team_members
  set user_id = new.id,
      status = 'active'
  where user_id is null
    and invite_email is not null
    and lower(invite_email) = lower(new.email);
  return new;
end;
$$;

create trigger claim_pending_team_memberships_trigger
  after insert on public.profiles
  for each row
  execute function public.claim_pending_team_memberships();

-- ============================================================
-- create_team: the person creating a team becomes a member AND holds
-- all four officer offices to start (per your call: whoever bootstraps
-- the team gets full elevated access, then hands specific offices to
-- the right people afterwards).
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

  insert into public.teams (name, sport, city, created_by)
  values (p_name, p_sport, p_city, auth.uid())
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

-- ============================================================
-- add_team_member: only a current officer can add players. If the
-- email already has a profile (they've signed in before), link
-- immediately; otherwise reserve a pending roster spot.
-- ============================================================

create or replace function public.add_team_member(p_team_id uuid, p_email text, p_full_name text default null)
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_profile_id uuid;
  v_member public.team_members;
  v_is_officer boolean;
begin
  select exists (
    select 1 from public.team_officer_roles
    where team_id = p_team_id and user_id = auth.uid() and end_date is null
  ) into v_is_officer;

  if not v_is_officer then
    raise exception 'Only a team officer can add members';
  end if;

  select id into v_existing_profile_id
  from public.profiles
  where lower(email) = lower(p_email);

  if v_existing_profile_id is not null then
    insert into public.team_members (team_id, user_id, status)
    values (p_team_id, v_existing_profile_id, 'active')
    on conflict (team_id, user_id) do nothing
    returning * into v_member;
  else
    insert into public.team_members (team_id, invite_email, display_name, status)
    values (p_team_id, p_email, coalesce(p_full_name, split_part(p_email, '@', 1)), 'invited')
    on conflict (team_id, lower(invite_email)) where (user_id is null) do nothing
    returning * into v_member;
  end if;

  return v_member;
end;
$$;

-- ============================================================
-- reassign_officer_role: hand an office from its current holder to
-- someone else on the roster. Callable by any current officer.
-- ============================================================

create or replace function public.reassign_officer_role(p_team_id uuid, p_role_key text, p_new_user_id uuid)
returns public.team_officer_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_officer boolean;
  v_row public.team_officer_roles;
begin
  select exists (
    select 1 from public.team_officer_roles
    where team_id = p_team_id and user_id = auth.uid() and end_date is null
  ) into v_is_officer;

  if not v_is_officer then
    raise exception 'Only a current officer can reassign roles';
  end if;

  update public.team_officer_roles
  set end_date = current_date
  where team_id = p_team_id and role_key = p_role_key and end_date is null;

  insert into public.team_officer_roles (team_id, user_id, role_key)
  values (p_team_id, p_new_user_id, p_role_key)
  returning * into v_row;

  -- Make sure the new office-holder is also a plain roster member.
  insert into public.team_members (team_id, user_id, status)
  values (p_team_id, p_new_user_id, 'active')
  on conflict (team_id, user_id) do nothing;

  return v_row;
end;
$$;
