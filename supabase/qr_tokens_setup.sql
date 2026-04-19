-- ═══════════════════════════════════════════════════════════════════════════
-- Per-order QR tokens
-- ═══════════════════════════════════════════════════════════════════════════
-- Run once in Supabase SQL Editor.
-- Adds a unique unguessable token to each order for the physical QR card.
-- When a user scans the card and arrives at /app?qr=<token>, the app can
-- look up the order, preload partner names/package, and mark the token
-- used so it can't be claimed again.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add columns if not present
alter table public.orders
  add column if not exists qr_token       text unique,
  add column if not exists qr_claimed_at  timestamptz,
  add column if not exists qr_claimed_by  text;

-- 2. Backfill any existing orders that lack a token
update public.orders
set qr_token = 'ATQR-' || substr(md5(random()::text || order_num || now()::text), 1, 16)
where qr_token is null;

-- 3. Index for fast lookups
create index if not exists orders_qr_token_idx on public.orders (qr_token);

-- 4. Allow the anon role to read a row by qr_token (needed for /app to look
-- up the order when the user lands on the page). Writes still require the
-- service-role key.
drop policy if exists "orders_qr_token_lookup" on public.orders;
create policy "orders_qr_token_lookup"
  on public.orders for select
  using (qr_token is not null);

-- Verify
select order_num, qr_token, qr_claimed_at from public.orders order by created_at desc limit 10;
