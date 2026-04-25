-- ═══════════════════════════════════════════════════════════════════════════
-- Activate the BETA-CORE-1 fixed-price code
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL Editor to seed the new $1 Assessment
-- promo code into the beta_codes table. Idempotent — safe to re-run.
--
-- The code itself is hardcoded in BOTH the client (public/checkout.html)
-- and the server (api/create-payment-intent.js). This SQL row is what
-- the active/uses_count tracking reads from.
--
-- Location: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Project ref: xixzdigqhmzuxymzezve
--
-- Prereqs:
--   - The beta_codes table must exist. If it doesn't, run
--     supabase/beta_codes_setup.sql first.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.beta_codes (code, package_key, active)
values ('BETA-CORE-1', 'core', true)
on conflict (code) do update set active = true;

-- Verify
select code, package_key, active, uses_count, last_used_at
from public.beta_codes
where code = 'BETA-CORE-1';
