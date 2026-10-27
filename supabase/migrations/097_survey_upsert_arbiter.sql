-- ============================================================================
-- 097: the survey has never saved a single answer, and this is why.
--
-- ── WHAT ELLIE SAW ──────────────────────────────────────────────────────────
-- She completed a survey. 095 then reported zero rows in survey_responses:
-- not an unjoinable row, not a row excluded as a demo account, no row at all.
-- Nothing has saved an answer since the survey shipped.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- api/survey.js saves a signed-in person's answers with
--
--   .upsert(row, { onConflict: 'respondent_id' })
--
-- and 079 created the index that is supposed to arbitrate that conflict as a
-- PARTIAL one:
--
--   create unique index survey_responses_respondent_idx
--     on survey_responses (respondent_id) where respondent_id is not null;
--
-- PostgreSQL will not infer a partial index as an ON CONFLICT arbiter unless
-- the statement repeats the index's own predicate, and supabase-js emits only
-- the column list. So every save raised 42P10, "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification". The endpoint
-- caught it, found nothing in the message matching its "storage is not set up"
-- test, and answered 500 "Could not save".
--
-- Three things hid it. The anonymous path is a plain insert and works, so the
-- code is not uniformly broken. supabase-js RETURNS its error rather than
-- throwing, so nothing crashed. And the table exists and answers queries, so
-- every check that asked whether survey storage was ready got yes: an empty
-- table answers like a working one, which this repo has written down before.
--
-- ── THE FIX ─────────────────────────────────────────────────────────────────
-- A plain unique index instead. The predicate was never doing any work:
-- PostgreSQL treats NULLs as distinct in a unique index by default, so a plain
-- unique index on respondent_id already permits unlimited anonymous rows,
-- which is the only thing `where respondent_id is not null` was there for.
-- Same constraint, same behaviour, and inferrable.
--
-- ── SAFE TO RUN TWICE ───────────────────────────────────────────────────────
-- Both statements are conditional. Running this on a database that has already
-- had it does nothing.
-- ============================================================================

drop index if exists public.survey_responses_respondent_idx;

create unique index if not exists survey_responses_respondent_key
  on public.survey_responses (respondent_id);

comment on index public.survey_responses_respondent_key is
  'One row per person. Plain rather than partial so ON CONFLICT (respondent_id) '
  'can infer it: a partial index needs its predicate repeated in the statement, '
  'which supabase-js does not emit. NULLs are distinct in a unique index, so '
  'anonymous responses are still unlimited.';

-- What the fix is for: this should be 0 before the next survey is saved and
-- rise afterwards. If it is still 0 after somebody completes one, the write is
-- failing somewhere else and the endpoint is the place to look, not the index.
select count(*) as survey_rows_now from public.survey_responses;
