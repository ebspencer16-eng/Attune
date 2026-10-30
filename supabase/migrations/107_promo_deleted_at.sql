-- ============================================================================
-- 107: deleting a promo code (A213).
--
-- Ellie: "I started deleting and only some would delete, others switched to
-- always active and the bin icon went away."
--
-- Some codes exist twice: built into the site (ATTUNE-BETA-01 to 12,
-- BETA-CORE and the rest, api/_lib/beta-codes.js) and as a row here. The bin
-- removed the row, the built-in copy showed through as "Always active", and
-- the code went on working. So a deleted code keeps its row, marked deleted
-- and switched off. The row is what outranks the built-in copy, it is hidden
-- from the admin's table, and past orders on the code still read their
-- discount from it. Nobody loses anything: access is read from orders.
--
-- Safe to run again.
-- ============================================================================

alter table public.beta_codes add column if not exists deleted_at timestamptz;
