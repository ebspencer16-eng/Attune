-- Migration 007: Tax columns on orders
--
-- Adds tax tracking columns to the orders table. These are populated by
-- the stripe-webhook.js handler on payment_intent.succeeded when the
-- PaymentIntent metadata carries a Stripe Tax calculation ID.
--
-- tax_amount:          Dollar amount of sales tax charged on this order
-- subtotal:            Pre-tax, post-promo dollar amount
-- tax_calculation_id:  Stripe Tax calculation ID (txcal_...) — used to link
--                      the order back to its Stripe Tax record for
--                      reconciliation and reports
-- promo_code:          Promo code applied to this order (if any) — already
--                      passed in webhook metadata but we add the column here
--                      if it doesn't exist yet
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tax_amount numeric,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS tax_calculation_id text,
  ADD COLUMN IF NOT EXISTS promo_code text;

CREATE INDEX IF NOT EXISTS orders_tax_calculation_id_idx ON orders(tax_calculation_id);
