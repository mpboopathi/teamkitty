-- Fixes a real gap from the earlier hardening pass (0005): revoking EXECUTE
-- from PUBLIC does NOT remove Supabase's separate default grant of EXECUTE
-- to the `anon` role on every new function in the public schema. Verified
-- via information_schema.routine_privileges that `anon` still had EXECUTE
-- on every custom function, old and new. Underlying tables have RLS
-- enabled, so this was not an active data leak (anon has no session, so
-- auth.uid() is null and RLS denies the rows) -- but anon should not be
-- able to invoke these at all, so closing it properly now.

-- Client-callable entry points and RLS-helper functions: authenticated
-- users only, never anon.
revoke execute on function public.acknowledge_ledger_entry(uuid) from public, anon;
revoke execute on function public.add_game(uuid, integer, date, text, text, boolean) from public, anon;
revoke execute on function public.add_team_member(uuid, text, text) from public, anon;
revoke execute on function public.claim_practice_payment(uuid) from public, anon;
revoke execute on function public.confirm_practice_payment(uuid) from public, anon;
revoke execute on function public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[]) from public, anon;
revoke execute on function public.create_season(uuid, text, uuid, text, date, date, numeric, numeric, integer) from public, anon;
revoke execute on function public.create_team(text, text, text) from public, anon;
revoke execute on function public.game_team_id(uuid) from public, anon;
revoke execute on function public.is_captain(uuid) from public, anon;
revoke execute on function public.is_team_member(uuid) from public, anon;
revoke execute on function public.is_team_officer(uuid) from public, anon;
revoke execute on function public.is_treasurer(uuid) from public, anon;
revoke execute on function public.join_team_by_code(text) from public, anon;
revoke execute on function public.reassign_officer_role(uuid, text, uuid) from public, anon;
revoke execute on function public.reject_ledger_entry(uuid, text) from public, anon;
revoke execute on function public.season_closing_balance(uuid) from public, anon;
revoke execute on function public.season_officer_check(uuid) from public, anon;
revoke execute on function public.season_player_summary(uuid) from public, anon;
revoke execute on function public.season_team_id(uuid) from public, anon;
revoke execute on function public.set_attendance(uuid, uuid, boolean) from public, anon;
revoke execute on function public.submit_ledger_entry(uuid, text, numeric, uuid, uuid, text, text, date) from public, anon;
revoke execute on function public.update_season_settings(uuid, numeric, numeric, numeric, integer, text) from public, anon;

grant execute on function public.acknowledge_ledger_entry(uuid) to authenticated;
grant execute on function public.add_game(uuid, integer, date, text, text, boolean) to authenticated;
grant execute on function public.add_team_member(uuid, text, text) to authenticated;
grant execute on function public.claim_practice_payment(uuid) to authenticated;
grant execute on function public.confirm_practice_payment(uuid) to authenticated;
grant execute on function public.create_practice_session(uuid, uuid, date, text, numeric, numeric, uuid, text, uuid[]) to authenticated;
grant execute on function public.create_season(uuid, text, uuid, text, date, date, numeric, numeric, integer) to authenticated;
grant execute on function public.create_team(text, text, text) to authenticated;
grant execute on function public.game_team_id(uuid) to authenticated;
grant execute on function public.is_captain(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_officer(uuid) to authenticated;
grant execute on function public.is_treasurer(uuid) to authenticated;
grant execute on function public.join_team_by_code(text) to authenticated;
grant execute on function public.reassign_officer_role(uuid, text, uuid) to authenticated;
grant execute on function public.reject_ledger_entry(uuid, text) to authenticated;
grant execute on function public.season_closing_balance(uuid) to authenticated;
grant execute on function public.season_officer_check(uuid) to authenticated;
grant execute on function public.season_player_summary(uuid) to authenticated;
grant execute on function public.season_team_id(uuid) to authenticated;
grant execute on function public.set_attendance(uuid, uuid, boolean) to authenticated;
grant execute on function public.submit_ledger_entry(uuid, text, numeric, uuid, uuid, text, text, date) to authenticated;
grant execute on function public.update_season_settings(uuid, numeric, numeric, numeric, integer, text) to authenticated;

-- Purely internal functions (trigger body / called only from inside another
-- SECURITY DEFINER function). Nobody should call these directly via the API.
revoke execute on function public.claim_pending_team_memberships() from public, anon, authenticated;
revoke execute on function public.generate_team_join_code() from public, anon, authenticated;
