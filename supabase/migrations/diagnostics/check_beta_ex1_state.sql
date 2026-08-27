-- Diagnostic: what does the database actually hold for the four beta testers?
-- ============================================================================
-- Read-only. Changes nothing. Run this in the Supabase SQL Editor after
-- migration 040 to see whether the reset landed, and on which rows.
--
-- The app reads profiles.ex1_answers by auth user id. If that column is still
-- populated, the dashboard will show Exercise 1 complete no matter what the
-- browser does, and incognito will not help.
--
-- Pre-filled to match 040, all four confirmed. If a row still comes back with
-- auth_user_found = false, that address has no account and the email is wrong,
-- not the data.
-- ============================================================================

with people as (
  select unnest(array[
    lower('ebspencer16@gmail.com'),            -- Ellie
    lower('mightyhunter00@gmail.com'),         -- Preston
    lower('carolina.c.cannon@gmail.com'),      -- Carolina
    lower('aaron.m.miner@gmail.com')           -- Aaron
  ]) as email
)
select
  pe.email                                        as looked_up,
  u.id is not null                                as auth_user_found,
  p.id is not null                                as profile_found,
  -- The three things that decide whether the dashboard says "complete".
  p.ex1_answers is not null                       as ex1_answers_present,
  coalesce(jsonb_array_length(
    case when jsonb_typeof(p.ex1_answers) = 'array' then p.ex1_answers else '[]'::jsonb end), 
    (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb)))
  )                                               as ex1_answer_count,
  p.ex1_completed,
  p.ex1_progress is not null                      as ex1_progress_present,
  -- Did the retake actually capture Part 2 answers?
  (select count(*) from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb)) k
     where k like 'pv\_%')                        as partner_view_answers,
  p.couple_type,
  p.partner_profile_id is not null                as partner_linked,
  p.invite_code,
  p.ex2_answers is not null                       as ex2_present,
  p.ex3_answers is not null                       as ex3_present
from people pe
left join auth.users u on lower(u.email) = pe.email
left join public.profiles p on p.id = u.id or lower(p.email) = pe.email
order by pe.email;

-- What to expect, and what each result means:
--
--   auth_user_found = false
--     That email has no account. The address in migration 040 was wrong, and
--     040 would have raised "Expected exactly 4 profiles" rather than running.
--
--   ex1_answers_present = true, partner_view_answers = 0
--     The reset did NOT land on this row. This is the case that produces
--     "dashboard shows complete" in a clean browser. Check the email matches
--     and re-run 040.
--
--   ex1_answers_present = false
--     The reset landed. If the dashboard still shows complete, the browser is
--     holding cached state, or it is signed out and showing the sample state
--     rather than this account.
--
--   ex1_answers_present = true, partner_view_answers = 27
--     They have already retaken it. This is the finished state.
--
--   partner_linked = false
--     Their results will not resolve a partner regardless of the reset. Tell
--     me and I will write the link repair.
