-- 015 — Add a 13th beta code.
-- Same grant as ATTUNE-BETA-01..12 (seeded in 014): core package with the
-- digital workbook included free, single-use (one couple). Idempotent.

insert into public.beta_codes
  (code, package_key, includes_workbook, workbook_variant, discount_mode, max_uses, uses_count, active, note)
values
  ('ATTUNE-BETA-13','core',true,'digital','free',1,0,true,'Beta tester 13')
on conflict (code) do update set
  package_key       = excluded.package_key,
  includes_workbook = excluded.includes_workbook,
  workbook_variant  = excluded.workbook_variant,
  discount_mode     = excluded.discount_mode,
  max_uses          = excluded.max_uses,
  active            = excluded.active,
  note              = excluded.note;

-- Verify:
-- select code, max_uses, uses_count, active
-- from beta_codes where code like 'ATTUNE-BETA-%' order by code;
