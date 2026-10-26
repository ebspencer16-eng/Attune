-- ============================================================================
-- 092: anybody who has finished the survey stops being asked for feedback.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "I filled out the survey, I shouldn't still see the tell us what you
-- think action prompt."
--
-- The home card is gated on `profiles.feedback_given_at`, and that column sat
-- unwritten for months: CLAUDE.md records it as "a flag nothing writes is a
-- prompt that never stops". api/survey.js writes it now, on the request that
-- finishes the survey. What it cannot do is reach back to a survey finished
-- before it learned to.
--
-- So this sets the flag from the thing that actually records the answer: a
-- completed row in survey_responses. The record is the evidence; the flag is
-- a copy of it kept for the home screen to read cheaply.
--
-- Safe to run more than once. It only fills a flag that is null, so a date
-- already recorded is left alone.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

update public.profiles p
   set feedback_given_at = s.completed_at
  from public.survey_responses s
 where s.respondent_id = p.id
   and s.completed_at is not null
   and p.feedback_given_at is null;

-- Who is now recorded as having given feedback.
--
-- The address comes from auth.users, because `profiles` has no email column.
-- The first version of this selected p.email and would have answered 42703 on
-- the one statement meant to show her the result. CLAUDE.md's own rule about a
-- read from a column that does not exist being as quiet as a write to one,
-- caught before she ran it rather than after.
select u.email, p.feedback_given_at
from public.profiles p
join auth.users u on u.id = p.id
where p.feedback_given_at is not null
order by p.feedback_given_at desc;
