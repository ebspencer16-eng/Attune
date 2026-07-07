-- 028_profiles_is_comp.sql
-- Comp accounts: founder, staff, and some beta testers get full product
-- access without depending on an order row. The client entitlement logic
-- (computeEntitlements in App.jsx) short-circuits on is_comp and grants every
-- package capability plus all add-ons. This exists so that access can never be
-- silently stripped by order-row state (a founder with no matching paid order,
-- a test purchase overwriting a real one, etc.).
--
-- Run in the Supabase SQL Editor. Then set is_comp = true on the accounts that
-- should have full access, e.g.:
--   update profiles set is_comp = true where email = 'you@attune-relationships.com';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_comp boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_comp IS
  'Comp account: grants full product access (all packages + add-ons) independent of any order row. Set manually for founder/staff/test accounts.';
