-- fix-reviewer.sql   (version 2, 2026-09-08)
-- ============================================================================
-- Short on purpose. The full 054 is 200 lines and easy to re-run an old copy of
-- by mistake, which is what happened: the database still held pkg = 'premium'
-- and an empty partner_name, which only the first version of 054 ever wrote.
--
-- The two profiles already exist, are linked, and have both exercises done.
-- Nothing here creates anything. It only corrects the four fields that are
-- wrong. Read it, paste it, run it.
-- ============================================================================

update public.profiles p
   set pkg               = 'core',
       addon_intimacy    = false,
       addon_conflict    = false,
       addon_reflection  = false,
       addon_budget      = false,
       addon_checklist   = false,
       addon_workbook    = null,
       -- Cleared so it recomputes. It only stays cleared because pkg is core
       -- now: the client rewrites this column from the package on sign-in,
       -- which is why clearing it while pkg said premium did nothing.
       entitlements      = null,
       -- The dashboard reads this column, not the linked partner's profile.
       partner_name      = case u.email
                             when 'review@attune-relationships.com' then 'Sam'
                             else 'Alex' end,
       partner_email     = case u.email
                             when 'review@attune-relationships.com'
                               then 'review-partner@attune-relationships.com'
                             else 'review@attune-relationships.com' end,
       partner_joined    = true
  from auth.users u
 where u.id = p.id
   and u.email in ('review@attune-relationships.com',
                   'review-partner@attune-relationships.com');

-- ── Check. Every column below must read as the comment says. ───────────────
select
  u.email,
  p.name,
  p.partner_name,                                    -- Sam / Alex
  p.pkg,                                             -- core
  (p.entitlements is null)           as entitlements_cleared,  -- true
  coalesce(p.addon_intimacy,false)   as addon_intimacy,        -- false
  coalesce(p.addon_conflict,false)   as addon_conflict,        -- false
  coalesce(p.addon_reflection,false) as addon_reflection       -- false
from public.profiles p
join auth.users u on u.id = p.id
where u.email in ('review@attune-relationships.com',
                  'review-partner@attune-relationships.com')
order by u.email;

-- ── And this one. Any row here is a second source of the premium grant. ────
-- Entitlements are computed from order rows as well as profile columns, so an
-- order saying premium outranks everything above. Send back whatever this
-- returns, including nothing.
select o.order_num, o.pkg_key, o.buyer_email, o.user_id, o.created_at
from public.orders o
where o.user_id in (select id from auth.users
                     where email in ('review@attune-relationships.com',
                                     'review-partner@attune-relationships.com'))
   or lower(o.buyer_email) in ('review@attune-relationships.com',
                               'review-partner@attune-relationships.com');
