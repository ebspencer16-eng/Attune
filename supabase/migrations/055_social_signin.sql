-- 055_social_signin.sql
-- ============================================================================
-- Columns that let an account created with Google or Sign in with Apple be
-- traced back to the purchase it belongs to.
--
-- ── WHY THIS IS NEEDED BEFORE SOCIAL SIGN-IN, NOT AFTER ────────────────────
-- Today the order is linked to the new user in the browser, fire and forget,
-- and the comment in src/App.jsx says so plainly: if it fails, linkage "falls
-- back to buyer_email match on later sign-in".
--
-- That fallback stops working the moment Sign in with Apple is offered. Apple
-- can return a private relay address, a1b2c3@privaterelay.appleid.com, which
-- will never match the email someone bought with. So a failed link would leave
-- a real customer with an account, no entitlements, and nothing to recover
-- them by.
--
-- purchase_email is the address the order was placed under, written at setup
-- while it is still known. It is the durable link between a person and what
-- they paid for, whatever address their provider hands us afterwards.
--
-- Run this in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.profiles
  -- The address on the order, kept even when auth.users.email is a relay
  -- address. Not the login address, and deliberately not unique: two partners
  -- can share one purchase email.
  add column if not exists purchase_email text,

  -- How this account signs in: 'email', 'google' or 'apple'. Recorded so a
  -- person who set up with one provider and later tries another can be told
  -- what happened, rather than silently getting a second empty account.
  add column if not exists auth_provider text,

  -- The order this profile was set up from. The claim is idempotent and this
  -- is what makes it so.
  add column if not exists claimed_order_num text;

comment on column public.profiles.purchase_email is
  'The email the order was placed under. Survives a provider relay address; not the login email.';
comment on column public.profiles.auth_provider is
  'email | google | apple. Which identity this account signs in with.';
comment on column public.profiles.claimed_order_num is
  'Order this profile claimed at setup, so the claim can run twice without doing anything twice.';

create index if not exists profiles_purchase_email_idx on public.profiles (lower(purchase_email));

-- ── Verification ───────────────────────────────────────────────────────────
select
  count(*) filter (where column_name = 'purchase_email')     as purchase_email,
  count(*) filter (where column_name = 'auth_provider')      as auth_provider,
  count(*) filter (where column_name = 'claimed_order_num')  as claimed_order_num
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles';
