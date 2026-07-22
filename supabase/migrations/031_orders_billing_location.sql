-- 031_orders_billing_location.sql
--
-- Order geography previously came only from the shipping address, which is
-- collected on physical orders only. Digital orders (now the default) captured
-- no location at all. These columns hold the billing location Stripe returns
-- for paid orders, so the geography breakdown can fall back to billing when
-- there is no shipping address.
--
-- Free/promo ($0) orders skip Stripe entirely and will still have neither, by
-- design — there is no payment step to collect an address from.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_state   text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_country text;

-- Verify
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'orders'
   AND column_name IN ('billing_state', 'billing_country')
 ORDER BY column_name;
