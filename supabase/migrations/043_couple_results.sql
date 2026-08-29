-- Migration 043: persist computed results
-- ============================================================================
-- Results are currently recomputed from raw answers on every page load. That is
-- fine for a one-time read on a website. It is wrong for an app people open
-- repeatedly on a phone, where the results should appear instantly, survive a
-- bad signal, and give annotations something stable to attach to.
--
-- This table stores the derived shape produced by api/_lib/results.js: couple
-- type, both partners' dimension scores and axes, gaps, ranked gaps, and the
-- understanding block. One row per couple.
--
-- WHY A SEPARATE TABLE rather than columns on profiles:
--   - Results belong to the couple, not to either person. Storing them twice
--     invites the two copies to disagree, which is the class of bug that has
--     cost us most this month.
--   - The shape will change. A JSON payload plus a version lets us tell a
--     stored result computed under old weights from a current one, and
--     recompute only what is stale.
--   - Annotations will reference a results row. A stable id to point at
--     matters more than query convenience.
--
-- Nothing writes to this yet. The table lands first so the write path has
-- somewhere to go.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.couple_results (
  id                uuid primary key default gen_random_uuid(),

  -- The two people, stored in a canonical order (lower uuid first) so a couple
  -- can only ever have one row regardless of who triggered the computation.
  partner_a         uuid not null references public.profiles(id) on delete cascade,
  partner_b         uuid not null references public.profiles(id) on delete cascade,

  -- RESULTS_VERSION from api/_lib/results.js. Bumped when the shape or the
  -- maths changes, so a stale row is detectable rather than silently served.
  version           integer not null,

  -- The couple type code (WW, XY, ...), duplicated out of the payload because
  -- it is the one field worth querying and grouping by.
  couple_type       text,

  -- The full derived shape. Read by the app and the results pages.
  results           jsonb not null,

  -- Fingerprint of the answers this was computed from. If either partner's
  -- answers change, this no longer matches and the row is stale. Cheaper and
  -- more reliable than comparing timestamps across two profiles.
  answers_hash      text not null,

  computed_at       timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint couple_results_ordered check (partner_a < partner_b)
);

-- One row per couple.
create unique index if not exists couple_results_pair_idx
  on public.couple_results (partner_a, partner_b);

-- Either partner's id resolves the row.
create index if not exists couple_results_a_idx on public.couple_results (partner_a);
create index if not exists couple_results_b_idx on public.couple_results (partner_b);

-- Cohort queries by type, matching how the admin dashboard already groups.
create index if not exists couple_results_type_idx on public.couple_results (couple_type);

comment on table public.couple_results is
  'Computed results per couple, from api/_lib/results.js. One row per pair, partner_a < partner_b. Stale when version or answers_hash no longer match.';
comment on column public.couple_results.answers_hash is
  'Fingerprint of both partner Exercise 1 answer sets. Mismatch means recompute.';

-- Written only by the service role, from the server. Clients read through
-- /api/results, which already verifies the caller, rather than querying this
-- table directly. No client-facing policies are added on purpose.
alter table public.couple_results enable row level security;

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'couple_results')            as columns_created,
  (select count(*) from pg_indexes
    where schemaname = 'public' and tablename = 'couple_results')               as indexes_created,
  (select relrowsecurity from pg_class where relname = 'couple_results')        as rls_enabled;
