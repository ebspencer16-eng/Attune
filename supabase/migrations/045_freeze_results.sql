-- Migration 045: freeze results once a couple has seen them
-- ============================================================================
-- DECISION: a couple's results never change underneath them. Changing the
-- weights, the questions or the prose affects future users, not past ones.
--
-- WHY THIS MATTERS MORE THAN IT LOOKS
-- Until now, results were derived state: recompute from answers on demand, and
-- a change to the engine silently changed what an existing couple saw. That is
-- a disservice on its own, and it also breaks annotations. A note attached to
-- Conflict Style survives a rewrite, but the paragraph it was written against
-- does not, and a highlight on prose that has since changed is worse than no
-- highlight.
--
-- So results become a RECORD rather than a derivation. Computed once, frozen,
-- and served unchanged for as long as that couple's answers stand.
--
-- WHAT THIS CHANGES
--   - RESULTS_VERSION no longer invalidates a stored row. A new engine version
--     applies to couples who have not been computed yet. Existing rows keep
--     the version they were computed under, which is now a record of what they
--     were shown rather than a staleness marker.
--   - Only a RETAKE recomputes, because that is the couple asking for new
--     results rather than us changing them from underneath.
--   - When a retake does happen, the previous row is archived rather than
--     overwritten, so annotations written against the old results still have
--     something to point at.
--
-- STILL OUTSTANDING, and it is the other half of this: the scores are frozen
-- here, but the PROSE is still generated at render time from the current copy.
-- Freezing the numbers without freezing the words only half-solves it. That
-- needs a content snapshot stored alongside, which is the next piece.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- When the row was frozen, which is also when the couple first had results.
-- Null on rows written before this migration; backfilled below from computed_at.
alter table public.couple_results
  add column if not exists frozen_at timestamptz;

update public.couple_results
   set frozen_at = coalesce(frozen_at, computed_at)
 where frozen_at is null;

alter table public.couple_results
  alter column frozen_at set default now();

comment on column public.couple_results.version is
  'The engine version these results were computed under. A record of what the couple was shown, NOT a staleness marker: a newer engine version does not invalidate this row.';
comment on column public.couple_results.frozen_at is
  'When these results were fixed. They are served unchanged from here on, unless the couple retakes.';

-- ── History ────────────────────────────────────────────────────────────────
-- A retake produces new results. The old ones are kept rather than discarded,
-- so notes and highlights written against them still resolve.
create table if not exists public.couple_results_history (
  id             uuid primary key default gen_random_uuid(),
  partner_a      uuid not null references public.profiles(id) on delete cascade,
  partner_b      uuid not null references public.profiles(id) on delete cascade,
  version        integer not null,
  couple_type    text,
  results        jsonb not null,
  answers_hash   text not null,
  frozen_at      timestamptz not null,
  superseded_at  timestamptz not null default now(),
  constraint couple_results_history_ordered check (partner_a < partner_b)
);
create index if not exists couple_results_history_pair_idx
  on public.couple_results_history (partner_a, partner_b, superseded_at desc);

comment on table public.couple_results_history is
  'Previous frozen results, kept when a couple retakes so annotations written against them still resolve.';

alter table public.couple_results_history enable row level security;

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from public.couple_results)                                as current_rows,
  (select count(*) from public.couple_results where frozen_at is null)        as unfrozen_should_be_zero,
  (select count(*) from public.couple_results_history)                        as history_rows;
