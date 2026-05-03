-- Migration 012: add notes_data column to profiles
--
-- The "Our Notes" view in the dashboard had React state with no
-- persistence anywhere — and a label saying "auto-saved" that lied to
-- users. This column stores per-profile notes (partner1, partner2,
-- shared) as JSON. Same pattern as budget_data and checklist_data.
--
-- The client (App.jsx) debounces writes 1.5s after the last keystroke
-- so typing a paragraph doesn't fire dozens of network calls.
--
-- The column is nullable; existing users have NULL until they first
-- type a note after this migration ships.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notes_data jsonb;
