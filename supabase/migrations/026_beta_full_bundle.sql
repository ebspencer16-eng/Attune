-- Migration 026: full bundle for ATTUNE-BETA-1 / ATTUNE-BETA-2
-- ============================================================================
-- These two beta-tester codes should grant the complete experience:
--   digital Premium package  (Premium already includes the LMFT session + workbook)
--   + digital workbook
--   + Relationship Reflection exercise
--   + Build a Budget tool
--   + Starting Out (newlywed) checklist
--   + Intimacy Expectations exercise
--
-- The existing schema already carries includes_workbook / workbook_variant /
-- includes_intimacy. This migration adds the three missing grant columns
-- (reflection, budget, checklist), adds an addon_checklist column to orders so
-- the checklist grant can ride on the order like the others, and upserts the two
-- codes with the full bundle so the result is correct whether or not migration
-- 024 was run first.
--
-- Safe to run more than once (idempotent: add column if not exists + upsert).
-- ============================================================================

-- 1. New grant columns on beta_codes -----------------------------------------
alter table public.beta_codes
  add column if not exists includes_reflection boolean default false,
  add column if not exists includes_budget     boolean default false,
  add column if not exists includes_checklist  boolean default false;

-- Make sure the columns the upsert relies on exist too (no-ops if 024 ran).
alter table public.beta_codes
  add column if not exists includes_workbook  boolean default false,
  add column if not exists workbook_variant   text    default 'digital',
  add column if not exists includes_intimacy  boolean default false;

-- 2. addon_checklist on orders (parallels addon_budget) ----------------------
alter table public.orders
  add column if not exists addon_checklist boolean default false;

-- 3. Upsert the two codes with the full bundle -------------------------------
insert into public.beta_codes
  (code, package_key, includes_workbook, workbook_variant, includes_intimacy,
   includes_reflection, includes_budget, includes_checklist,
   discount_mode, discount_value, applies_to, max_uses, uses_count, active, note)
values
  ('ATTUNE-BETA-1', 'premium', true, 'digital', true, true, true, true,
   'free', 0, 'package', 1, 0, true, 'Beta tester 1 - full bundle'),
  ('ATTUNE-BETA-2', 'premium', true, 'digital', true, true, true, true,
   'free', 0, 'package', 1, 0, true, 'Beta tester 2 - full bundle')
on conflict (code) do update set
  package_key         = excluded.package_key,
  includes_workbook   = excluded.includes_workbook,
  workbook_variant    = excluded.workbook_variant,
  includes_intimacy   = excluded.includes_intimacy,
  includes_reflection = excluded.includes_reflection,
  includes_budget     = excluded.includes_budget,
  includes_checklist  = excluded.includes_checklist,
  discount_mode       = excluded.discount_mode,
  applies_to          = excluded.applies_to,
  active              = true;
