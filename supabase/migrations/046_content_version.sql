-- Migration 046: pin each couple's results to a version of the copy
-- ============================================================================
-- Freezing the scores was only half of it. The prose is customer-facing copy
-- that Carolina revises, and a highlight written against a paragraph sits on
-- different words once that paragraph changes. So a couple's results record
-- which version of the copy they were computed under, and render from it.
--
-- ── NO BACKFILL, ON PURPOSE ───────────────────────────────────────────────
-- Ellie's instruction: beta testers should see the copy that exists right now,
-- not be pinned retroactively to whatever they happened to see earlier.
--
-- So existing rows get content_version = NULL, and a null means "render from
-- current". The next time a couple's results are computed, or the next time
-- they are deliberately republished, they get stamped. From this point on,
-- every new couple is pinned from the moment they first see results.
--
-- The alternative, backfilling everyone to version 1, would freeze the beta
-- testers onto copy that has been revised repeatedly this month and is not what
-- we want them reviewing.
--
-- ── AFTER THIS ────────────────────────────────────────────────────────────
-- Editing copy is safe: it changes nothing for anyone already stamped, and
-- affects only couples computed afterwards. Changing what an existing couple
-- sees is a deliberate action, see diagnostics/republish_content.sql.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.couple_results
  add column if not exists content_version integer;

alter table public.couple_results_history
  add column if not exists content_version integer;

comment on column public.couple_results.content_version is
  'Version of the customer-facing copy these results render from. NULL means render from current, which is the state of rows that predate this column. Set on every computation from here on.';

-- Deliberately no UPDATE statement. See the note above: existing rows stay
-- null so the beta testers read current copy.

-- ── Verification ───────────────────────────────────────────────────────────
-- Expect pinned_rows = 0 immediately after running, rising as couples are
-- computed or republished.
select
  count(*)                                          as total_rows,
  count(*) filter (where content_version is null)   as render_from_current,
  count(*) filter (where content_version is not null) as pinned_rows
from public.couple_results;
