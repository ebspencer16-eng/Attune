-- Migration 035: second (soft) post-results survey nudge timestamp.
alter table public.profiles
  add column if not exists survey_nudge2_sent_at timestamptz;
