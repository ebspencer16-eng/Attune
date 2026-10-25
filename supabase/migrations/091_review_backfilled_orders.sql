-- ============================================================================
-- 091: what the backfill actually created. Reads only. Deletes nothing.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- The first version of 089 wrote an order for EVERY profile that had none,
-- carrying whatever package the profile said. It ran before it was replaced.
-- 090 then came back with no rows, which is how we know: there is nobody left
-- without an order, so all thirteen got one.
--
-- Five of those thirteen carried `premium` on the profile, and
-- `create-profile` used to take the package from the request, so signing up at
-- ?pkg=premium granted premium. Four of the five date from July, before that
-- was closed. Those five now have a premium ORDER behind them, which is in the
-- revenue figures and reads exactly like a sale.
--
-- Nothing here changes any of that. It shows what exists so Ellie can say
-- which should stay. The undo is at the foot, commented out, and takes a list
-- the same way 089 does.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

-- Every row the backfill wrote, with what that account has actually done.
select
  o.order_num,
  coalesce(p.email, '(no email)')        as email,
  o.pkg_key                              as granted,
  p.pkg                                  as pkg_on_profile,
  coalesce(p.is_demo, false)             as is_demo,
  p.created_at::date                     as joined,
  (p.ex1_answers is not null)            as started_comms,
  (p.ex2_answers is not null)            as started_expectations,
  (p.partner_profile_id is not null)     as partner_linked
from public.orders o
left join public.profiles p on p.id = o.user_id
where o.promo_code = 'BACKFILL-COMPED'
order by o.pkg_key desc, p.created_at;

-- And the shape of it in one line.
select o.pkg_key as granted, count(*) as rows_written
from public.orders o
where o.promo_code = 'BACKFILL-COMPED'
group by o.pkg_key
order by o.pkg_key;

-- ── THE UNDO, WHEN SHE HAS SAID WHO ─────────────────────────────────────────
-- Commented out on purpose. Every row it would remove was written by the
-- backfill and by nothing else, so this cannot touch a real sale: the filter
-- is the promo_code the backfill stamped and the email list she names.
--
-- delete from public.orders
--  where promo_code = 'BACKFILL-COMPED'
--    and lower(buyer_email) in (
--      'someone@example.com',
--      'someone-else@example.com'
--    );
