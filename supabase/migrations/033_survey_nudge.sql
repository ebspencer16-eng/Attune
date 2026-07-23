-- Migration 033: track the post-results survey nudge email so it fires once.
alter table public.profiles
  add column if not exists survey_nudge_sent_at timestamptz;
