-- Migration 025: clear test accounts (Ellie + Preston) for a clean repurchase
-- ============================================================================
-- One-off data reset. Removes both test accounts and every row tied to them so
-- the same two emails can repurchase with the new code and redo the experience
-- from scratch.
--
-- HOW TO RUN
--   1. Replace the two placeholder emails below with the real ones.
--   2. Run the whole file in the Supabase SQL Editor (one execution).
--   3. The NOTICE at the end prints how many rows were removed per table.
--
-- WHAT IT TOUCHES (per-user data, in FK-safe order)
--   orders               (purchase records; carries qr_token + shipping)
--   lmft_requests        (LMFT bookings)
--   feedback_submissions (their feedback)
--   partner_sessions     (Partner B answers, keyed by invite_code)
--   profiles             (account + all answers + budget/checklist/notes/intimacy)
--   auth.users           (the login; cascades any remaining profile + auth rows)
--
-- NOT TOUCHED
--   beta_codes           (the new code must survive so they can repurchase)
--   deleted_user_archive (this is a test reset, not a research deletion; nothing archived)
--   workbooks storage    (SQL cannot delete Storage files; old workbook files under
--                         the deleted order_nums are orphaned and harmless. Clear the
--                         `workbooks` bucket manually if you want them gone.)
--
-- After running: re-signup with the same emails, then repurchase with the new code.
-- If you would rather KEEP the logins and only wipe progress + orders, delete the
-- final `delete from auth.users` block before running.
-- ============================================================================

do $$
declare
  -- ▼▼▼ REPLACE THESE TWO EMAILS, then run ▼▼▼
  emails text[] := array[
    lower('ELLIE_EMAIL_HERE'),
    lower('PRESTON_EMAIL_HERE')
  ];
  -- ▲▲▲ REPLACE THESE TWO EMAILS, then run ▲▲▲

  uids uuid[];
  inv  text[];
  n_orders int; n_lmft int; n_fb int; n_ps int; n_prof int; n_auth int;
begin
  -- Guard: refuse to run while the placeholders are still in place.
  if exists (select 1 from unnest(emails) e where e like '%email_here%') then
    raise exception 'Replace the placeholder emails at the top of this migration before running.';
  end if;

  -- Resolve target user ids (from profiles and auth.users) and invite codes
  -- BEFORE deleting anything, so later steps still have them.
  select coalesce(array_agg(distinct id) filter (where id is not null), '{}')
    into uids
  from (
    select id from public.profiles
      where lower(email) = any(emails) or lower(partner_email) = any(emails)
    union
    select id from auth.users where lower(email) = any(emails)
  ) t;

  select coalesce(array_agg(distinct invite_code) filter (where invite_code is not null), '{}')
    into inv
  from public.profiles
  where lower(email) = any(emails) or id = any(uids);

  -- orders: user_id is ON DELETE SET NULL, so delete explicitly. Matches by
  -- linked user, buyer email, or partner email. (qr_token lives on this row.)
  with d as (
    delete from public.orders
     where user_id = any(uids)
        or lower(buyer_email)   = any(emails)
        or lower(partner_email) = any(emails)
    returning 1
  ) select count(*) into n_orders from d;

  with d as (
    delete from public.lmft_requests
     where user_id = any(uids) or lower(email) = any(emails)
    returning 1
  ) select count(*) into n_lmft from d;

  with d as (
    delete from public.feedback_submissions
     where user_id = any(uids) or lower(email) = any(emails)
    returning 1
  ) select count(*) into n_fb from d;

  -- partner_sessions: keyed by the inviter's invite_code; also catch rows where
  -- one of these users was Partner B.
  with d as (
    delete from public.partner_sessions
     where invite_code = any(inv) or partner_b_id = any(uids)
    returning 1
  ) select count(*) into n_ps from d;

  -- profiles: explicit delete handles any profile whose email matches but whose
  -- id is not in auth.users. partner_profile_id is ON DELETE SET NULL, so the
  -- partner link drops on its own.
  with d as (
    delete from public.profiles
     where id = any(uids)
        or lower(email)         = any(emails)
        or lower(partner_email) = any(emails)
    returning 1
  ) select count(*) into n_prof from d;

  -- auth.users: removes the login and cascades auth.identities / sessions /
  -- refresh_tokens and any remaining profile row. Delete this block to keep logins.
  with d as (
    delete from auth.users
     where id = any(uids) or lower(email) = any(emails)
    returning 1
  ) select count(*) into n_auth from d;

  raise notice 'Cleared % : orders=%, lmft=%, feedback=%, partner_sessions=%, profiles=%, auth_users=%',
    emails, n_orders, n_lmft, n_fb, n_ps, n_prof, n_auth;
end $$;
