-- Migration 050: activity columns the home screen reads
-- ============================================================================
-- /api/home selects these three and they exist in no migration, so PostgREST
-- rejects the whole select and the profile lookup comes back empty. The
-- endpoint then answers "profile not found", which is how a working account
-- with a real profile got a 404 in the app.
--
-- They were written into the priority engine and its 26 tests, which pass
-- because the tests pass plain objects rather than reading a database. The
-- engine was correct; the schema simply never caught up.
--
-- All three are nullable with no default. Null is meaningful here: it means
-- "never happened", which is exactly what the ladder needs to know.
--
--   results_last_opened_at  drives "results ready and never opened"
--   partner_nudged_at       enforces the 3-day nudge cooldown
--   feedback_given_at       stops the feedback ask repeating
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists results_last_opened_at timestamptz,
  add column if not exists partner_nudged_at      timestamptz,
  add column if not exists feedback_given_at      timestamptz;

comment on column public.profiles.results_last_opened_at is
  'When this person last opened their results. Null means never, which is what raises the results-ready card.';
comment on column public.profiles.partner_nudged_at is
  'When they last nudged their partner. Null means never. Enforces the 3-day cooldown in next-action.js.';
comment on column public.profiles.feedback_given_at is
  'When they last gave feedback. Null means never. Stops the ask repeating.';

-- ── Verification ───────────────────────────────────────────────────────────
-- Expect 3.
select count(*) as columns_added
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('results_last_opened_at', 'partner_nudged_at', 'feedback_given_at');
