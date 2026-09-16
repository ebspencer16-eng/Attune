-- Migration 068: make the test couple able to sign in
-- ============================================================================
-- WHAT WENT WRONG
--
-- 067 created both accounts and both identities. Ellie ran it, the verification
-- printed 2, 2, 2 and the link between them, and signing in still answered
-- "something went wrong on our end."
--
-- Supabase's auth service reads eight columns on auth.users as text rather
-- than as nullable text: confirmation_token, recovery_token,
-- email_change_token_new, email_change, email_change_token_current,
-- phone_change, phone_change_token and reauthentication_token. A row made
-- through a real signup has them as empty strings. A row inserted by hand,
-- like 067's, leaves them null, and the sign-in fails inside the service
-- before it ever reaches the password. Nothing in the app can tell that apart
-- from the server being broken, which is exactly what it said.
--
-- 067 has been corrected, so a fresh project gets this right the first time.
-- This repairs the rows that already exist.
--
-- ── SCOPED TO THE TEST ACCOUNTS ───────────────────────────────────────────
-- Only the two ids 067 created. Every real account was made through signup and
-- already has empty strings here, and a blanket update over auth.users is not
-- a thing to run to fix two test rows.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

-- ── Verification ───────────────────────────────────────────────────────────
-- Both rows should come back with nulls = 0. If a column below does not exist
-- in your project, delete that line from the count and run again: the version
-- of the auth schema decides which are present, and any that is missing cannot
-- be the thing breaking the sign-in.
select
  email,
  (
    (confirmation_token is null)::int + (recovery_token is null)::int
    + (email_change_token_new is null)::int + (email_change is null)::int
    + (email_change_token_current is null)::int + (phone_change is null)::int
    + (phone_change_token is null)::int + (reauthentication_token is null)::int
  ) as nulls,
  (encrypted_password is not null) as has_password,
  (email_confirmed_at is not null) as confirmed
from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);
