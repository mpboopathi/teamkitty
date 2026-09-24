-- Lets mistakes be corrected without ever hard-deleting a financial record
-- (so the ledger always keeps a full audit trail), and lets officers remove
-- a player from the active roster without destroying their history.
--
-- New ledger_entries statuses:
--   withdrawn - the submitter (or an officer) cancels their own entry
--               before anyone has acted on it. Never affected the balance.
--   voided    - an officer reverses an entry that was already acknowledged.
--               Same authorization rule as who could have acknowledged it.
-- Both are simply excluded from season_closing_balance/season_player_summary,
-- which already only sum status = 'acknowledged' rows.

alter table public.ledger_entries drop constraint ledger_entries_status_check;
alter table public.ledger_entries add constraint ledger_entries_status_check
  check (status in ('pending', 'acknowledged', 'rejected', 'withdrawn', 'voided'));

alter table public.ledger_entries add column voided_by uuid references public.profiles(id);
alter table public.ledger_entries add column voided_at timestamptz;
alter table public.ledger_entries add column void_reason text;

create or replace function public.withdraw_ledger_entry(p_entry_id uuid)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.ledger_entries;
  v_team_id uuid;
begin
  select * into v_entry from public.ledger_entries where id = p_entry_id;
  if v_entry.id is null then
    raise exception 'Entry not found';
  end if;
  if v_entry.status <> 'pending' then
    raise exception 'Only a pending entry can be withdrawn';
  end if;

  v_team_id := public.season_team_id(v_entry.season_id);

  if auth.uid() <> v_entry.created_by and not public.is_team_officer(v_team_id) then
    raise exception 'Only the person who submitted this, or a team officer, can withdraw it';
  end if;

  update public.ledger_entries
  set status = 'withdrawn'
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.void_ledger_entry(p_entry_id uuid, p_reason text default null)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
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
  if v_entry.status <> 'acknowledged' then
    raise exception 'Only an acknowledged entry can be voided';
  end if;
  if auth.uid() = v_entry.created_by then
    raise exception 'You cannot void your own entry';
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
    raise exception 'You are not authorized to void this entry';
  end if;

  update public.ledger_entries
  set status = 'voided', voided_by = auth.uid(), voided_at = now(), void_reason = p_reason
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

-- Removing a player = mark them inactive, never delete the row: their past
-- ledger entries, attendance, and practice history all stay intact and
-- correctly attributed. Also closes out any office they currently hold.
create or replace function public.deactivate_team_member(p_member_id uuid)
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.team_members;
begin
  select * into v_member from public.team_members where id = p_member_id;
  if v_member.id is null then
    raise exception 'Member not found';
  end if;
  if not public.is_team_officer(v_member.team_id) then
    raise exception 'Only a team officer can remove a player';
  end if;

  if v_member.user_id is not null then
    update public.team_officer_roles
    set end_date = current_date
    where team_id = v_member.team_id and user_id = v_member.user_id and end_date is null;
  end if;

  update public.team_members
  set status = 'inactive'
  where id = p_member_id
  returning * into v_member;

  return v_member;
end;
$$;

create or replace function public.reactivate_team_member(p_member_id uuid)
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.team_members;
begin
  select * into v_member from public.team_members where id = p_member_id;
  if v_member.id is null then
    raise exception 'Member not found';
  end if;
  if not public.is_team_officer(v_member.team_id) then
    raise exception 'Only a team officer can reactivate a player';
  end if;

  update public.team_members
  set status = 'active'
  where id = p_member_id
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.withdraw_ledger_entry(uuid) from public, anon;
grant execute on function public.withdraw_ledger_entry(uuid) to authenticated;

revoke all on function public.void_ledger_entry(uuid, text) from public, anon;
grant execute on function public.void_ledger_entry(uuid, text) to authenticated;

revoke all on function public.deactivate_team_member(uuid) from public, anon;
grant execute on function public.deactivate_team_member(uuid) to authenticated;

revoke all on function public.reactivate_team_member(uuid) from public, anon;
grant execute on function public.reactivate_team_member(uuid) to authenticated;
