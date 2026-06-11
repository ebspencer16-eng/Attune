-- Migration 021: Add orders.partner1_name
-- APPLIED IN PROD 2026-06-11 via SQL Editor.
--
-- The live table had legacy partner_name; all order writers
-- (stripe-webhook, create-payment-intent) and readers (admin, orders.js,
-- qr-claim) use partner1_name/partner2_name. partner2_name existed,
-- partner1_name did not, so every order insert failed with 42703 even
-- after promo_code was added.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner1_name text;
