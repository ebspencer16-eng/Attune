-- Migration 023: Intimacy Expectations add-on
--
-- profiles.intimacy_data   jsonb — each partner's own answers + chosen variant,
--                          shape: { variant, answers, completedAt }. Written by
--                          the dashboard intimacy view (App.jsx) and read back
--                          for the comparison. Mirrors how budget_data/notes_data
--                          are stored per profile.
-- orders.addon_intimacy    boolean — whether the Intimacy Expectations add-on was
--                          purchased. Drives the dashboard entitlement (hasIntimacy).
-- profiles.addon_intimacy  boolean — mirror on the profile so the entitlement
--                          survives when only the profile is loaded (matches the
--                          existing addon_* mirroring pattern).
--
-- Run in the Supabase SQL Editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intimacy_data jsonb;
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS addon_intimacy boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS addon_intimacy boolean DEFAULT false;
