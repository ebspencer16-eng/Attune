-- 018 — Fix infinite recursion in the profiles partner-read policy.
--
-- The policy added in 010 subqueried `public.profiles` from inside a SELECT
-- policy *on* profiles:
--
--   using ( auth.uid() in (
--     select id from public.profiles where partner_profile_id = profiles.id
--   ))
--
-- Postgres evaluates that subquery under the same policy, which recurses and
-- is rejected with error 42P17 ("infinite recursion detected in policy for
-- relation profiles"). The result: EVERY client-side read of profiles returned
-- HTTP 500, so the app loaded accounts with empty names and the dashboard
-- showed the "You" / "Your partner" placeholders.
--
-- Fix: check the relationship directly on the row being evaluated. Partners are
-- linked both ways (partner-sync sets partner_profile_id on both rows), so a
-- profile whose partner_profile_id points at the caller is, by definition, the
-- caller's partner. No subquery on profiles, so no recursion. This is also
-- tighter: a caller can't self-grant access, because they can only edit their
-- own row's partner_profile_id, not the target row's.

drop policy if exists "profiles_partner_select" on public.profiles;

create policy "profiles_partner_select"
  on public.profiles for select
  using (partner_profile_id = auth.uid());

-- Verify after running:
--   select id from profiles limit 1;           -- should return a row, not 500
--   select polname, qual from pg_policies where tablename = 'profiles';
