-- reviewer-check.sql
-- Read-only. Changes nothing. Run this in the Supabase SQL Editor and send back
-- the row it returns.
--
-- This answers one question: did migration 054 actually land in the database?
-- Everything after that is the browser's cached copy, which the database cannot
-- see and this query cannot tell you about.

select
  u.email,
  p.name,
  p.partner_name,                                   -- expect Sam / Alex, not null
  p.pkg,                                            -- expect core
  (p.entitlements is null)      as entitlements_cleared,   -- expect true
  p.entitlements,                                   -- if not null, this is what is granting 5 exercises
  coalesce(p.addon_intimacy,false)   as addon_intimacy,    -- expect false
  coalesce(p.addon_conflict,false)   as addon_conflict,    -- expect false
  coalesce(p.addon_reflection,false) as addon_reflection,  -- expect false
  (p.partner_profile_id is not null) as partner_linked,    -- expect true
  (p.ex1_answers is not null and p.ex1_answers <> '{}'::jsonb) as ex1_done,
  (p.ex2_answers is not null and p.ex2_answers <> '{}'::jsonb) as ex2_done,
  (p.ex3_answers is not null)   as ex3_present,     -- expect false
  (p.intimacy_data is not null) as intimacy_present,-- expect false
  (p.conflict_data is not null) as conflict_present -- expect false
from public.profiles p
join auth.users u on u.id = p.id
where u.email in ('review@attune-relationships.com',
                  'review-partner@attune-relationships.com')
order by u.email;

-- Also worth checking: an order row grants entitlements independently of the
-- profile columns, and 054 does not touch orders. If anything comes back here,
-- that is another source of the premium grant.
select o.order_num, o.pkg_key, o.buyer_email,
       o.addon_intimacy, o.addon_conflict, o.addon_reflection, o.created_at
from public.orders o
where o.user_id in (
        select id from auth.users
         where email in ('review@attune-relationships.com',
                         'review-partner@attune-relationships.com'))
   or lower(o.buyer_email) in ('review@attune-relationships.com',
                               'review-partner@attune-relationships.com');
