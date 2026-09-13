-- Migration 059: the remaining partner keeps their results
-- ============================================================================
-- WHAT IS WRONG TODAY
--
-- The published retention policy says:
--
--   "If one partner deletes their account, we will anonymize that partner's
--    responses in the joint results display. The other partner retains access
--    to their own responses and the portions of the joint results derived
--    solely from their own answers."
--
-- They do not. couple_results declares both partner columns ON DELETE CASCADE,
-- so deleting either person deletes the couple's one frozen results row, and
-- api/delete-account.js nulls the other partner's link, so api/results.js
-- answers ready:false. Someone who paid, finished every exercise and read
-- their results opens the app and is told they are waiting on a partner who no
-- longer has an account. Results are frozen, so there is nothing to recompute
-- from: the row was the only copy.
--
-- That cascade arrived in d3b7d7d, a commit about serving results from cache.
-- Its message says nothing about deletion. It reads as the default that was
-- typed rather than a decision that was taken.
--
-- WHAT THIS CHANGES
--
--   1. Both foreign keys become ON DELETE SET NULL, so the row outlives either
--      account. The row holds derived scores, not answers.
--   2. profiles gains partner_deleted_at, so the survivor's app can tell "my
--      partner deleted their account" from "I never had a partner". Those look
--      identical today and the product says the wrong one.
--   3. couple_results gains deleted_partner_at, marking the row as half
--      orphaned so nothing tries to recompute it.
--
-- WHAT IT DOES NOT DO
--
-- It does not delete the departed person's scores from the payload. The policy
-- says anonymize, not remove, and removing them would take the joint sections
-- with them. api/results.js strips the name on the way out instead, in
-- withContent, because results are frozen: a row written last year is served
-- back as it was written, so anything the display needs has to be derived at
-- read time rather than stored.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- ── 1. The couple's row survives either deletion ───────────────────────────
alter table public.couple_results
  drop constraint if exists couple_results_partner_a_fkey,
  drop constraint if exists couple_results_partner_b_fkey;

alter table public.couple_results
  alter column partner_a drop not null,
  alter column partner_b drop not null;

alter table public.couple_results
  add constraint couple_results_partner_a_fkey
    foreign key (partner_a) references public.profiles(id) on delete set null,
  add constraint couple_results_partner_b_fkey
    foreign key (partner_b) references public.profiles(id) on delete set null;

-- The history table holds the same kind of row for the same reason.
alter table public.couple_results_history
  drop constraint if exists couple_results_history_partner_a_fkey,
  drop constraint if exists couple_results_history_partner_b_fkey;

alter table public.couple_results_history
  alter column partner_a drop not null,
  alter column partner_b drop not null;

alter table public.couple_results_history
  add constraint couple_results_history_partner_a_fkey
    foreign key (partner_a) references public.profiles(id) on delete set null,
  add constraint couple_results_history_partner_b_fkey
    foreign key (partner_b) references public.profiles(id) on delete set null;

-- ── 2. The survivor knows what happened ────────────────────────────────────
alter table public.profiles
  add column if not exists partner_deleted_at timestamptz;

comment on column public.profiles.partner_deleted_at is
  'Set when this person''s partner deleted their account. Distinguishes "my partner is gone" from "I never linked with anyone", which the product showed identically.';

-- ── 3. The row says it is half orphaned ────────────────────────────────────
alter table public.couple_results
  add column if not exists deleted_partner_at timestamptz;

comment on column public.couple_results.deleted_partner_at is
  'Set when one of the two people deleted their account. The row is served to the survivor with the other person anonymized, and never recomputed.';

-- Finding the survivor's row when their partner id is gone.
create index if not exists couple_results_partner_a_idx on public.couple_results (partner_a);
create index if not exists couple_results_partner_b_idx on public.couple_results (partner_b);
