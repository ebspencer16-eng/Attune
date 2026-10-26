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

-- ── 1. Account setup ──────────────────────────────────────────────────────
-- A profile is set up when it has a name and the pronouns, which is what the
-- in-app editor writes. `profile_setup_complete` is the flag the app sets, and
-- it is reported separately from the fields because a broken path is exactly
-- how a flag and its fields come apart.
select
  'account setup'                                       as question,
  p.name                                                as name,
  nullif(p.pronouns, '')                                as pronouns,
  p.profile_setup_complete                              as setup_flag,
  case
    when coalesce(p.name, '') = '' then 'NO: no name'
    when coalesce(p.pronouns, '') = '' then 'NO: no pronouns'
    when p.profile_setup_complete is not true then 'PARTLY: fields are there, flag is not set'
    else 'YES'
  end                                                   as answer,
  p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) like 'rebecca%' or lower(coalesce(p.name, '')) like 'rebecca%';

-- ── 2. The exercises ──────────────────────────────────────────────────────
-- One row per exercise, so a half-finished set is visible rather than averaged
-- into a single yes. An answers column that is null or an empty object is not
-- started; one with keys in it has been answered.
select
  'exercises'                                           as question,
  x.exercise,
  case
    when x.answers is null then 'NO: not started'
    when jsonb_typeof(x.answers) <> 'object' then 'ODD: stored value is not an object'
    when x.answers = '{}'::jsonb then 'NO: started and empty'
    when x.answers ? 'completedAt' then 'YES: finished ' || (x.answers ->> 'completedAt')
    else 'PARTLY: ' || (select count(*) from jsonb_object_keys(x.answers)) || ' answers, no completedAt'
  end                                                   as answer
from public.profiles p
join auth.users u on u.id = p.id
cross join lateral (
  values
    ('Communication Styles',  p.ex1_answers),
    ('Expectations',          p.ex2_answers),
    ('Relationship Reflection', p.ex3_answers),
    ('Physical Intimacy',     p.intimacy_data),
    ('Conflict Patterns',     p.conflict_data)
) as x(exercise, answers)
where lower(u.email) like 'rebecca%' or lower(coalesce(p.name, '')) like 'rebecca%';

-- ── 3. The partner ────────────────────────────────────────────────────────
-- Three separate states, because they fail separately: no invite was ever
-- addressed, an invite was addressed but nobody joined, or a partner is linked.
select
  'partner'                                             as question,
  nullif(p.partner_name, '')                            as partner_name,
  nullif(p.partner_email, '')                           as partner_email,
  p.invite_code,
  p.partner_joined,
  case
    when coalesce(p.partner_email, '') = '' then 'NO: no partner email on the profile'
    when p.invite_code is null then 'NO: an email but no invite code, so nothing could be sent'
    when p.partner_joined is not true then 'INVITED, NOT JOINED: ' || p.partner_email
    else 'YES: joined'
  end                                                   as answer
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) like 'rebecca%' or lower(coalesce(p.name, '')) like 'rebecca%';
