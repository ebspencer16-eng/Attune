-- Why a couple's results will not open.
--
-- Run this in the Supabase SQL Editor. It reads only; it writes nothing, and
-- it creates nothing: one SELECT, start to finish.
--
-- Find REPLACE_WITH_THEIR_EMAIL below, which appears once, and put either
-- partner's email address there. Then run it. It finds the other half of the
-- couple itself. One row per person, and the column that answers it is
-- `verdict`.
--
-- It reports what the product reads and does not try to decide: the rule for
-- when results open is api/_lib/results-gate.js and the rule for whether an
-- exercise is finished is api/_exercises.js. The long version of why those two
-- are not restated here is in HANDOFF.md.

with asked as (select lower('REPLACE_WITH_THEIR_EMAIL') as email),

-- Both halves of the couple, plus any duplicate account for either of them,
-- because a signup outside the checkout path is how a second account happens.
--
-- The answer counts are taken here, once, each guarded on the value actually
-- being an object. jsonb_object_keys raises on a scalar, and an error message
-- in place of an answer is the worst outcome this query has; these accounts
-- did not come through the normal path, which is where odd data lives.
people as (
  select
    p.*,
    case when jsonb_typeof(p.ex1_answers) = 'object'
         then (select count(*)::int from jsonb_object_keys(p.ex1_answers)) else 0 end as n_ex1,
    case when jsonb_typeof(p.ex2_answers) = 'object'
         then (select count(*)::int from jsonb_object_keys(p.ex2_answers)) else 0 end as n_ex2,
    case when jsonb_typeof(p.ex3_answers) = 'object'
         then (select count(*)::int from jsonb_object_keys(p.ex3_answers)) else 0 end as n_ex3,
    case when jsonb_typeof(p.intimacy_data -> 'answers') = 'object'
         then (select count(*)::int from jsonb_object_keys(p.intimacy_data -> 'answers')) else 0 end as n_intimacy,
    case when jsonb_typeof(p.conflict_data -> 'answers') = 'object'
         then (select count(*)::int from jsonb_object_keys(p.conflict_data -> 'answers')) else 0 end as n_conflict
  from public.profiles p, asked a
  where lower(p.email) = a.email
     or p.id in (select partner_profile_id from public.profiles q, asked b
                 where lower(q.email) = b.email)
     or p.partner_profile_id in (select id from public.profiles q, asked c
                                 where lower(q.email) = c.email)
),

-- An exercise is finished when its answers column has any keys, except the two
-- stored as a record, which are finished only when the record carries
-- completedAt. Conflict Patterns is 12 questions and Physical Intimacy is 16;
-- those two counts are a note, not the rule, and the lists live in
-- api/_conflict-questions.js and api/_intimacy-questions.js.
per_exercise as (
  select p.id, 'Communication' as exercise, p.n_ex1 as answers, null::int as expected,
         case when p.ex1_answers is null then 'NOT STARTED'
              when p.n_ex1 = 0 then 'NOT AN ANSWER SET'
              else 'FINISHED' end as state
  from people p
  union all
  select p.id, 'Expectations', p.n_ex2, null,
         case when p.ex2_answers is null then 'NOT STARTED'
              when p.n_ex2 = 0 then 'NOT AN ANSWER SET'
              else 'FINISHED' end
  from people p
  union all
  select p.id, 'Reflection', p.n_ex3, null,
         case when p.ex3_answers is null then 'NOT STARTED'
              when p.n_ex3 = 0 then 'NOT AN ANSWER SET'
              else 'FINISHED' end
  from people p
  union all
  select p.id, 'Physical Intimacy', p.n_intimacy, 16,
         case when p.intimacy_data is null then 'NOT STARTED'
              when p.intimacy_data ->> 'completedAt' is not null then 'FINISHED'
              else 'ANSWERED, NOT MARKED' end
  from people p
  union all
  select p.id, 'Conflict Patterns', p.n_conflict, 12,
         case when p.conflict_data is null then 'NOT STARTED'
              when p.conflict_data ->> 'completedAt' is not null then 'FINISHED'
              else 'ANSWERED, NOT MARKED' end
  from people p
)

select
  p.name,
  p.email,
  -- The one column to read. Anything but the last line is the answer.
  case
    when (select count(*) from public.profiles d where lower(d.email) = lower(p.email)) > 1
      then 'TWO ACCOUNTS FOR THIS PERSON'
    when p.partner_profile_id is null
      then 'NO PARTNER LINKED'
    when not exists (select 1 from public.profiles x where x.id = p.partner_profile_id)
      then 'PARTNER LINK POINTS AT NOTHING'
    when exists (select 1 from per_exercise e where e.id = p.id
                   and e.state = 'ANSWERED, NOT MARKED' and e.answers >= e.expected)
      then 'ANSWERED EVERYTHING, NEVER MARKED FINISHED'
    when exists (select 1 from per_exercise e where e.id = p.id
                   and e.state = 'ANSWERED, NOT MARKED')
      then 'STOPPED PART WAY THROUGH'
    when exists (select 1 from per_exercise e where e.id = p.id
                   and e.state = 'NOT AN ANSWER SET')
      then 'AN ANSWERS COLUMN HOLDS SOMETHING THAT IS NOT ANSWERS'
    -- Not "all is well": it means this query found nothing, which is itself
    -- worth knowing because it rules the others out.
    else 'NOTHING THIS QUERY CAN SEE'
  end as verdict,
  -- And the detail behind it, one line per exercise.
  (select string_agg(e.exercise || ': ' || e.state
                     || case when e.expected is null then ''
                             else ' (' || e.answers || ' of ' || e.expected || ')' end,
                     '  |  ' order by e.exercise)
     from per_exercise e where e.id = p.id) as exercises,
  p.pkg,
  p.is_comp,
  p.joined_via_invite,
  (select count(*) from public.partner_sessions s where s.invite_code = p.invite_code) as rows_in_old_table,
  (select count(*) from public.orders o
    where o.user_id = p.id
       or (p.email is not null and lower(o.buyer_email) = lower(p.email))) as their_orders,
  p.id
from people p
order by p.created_at;
