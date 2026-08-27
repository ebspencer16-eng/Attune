-- Diagnostic: is there more than one profile row per person?
-- ============================================================================
-- Read-only. Changes nothing.
--
-- WHY: after migration 040 reported success and the profiles diagnostic showed
-- ex1_answers = null for all four, a fresh incognito window still pulled 28
-- Ex1 answers down from the server for ebspencer16@gmail.com. 28 answers with
-- 5 partner-view keys is the pre-restructure shape, so the app is reading a row
-- that was never reset.
--
-- The app reads profiles by AUTH USER ID. 040 matched on
-- "id = any(uids) OR lower(email) = any(emails)", so a second row carrying the
-- same email under a different id would satisfy the count of four while leaving
-- the row the app actually reads untouched.
--
-- This lists every profile row that matches any of the four people by either
-- route, so a duplicate or an id mismatch is visible.
-- ============================================================================

with people as (
  select unnest(array[
    lower('ebspencer16@gmail.com'),
    lower('mightyhunter00@gmail.com'),
    lower('carolina.c.cannon@gmail.com'),
    lower('aaron.m.miner@gmail.com')
  ]) as email
),
matched as (
  select
    pe.email                    as looked_up,
    u.id                        as auth_user_id,
    p.id                        as profile_id,
    p.email                     as profile_email,
    (p.id = u.id)               as id_matches_auth_user,
    p.ex1_answers is not null   as ex1_present,
    (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb))) as ex1_count,
    (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb)) k
       where k like 'pv\_%')    as partner_view_count,
    p.partner_profile_id,
    p.invite_code,
    p.created_at
  from people pe
  left join auth.users u on lower(u.email) = pe.email
  left join public.profiles p
         on p.id = u.id or lower(p.email) = pe.email
)
select * from matched order by looked_up, id_matches_auth_user desc nulls last, created_at;

-- How to read it:
--
--   More than one row for the same looked_up value
--     Duplicate profiles. The one with id_matches_auth_user = true is the one
--     the app reads; the other is a leftover. Expect the app's row to still
--     show ex1_present = true, which is the bug.
--
--   id_matches_auth_user = false on the only row
--     The profile is keyed to something other than the auth user, so the app
--     is reading a row that 040 never touched.
--
--   ex1_count = 28 and partner_view_count = 5
--     Pre-restructure answers, never reset.
--
--   ex1_count = 0
--     That row was reset correctly.
--
-- Send the whole table back. The fix depends on which of these it is: a reset
-- targeted by auth id rather than email, or a duplicate row to remove.
