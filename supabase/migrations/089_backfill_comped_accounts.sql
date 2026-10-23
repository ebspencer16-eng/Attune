-- ============================================================================
-- 089: an order row for the accounts that have none.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "Just update the two accounts that exist without the order, then
-- there's only two types."
--
-- An account with no order row is a third kind of thing the product has to
-- reason about, and it is the kind that produced a beta tester working through
-- the exercises with nothing in the admin behind her. Results now require a
-- real order, a comp, or a partner who has one, so these accounts would be
-- refused their own results: this is what makes them customers.
--
-- ── WHAT IT DOES ────────────────────────────────────────────────────────────
-- For every profile that has no order under it, by id or by email, it writes
-- one $0 order carrying the package that profile already has. Nothing is
-- invented: the package is the profile's own, and `promo_code` says plainly
-- that this row was written by a backfill rather than by a checkout, so the
-- admin's figures can tell the two apart.
--
-- It is scoped to accounts that exist RIGHT NOW. Anybody who signs up after
-- this runs is not touched by it, which is the point: the gate is what stops
-- the next one, not this.
--
-- Safe to run more than once. The second run finds no profile without an
-- order and writes nothing.
--
-- ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
-- It does not raise `uses_count` on any beta code. A code's count is the
-- record of a redemption that happened at checkout, and none of these went
-- through one. ATTUNE-BETA-14 stays unused and can still be given to somebody.
--
-- ── AND WHAT HAPPENS NEXT ───────────────────────────────────────────────────
-- `profiles.entitlements` is a computed summary of what an account owns, and
-- it is recomputed on sign-in rather than by this file. So the moment this
-- runs, /api/results lets these two through: it reads the orders themselves
-- before refusing anybody, which is exactly the case it was written for. The
-- home screen's "results are ready" card reads the summary instead, so it
-- catches up the next time they sign in. Nothing is stuck; one of the two
-- answers is simply a few minutes behind the other.
--
-- Writing the summary by hand here would be a second place that decides what
-- an account owns, which is the failure this codebase is most prone to.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

-- What it is about to change, so the result is visible before and after.
select p.email, p.pkg, p.created_at::date as joined
from public.profiles p
where not exists (
  select 1 from public.orders o
  where o.user_id = p.id
     or (p.email is not null and lower(o.buyer_email) = lower(p.email))
);

insert into public.orders
  (order_num, user_id, buyer_name, buyer_email, partner1_name, partner2_name,
   pkg_key, is_gift, is_physical, total, promo_code,
   workbook_status, card_status, created_at)
select
  'ATT-BACKFILL-' || upper(substr(replace(p.id::text, '-', ''), 1, 8)),
  p.id,
  nullif(p.name, ''),
  p.email,
  nullif(p.name, ''),
  nullif(p.partner_name, ''),
  coalesce(nullif(p.pkg, ''), 'core'),
  false,
  false,
  0,
  'BACKFILL-COMPED',
  'pending',
  'pending',
  coalesce(p.created_at, now())
from public.profiles p
where not exists (
  select 1 from public.orders o
  where o.user_id = p.id
     or (p.email is not null and lower(o.buyer_email) = lower(p.email))
)
on conflict (order_num) do nothing;

-- And the same list again. Every row above should now be gone.
select p.email, p.pkg
from public.profiles p
where not exists (
  select 1 from public.orders o
  where o.user_id = p.id
     or (p.email is not null and lower(o.buyer_email) = lower(p.email))
);
