-- Migration 020: Add columns code writes but DDL never defined + email backfill
-- APPLIED IN PROD 2026-06-11 via SQL Editor.
--
-- Found during launch schema reconciliation (live information_schema vs repo):
--   orders.card_status      written by api/orders.js + generate-card flow
--   orders.workbook_format  written by api/store-workbook-pdf.js
--   profiles.email          selected daily by api/cron-checkin.js (check-in
--                           emails could never send) and never populated
--
-- profiles.email is backfilled from auth.users and populated going forward
-- by api/create-profile.js (email field added in the same commit).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS workbook_format text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE profiles p SET email = lower(u.email)
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;
