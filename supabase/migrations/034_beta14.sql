-- Migration 034: ATTUNE-BETA-14 — Foundation Assessment + digital workbook, fully comped.
-- Assessment (core package) + workbook add-on at $0. No other add-ons.
-- Safe to run more than once (idempotent upsert).
insert into public.beta_codes
  (code, package_key, includes_workbook, workbook_variant, includes_intimacy,
   includes_reflection, includes_budget, includes_checklist,
   discount_mode, discount_value, applies_to, max_uses, uses_count, active, note)
values
  ('ATTUNE-BETA-14', 'core', true, 'digital', false,
   false, false, false,
   'free', 0, 'package', 1, 0, true, 'Beta tester 14 - assessment + workbook, comped')
on conflict (code) do update set
  package_key       = excluded.package_key,
  includes_workbook = excluded.includes_workbook,
  workbook_variant  = excluded.workbook_variant,
  includes_intimacy = excluded.includes_intimacy,
  includes_reflection = excluded.includes_reflection,
  includes_budget   = excluded.includes_budget,
  includes_checklist = excluded.includes_checklist,
  discount_mode     = excluded.discount_mode,
  discount_value    = excluded.discount_value,
  applies_to        = excluded.applies_to,
  active            = true;
