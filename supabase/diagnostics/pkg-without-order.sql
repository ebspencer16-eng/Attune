-- Who holds a package above core, and what paid for it?
--
-- Run this in the Supabase SQL Editor. It reads only; it writes nothing.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
-- /api/create-profile accepted `pkg` from the request body until 2026-09-08,
-- allowlisted to the four package names including premium. profiles.pkg is a
-- grant source in the entitlements engine, and grant-only merging never takes
-- a grant away, so anything written there was permanent. The website passed
-- the value straight through from the URL, so signing up at ?pkg=premium was
-- the whole exploit. No payment, no order row.
--
-- Every profile above core therefore needs a reason. There are four:
--
--   PAID           an order exists for this person with a matching package
--   COMP           is_comp is set, which grants everything by design
--   PARTNER        they were invited by someone who paid, and inherited it
--   NO SOURCE      none of the above. Either the exploit, or a grant made by
--                  hand in the SQL editor and not recorded anywhere
--
-- NO SOURCE is the list you want. It cannot tell an exploit from an
-- undocumented manual grant, because neither leaves a trace, so anything on it
-- has to be checked against your own records.

with ranked as (
  select 'core' as pkg, 0 as rank
  union all select 'newlywed', 1
  union all select 'anniversary', 1
  union all select 'premium', 2
),
-- Every order that could justify a grant, matched the same two ways the
-- entitlements engine matches them: by user id, and by the email on the
-- account, because a guest checkout writes buyer_email before any user id.
orders_for_profile as (
  select
    p.id as profile_id,
    max(r.rank) as best_order_rank,
    string_agg(distinct o.order_num, ', ' order by o.order_num) as order_nums,
    string_agg(distinct o.pkg_key, ', ') as order_pkgs,
    max(o.created_at) as latest_order_at
  from public.profiles p
  join public.orders o
    on o.user_id = p.id
    or (p.email is not null and lower(o.buyer_email) = lower(p.email))
  join ranked r on r.pkg = coalesce(o.pkg_key, 'core')
  group by p.id
)
select
  p.id,
  p.email,
  p.name,
  p.pkg                                   as profile_pkg,
  p.is_comp,
  p.joined_via_invite,
  p.created_at,
  ofp.order_nums,
  ofp.order_pkgs,
  case
    when p.is_comp then 'COMP'
    when ofp.best_order_rank >= pr.rank then 'PAID'
    when p.joined_via_invite and partner_paid.best_order_rank >= pr.rank then 'PARTNER'
    else 'NO SOURCE'
  end as grant_source,
  -- Add-ons are granted the same way and are worth seeing next to the package.
  array_remove(array[
    case when p.addon_reflection then 'reflection' end,
    case when p.addon_budget     then 'budget'     end,
    case when p.addon_checklist  then 'checklist'  end,
    case when p.addon_intimacy   then 'intimacy'   end,
    case when p.addon_conflict   then 'conflict'   end,
    case when p.addon_workbook is not null and p.addon_workbook <> '' then 'workbook' end
  ], null) as addons_on_profile
from public.profiles p
join ranked pr on pr.pkg = coalesce(p.pkg, 'core')
left join orders_for_profile ofp on ofp.profile_id = p.id
left join orders_for_profile partner_paid on partner_paid.profile_id = p.partner_profile_id
where coalesce(p.pkg, 'core') <> 'core'
order by
  case
    when p.is_comp then 3
    when ofp.best_order_rank >= pr.rank then 4
    when p.joined_via_invite and partner_paid.best_order_rank >= pr.rank then 2
    else 1                                    -- NO SOURCE first
  end,
  p.created_at desc;


-- ── A one-line summary, to run after the list above ───────────────────────
-- Paste and run separately.
--
-- with ranked as (
--   select 'core' as pkg, 0 as rank
--   union all select 'newlywed', 1
--   union all select 'anniversary', 1
--   union all select 'premium', 2
-- )
-- select
--   count(*) filter (where p.is_comp)                       as comp,
--   count(*) filter (where not p.is_comp and exists (
--     select 1 from public.orders o join ranked r on r.pkg = coalesce(o.pkg_key,'core')
--     where (o.user_id = p.id or lower(o.buyer_email) = lower(p.email))
--       and r.rank >= pr.rank))                              as paid,
--   count(*) filter (where not p.is_comp and not exists (
--     select 1 from public.orders o join ranked r on r.pkg = coalesce(o.pkg_key,'core')
--     where (o.user_id = p.id or lower(o.buyer_email) = lower(p.email))
--       and r.rank >= pr.rank))                              as unexplained
-- from public.profiles p
-- join ranked pr on pr.pkg = coalesce(p.pkg, 'core')
-- where coalesce(p.pkg, 'core') <> 'core';


-- ── If you find unexplained grants ────────────────────────────────────────
-- Downgrading is a write, so it is not in this file. Decide first: an account
-- that has already seen results under a package you did not sell is a support
-- conversation, not a silent downgrade. Ask for the list and I will write the
-- migration once you have decided who is who.
