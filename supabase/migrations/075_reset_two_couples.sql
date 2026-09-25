-- Migration 075: reset Aspen & Ryan and Lanae & Spencer to the start line.
-- ============================================================================
-- Ellie: "Please reset Aspen and Ryan as well as Lanae and Spencer's exercise
-- responses, and grant all 4 accounts each of the 5 exercises and each of the 3
-- additional resources. These couples are going to redo their experience, with
-- one partner on the site and one partner on the app. When you reset Carolina
-- and Aaron's and Preston and my accounts, there were errors and roadblocks as
-- we went to complete everything and view results. Please ensure that this
-- change is done cleanly."
--
-- ── WHY THE EARLIER RESETS LEFT ROADBLOCKS ──────────────────────────────────
-- They cleared the answers and nothing else. Four things survive a reset that
-- only empties ex*_answers, and every one of them shows up later as something
-- that looks like a bug:
--
--   1. couple_results. Results are FROZEN on purpose: once a couple's row
--      exists, /api/results serves it back exactly as written and never
--      recomputes. So a couple with cleared answers and a surviving results row
--      is shown last month's results, computed from answers that no longer
--      exist, and nothing in the product can tell that is wrong. This is the
--      big one.
--   2. ex*_completed and ex*_completed_at. The website reads these, so a
--      profile with no answers and completed = true is a couple the product
--      believes has finished. That is "we could not complete everything".
--   3. couple_type, results_email_sent_at, workbook_url and the workbook
--      status. A stale type is drawn on the home screen; a sent-at means the
--      results email never fires again; a workbook_url points at a PDF built
--      from the old answers.
--   4. Notifications already raised. "Your results are ready" sitting at the
--      top of the home screen, pointing at results that no longer exist.
--
-- All four are handled below, each with a comment saying which.
--
-- ── GRANTS: is_comp, NOT SIX COLUMNS ────────────────────────────────────────
-- computeEntitlements in api/_lib/entitlements.js short-circuits on is_comp
-- and returns premium plus every add-on plus the digital workbook, with no
-- dependence on an order row. That is exactly what Ellie asked for and it is
-- one flag rather than six that have to agree with each other and with the
-- entitlements blob.
--
-- The blob is written here too, in the shape that function returns, so the app
-- has full access on its very next read rather than after a resync. If the two
-- ever disagreed, the blob wins for the app and the columns win for the
-- website, which is the kind of split that produces "I own this on my phone
-- and not on my laptop".
--
-- ── WHO THIS TOUCHES, AND HOW IT REFUSES TO GUESS ───────────────────────────
-- Matched on the first name in profiles.name, because I do not have these four
-- email addresses. It raises rather than proceeding if it does not find exactly
-- four, and raises again if they are not two linked couples. It also prints
-- every row it matched before changing anything, so the SQL editor's Messages
-- pane shows you who is about to be reset.
--
-- If a name is ambiguous or stored differently, put the four email addresses in
-- `by_email` below instead and leave `by_name` empty. The rest works unchanged.
--
-- ── AFTER RUNNING IT ────────────────────────────────────────────────────────
-- Both partners in each couple should sign out and back in, on both surfaces.
-- The client caches answers, and although the app clears them on a successful
-- empty read, a clean sign-in removes the question entirely.
--
-- The three checks at the foot of this file confirm it worked. Run them.
--
-- Safe to run twice: everything is an update to a fixed value or a delete.
-- ============================================================================

do $$
declare
  -- Match on these first names. Case-insensitive, first word of profiles.name.
  by_name  constant text[] := array['aspen', 'ryan', 'lanae', 'spencer'];
  -- Or put four email addresses here instead and set by_name to '{}'.
  by_email constant text[] := array[]::text[];

  uids uuid[];
  n int;
  couples int;
  r record;
  comp_blob jsonb;
