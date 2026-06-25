-- Migration 027: reflection (ex3) completion timestamp + question-set version
-- ============================================================================
-- Adds two columns so reflection responses can be analyzed over time and
-- segmented by which version of the question set they were answered against.
--
--   ex3_completed_at  timestamptz  when the current ex3_answers were completed
--   ex3_version       int          ANNIVERSARY_VERSION at completion time
--
-- Both are written by the app on every reflection completion (first run and
-- retake). Existing rows stay null, which reads as "completed before this was
-- tracked (pre-v1)". Run once in the Supabase SQL Editor.
-- ============================================================================

alter table public.profiles
  add column if not exists ex3_completed_at timestamptz,
  add column if not exists ex3_version      int;

-- Mirror on partner_sessions so the invited partner's reflection (when stored
-- there) can carry the same metadata if/when that path writes it.
alter table public.partner_sessions
  add column if not exists ex3_completed_at timestamptz,
  add column if not exists ex3_version      int;
