-- Let a team's officers upload their own logo, shown in the app header in
-- place of the default TeamKitty mark for that team. This is in-app team
-- branding only -- the native app's home-screen icon is one binary shared
-- by every team and can't vary per team, so this can't change that icon.
--
-- Stored at <team_id>/logo.<ext> in a public bucket: logos aren't sensitive
-- data, and a public bucket lets the app just use a plain URL instead of
-- minting a signed one every time the header renders.

alter table public.teams add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

create policy "officers can upload their team logo"
  on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and public.is_team_officer((storage.foldername(name))[1]::uuid)
  );

create policy "officers can replace their team logo"
  on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and public.is_team_officer((storage.foldername(name))[1]::uuid)
  );

create or replace function public.update_team_logo(p_team_id uuid, p_logo_path text)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams;
begin
  if not public.is_team_officer(p_team_id) then
    raise exception 'Only a team officer can change the team logo';
  end if;

  update public.teams set logo_path = p_logo_path where id = p_team_id
  returning * into v_team;

  if v_team.id is null then
    raise exception 'Team not found';
  end if;

  return v_team;
end;
$$;

revoke execute on function public.update_team_logo(uuid, text) from public, anon;
grant execute on function public.update_team_logo(uuid, text) to authenticated;
