-- 093: What Rebecca has and has not done. READ ONLY. Writes nothing.
--
-- Ellie: "Since rebecca's login process was messed up, did she complete demos
-- and account setup? Did she invite a partner? If no to any of that, we need
-- to prompt her with it immediately."
--
-- Her sign-up went through a broken path, so the question is whether anything
-- was left half-finished. Three things, one row each, with a plain yes or no
-- and the date where there is one.
--
-- Nothing here changes a single value. Run it, read it, and nothing has moved.
--
-- She is found by email OR by the name on the profile, because a broken
-- sign-up is one of the ways those two come apart. If all three blocks come
-- back empty, the account is not under a name or address starting "rebecca"
-- and the thing to do is send me the email address rather than guess.

-- ── ONE RESULT, NOT THREE ───────────────────────────────────────────────────
-- This asked three questions as three SELECTs, and Ellie got the third one
-- back twice while telling me she had pasted everything. She had. The Supabase
-- SQL Editor shows the result of the LAST statement in a run and silently
-- discards the ones before it, so a three-statement script can only ever hand
-- back a third of its answer.
--
-- It is one query now. Every row is a question with its answer, in one table
-- she can copy whole.
-- ============================================================================

with me as (
  select p.*, u.email as auth_email
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(u.email) like 'rebecca%'
      or lower(coalesce(p.name, '')) like 'rebecca%'
),
-- One row per exercise, so a half-finished set is visible rather than averaged
-- into a single yes.
ex as (
  select x.exercise, x.answers
    from me
    cross join lateral (
      values
        ('1. Communication Styles',    me.ex1_answers),
        ('2. Expectations',            me.ex2_answers),
        ('3. Relationship Reflection', me.ex3_answers),
        ('4. Physical Intimacy',       me.intimacy_data),
        ('5. Conflict Patterns',       me.conflict_data)
    ) as x(exercise, answers)
)
select 1 as ord, 'account' as section, 'Name'::text as item,
       coalesce(nullif(me.name, ''), 'NOT SET')::text as answer from me
union all
select 2, 'account', 'Pronouns',
       coalesce(nullif(me.pronouns, ''), 'NOT SET')::text from me
union all
select 3, 'account', 'Setup marked complete',
       case when me.profile_setup_complete then 'YES' else 'NO' end::text from me
union all
select 4, 'account', 'Signed up',
       to_char(me.created_at, 'YYYY-MM-DD')::text from me
union all
select 5, 'exercises', ex.exercise,
       (case
          when ex.answers is null then 'NOT STARTED'
          when jsonb_typeof(ex.answers) <> 'object' then 'ODD: stored value is not an object'
          when ex.answers = '{}'::jsonb then 'STARTED, EMPTY'
          when ex.answers ? 'completedAt' then 'FINISHED ' || (ex.answers ->> 'completedAt')
          else 'PARTLY: ' || (select count(*) from jsonb_object_keys(ex.answers))::text || ' answers, not finished'
        end)::text
  from ex
union all
select 6, 'partner', 'Partner name',
       coalesce(nullif(me.partner_name, ''), 'NOT SET')::text from me
union all
select 7, 'partner', 'Partner email',
       coalesce(nullif(me.partner_email, ''), 'NOT SET')::text from me
union all
select 8, 'partner', 'Invite code',
       coalesce(me.invite_code, 'NONE')::text from me
union all
select 9, 'partner', 'Partner joined',
       case when me.partner_joined then 'YES' else 'NO' end::text from me
order by ord, item;
