-- ============================================================================
-- 095: why the admin shows no survey responses. READ ONLY. Writes nothing.
--
-- Ellie: "There should be some survey responses, I know I completed it at
-- least."
--
-- There are three ways a completed survey can be invisible in the admin, and
-- they want different fixes, so this tells them apart rather than guessing.
--
--   1. The row is not there. The survey did not save.
--   2. The row is there and has no respondent_id, so nothing can join it to a
--      person and every chart about it is empty.
--   3. The row is there, joins fine, and the person is a demo account. Every
--      admin figure excludes demo accounts on purpose, so this would be the
--      admin working correctly and surprising her. If it is her own account
--      that is marked as a demo, that is the whole answer.
--
-- Run in the Supabase SQL Editor and click Run. One table comes back.
-- ============================================================================

select 'total survey rows'                        as question,
       count(*)::text                             as answer
  from public.survey_responses
union all
select 'finished (completed_at set)',
       count(*) filter (where completed_at is not null)::text
  from public.survey_responses
union all
select 'rows with no respondent_id, so unjoinable',
       count(*) filter (where respondent_id is null)::text
  from public.survey_responses
union all
select 'rows whose respondent has no profile row',
       count(*)::text
  from public.survey_responses s
  left join public.profiles p on p.id = s.respondent_id
 where s.respondent_id is not null and p.id is null
union all
select 'rows EXCLUDED because the person is a demo account',
       count(*)::text
  from public.survey_responses s
  join public.profiles p on p.id = s.respondent_id
 where coalesce(p.is_demo, false) = true
union all
select 'rows the admin should therefore be showing',
       count(*)::text
  from public.survey_responses s
  join public.profiles p on p.id = s.respondent_id
 where coalesce(p.is_demo, false) = false
union all
-- Who they are, so she can see whether her own account is one of the demos.
select 'demo accounts with a survey row: ' || coalesce(u.email, '(no email)'),
       'is_demo = true'
  from public.survey_responses s
  join public.profiles p on p.id = s.respondent_id
  join auth.users u on u.id = p.id
 where coalesce(p.is_demo, false) = true;
