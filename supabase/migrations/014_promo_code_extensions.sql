-- 014_promo_code_extensions.sql
-- Extends the beta_codes table into a general promo/code table that supports:
--   • included add-ons (beta codes that bundle the workbook free with a package)
--   • percent discount on a specific add-on (the 30%-off-workbook flash promo)
--   • single-use enforcement (max_uses) + expiry (expires_at)
--   • strict couple-binding (bound_emails: buyer must match)
--
-- Safe to run more than once. Additive only; existing named codes keep working.

-- Make sure the table exists with the columns the app already writes.
create table if not exists public.beta_codes (
  code          text primary key,
  package_key   text,
  uses_count    int default 0,
  active        boolean default true,
  last_used_at  timestamptz,
  last_used_by  text
);

-- New capability columns.
alter table public.beta_codes add column if not exists discount_mode     text    default 'free';   -- free | fixed | percent
alter table public.beta_codes add column if not exists discount_value    numeric default 0;        -- fixed dollars, or percent (e.g. 30)
alter table public.beta_codes add column if not exists applies_to        text    default 'package';-- package | workbook
alter table public.beta_codes add column if not exists includes_workbook boolean default false;    -- bundle the workbook free with the package
alter table public.beta_codes add column if not exists workbook_variant  text;                      -- digital | print (for an included workbook)
alter table public.beta_codes add column if not exists max_uses          int;                       -- null = unlimited; 1 = single-use
alter table public.beta_codes add column if not exists expires_at        timestamptz;               -- null = never expires
alter table public.beta_codes add column if not exists bound_emails      text[];                    -- strict binding: buyer email must be in this set
alter table public.beta_codes add column if not exists note              text;                      -- human label (e.g. "Beta tester 1", "Flash promo - Smith couple")

-- ── Seed the 12 beta codes ───────────────────────────────────────────────────
-- Each: core package + workbook (digital) included free, single-use (one couple).
insert into public.beta_codes
  (code, package_key, includes_workbook, workbook_variant, discount_mode, max_uses, uses_count, active, note)
values
  ('ATTUNE-BETA-01','core',true,'digital','free',1,0,true,'Beta tester 1'),
  ('ATTUNE-BETA-02','core',true,'digital','free',1,0,true,'Beta tester 2'),
  ('ATTUNE-BETA-03','core',true,'digital','free',1,0,true,'Beta tester 3'),
  ('ATTUNE-BETA-04','core',true,'digital','free',1,0,true,'Beta tester 4'),
  ('ATTUNE-BETA-05','core',true,'digital','free',1,0,true,'Beta tester 5'),
  ('ATTUNE-BETA-06','core',true,'digital','free',1,0,true,'Beta tester 6'),
  ('ATTUNE-BETA-07','core',true,'digital','free',1,0,true,'Beta tester 7'),
  ('ATTUNE-BETA-08','core',true,'digital','free',1,0,true,'Beta tester 8'),
  ('ATTUNE-BETA-09','core',true,'digital','free',1,0,true,'Beta tester 9'),
  ('ATTUNE-BETA-10','core',true,'digital','free',1,0,true,'Beta tester 10'),
  ('ATTUNE-BETA-11','core',true,'digital','free',1,0,true,'Beta tester 11'),
  ('ATTUNE-BETA-12','core',true,'digital','free',1,0,true,'Beta tester 12')
on conflict (code) do update set
  package_key       = excluded.package_key,
  includes_workbook = excluded.includes_workbook,
  workbook_variant  = excluded.workbook_variant,
  discount_mode     = excluded.discount_mode,
  max_uses          = excluded.max_uses,
  active            = excluded.active,
  note              = excluded.note;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select code, package_key, includes_workbook, max_uses, uses_count, active
--   from public.beta_codes where code like 'ATTUNE-BETA-%' order by code;
