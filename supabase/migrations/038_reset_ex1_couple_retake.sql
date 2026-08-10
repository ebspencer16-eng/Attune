-- Migration 038: reset Exercise 1 for one couple (retake with partner-view questions)
-- ============================================================================
-- One-off data reset. Clears Ex1 for BOTH partners of a single couple (Carolina
-- + Aaron) so they can retake Exercise 1, pick up the partner-view questions that
-- were added later, and see the updated results (near-axis prose + the four-dot
-- perception bar).
--
-- WHY BOTH, TOGETHER: the inconsistencies come from asymmetry. If only one
-- partner redoes Ex1, one partner has partner-view (pv_*) answers and the other
-- does not, so the perception bar and the couple-type read from mismatched data.
-- This resets both partners, clears the derived couple_type (so it recomputes
-- from the new answers), and repairs the mutual partner link (a one-directional
-- link is a separate source of the mismatch). That removes every server-side
-- cause of the inconsistency.
--
-- HOW TO RUN
--   1. Replace the two placeholder emails below (Carolina + Aaron).
--   2. Run the whole file in the Supabase SQL Editor, one execution.
--   3. Read the NOTICE at the end (expect profiles=2, link rows set=2).
--
-- KEEPS: their logins, Ex2/Ex3, orders, budget/checklist/notes/intimacy. Only
-- Ex1, the derived couple_type, and the results-email flag are cleared.
--
-- ⚠ CLIENT CACHE — THE OTHER HALF (SQL cannot reach this):
-- the app caches answers and results in each browser (attune_ex1,
-- attune_ex1_progress, attune_results_state, attune_couple_type_saved,
-- attune_partner_session, attune_workbook_*). If that survives, the old state
-- re-hydrates and can even re-sync back to the server, undoing this reset. So
-- BEFORE reopening the app, each tester must clear site data for
-- attune-relationships.com, OR use a private window, OR log out and back in.
-- Do that first; then retake Ex1. This is what Preston and Ellie hit.
-- ============================================================================

do $$
declare
  -- ▼▼▼ REPLACE THESE TWO EMAILS, then run ▼▼▼
  emails text[] := array[
    lower('CAROLINA_EMAIL_HERE'),
    lower('AARON_EMAIL_HERE')
  ];
  -- ▲▲▲ REPLACE THESE TWO EMAILS, then run ▲▲▲

  uids uuid[];
  pids uuid[];
  n_reset int; n_link int;
begin
  if exists (select 1 from unnest(emails) e where e like '%email_here%') then
    raise exception 'Replace the placeholder emails at the top of this file before running.';
  end if;

  -- Resolve the two auth users by email (the reliable source).
  select coalesce(array_agg(id), '{}') into uids
    from auth.users
   where lower(email) = any(emails);

  -- Their profile ids. In the unified model (migration 006) both partners have a
  -- profiles row, so we expect exactly two.
  select coalesce(array_agg(distinct id), '{}') into pids
    from public.profiles
   where id = any(uids) or lower(email) = any(emails);

  if array_length(pids, 1) is distinct from 2 then
    raise exception 'Expected exactly 2 profiles for this couple, found %. Check the emails (and that both accounts exist).',
      coalesce(array_length(pids, 1), 0);
  end if;

  -- Reset Ex1 on both profiles. Nulling ex1_answers also clears the old
  -- pre-partner-view pv_* answers, so the retake captures the new questions.
  with u as (
    update public.profiles set
      ex1_answers           = null,
      ex1_progress          = null,
      ex1_completed         = false,
      ex1_completed_at      = null,
      couple_type           = null,
      results_email_sent_at = null   -- lets the results-ready email re-fire when they finish; delete this line to suppress it
    where id = any(pids)
    returning 1
  ) select count(*) into n_reset from u;

  -- Repair the mutual partner link so partner signals resolve both directions.
  update public.profiles a
     set partner_profile_id = b.id
    from public.profiles b
   where a.id = any(pids) and b.id = any(pids) and a.id <> b.id;
  get diagnostics n_link = row_count;

  raise notice 'Ex1 reset complete: profiles=%, link rows set=%. Both partners must now clear site data and retake Exercise 1.',
    n_reset, n_link;
end $$;
