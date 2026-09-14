-- Migration 062: drop what the gift cards left on the orders table
-- ============================================================================
-- WHY
--
-- Ellie: "No gift cards were printed, and all should be retired from the code,
-- we abandoned that workstream." The code is gone. These columns are what it
-- wrote to, and nothing writes or reads them now.
--
-- THE PART THAT MATTERS MORE THAN THE COLUMNS
--
-- supabase/qr_tokens_setup.sql, run in April, added this policy so that the
-- app could look up an order from a scanned card before anyone had signed in:
--
--     create policy "orders_qr_token_lookup"
--       on public.orders for select
--       using (qr_token is not null);
--
-- It names no role and no owner, so it applies to every caller including the
-- anonymous one, and the same script backfilled a token onto every existing
-- order. Row level security policies are permissive and OR together, so for as
-- long as this policy exists it sits beside orders_self_select and widens it:
-- any client holding the publishable key could select order rows, which carry
-- the buyer's name, email address, shipping address and gift message.
--
-- Migration 019 rewrote orders_self_select in June and did not touch this one,
-- because it was not looking for it.
--
-- I could not verify from here whether the policy is still on the table, so
-- this drops it by name either way. To see for yourself, in the SQL Editor:
--
--     select policyname, cmd, qual from pg_policies
--     where schemaname = 'public' and tablename = 'orders';
--
-- What should be left afterwards is orders_self_select and
-- orders_self_update_link, both of which check the caller against the row.
--
-- WHAT THIS DOES NOT TOUCH
--
-- orders.card_status stays. Despite the name it is the fulfilment state of a
-- physical box, it is set by api/orders.js and moved by the admin, and the
-- shipping email is sent when it changes.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- 1. The policy first: it references qr_token, so the column cannot go while
--    it stands.
drop policy if exists "orders_qr_token_lookup" on public.orders;

-- 2. The index it was there to serve.
drop index if exists public.orders_qr_token_idx;

-- 3. The columns. Nothing in the codebase reads or writes any of these.
alter table public.orders
  drop column if exists qr_token,
  drop column if exists qr_claimed_at,
  drop column if exists qr_claimed_by,
  drop column if exists card_url;

-- 4. Show what is left, so the result of running this is visible.
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'orders'
order by policyname;
