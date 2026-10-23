-- ============================================================================
-- 089: order rows for the accounts Ellie names, and nothing else.
--
-- ── WHY THIS REPLACED ITSELF ────────────────────────────────────────────────
-- Ellie: "Just update the two accounts that exist without the order, then
-- there's only two types." The first version of this file did it by rule:
-- every profile with no order gets one carrying its own package.
--
-- Then she ran the list and there were THIRTEEN, not two, and they are not
-- one kind of thing:
--
--   two test accounts, tester-partner@ and tester-alone@, which 087 already
--     marked is_demo so they are outside every figure;
--   two rows with no email at all, which are not people and need looking at
--     rather than an order;
--   nine real addresses, five of them carrying `premium` on the profile.
--
-- That last group is why the rule had to go. `create-profile` used to accept
-- the package from the request, so signing up at ?pkg=premium granted premium;
-- the comment in that file says so. Four of those five profiles date from
-- July, before it was closed. Backfilling `pkg_key = p.pkg` would have written
-- a premium ORDER for an account whose premium may never have been bought, put
-- it in the revenue figures, and made it permanent.
--
-- So this takes a list. Ellie says who is a real tester and what each should
-- have; nothing is guessed from a column that may itself be the bug.
--
-- ── WHAT IT DOES ────────────────────────────────────────────────────────────
-- One $0 order per named email, carrying the package named beside it, marked
-- so the admin can tell it from a checkout. Skips anybody who already has an
-- order. Safe to run more than once.
--
-- It does not raise uses_count on any beta code: a count records a redemption
-- at checkout and none of these went through one.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

-- ── THE LIST ────────────────────────────────────────────────────────────────
-- One row per person: the email they signed up with, and the package they
-- should own. Add a line per name Ellie confirms.
--
-- rebecca.russavage@gmail.com is here because she was issued ATTUNE-BETA-14,
-- which is core plus a digital workbook, and is partway through the exercises.
with named(email, pkg, workbook) as (
  values
    ('rebecca.russavage@gmail.com', 'core', 'digital')
)

insert into public.orders
  (order_num, user_id, buyer_name, buyer_email, partner1_name, partner2_name,
   pkg_key, is_gift, is_physical, total, promo_code, addon_workbook,
   workbook_status, card_status, created_at)
select
  'ATT-BACKFILL-' || upper(substr(replace(p.id::text, '-', ''), 1, 8)),
  p.id,
  nullif(p.name, ''),
  p.email,
  nullif(p.name, ''),
  nullif(p.partner_name, ''),
  n.pkg,
  false,
  false,
  0,
  'BACKFILL-COMPED',
  nullif(n.workbook, ''),
  'pending',
  'pending',
  coalesce(p.created_at, now())
from named n
join public.profiles p on lower(p.email) = lower(n.email)
where coalesce(p.is_demo, false) = false
  and not exists (
    select 1 from public.orders o
    where o.user_id = p.id
       or (p.email is not null and lower(o.buyer_email) = lower(p.email))
  )
on conflict (order_num) do nothing;

-- Who now has an order, of the people named above.
select p.email, p.pkg, o.order_num, o.pkg_key, o.addon_workbook, o.promo_code
from public.profiles p
left join public.orders o
  on o.user_id = p.id or lower(o.buyer_email) = lower(p.email)
where lower(p.email) in (select lower(email) from (values
  ('rebecca.russavage@gmail.com')
) as t(email))
order by p.email;
