-- Migration 011: add checklist_data column to profiles
--
-- Newlywed users had their Starting Out checklist state held only in
-- React state (no localStorage, no Supabase). Every refresh wiped progress.
-- This column persists checklist completion alongside the existing
-- budget_data column. Same JSON shape, same access pattern.
--
-- After running this migration, the client (App.jsx) will:
--   1. Hydrate localStorage from profiles.checklist_data on sign-in
--   2. Mirror every checklist toggle to localStorage + Supabase
--
-- The column is nullable; existing users have NULL until they first
-- interact with the checklist after this migration ships.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checklist_data jsonb;
