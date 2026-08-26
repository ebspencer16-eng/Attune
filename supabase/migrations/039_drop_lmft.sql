-- 039_drop_lmft.sql
-- Drops the database side of the discontinued LMFT session offering. The code
-- side is already gone: no endpoint writes these, no page reads them.
--
-- THIS DESTROYS DATA AND CANNOT BE UNDONE. lmft_requests holds real bookings
-- and orders.addon_lmft records what people actually paid for. Export both
-- first if there is any chance you will want the history:
--
--   select * from public.lmft_requests order by created_at;
--   select order_num, created_at, addon_lmft from public.orders where addon_lmft;
--
-- Run this in the Supabase SQL Editor, and actually click Run. Saving the tab
-- is not running it. Safe to run more than once.

-- 1. The bookings table, plus anything hanging off it.
drop table if exists public.lmft_requests cascade;

-- 2. The per-order add-on flag.
alter table public.orders
  drop column if exists addon_lmft;

-- 3. The mirrored flag on profiles, if the entitlements migration added one.
alter table public.profiles
  drop column if exists addon_lmft;
