-- Migration 040: reset Exercise 1 for the four beta testers
-- ============================================================================
-- One-off data reset. Clears Exercise 1 for Ellie + Preston and Carolina +
-- Aaron so all four retake it and pick up the two-part exercise.
--
-- WHY NOW: they answered before three separate changes, and the results they
-- see are wrong in ways no code fix can reach.
--   1. Exercise 1 became two parts. Part 2 asks all 27 questions again about
--      the partner and stores them as pv_<question>. They have none, so the
--      "How Ellie views Preston" callouts on the dimension pages render
--      nothing, and the type falls back to pure self-report.
--   2. The question set changed: ls2 removed, cf3 and fb2 added, Communication
--      Under Stress folded into Conflict Style, Reassurance added. Their saved
--      answers have gaps on the affected dimensions.
--   3. The scoring changed: Engage/Withdraw reweighted (conflict .70 -> .55)
--      and the partner-view blend moved to visibility weighting. Their stored
--      couple_type was derived under the old formula.
--
-- WHY ALL FOUR TOGETHER: the damage comes from asymmetry. If one partner
-- retakes and the other does not, one has pv_* answers and the other does not,
-- so the cross-view labels and the blended type read from mismatched data. Each
-- couple must be reset as a pair. Both couples are done here so the beta cohort
-- is consistent.
--
-- HOW TO RUN
--   1. Check the first email in the list below. The other three are the
--      addresses on record; the one you sign in with may differ.
--   2. Run the whole file in the Supabase SQL Editor, in one execution, and
--      actually click Run. Saving the tab is not running it.
--   3. Read the NOTICE at the end. Expect profiles=4 and link rows set=4.
--      If it raises "Expected exactly 4 profiles, found N", one of the four
--      addresses does not match an account. Nothing is changed when it raises.
--   Safe to run more than once.
--
-- KEEPS: their logins, Exercise 2, Exercise 3, the intimacy exercise, orders,
-- budget, checklist, notes. Only Exercise 1, the derived couple_type, and the
-- results-email flag are cleared.
--
-- ── CLIENT CACHE: the other half, and SQL cannot reach it ──────────────────
-- The app caches answers and results in each browser (attune_ex1,
-- attune_ex1_progress, attune_results_state, attune_couple_type_saved,
-- attune_partner_session, attune_workbook_*). If that survives, the old state
-- rehydrates and can sync back to the server, undoing this reset.
--
-- So BEFORE reopening the app, each of the four must do ONE of:
--   - clear site data for attune-relationships.com, or
--   - use a private window, or
--   - sign out and back in (clearAllUserLocalStorage runs on sign-out).
-- Do that first, then retake Exercise 1. This is what tripped up the last reset.
-- ============================================================================

do $$
declare
  -- Pre-filled. Check line 1 before running: the other three are the addresses
  -- on record, but the account you sign in with may not be the one below.
  emails text[] := array[
    lower('ellie@attune-relationships.com'),   -- CHECK THIS ONE
    lower('mightyhunter00@gmail.com'),         -- Preston
    lower('carolina.c.cannon@gmail.com'),      -- Carolina
    lower('aaron.m.miner@gmail.com')           -- Aaron
  ];

  uids uuid[];
  pids uuid[];
  n_reset int; n_link int; n_sessions int;
begin
  if exists (select 1 from unnest(emails) e where e like '%email_here%') then
    raise exception 'Placeholder emails are still in this file. Replace them before running.';
  end if;

  select coalesce(array_agg(id), '{}') into uids
    from auth.users
   where lower(email) = any(emails);

  select coalesce(array_agg(distinct id), '{}') into pids
    from public.profiles
   where id = any(uids) or lower(email) = any(emails);

  if array_length(pids, 1) is distinct from 4 then
    raise exception 'Expected exactly 4 profiles, found %. Check the emails, and that all four accounts exist.',
      coalesce(array_length(pids, 1), 0);
  end if;

  -- Clear Ex1 on all four. Nulling ex1_answers also drops the old
  -- dimension-level pv_* answers from the retired scheme, so the retake stores
  -- the new per-question ones cleanly.
  with u as (
    update public.profiles set
      ex1_answers           = null,
      ex1_progress          = null,
      ex1_completed         = false,
      ex1_completed_at      = null,
      couple_type           = null,
      results_email_sent_at = null   -- lets the results-ready email fire again; delete this line to suppress it
    where id = any(pids)
    returning 1
  ) select count(*) into n_reset from u;

  -- The legacy partner_sessions rows hold their own copy of ex1_answers, which
  -- the admin explorer and the beta digest still read. Left stale, those two
  -- surfaces would keep reporting the pre-reset answers.
  --
  -- partner_sessions was created outside these migrations, so its exact shape
  -- is not guaranteed here. Matched on invite_code, which every reader of the
  -- table uses, and guarded so a missing table or column skips this step
  -- instead of aborting the whole reset.
  begin
    execute $q$
      update public.partner_sessions
         set ex1_answers = null
       where invite_code in (
         select invite_code from public.profiles
          where id = any($1) and invite_code is not null
       )
    $q$ using pids;
    get diagnostics n_sessions = row_count;
  exception when undefined_table or undefined_column then
    n_sessions := -1;
    raise notice 'partner_sessions not updated (table or column missing). Profiles were still reset.';
  end;

  -- Repair the mutual partner link within each couple, so partner signals
  -- resolve in both directions. Pairs by shared invite code rather than
  -- assuming an order, so it cannot cross-link Ellie to Carolina.
  update public.profiles a
     set partner_profile_id = b.id
    from public.profiles b
   where a.id = any(pids)
     and b.id = any(pids)
     and a.id <> b.id
     and a.invite_code is not null
     and a.invite_code = b.invite_code;
  get diagnostics n_link = row_count;

  raise notice 'Ex1 reset complete: profiles=%, partner_sessions cleared=% (-1 means skipped), link rows set=%.',
    n_reset, n_sessions, n_link;
  raise notice 'Expect profiles=4 and link rows set=4. If link rows is not 4, the couples are not paired by invite_code and the link needs setting by hand.';
  raise notice 'All four must now clear site data (or sign out and back in) BEFORE reopening the app, then retake Exercise 1.';
end $$;
