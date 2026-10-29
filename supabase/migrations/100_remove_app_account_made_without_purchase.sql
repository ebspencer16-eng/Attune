-- ============================================================================
-- 100: remove the one account the app made without a purchase (A191).
--
-- Ellie: "Can we delete her account that she made on the app and shouldn't
-- have been able to?" Before the A191 fix, the app's Continue with Google
-- made an account for any address and let it set up a profile. The
-- accounts-with-no-purchase check found exactly one: made with Google on
-- 29 October, a profile, nobody joined on its invite code, nothing bought.
--
-- No address is written here: this file is in a public repository. The
-- account is found by that description instead, which is the same rule as
-- supabase/diagnostics/accounts-with-no-purchase.sql.
--
-- ── WHY IT REFUSES RATHER THAN GUESSES ──────────────────────────────────────
-- It deletes only if the description matches exactly one account. Zero means
-- she has since bought something under that address, or the account is
-- already gone, and either way it must be left alone. Two or more means
-- somebody else fits too, and deleting a person by accident is not something
-- a re-run undoes. Both stop with a message and change nothing.
--
-- ── WHAT GOES WITH IT ───────────────────────────────────────────────────────
-- Deleting the login removes the profile (profiles.id cascades from
-- auth.users), and the profile takes her notes, tags, folders, saved and read
-- articles, notifications and push tokens with it. Anonymous page visits and
-- any survey answer keep their row with the owner cleared, which is what
-- happens when anybody deletes their own account.
--
-- Safe to run twice: the second run finds nobody and stops.
-- ============================================================================

do $$
declare
  target uuid;
  n int;
begin
  select count(*), min(u.id::text)::uuid into n, target
  from auth.users u
  join public.profiles p on p.id = u.id
  where coalesce(u.raw_app_meta_data->>'provider', 'email') = 'google'
    and u.created_at::date = date '2026-10-29'
    and p.partner_profile_id is null
    and not coalesce(p.is_comp, false)
    and not coalesce((p.entitlements->>'hasGrant')::boolean, false)
    and not exists (
      select 1 from public.orders o
      where o.user_id = u.id or lower(o.buyer_email) = lower(u.email))
    and not exists (
      select 1 from public.profiles j
      where j.invite_code = p.invite_code and j.id <> p.id);

  if n <> 1 then
    raise exception 'Expected exactly one account made in the app without a purchase on 29 October, found %. Nothing was deleted.', n;
  end if;

  delete from auth.users where id = target;
  raise notice 'Removed one account made in the app without a purchase.';
end
$$;
