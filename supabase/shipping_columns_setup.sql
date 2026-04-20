-- ═══════════════════════════════════════════════════════════════════════════
-- Shipping address columns on orders
-- ═══════════════════════════════════════════════════════════════════════════
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Adds columns for per-order shipping address, which the checkout API
-- now writes for physical orders (from the form or from Apple Pay /
-- Google Pay's native address picker).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.orders
  add column if not exists shipping_name     text,
  add column if not exists shipping_address  text,
  add column if not exists shipping_city     text,
  add column if not exists shipping_state    text;

-- Verify
select order_num, is_physical, shipping_name, shipping_address, shipping_city, shipping_state
from public.orders
where is_physical = true
order by created_at desc
limit 10;
