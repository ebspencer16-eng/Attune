-- 054_reviewer_account.sql
-- ============================================================================
-- A permanent App Review test account: two linked partners who have both
-- finished the exercises, so a reviewer signs in and lands on real results
-- instead of an empty dashboard.
--
-- App Review rejects on a sign-in they cannot get past. They will not create an
-- account, they will not pair a partner, and they will not sit through two
-- exercises. This gives them a couple that is already done.
--
-- ── BEFORE YOU RUN THIS ────────────────────────────────────────────────────
-- Create the two users first, in the Supabase Dashboard:
--
--   Authentication -> Users -> Add user -> Create new user
--   Tick "Auto Confirm User" for both.
--
--   1. review@attune-relationships.com
--   2. review-partner@attune-relationships.com
--
-- Use one strong password for both and keep it in your password manager. This
-- script does not create auth users and does not set passwords. Inserting into
-- auth.users by hand skips the identity rows Supabase builds, and the result is
-- an account that exists but cannot sign in, which is the worst possible thing
-- to hand a reviewer.
--
-- Then run this. It reads those two users, wires them into a couple, and fills
-- in finished exercises. It is safe to run more than once.
--
-- ── AFTER YOU RUN IT ───────────────────────────────────────────────────────
-- Sign in as review@attune-relationships.com yourself once, in the app, and
-- check you land on results. Then put the email and password in App Store
-- Connect under App Review Information -> Sign-In Required.
--
-- Do not delete these two users. Deleting the reviewer account between
-- submissions is a common way to fail a re-review months later.
-- ============================================================================

do $$
declare
  a_id uuid;
  b_id uuid;