begin
  if coalesce(array_length(by_email, 1), 0) > 0 then
    select coalesce(array_agg(p.id), '{}') into uids
      from public.profiles p
     where lower(p.email) = any(select lower(e) from unnest(by_email) e);
  else
    select coalesce(array_agg(p.id), '{}') into uids
      from public.profiles p
     where lower(split_part(coalesce(p.name, ''), ' ', 1)) = any(by_name);
  end if;

  -- Say who, before touching anything. Visible in the Messages pane.
  for r in
    select p.id, p.email, p.name, p.pkg, p.is_comp, p.partner_profile_id
      from public.profiles p where p.id = any(uids) order by p.name
  loop
    raise notice 'matched: % <%>  pkg=% comp=% partner=%', r.name, r.email, r.pkg, r.is_comp, r.partner_profile_id;
  end loop;

  n := coalesce(array_length(uids, 1), 0);
  if n <> 4 then
    raise exception
      'Expected 4 profiles, found %. Nothing has been changed. Either a name is stored differently, or two people share a first name. Put the four email addresses in by_email at the top of this file and run it again.', n;
  end if;

  -- Two couples, not four strangers. Every one of the four must be partnered
  -- with another one of the four, or the reset is being pointed at the wrong
  -- people and would leave a partner behind with results and no answers.
  select count(*) into couples
    from public.profiles p
   where p.id = any(uids)
     and p.partner_profile_id = any(uids);
  if couples <> 4 then
    raise exception
      'Expected all 4 to be linked to each other as 2 couples; % of 4 are. Nothing has been changed.', couples;
  end if;

  -- ── 1. THE ANSWERS, AND EVERY CLAIM THAT THEY EXIST ──────────────────────
  update public.profiles set
    ex1_answers = null, ex1_progress = null,
    ex1_completed = false, ex1_completed_at = null, ex1_prior_completed_at = null,
    ex2_answers = null, ex2_progress = null,
    ex2_completed = false, ex2_completed_at = null, ex2_prior_completed_at = null,
    ex3_answers = null, ex3_progress = null,
    ex3_completed = false, ex3_completed_at = null, ex3_prior_completed_at = null,
    intimacy_data = null,
    conflict_data = null,
    -- Reason 2 and 3 above: what the product believes about them.
    couple_type = null,
    results_email_sent_at = null,
    results_last_opened_at = null,
    partner_nudged_at = null,
    -- The workbook, which is built from answers that are about to be gone.
    workbook_url = null, workbook_status = null, workbook_generated_at = null
  where id = any(uids);

  get diagnostics n = row_count;
  if n <> 4 then
    raise exception 'Expected to reset 4 profiles, reset %.', n;
  end if;

  -- ── 2. THE GRANTS ────────────────────────────────────────────────────────
  -- is_comp is the whole grant. The columns are set to match so that anything
  -- reading them directly agrees, and the blob is written so the app does not
  -- need a resync to see it.
  comp_blob := jsonb_build_object(
    'comp', true,
    'hasGrant', true,
    'pkg', 'premium',
    'orderNum', '',
    'isPhysical', false,
    'addonReflection', true,
    'addonBudget', true,
    'addonChecklist', true,
    'addonIntimacy', true,
    'addonConflict', true,
    'addonWorkbook', 'digital',
    'computedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  update public.profiles set
    is_comp = true,
    pkg = 'premium',
    addon_reflection = true,
    addon_intimacy = true,
    addon_conflict = true,
    addon_budget = true,
    addon_checklist = true,
    addon_workbook = 'digital',
    entitlements = comp_blob,
    entitlements_updated_at = now()
  where id = any(uids);

  -- ── 3. THE FROZEN RESULTS ────────────────────────────────────────────────
  -- Reason 1, and the one that made the last two resets look broken.
  delete from public.couple_results
   where partner_a = any(uids) or partner_b = any(uids);

  begin
    execute 'delete from public.couple_results_history where partner_a = any($1) or partner_b = any($1)'
      using uids;
  exception when undefined_table or undefined_column then
    raise notice 'couple_results_history not present; skipped.';
  end;

  -- ── 4. ALERTS ABOUT RESULTS THAT NO LONGER EXIST ─────────────────────────
  begin
    execute 'delete from public.notifications where owner_id = any($1)' using uids;
  exception when undefined_table or undefined_column then
    raise notice 'notifications not present; skipped.';
  end;

  -- ── 5. THE INVITED PARTNER'S OWN COPY ────────────────────────────────────
  -- partner_sessions is keyed by invite_code and keeps its own answers, which
  -- the admin explorer and the beta digest read. Guarded: a missing table or
  -- column skips rather than aborting the whole reset.
  begin
    execute $q$
      update public.partner_sessions set
        ex1_answers = null, ex2_answers = null
      where invite_code in (
        select invite_code from public.profiles
         where id = any($1) and invite_code is not null
      )
    $q$ using uids;
  exception when undefined_table or undefined_column then
    raise notice 'partner_sessions not present; skipped.';
  end;

  raise notice 'Done. 4 profiles reset and granted, results and alerts cleared.';
end $$;

-- ============================================================================
-- CHECK IT WORKED. Run these three and read the answers.
--
-- 1. Four rows, every answer column null, every completed false, is_comp true.
--
--   select name, email, is_comp, pkg,
--          ex1_answers is null as ex1_clear, ex2_answers is null as ex2_clear,
--          ex3_answers is null as ex3_clear, intimacy_data is null as int_clear,
--          conflict_data is null as con_clear,
--          ex1_completed, ex2_completed, ex3_completed, couple_type
--     from public.profiles
--    where lower(split_part(coalesce(name,''),' ',1))
--          in ('aspen','ryan','lanae','spencer')
--    order by name;
--
-- 2. No frozen results left for any of them. Expect zero rows.
--
--   select cr.* from public.couple_results cr
--     join public.profiles p on p.id in (cr.partner_a, cr.partner_b)
--    where lower(split_part(coalesce(p.name,''),' ',1))
--          in ('aspen','ryan','lanae','spencer');
--
-- 3. Each of the four is still linked to their partner. Expect four rows, each
--    with a partner name from the same list.
--
--   select p.name, q.name as partner
--     from public.profiles p
--     join public.profiles q on q.id = p.partner_profile_id
--    where lower(split_part(coalesce(p.name,''),' ',1))
--          in ('aspen','ryan','lanae','spencer')
--    order by p.name;
-- ============================================================================
