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
--
-- ── WHAT THE FIRST VERSION MISSED ────────────────────────────────────────
-- It answered NOTHING THIS QUERY CAN SEE for a couple whose results plainly
-- would not open, because it had been trimmed to read nicely and the three
-- columns it lost are the three that decide:
--
--   whether the couple link is MUTUAL. results.js fetches the partner by
--   `id = me.partner_profile_id` and nothing checks the pointer comes back,
--   so a one-way link gives a partner row whose answers are somebody else's,
--   or none.
--
--   what the profile GRANTS. The gate waits on every exercise the viewer owns
--   and neither has started. Ownership is the union of three sources, and the
--   trimmed query showed none of them: the pkg column, the six addon_*
--   columns, and the `entitlements` blob, which can name a higher package and
--   more add-ons than the columns do.
--
--   whether anybody paid, which is a separate question from what they can see.

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
         then (select count(*)::int from jsonb_object_keys(p.conflict_data -> 'answers')) else 0 end as n_conflict,
    -- Every ownership input, as stored. The pkg-to-capability mapping is
    -- PKG_CAPS in api/_lib/entitlements.js and is deliberately NOT restated
    -- here; `core` grants none of the three exercises, which is why they are
    -- add-ons, so for a core account these columns are the whole answer.
    array_remove(array[
      case when p.addon_reflection then 'reflection' end,
      case when p.addon_intimacy   then 'intimacy'   end,
      case when p.addon_conflict   then 'conflict'   end,
      case when p.addon_budget     then 'budget'     end,
      case when p.addon_checklist  then 'checklist'  end,
      case when coalesce(p.addon_workbook, '') <> '' then 'workbook' end
    ], null) as addon_columns,
    -- The blob grants on top of the columns, and can name a bigger package.
    p.entitlements ->> 'pkg' as blob_pkg,
    array_remove(array[
      case when (p.entitlements ->> 'addonReflection')::boolean then 'reflection' end,
      case when (p.entitlements ->> 'addonIntimacy')::boolean   then 'intimacy'   end,
      case when (p.entitlements ->> 'addonConflict')::boolean   then 'conflict'   end
    ], null) as blob_addons,
    (p.entitlements ->> 'hasGrant')::boolean as blob_has_grant,
    (p.entitlements ->> 'comp')::boolean as blob_comp
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
    -- A one-way link is the quiet one: the partner row exists, so nothing
    -- errors, and its answers belong to the wrong person or to nobody.
    when not exists (select 1 from public.profiles x
                     where x.id = p.partner_profile_id and x.partner_profile_id = p.id)
      then 'PARTNER LINK IS ONE WAY'
    -- The gate waits on every exercise this account owns. One it owns and
    -- nobody has started is a wait with no way out of it.
    when 'conflict' = any(p.addon_columns || p.blob_addons) and p.conflict_data is null
      then 'OWNS CONFLICT PATTERNS AND NOBODY HAS STARTED IT'
    when 'intimacy' = any(p.addon_columns || p.blob_addons) and p.intimacy_data is null
      then 'OWNS PHYSICAL INTIMACY AND NOBODY HAS STARTED IT'
    when 'reflection' = any(p.addon_columns || p.blob_addons) and p.ex3_answers is null
      then 'OWNS REFLECTION AND NOBODY HAS STARTED IT'
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
  -- Is the link mutual? results.js reads the partner by this id alone.
  case
    when p.partner_profile_id is null then 'NONE'
    when exists (select 1 from public.profiles x
                 where x.id = p.partner_profile_id and x.partner_profile_id = p.id) then 'MUTUAL'
    else 'ONE WAY'
  end as partner_link,
  p.pkg,
  p.addon_columns,
  p.blob_pkg,
  p.blob_addons,
  p.blob_has_grant,
  p.blob_comp,
  p.is_comp,
  p.joined_via_invite,
  (select count(*) from public.partner_sessions s where s.invite_code = p.invite_code) as rows_in_old_table,
  (select count(*) from public.orders o
    where o.user_id = p.id
       or (p.email is not null and lower(o.buyer_email) = lower(p.email))) as their_orders,
  p.id
from people p
order by p.created_at;
