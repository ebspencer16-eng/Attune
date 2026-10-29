-- Which accounts have nothing bought behind them? (A191)
--
-- Run this in the Supabase SQL Editor. It reads only; it writes nothing.
--
-- The app now turns away any account that has not bought something. This
-- lists every account that rule turns away, so you can see who they are
-- before anybody tells you. Mya's should be here until her order goes through.
--
-- An account counts as bought when ANY of these is true, the same rule as
-- api/_lib/purchase-gate.js:
--   an order under its id or its email; a comp account; its stored
--   entitlements say so; its linked partner bought; or it joined on the
--   invite code of somebody who bought.
--
-- ── WHAT ITS ANSWER MEANS ─────────────────────────────────────────────────
--   no rows       nobody is shut out.
--   a row         that account cannot get into the app. "how they signed up"
--                 says google, apple or email. A row for somebody who should
--                 get in is a gap in the rule: paste it back.

with acct as (
  select u.id, lower(u.email) as email, u.created_at,
         coalesce(u.raw_app_meta_data->>'provider', 'email') as provider,
         p.id is not null as has_profile, p.name, p.pkg, p.is_comp, p.entitlements,
         p.partner_profile_id, p.invite_code, p.joined_via_invite
  from auth.users u
  left join public.profiles p on p.id = u.id
),
bought as (
  select a.id from acct a
  where exists (select 1 from public.orders o where o.user_id = a.id or lower(o.buyer_email) = a.email)
     or coalesce(a.is_comp, false)
     or coalesce((a.entitlements->>'hasGrant')::boolean, false)
     or coalesce((a.entitlements->>'comp')::boolean, false)
)
select
  a.email                                        as "email",
  a.provider                                     as "how they signed up",
  a.created_at::date                             as "account made",
  case when a.has_profile then 'yes' else 'no' end as "profile",
  coalesce(a.name, '')                           as "name on profile",
  coalesce(a.invite_code, '')                    as "their invite code",
  (select count(*) from public.profiles j
     where j.invite_code = a.invite_code and j.id <> a.id) as "people joined on their code"
from acct a
where a.id not in (select id from bought)
  -- a partner who bought
  and not exists (select 1 from bought b where b.id = a.partner_profile_id)
  -- the inviter whose code they joined on
  and not (coalesce(a.joined_via_invite, false) and exists (
        select 1 from public.profiles i
        join bought b on b.id = i.id
        where i.invite_code = a.invite_code and i.id <> a.id))
order by a.created_at desc;
