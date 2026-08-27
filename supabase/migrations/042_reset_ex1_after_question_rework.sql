-- Migration 042: reset Exercise 1 for Ellie and Preston
-- ============================================================================
-- The comms exercise changed again: 26 questions instead of 27, reordered,
-- three retired (ex9, ex10, rs2) and two added (rs3, ls3). Any answers taken
-- before this carry gaps on expression, reassurance and listening.
--
-- Only Ellie and Preston. Carolina and Aaron were reset in 040 and have not
-- retaken yet, so their rows are already empty and correct for the new set.
--
-- Keyed on auth user id, which is how the app reads profiles.
--
-- BEFORE REOPENING THE APP, both must sign out and back in, or use a private
-- window. The client caches answers, and while the app now refuses to resync
-- answers that do not match the current question set, a clean start removes
-- the question entirely.
--
-- Run the whole file in the Supabase SQL Editor and click Run. Safe to re-run.
-- ============================================================================

do $$
declare
  emails constant text[] := array[
    lower('ebspencer16@gmail.com'),   -- Ellie
    lower('mightyhunter00@gmail.com') -- Preston
  ];
  uids uuid[];
  n_reset int;
begin
  select coalesce(array_agg(id), '{}') into uids
    from auth.users where lower(email) = any(emails);

  if coalesce(array_length(uids, 1), 0) <> 2 then
    raise exception 'Expected 2 auth users, found %.', coalesce(array_length(uids, 1), 0);
  end if;

  with u as (
    update public.profiles set
      ex1_answers           = null,
      ex1_progress          = null,
      ex1_completed         = false,
      ex1_completed_at      = null,
      couple_type           = null,
      results_email_sent_at = null
    where id = any(uids)
    returning 1
  ) select count(*) into n_reset from u;

  if n_reset <> 2 then
    raise exception 'Expected to reset 2 profiles, reset %.', n_reset;
  end if;

  -- partner_sessions keeps its own copy, which the admin explorer and beta
  -- digest read. Guarded: a missing table or column skips rather than aborts.
  begin
    execute $q$
      update public.partner_sessions
         set ex1_answers = null
       where invite_code in (
         select invite_code from public.profiles
          where id = any($1) and invite_code is not null
       )
    $q$ using uids;
  exception when undefined_table or undefined_column then
    raise notice 'partner_sessions not updated (table or column missing). Profiles were still reset.';
  end;
end $$;

-- ── Verification. Expect ex1_count = 0 for all four. ──────────────────────
select
  u.email,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb))) as ex1_count,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb)) k
     where k like 'pv\_%')                        as partner_view_count,
  coalesce(p.ex1_completed, false)                as ex1_completed,
  p.couple_type,
  p.partner_profile_id is not null                as partner_linked,
  p.ex2_answers is not null                       as ex2_kept,
  p.ex3_answers is not null                       as ex3_kept
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) in (
  'ebspencer16@gmail.com',
  'mightyhunter00@gmail.com',
  'carolina.c.cannon@gmail.com',
  'aaron.m.miner@gmail.com'
)
order by u.email;
