-- ============================================================================
-- 080: CONGRATSMYA — one free Starting Out package, usable once.
--
-- ── WHAT IT IS ──────────────────────────────────────────────────────────────
-- Ellie: "Build me a discount code for a free starting out package (one use)
-- called CONGRATSMYA".
--
-- Starting Out is `newlywed` in the code: see PKG_CAPS in
-- api/_lib/entitlements.js and DIGITAL_PRICES in api/_catalogue.js, where that
-- key carries the shared budget and the merging lives checklist. The package
-- is $139 digital, and this makes it nothing.
--
-- ── HOW IT BEHAVES ──────────────────────────────────────────────────────────
-- `discount_mode = 'free'` with `package_key = 'newlywed'` means the checkout
-- takes the package to zero and refuses the code against any other package: a
-- cart holding anything but Starting Out is rejected with a message naming
-- what the code unlocks. See api/create-payment-intent.js.
--
-- `max_uses = 1` is single use. The first redemption raises uses_count and
-- every attempt after it is answered "This code has already been used", both
-- at the promo field and again at purchase. Two people cannot race it: the
-- count is read and written on the same row at redemption.
--
-- It does NOT include the workbook. Starting Out does not come with one, and a
-- code that quietly added it would be a different gift from the one she asked
-- for.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once:
-- re-running resets it to these terms but leaves uses_count alone, so a code
-- that has been redeemed stays redeemed.
-- ============================================================================

insert into public.beta_codes
  (code, package_key, discount_mode, discount_value, applies_to,
   includes_workbook, max_uses, uses_count, active, note)
values
  ('CONGRATSMYA', 'newlywed', 'free', 0, 'package', false, 1, 0, true, 'Gift - Mya')
on conflict (code) do update set
  package_key       = excluded.package_key,
  discount_mode     = excluded.discount_mode,
  discount_value    = excluded.discount_value,
  applies_to        = excluded.applies_to,
  includes_workbook = excluded.includes_workbook,
  max_uses          = excluded.max_uses,
  active            = excluded.active,
  note              = excluded.note;

-- ── Verification ────────────────────────────────────────────────────────────
-- uses_count 0 and active true is a code nobody has redeemed yet.
select code, package_key, discount_mode, max_uses, uses_count, active, note
  from public.beta_codes
 where code = 'CONGRATSMYA';
