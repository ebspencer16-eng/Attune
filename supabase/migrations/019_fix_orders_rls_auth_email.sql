-- Migration 019: Fix orders RLS policies (auth.users permission denied)
--
-- The orders_self_select and orders_self_update_link policies from
-- migration 010 subquery auth.users to resolve the caller's email:
--
--   buyer_email = (select email from auth.users where id = auth.uid())
--
-- The authenticated/anon roles have no SELECT grant on auth.users, so any
-- client-side query touching orders fails with:
--
--   42501 permission denied for table users
--
-- This broke ALL client order reads (attune_order restore on sign-in,
-- pkg feature detection) and the client-side user_id linkage updates.
--
-- Fix: use auth.jwt()->>'email', which reads the caller's own JWT claim
-- and needs no table access. Same semantics, no privilege problem.
--
-- Safe to re-run (drop if exists + recreate).

drop policy if exists "orders_self_select" on public.orders;
create policy "orders_self_select"
  on public.orders for select
  using (
    auth.uid() = user_id
    or buyer_email = (auth.jwt()->>'email')
  );

drop policy if exists "orders_self_update_link" on public.orders;
create policy "orders_self_update_link"
  on public.orders for update
  using (
    auth.uid() = user_id
    or (user_id is null and buyer_email = (auth.jwt()->>'email'))
  )
  with check (
    -- Only allow setting user_id to self; everything else is server-side.
    auth.uid() = user_id
  );