begin
  select id into a_id from auth.users where email = 'review@attune-relationships.com';
  select id into b_id from auth.users where email = 'review-partner@attune-relationships.com';

  if a_id is null or b_id is null then
    raise exception
      'Create both users in Authentication -> Users first, with Auto Confirm ticked. Missing: %',
      coalesce(
        nullif(concat_ws(', ',
          case when a_id is null then 'review@attune-relationships.com' end,
          case when b_id is null then 'review-partner@attune-relationships.com' end), ''),
        'none');
  end if;

  -- ── Partner A: the account the reviewer signs in as ──────────────────────
  insert into public.profiles as p (
    id, name, pronouns, partner_pronouns, partner_profile_id,
    pkg, addon_intimacy, addon_conflict, addon_reflection,
    profile_setup_complete, ex1_answers, ex2_answers
  ) values (
    a_id, 'Alex', 'they/them', 'she/her', b_id,
    'premium', true, true, true,
    true, '{"en4": 1, "en6": 4, "ex6": 2, "ex7": 5, "ex8": 3, "rs1": 1, "rs3": 4, "lv1": 2, "lv2": 5, "bd1": 3, "bd3": 1, "bd4": 4, "nd1": 2, "nd5": 5, "cf1": 3, "cf2": 1, "cf3": 4, "st1": 2, "rp2": 5, "rp3": 3, "rp6": 1, "fb2": 4, "fb5": 2, "ls1": 5, "ls3": 3}'::jsonb, '{"responsibilities": {"household__Cooking meals": "Both of us", "household__Grocery shopping and meal planning": "Alex", "household__Keeping the home tidy day-to-day": "Sam", "household__Managing home repairs and maintenance": "Both of us", "household__Managing the family calendar": "Alex", "household__Planning and organizing social events, holidays, and gatherings": "Sam", "household__Planning and booking vacations": "Both of us", "financial__Paying bills and managing day-to-day finances": "Alex", "financial__Making major financial decisions": "Sam", "financial__Managing savings and investments": "Both of us", "financial__Filing taxes": "Alex", "career__Being the primary income earner": "Sam", "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Both of us", "career__Who makes career sacrifices when the family needs it": "Alex", "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Both of us", "emotional__Tracking the emotional wellbeing of the household": "Alex", "extended_family__Planning visits with {userName}''s family": "Alex", "extended_family__Gifting for {userName}''s family": "Sam", "extended_family__Planning visits with {partnerName}''s family": "Both of us", "extended_family__Gifting for {partnerName}''s family": "Alex"}, "childhood": {}, "bothDetail": {}, "childhoodBothDetail": {}, "life": {"lq_children": "1", "lq_involve_user": "2", "lq_involve_partner": "3", "lq_family_conf": "4", "lq_location": "1", "lq_social": "2", "lq_routine": "3", "lq_faith": "4"}}'::jsonb
  )
  on conflict (id) do update set
    name = excluded.name,
    pronouns = excluded.pronouns,
    partner_pronouns = excluded.partner_pronouns,
    partner_profile_id = excluded.partner_profile_id,
    pkg = excluded.pkg,
    addon_intimacy = excluded.addon_intimacy,
    addon_conflict = excluded.addon_conflict,
    addon_reflection = excluded.addon_reflection,
    profile_setup_complete = excluded.profile_setup_complete,
    ex1_answers = excluded.ex1_answers,
    ex2_answers = excluded.ex2_answers;

  -- ── Partner B: exists so results have two sides to compare ───────────────
  insert into public.profiles as p (
    id, name, pronouns, partner_pronouns, partner_profile_id,
    pkg, addon_intimacy, addon_conflict, addon_reflection,
    profile_setup_complete, ex1_answers, ex2_answers
  ) values (
    b_id, 'Sam', 'she/her', 'they/them', a_id,
    'premium', true, true, true,
    true, '{"en4": 1, "en6": 3, "ex6": 5, "ex7": 2, "ex8": 4, "rs1": 1, "rs3": 3, "lv1": 5, "lv2": 2, "bd1": 4, "bd3": 1, "bd4": 3, "nd1": 5, "nd5": 2, "cf1": 4, "cf2": 1, "cf3": 3, "st1": 5, "rp2": 2, "rp3": 4, "rp6": 1, "fb2": 3, "fb5": 5, "ls1": 2, "ls3": 4}'::jsonb, '{"responsibilities": {"household__Cooking meals": "Alex", "household__Grocery shopping and meal planning": "Sam", "household__Keeping the home tidy day-to-day": "Both of us", "household__Managing home repairs and maintenance": "Alex", "household__Managing the family calendar": "Sam", "household__Planning and organizing social events, holidays, and gatherings": "Both of us", "household__Planning and booking vacations": "Alex", "financial__Paying bills and managing day-to-day finances": "Sam", "financial__Making major financial decisions": "Both of us", "financial__Managing savings and investments": "Alex", "financial__Filing taxes": "Sam", "career__Being the primary income earner": "Both of us", "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Alex", "career__Who makes career sacrifices when the family needs it": "Sam", "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Alex", "emotional__Tracking the emotional wellbeing of the household": "Sam", "extended_family__Planning visits with {userName}''s family": "Sam", "extended_family__Gifting for {userName}''s family": "Both of us", "extended_family__Planning visits with {partnerName}''s family": "Alex", "extended_family__Gifting for {partnerName}''s family": "Sam"}, "childhood": {}, "bothDetail": {}, "childhoodBothDetail": {}, "life": {"lq_children": "2", "lq_involve_user": "3", "lq_involve_partner": "4", "lq_family_conf": "1", "lq_location": "2", "lq_social": "3", "lq_routine": "4", "lq_faith": "1"}}'::jsonb
  )
  on conflict (id) do update set
    name = excluded.name,
    pronouns = excluded.pronouns,
    partner_pronouns = excluded.partner_pronouns,
    partner_profile_id = excluded.partner_profile_id,
    pkg = excluded.pkg,
    addon_intimacy = excluded.addon_intimacy,
    addon_conflict = excluded.addon_conflict,
    addon_reflection = excluded.addon_reflection,
    profile_setup_complete = excluded.profile_setup_complete,
    ex1_answers = excluded.ex1_answers,
    ex2_answers = excluded.ex2_answers;

  -- Never keep a research copy of a test couple.
  insert into public.privacy_preferences (owner_id, opt_out_research, source)
  values (a_id, true, 'page'), (b_id, true, 'page')
  on conflict (owner_id) do update set opt_out_research = true;

  -- Any stored results are from before this data existed. Dropping them forces
  -- a recompute on the reviewer's first open, against the answers above.
  delete from public.couple_results
   where (partner_a = least(a_id, b_id) and partner_b = greatest(a_id, b_id));

  raise notice 'Reviewer couple ready: % and %', a_id, b_id;
end $$;

-- ── Verification ───────────────────────────────────────────────────────────
-- Both rows should come back, each pointing at the other, both exercises done.
select
  u.email,
  p.name,
  p.pkg,
  (p.partner_profile_id is not null)                as partner_linked,
  (p.ex1_answers is not null and p.ex1_answers <> '{}'::jsonb) as ex1_done,
  (p.ex2_answers is not null and p.ex2_answers <> '{}'::jsonb) as ex2_done
from public.profiles p
join auth.users u on u.id = p.id
where u.email in ('review@attune-relationships.com', 'review-partner@attune-relationships.com');
