-- Migration 008: Retake comparison columns
--
-- Adds columns to profiles for storing the most recent PRIOR completion of
-- each exercise, enabling the retake comparison view. When a user re-takes
-- an exercise, their current answers are moved to the _prior column before
-- the new answers overwrite the main column. This preserves one step back
-- of history — sufficient for the 6-month check-in and anniversary retakes.
--
-- A future migration could add a full history table (exercise_snapshots)
-- if we decide to preserve more than one retake. For now, 1-step-back
-- gives us the primary value: "since last time, here's what shifted."
--
-- Columns:
--   ex{1,2,3}_answers_prior       — the previous completion's answers (JSONB)
--   ex{1,2,3}_prior_completed_at  — when the previous completion was finished
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ex1_answers_prior jsonb,
  ADD COLUMN IF NOT EXISTS ex2_answers_prior jsonb,
  ADD COLUMN IF NOT EXISTS ex3_answers_prior jsonb,
  ADD COLUMN IF NOT EXISTS ex1_prior_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ex2_prior_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ex3_prior_completed_at timestamptz;
