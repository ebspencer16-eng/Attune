-- ============================================================================
-- 090: who the thirteen accounts without an order actually are. Reads only.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie asked to fix "the two accounts that exist without the order" and the
-- list came back with thirteen. They are not one kind of thing, and the
-- difference matters before anybody is written an order: five of them carry
-- `premium` on the profile, and `create-profile` used to take the package
-- from the request, so signing up at ?pkg=premium granted premium. Four of
-- those five date from July, before that was closed.
--
-- So this asks what each of them has actually DONE. A real beta tester has
-- answers, a partner, or both. A self-granted premium with no answers and no
-- partner is a different decision.
--
-- Nothing here writes. Run it, read it, and tell me which names should become
-- customers and at what package; 089 takes a list.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

select
  coalesce(p.email, '(no email)')                       as email,
  p.pkg                                                 as pkg_on_profile,
  coalesce(p.is_demo, false)                            as is_demo,
  p.created_at::date                                    as joined,
  p.auth_provider,
  (p.ex1_answers is not null)                           as started_comms,
  (p.ex2_answers is not null)                           as started_expectations,
  (p.ex3_answers is not null)                           as started_reflection,
  (p.intimacy_data is not null)                         as started_intimacy,
  (p.conflict_data is not null)                         as started_conflict,
  (p.partner_profile_id is not null)                    as partner_linked,
  p.joined_via_invite,
  (p.entitlements ->> 'hasGrant')::boolean              as grant_recorded
from public.profiles p
where not exists (
  select 1 from public.orders o
  where o.user_id = p.id
     or (p.email is not null and lower(o.buyer_email) = lower(p.email))
)
order by coalesce(p.is_demo, false), p.pkg desc, p.created_at;
