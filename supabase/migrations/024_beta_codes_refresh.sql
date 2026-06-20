-- 024 — Refresh the beta tester codes.
--
-- One migration that:
--   1. Adds an `includes_intimacy` grant column (parallels includes_workbook).
--   2. Deactivates the existing ATTUNE-BETA-* series (the old zero-padded
--      ATTUNE-BETA-01..13 batch).
--   3. Seeds a fresh, unpadded batch ATTUNE-BETA-1..13.
--
-- Grants:
--   ATTUNE-BETA-1, 2  -> digital Premium + digital Workbook + Intimacy add-on.
--                        (Premium already includes Relationship Reflection,
--                         Budget, and the LMFT session as package features, so
--                         "rel relf" needs no separate flag.)
--   ATTUNE-BETA-3..13 -> digital Core + digital Workbook.
--
-- All codes are free, single-use (one couple each). Re-running this migration
-- resets the 13 codes to a fresh, unused state.
--
-- NOTE: the Intimacy grant on codes 1 and 2 requires the matching redemption
-- change in api/create-payment-intent.js (free-bundle `includes_intimacy`,
-- shipped alongside this migration). Without it the column is inert.

-- 1. Grant column ----------------------------------------------------------
alter table public.beta_codes
  add column if not exists includes_intimacy boolean default false;

-- 2. Deactivate the existing ATTUNE-BETA-* codes ---------------------------
-- Scoped to the ATTUNE-BETA-* series (the distributed beta tester codes).
-- Named test codes (BETA-CORE-1, etc.) are intentionally left untouched.
update public.beta_codes
   set active = false
 where code like 'ATTUNE-BETA-%';

-- 3. Seed the fresh batch --------------------------------------------------
insert into public.beta_codes
  (code, package_key, includes_workbook, workbook_variant, includes_intimacy,
   discount_mode, discount_value, applies_to, max_uses, uses_count, active, note)
values
  ('ATTUNE-BETA-1',  'premium', true, 'digital', true,  'free', 0, 'package', 1, 0, true, 'Beta tester 1'),
  ('ATTUNE-BETA-2',  'premium', true, 'digital', true,  'free', 0, 'package', 1, 0, true, 'Beta tester 2'),
  ('ATTUNE-BETA-3',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 3'),
  ('ATTUNE-BETA-4',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 4'),
  ('ATTUNE-BETA-5',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 5'),
  ('ATTUNE-BETA-6',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 6'),
  ('ATTUNE-BETA-7',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 7'),
  ('ATTUNE-BETA-8',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 8'),
  ('ATTUNE-BETA-9',  'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 9'),
  ('ATTUNE-BETA-10', 'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 10'),
  ('ATTUNE-BETA-11', 'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 11'),
  ('ATTUNE-BETA-12', 'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 12'),
  ('ATTUNE-BETA-13', 'core',    true, 'digital', false, 'free', 0, 'package', 1, 0, true, 'Beta tester 13')
on conflict (code) do update set
  package_key       = excluded.package_key,
  includes_workbook = excluded.includes_workbook,
  workbook_variant  = excluded.workbook_variant,
  includes_intimacy = excluded.includes_intimacy,
  discount_mode     = excluded.discount_mode,
  discount_value    = excluded.discount_value,
  applies_to        = excluded.applies_to,
  max_uses          = excluded.max_uses,
  uses_count        = 0,
  active            = true,
  note              = excluded.note;

-- Verify:
-- select code, package_key, includes_workbook, workbook_variant,
--        includes_intimacy, max_uses, uses_count, active
--   from public.beta_codes
--  where code like 'ATTUNE-BETA-%'
--  order by length(code), code;
