-- Migration 025: clear test accounts (Ellie + Preston) for a clean repurchase
-- ============================================================================
-- One-off data reset. Removes both test accounts and every row tied to them so
-- the same two emails can repurchase with the new code and redo from scratch.
--
-- HOW TO RUN
--   1. Replace the two placeholder emails below with the real ones.
--   2. Run the whole file in the Supabase SQL Editor (one execution).
--   3. The NOTICE at the end prints how many rows were removed per table.
--
-- Uses only columns the live base schema guarantees. User ids are resolved from
-- auth.users by email (the reliable source); profiles/orders are matched off
-- that plus the emails directly. lmft_requests has no user_id in the live DB, so
-- it is matched by email and by order_id; feedback_submissions by email.
--
-- WHAT IT TOUCHES (per-user data)
--   orders               (purchase records; carries qr_token + shipping)
--   lmft_requests        (LMFT bookings; matched by email + order_id)
--   feedback_submissions (their feedback; matched by email)
--   partner_sessions     (Partner B answers; matched by invite_code + partner_b_id)
--   profiles             (account + all answers + budget/checklist/notes/intimacy)
--   auth.users           (the login; cascades any remaining profile + auth rows)
--
-- NOT TOUCHED: beta_codes (new code must survive), deleted_user_archive (test
-- reset, nothing archived), workbooks storage (SQL cannot delete Storage files;
-- clear the `workbooks` bucket manually if you want the old files gone).
--
-- After running: re-signup with the same emails, then repurchase with the new
-- code. To KEEP the logins and only wipe progress + orders, delete the final
-- `delete from auth.users` block before running.
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
  ords text[];
  n_orders int; n_lmft int; n_fb int; n_ps int; n_prof int; n_auth int;
begin
  if exists (select 1 from unnest(emails) e where e like '%email_here%') then
    raise exception 'Replace the placeholder emails at the top of this migration before running.';
  end if;

  -- Target auth user ids (auth.users.email is the reliable source).
  select coalesce(array_agg(id), '{}')
    into uids
  from auth.users
  where lower(email) = any(emails);

  -- Invite codes for their profiles (drives partner_sessions cleanup).
  select coalesce(array_agg(distinct invite_code) filter (where invite_code is not null), '{}')
    into inv
  from public.profiles
  where id = any(uids);

  -- Order numbers for their orders (drives lmft_requests.order_id cleanup).
  select coalesce(array_agg(distinct order_num) filter (where order_num is not null), '{}')
    into ords
  from public.orders
  where user_id = any(uids)
     or lower(buyer_email)   = any(emails)
     or lower(partner_email) = any(emails);

  -- orders (user_id is ON DELETE SET NULL, so delete explicitly; qr_token is here)
  with d as (
    delete from public.orders
     where user_id = any(uids)
        or lower(buyer_email)   = any(emails)
        or lower(partner_email) = any(emails)
    returning 1
  ) select count(*) into n_orders from d;

  -- lmft_requests: no user_id column in the live DB. Match by booking email and
  -- by order_id (which stores the order_num of the linked order).
  with d as (
    delete from public.lmft_requests
     where lower(email) = any(emails)
        or order_id = any(ords)
    returning 1
  ) select count(*) into n_lmft from d;

  -- feedback_submissions: no user_id column. Match by email.
  with d as (
    delete from public.feedback_submissions
     where lower(email) = any(emails)
    returning 1
  ) select count(*) into n_fb from d;

  with d as (
    delete from public.partner_sessions
     where invite_code = any(inv)
        or partner_b_id = any(uids)
    returning 1
  ) select count(*) into n_ps from d;

  with d as (
    delete from public.profiles
     where id = any(uids)
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
