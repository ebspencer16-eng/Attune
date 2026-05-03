-- Migration 013: exercise progress and completion tracking
--
-- Purpose: Support cross-device exercise resume (Issue 3.5) and the
-- /api/save-exercise service-role endpoint (Issue 4.8).
--
-- Background: Originally the schema only tracked ex3_completed (boolean).
-- ex1 and ex2 completion was inferred from ex1_answers IS NOT NULL.
-- Mid-exercise progress lived in localStorage only — switching devices
-- mid-exercise lost progress.
--
-- This migration adds:
--   ex{N}_progress      — partial answers stored as the user works through
--                         the exercise. Cleared when the exercise is finished.
--   ex{N}_completed     — explicit completion flag (replaces inference).
--   ex{N}_completed_at  — when the exercise was completed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ex1_progress      jsonb,
  ADD COLUMN IF NOT EXISTS ex2_progress      jsonb,
  ADD COLUMN IF NOT EXISTS ex3_progress      jsonb,
  ADD COLUMN IF NOT EXISTS ex1_completed     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ex2_completed     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ex1_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS ex2_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS ex3_completed_at  timestamptz;

-- Backfill ex1_completed / ex2_completed from existing answer data so
-- already-completed users don't show as incomplete after this migration.
UPDATE public.profiles SET ex1_completed = true WHERE ex1_answers IS NOT NULL AND ex1_completed = false;
UPDATE public.profiles SET ex2_completed = true WHERE ex2_answers IS NOT NULL AND ex2_completed = false;
