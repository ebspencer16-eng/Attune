-- 029_profiles_entitlements.sql
-- Authoritative, server-computed entitlements stored on the profile. This is
-- the single source of truth the client reads, instead of deriving access from
-- raw order rows on the client. The writer (writeEntitlements in
-- api/_lib/entitlements.js) recomputes the union of all orders + profile
-- columns + comp grant and writes the blob here after any entitlement-changing
-- event (order created/updated, comp toggled, invitee linked, QR claimed).
--
-- Shape of profiles.entitlements:
--   {
--     "pkg": "premium",
--     "addonReflection": true, "addonBudget": true, "addonChecklist": true,
--     "addonLmft": true, "addonIntimacy": false, "addonWorkbook": "digital",
--     "isPhysical": false, "orderNum": "...", "comp": false, "hasGrant": true,
--     "computedAt": "2026-07-08T..."
--   }
--
-- Run in the Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS entitlements jsonb,
  ADD COLUMN IF NOT EXISTS entitlements_updated_at timestamptz;

COMMENT ON COLUMN profiles.entitlements IS
  'Server-computed union of all orders + profile columns + comp grant. Single source of truth for feature access. Written by writeEntitlements().';
