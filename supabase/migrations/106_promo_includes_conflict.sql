-- ============================================================================
-- 106: a promo code can include Conflict Patterns free (A208g).
--
-- Ellie, making a code in the admin: the form said Conflict Patterns "isn't
-- here because the checkout has no column for it, so a tick would do
-- nothing. Is that true? We need to add conflict patterns to checkout."
--
-- It was true: beta_codes had a column for every other add-on and none for
-- this one. This is that column. The admin form, the code check, the price,
-- the tax and the order all read it from the same release as this file.
--
-- Safe to run again.
-- ============================================================================

alter table public.beta_codes add column if not exists includes_conflict boolean not null default false;
