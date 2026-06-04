-- 016_partner_b_addons.sql
-- Persist add-on entitlements on the profiles table.
--
-- Add-ons (Reflection, Budget, LMFT, Workbook) are bought by the purchaser and
-- live only on the buyer's order row. The invited partner (Partner B) has no
-- order of their own, so without these columns their add-on entitlements can't
-- survive a cross-device reload. partner-sync copies the buyer's add-ons here at
-- link time so Partner B inherits the same experience everywhere.
--
-- Safe to run multiple times (IF NOT EXISTS). No data backfill required: existing
-- rows default to no add-ons, which matches prior behavior.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS addon_reflection boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS addon_budget     boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS addon_lmft       boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS addon_workbook   text    DEFAULT '';
