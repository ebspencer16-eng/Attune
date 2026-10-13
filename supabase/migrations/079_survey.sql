-- ============================================================================
-- 079: one survey, kept as it is written rather than only when it is sent.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie, having approved a replacement for the 26-question beta survey:
--
--   "Please use this as the regular survey for everyone at the end of their
--    experience, not just beta users."
--   "Collect incomplete responses."
--   "Build a page into admin to view responses for each question in this
--    survey... and build a tool to postcode open entry responses and quantify
--    for visuals."
--   "We can delete all prior survey data. Survey and experience are different
--    enough now."
--
-- Three things follow from that. One row per person rather than one per
-- submission, because an answer is saved as it is written and the row is
-- updated; a place to record what a free-text answer is ABOUT, which is the
-- coding tool; and the old rows go.
--
-- ── WHAT IT ADDS ────────────────────────────────────────────────────────────
-- survey_responses: the answers, as jsonb keyed by question id, with the
-- version they were given under. `completed_at` is null until somebody reaches
-- the end, which is the difference between a partial answer and a finished
-- one. Both are counted; only one of them is a response rate.
--
-- survey_codes: what an open answer is about, one row per code per answer, so
-- one sentence can be about two things and a chart can count both. Written by
-- an admin through /api/admin-survey, never by a customer.
--
-- ── WHAT IT DELETES ─────────────────────────────────────────────────────────
-- Every row of the old surveys, at her word. The quick footer reactions and
-- the app's experience answers stay: those are a different question and the
-- Feedback Overview still draws them.
--
-- ── ACCESS ──────────────────────────────────────────────────────────────────
-- Row level security on, no policies. Nothing reaches these tables except the
-- server with the service key. An answer here is anonymous in the sense that
-- it carries no name and no email, but it is linked to a profile so a person
-- can come back to a half-finished survey, and that link is not for anybody
-- else to read.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.survey_responses (
  id            bigserial primary key,
  -- One row per person. Null for somebody answering from an email link with no
  -- session, which is why it is not the primary key.
  respondent_id uuid references public.profiles(id) on delete set null,
  -- The sorted pair, so both halves of a couple can be read together without
  -- storing anything that says who they are.
  couple_id     text,
  -- Question id -> answer. A string, a number, or an array for the ranking.
  answers       jsonb not null default '{}'::jsonb,
  -- Which set of questions these answers were given under.
  version       text,
  -- Where it was answered: 'results', 'app' or 'link'.
  source        text,
  started_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Null while it is still being written. A partial answer is still an answer.
  completed_at  timestamptz,
  -- ── A quote on the homepage ───────────────────────────────────────────────
  -- Which open answer an admin picked to publish, and when. The homepage reads
  -- these two columns and nothing else, so a quote cannot be published without
  -- somebody choosing both a response and the answer on it.
  --
  -- There is no name here, and that is the whole design. Ellie, on the consent
  -- question the old survey asked: "Do we have to ask this if we don't include
  -- PII with the testimonials? Is there fine print we could have instead that
  -- covers us?" The fine print is TESTIMONIAL_NOTICE in api/_lib/survey.js and
  -- it sits under every open question.
  featured_question text,
  featured_at       timestamptz
);

-- One row per person, which is what makes a partial answer resumable.
create unique index if not exists survey_responses_respondent_idx
  on public.survey_responses (respondent_id) where respondent_id is not null;

-- The admin reads newest first.
create index if not exists survey_responses_recent_idx
  on public.survey_responses (updated_at desc);

-- The homepage reads only the featured ones.
create index if not exists survey_responses_featured_idx
  on public.survey_responses (featured_at desc) where featured_at is not null;

-- Added after the table existed, for anybody who ran an earlier copy of this
-- file. `if not exists` makes both paths the same path.
alter table public.survey_responses add column if not exists featured_question text;
alter table public.survey_responses add column if not exists featured_at timestamptz;

alter table public.survey_responses enable row level security;

comment on table public.survey_responses is
  'One row per person for the end-of-experience survey. Updated as they answer, so a half-finished survey is kept. No name and no email: see api/_lib/survey.js.';
comment on column public.survey_responses.featured_question is
  'Which open answer on this row an admin published to the homepage. Null for every row that has not been picked. No name is stored anywhere here: see TESTIMONIAL_NOTICE.';
comment on column public.survey_responses.completed_at is
  'Null while it is still being written. Both partial and finished rows are counted; only finished ones are a response rate.';

-- ── What an open answer is about ────────────────────────────────────────────
create table if not exists public.survey_codes (
  id          bigserial primary key,
  response_id bigint not null references public.survey_responses(id) on delete cascade,
  -- Which open question this code is on.
  question_id text not null,
  -- The code itself, as typed in the admin. Free text on purpose: a fixed list
  -- would have to be guessed before any answers exist.
  code        text not null,
  created_at  timestamptz not null default now()
);

-- One code once per answer. Adding it twice is a tap, not an intention.
create unique index if not exists survey_codes_once_idx
  on public.survey_codes (response_id, question_id, code);

create index if not exists survey_codes_question_idx
  on public.survey_codes (question_id);

alter table public.survey_codes enable row level security;

comment on table public.survey_codes is
  'What an open survey answer is about, assigned by an admin. One row per code per answer, so one sentence can be about two things.';

-- ── The old surveys go ──────────────────────────────────────────────────────
-- Ellie: "We can delete all prior survey data. Survey and experience are
-- different enough now." The quick footer reactions and the app's experience
-- answers are a different question and stay.
delete from public.feedback_submissions
 where type in ('beta_survey', 'post_results');

-- The profile flag that recorded somebody had answered the old one. It gates
-- nothing now; the new survey knows by its own row.
update public.profiles set beta_survey_at = null where beta_survey_at is not null;

-- ── Verification ────────────────────────────────────────────────────────────
select
  (select count(*) from public.survey_responses)                                  as responses,
  (select count(*) from public.survey_responses where completed_at is not null)   as finished,
  (select count(*) from public.survey_codes)                                      as codes,
  (select count(*) from public.survey_responses where featured_at is not null)    as featured_quotes,
  (select count(*) from public.feedback_submissions where type in ('beta_survey','post_results')) as old_rows_left,
  (select count(*) from public.feedback_submissions)                              as feedback_rows_kept;
