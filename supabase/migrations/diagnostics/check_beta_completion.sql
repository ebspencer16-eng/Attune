-- Is any beta tester data lost, and what is each exercise's true status?
-- ============================================================================
-- Read-only. Changes nothing.
--
-- The dashboard reads completion from the browser's cached copy, not from the
-- database. So a row showing "not complete" can mean either the answers are
-- gone, or the browser simply does not have them. This tells them apart.
--
-- If answer counts are non-zero here, nothing is lost regardless of what the
-- dashboard shows.
-- ============================================================================

select
  u.email,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers,'{}'::jsonb)))  as ex1_answers,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers,'{}'::jsonb)) k
     where k like 'pv\_%')                                                            as ex1_partner_view,
  p.ex2_answers is not null                                                           as ex2_done,
  p.ex3_answers is not null                                                           as ex3_done,
  (p.intimacy_data -> 'completedAt') is not null                                      as intimacy_done,
  (p.conflict_data -> 'completedAt') is not null                                      as conflict_done,
  (select count(*)::int from jsonb_object_keys(
     coalesce(p.conflict_data -> 'answers', '{}'::jsonb)))                            as conflict_answers,
  p.addon_conflict                                                                    as owns_conflict,
  p.partner_profile_id is not null                                                    as partner_linked
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) in (
  'ebspencer16@gmail.com',
  'mightyhunter00@gmail.com',
  'carolina.c.cannon@gmail.com',
  'aaron.m.miner@gmail.com'
)
order by u.email;

-- What shape is conflict_data actually stored in? The dashboard looks for
-- completedAt at the top level. If it is nested somewhere else, the answers
-- are safe but the status reads false.
select
  u.email,
  jsonb_object_keys(p.conflict_data) as conflict_data_top_level_keys
from public.profiles p
join auth.users u on u.id = p.id
where p.conflict_data is not null
  and lower(u.email) in (
    'ebspencer16@gmail.com','mightyhunter00@gmail.com',
    'carolina.c.cannon@gmail.com','aaron.m.miner@gmail.com');
