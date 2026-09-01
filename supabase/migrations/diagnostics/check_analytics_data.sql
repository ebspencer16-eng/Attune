-- Why is the type analytics page empty?
-- ============================================================================
-- Read-only. The typing page needs profiles that have ex1_answers, and couples
-- need BOTH partners to have them plus a partner link. This shows how many
-- exist, so an empty page can be told apart from a broken page.
--
-- Likely answer: the beta resets cleared ex1_answers for all four testers, and
-- they are the only accounts with answers. If retaken_ex1 comes back 0, the
-- page is empty because the data is empty, not because anything is wrong.
-- ============================================================================

select
  count(*)                                                          as profiles_total,
  count(*) filter (where ex1_answers is not null)                   as with_ex1,
  count(*) filter (where ex1_answers is not null
                     and partner_profile_id is not null)            as with_ex1_and_partner,
  count(*) filter (where couple_type is not null)                   as with_stored_couple_type,
  count(*) filter (where ex2_answers is not null)                   as with_ex2
from public.profiles;

-- Couples where BOTH partners have answers: what the typing page actually counts.
select count(*) as complete_couples
from public.profiles a
join public.profiles b on b.id = a.partner_profile_id
where a.id < b.id
  and a.ex1_answers is not null
  and b.ex1_answers is not null;

-- Per person, so it is obvious who has and has not retaken.
select
  u.email,
  p.ex1_answers is not null                        as has_ex1,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers,'{}'::jsonb))) as answer_count,
  p.partner_profile_id is not null                 as partner_linked
from public.profiles p
join auth.users u on u.id = p.id
order by has_ex1 desc, u.email;
