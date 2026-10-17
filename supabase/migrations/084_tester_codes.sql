-- Migration 084: two fresh full-bundle beta codes for design testing.
--
-- Every existing code is single use (max_uses 1), so a tester needs one that
-- has not been redeemed. These two unlock the complete experience in one go:
--
--   premium package        -> Communication, Expectations, Relationship
--                             Reflection and Conflict Patterns
--   + includes_intimacy    -> Physical Intimacy Expectations, the fifth
--   + includes_workbook    -> the personalised workbook
--   + budget and checklist -> both tools
--
-- Conflict Patterns has no includes_ column because no code can bundle it:
-- the premium package already carries it, which is why these are premium.
--
-- Two of them, because results only open once BOTH partners have finished,
-- so a design tester needs an account on each side of the couple.
--
-- Safe to run more than once (idempotent upsert).
insert into public.beta_codes
  (code, package_key, includes_workbook, workbook_variant, includes_intimacy,
   includes_reflection, includes_budget, includes_checklist,
   discount_mode, discount_value, applies_to, max_uses, uses_count, active, note)
values
  ('ATTUNE-DESIGN-1', 'premium', true, 'digital', true,
   true, true, true,
   'free', 0, 'package', 1, 0, true, 'Design tester - full bundle'),
  ('ATTUNE-DESIGN-2', 'premium', true, 'digital', true,
   true, true, true,
   'free', 0, 'package', 1, 0, true, 'Design tester - full bundle, partner side')
on conflict (code) do update set
  package_key         = excluded.package_key,
  includes_workbook   = excluded.includes_workbook,
  workbook_variant    = excluded.workbook_variant,
  includes_intimacy   = excluded.includes_intimacy,
  includes_reflection = excluded.includes_reflection,
  includes_budget     = excluded.includes_budget,
  includes_checklist  = excluded.includes_checklist,
  discount_mode       = excluded.discount_mode,
  discount_value      = excluded.discount_value,
  applies_to          = excluded.applies_to,
  active              = true;

-- Which codes are still unredeemed, including these two.
select code, package_key, max_uses, uses_count, active, note
from public.beta_codes
where active = true and uses_count < max_uses
order by code;
