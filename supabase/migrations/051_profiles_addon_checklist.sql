-- Migration 051: addon_checklist on profiles
-- ============================================================================
-- /api/home selects addon_checklist from profiles. Migration 026 added that
-- column to ORDERS only, so it has never existed on profiles.
--
-- PostgREST rejects the entire select when one column is unknown, so the
-- profile lookup returned nothing and the endpoint answered 'profile not
-- found' for accounts whose profile was right there. That is the 404 the app
-- has been showing.
--
-- The other three add-on flags (reflection, budget, intimacy) are all on
-- profiles already. Checklist was simply missed, and nothing noticed because
-- the website reads entitlements from orders rather than from this column.
--
-- A second, quieter consequence: partner-sync writes addon_checklist onto the
-- invitee's profile when inheriting entitlements from Partner A. That write
-- has been failing silently for every invitee, which is its own bug and is
-- fixed by this column existing.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists addon_checklist boolean not null default false;

comment on column public.profiles.addon_checklist is
  'Mirrors orders.addon_checklist onto the profile, as the other three add-on flags already do. Read by /api/home and written by partner-sync when an invitee inherits entitlements.';

-- ── Backfill ───────────────────────────────────────────────────────────────
-- Anyone whose order includes the checklist should have the flag on their
-- profile, matching how the other add-ons behave. Without this, existing
-- customers who bought Starting Out would show the column as false.
-- Matched on user_id, and on buyer_email for older orders placed before the
-- account existed. The column is buyer_email, not email: orders records who
-- paid, which is not always who ends up owning the profile.
update public.profiles p
   set addon_checklist = true
  from public.orders o
 where o.addon_checklist = true
   and p.addon_checklist = false
   and (
     o.user_id = p.id
     -- The email branch requires a non-empty address on both sides, or two
     -- nulls would match every profile against every order.
     or (
       coalesce(o.buyer_email, '') <> ''
       and lower(o.buyer_email) = lower((select u.email from auth.users u where u.id = p.id))
     )
   );

-- ── Verification ───────────────────────────────────────────────────────────
-- Expect column_exists = 1. flagged is how many profiles the backfill set.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'addon_checklist')            as column_exists,
  (select count(*) from public.profiles
    where addon_checklist)                            as flagged;
