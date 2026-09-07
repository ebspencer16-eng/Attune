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
-- Then run this. It is safe to run more than once, and re-running repairs a
-- couple left in a bad state by an earlier version of this script.
--
-- ── WHY CORE AND NOT PREMIUM ───────────────────────────────────────────────
-- The couple is on the core package with no add-ons, so they own exactly the
-- two exercises this script fills in: Communication and Expectations.
--
-- A first version granted premium and every add-on. That turns on five
-- exercises while only two were filled, so the dashboard showed three pending
-- for both partners and results stayed locked. Results wait on the intimacy
-- add-on when a couple owns it, and that couple owned it without ever having
-- answered it.
--
-- Granting only what is filled is what makes results open. If a reviewer should
-- see the add-on sections one day, fill ex3_answers, intimacy_data and
-- conflict_data with real answers here rather than granting empty add-ons.
--
-- ── WHY ENTITLEMENTS ARE CLEARED ───────────────────────────────────────────
-- Entitlements are cumulative by design: mergeEntitlementsGrantOnly ORs
-- capabilities so a partial or failed resync can only ever add access, never
-- strip it. For a paying customer that is exactly right.
--
-- It also means downgrading this couple from premium to core in the profile
-- does nothing on its own. Signing in once while they were premium wrote
-- premium entitlements to profiles.entitlements, and every sync after that
-- merged them back on top. The dashboard kept showing five exercises.
--
-- So the column is set to null here, letting it recompute from the package.
--
-- THE BROWSER KEEPS A COPY TOO. Local grants merge the same way, so after
-- running this, sign out fully before signing back in as the reviewer. Signing
-- out clears the stored grants; reloading the page does not.
--
-- ── WHY THE LINKING IS A SEPARATE STEP ─────────────────────────────────────
-- profiles.partner_profile_id is a foreign key to profiles.id, so neither row
-- can point at the other until both exist. A first version set the link inside
-- the first insert and failed with profiles_partner_profile_id_fkey.
--
-- ── AFTER YOU RUN IT ───────────────────────────────────────────────────────
-- Sign in as review@attune-relationships.com yourself once and check you land
-- on results. Then put the email and password in App Store Connect under
-- App Review Information -> Sign-In Required.
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

  -- ── 1. Both profiles, unlinked ───────────────────────────────────────────
  -- partner_profile_id is deliberately absent here. See the note above.
  -- The add-on flags and the three add-on exercise columns are written
  -- explicitly rather than left alone, so re-running repairs a row an earlier
  -- version of this script wrote as premium.

  insert into public.profiles as p (
    id, name, pronouns, partner_pronouns,
    partner_name, partner_email, partner_joined, entitlements,
    pkg, addon_intimacy, addon_conflict, addon_reflection, addon_budget, addon_checklist,
    profile_setup_complete, ex1_answers, ex2_answers,
    ex3_answers, intimacy_data, conflict_data
  ) values (
    a_id, 'Alex', 'they/them', 'she/her',
    'Sam', 'review-partner@attune-relationships.com', true, null,
    'core', false, false, false, false, false,
    true, '{"en4": 1, "en6": 4, "ex6": 2, "ex7": 5, "ex8": 3, "rs1": 1, "rs3": 4, "lv1": 2, "lv2": 5, "bd1": 3, "bd3": 1, "bd4": 4, "nd1": 2, "nd5": 5, "cf1": 3, "cf2": 1, "cf3": 4, "st1": 2, "rp2": 5, "rp3": 3, "rp6": 1, "fb2": 4, "fb5": 2, "ls1": 5, "ls3": 3}'::jsonb, '{"responsibilities": {"household__Cooking meals": "Both of us", "household__Grocery shopping and meal planning": "Alex", "household__Keeping the home tidy day-to-day": "Sam", "household__Managing home repairs and maintenance": "Both of us", "household__Managing the family calendar": "Alex", "household__Planning and organizing social events, holidays, and gatherings": "Sam", "household__Planning and booking vacations": "Both of us", "financial__Paying bills and managing day-to-day finances": "Alex", "financial__Making major financial decisions": "Sam", "financial__Managing savings and investments": "Both of us", "financial__Filing taxes": "Alex", "career__Being the primary income earner": "Sam", "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Both of us", "career__Who makes career sacrifices when the family needs it": "Alex", "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Both of us", "emotional__Tracking the emotional wellbeing of the household": "Alex", "extended_family__Planning visits with {userName}''s family": "Alex", "extended_family__Gifting for {userName}''s family": "Sam", "extended_family__Planning visits with {partnerName}''s family": "Both of us", "extended_family__Gifting for {partnerName}''s family": "Alex"}, "childhood": {}, "bothDetail": {}, "childhoodBothDetail": {}, "life": {"lq_children": "1", "lq_involve_user": "2", "lq_involve_partner": "3", "lq_family_conf": "4", "lq_location": "1", "lq_social": "2", "lq_routine": "3", "lq_faith": "4"}}'::jsonb,
    null, null, null
  )
  on conflict (id) do update set
    name = excluded.name,
    pronouns = excluded.pronouns,
    partner_pronouns = excluded.partner_pronouns,
    partner_name = excluded.partner_name,
    partner_email = excluded.partner_email,
    partner_joined = excluded.partner_joined,
    -- Cleared, not merged. Entitlements are stored grant-only on purpose, so a
    -- resync can never take access away. That is right for a customer and
    -- wrong here: signing in once while this couple was premium wrote premium
    -- entitlements, and every later sync ORed them back on top of core.
    entitlements = null,
    pkg = excluded.pkg,
    addon_intimacy = excluded.addon_intimacy,
    addon_conflict = excluded.addon_conflict,
    addon_reflection = excluded.addon_reflection,
    addon_budget = excluded.addon_budget,
    addon_checklist = excluded.addon_checklist,
    profile_setup_complete = excluded.profile_setup_complete,
    ex1_answers = excluded.ex1_answers,
    ex2_answers = excluded.ex2_answers,
    ex3_answers = excluded.ex3_answers,
    intimacy_data = excluded.intimacy_data,
    conflict_data = excluded.conflict_data;

  insert into public.profiles as p (
    id, name, pronouns, partner_pronouns,
    partner_name, partner_email, partner_joined, entitlements,
    pkg, addon_intimacy, addon_conflict, addon_reflection, addon_budget, addon_checklist,
    profile_setup_complete, ex1_answers, ex2_answers,
    ex3_answers, intimacy_data, conflict_data
  ) values (
    b_id, 'Sam', 'she/her', 'they/them',
    'Alex', 'review@attune-relationships.com', true, null,
    'core', false, false, false, false, false,
    true, '{"en4": 1, "en6": 3, "ex6": 5, "ex7": 2, "ex8": 4, "rs1": 1, "rs3": 3, "lv1": 5, "lv2": 2, "bd1": 4, "bd3": 1, "bd4": 3, "nd1": 5, "nd5": 2, "cf1": 4, "cf2": 1, "cf3": 3, "st1": 5, "rp2": 2, "rp3": 4, "rp6": 1, "fb2": 3, "fb5": 5, "ls1": 2, "ls3": 4}'::jsonb, '{"responsibilities": {"household__Cooking meals": "Alex", "household__Grocery shopping and meal planning": "Sam", "household__Keeping the home tidy day-to-day": "Both of us", "household__Managing home repairs and maintenance": "Alex", "household__Managing the family calendar": "Sam", "household__Planning and organizing social events, holidays, and gatherings": "Both of us", "household__Planning and booking vacations": "Alex", "financial__Paying bills and managing day-to-day finances": "Sam", "financial__Making major financial decisions": "Both of us", "financial__Managing savings and investments": "Alex", "financial__Filing taxes": "Sam", "career__Being the primary income earner": "Both of us", "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Alex", "career__Who makes career sacrifices when the family needs it": "Sam", "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Alex", "emotional__Tracking the emotional wellbeing of the household": "Sam", "extended_family__Planning visits with {userName}''s family": "Sam", "extended_family__Gifting for {userName}''s family": "Both of us", "extended_family__Planning visits with {partnerName}''s family": "Alex", "extended_family__Gifting for {partnerName}''s family": "Sam"}, "childhood": {}, "bothDetail": {}, "childhoodBothDetail": {}, "life": {"lq_children": "2", "lq_involve_user": "3", "lq_involve_partner": "4", "lq_family_conf": "1", "lq_location": "2", "lq_social": "3", "lq_routine": "4", "lq_faith": "1"}}'::jsonb,
    null, null, null
  )
  on conflict (id) do update set
    name = excluded.name,
    pronouns = excluded.pronouns,
    partner_pronouns = excluded.partner_pronouns,
    partner_name = excluded.partner_name,
    partner_email = excluded.partner_email,
    partner_joined = excluded.partner_joined,
    -- Cleared, not merged. Entitlements are stored grant-only on purpose, so a
    -- resync can never take access away. That is right for a customer and
    -- wrong here: signing in once while this couple was premium wrote premium
    -- entitlements, and every later sync ORed them back on top of core.
    entitlements = null,
    pkg = excluded.pkg,
    addon_intimacy = excluded.addon_intimacy,
    addon_conflict = excluded.addon_conflict,
    addon_reflection = excluded.addon_reflection,
    addon_budget = excluded.addon_budget,
    addon_checklist = excluded.addon_checklist,
    profile_setup_complete = excluded.profile_setup_complete,
    ex1_answers = excluded.ex1_answers,
    ex2_answers = excluded.ex2_answers,
    ex3_answers = excluded.ex3_answers,
    intimacy_data = excluded.intimacy_data,
    conflict_data = excluded.conflict_data;

  -- ── 2. Now that both rows exist, point them at each other ────────────────
  update public.profiles set partner_profile_id = b_id where id = a_id;
  update public.profiles set partner_profile_id = a_id where id = b_id;

  -- ── 3. Never keep a research copy of a test couple ───────────────────────
  -- Skipped without complaint if migration 053 has not been run yet.
  begin
    insert into public.privacy_preferences (owner_id, opt_out_research, source)
    values (a_id, true, 'page'), (b_id, true, 'page')
    on conflict (owner_id) do update set opt_out_research = true;
  exception when undefined_table then
    raise notice 'privacy_preferences not found, skipping. Run 053 when you can.';
  end;

  -- ── 4. Drop any stored results so they recompute from the answers above ──
  begin
    delete from public.couple_results
     where partner_a = least(a_id, b_id) and partner_b = greatest(a_id, b_id);
  exception when undefined_table then
    raise notice 'couple_results not found, skipping.';
  end;

  raise notice 'Reviewer couple ready: Alex % and Sam %', a_id, b_id;
end $$;

-- ── Verification ───────────────────────────────────────────────────────────
-- Expect two rows. Each linked to the other, core package, both exercises done,
-- and no add-ons owned. owns_addons must read false, or results stay locked.
select
  u.email,
  p.name,
  p.pkg,
  (p.partner_profile_id is not null)                            as partner_linked,
  (p.ex1_answers is not null and p.ex1_answers <> '{}'::jsonb)  as ex1_done,
  (p.ex2_answers is not null and p.ex2_answers <> '{}'::jsonb)  as ex2_done,
  p.partner_name,
  (p.entitlements is null)                                      as entitlements_cleared,
  (coalesce(p.addon_intimacy,false) or coalesce(p.addon_conflict,false)
     or coalesce(p.addon_reflection,false))                     as owns_addons
from public.profiles p
join auth.users u on u.id = p.id
where u.email in ('review@attune-relationships.com', 'review-partner@attune-relationships.com')
order by u.email;
