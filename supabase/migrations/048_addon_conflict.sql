-- Migration 048: the Conflict Patterns add-on
-- ============================================================================
-- Exercise 5 is a $40 add-on, never bundled into a package. Premium does not
-- include it, unlike intimacy, so the flag is the only way anyone gets it.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.orders
  add column if not exists addon_conflict boolean not null default false;

-- Mirrored onto profiles the same way the other add-on flags are, so partner
-- sync and the entitlement recompute can read it without joining orders.
alter table public.profiles
  add column if not exists addon_conflict boolean not null default false;

-- Answers live in their own column rather than inside another exercise's blob:
-- this exercise is self-only and scored separately, and mixing it into
-- intimacy_data would make a retake of one clear the other.
alter table public.profiles
  add column if not exists conflict_data jsonb;

comment on column public.orders.addon_conflict is
  'Conflict Patterns ($40). Never bundled into a package, including premium.';
comment on column public.profiles.conflict_data is
  'Exercise 5 answers: { answers, completedAt }. Self-only, no partner-view.';

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='addon_conflict')      as orders_flag,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='addon_conflict')    as profiles_flag,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='conflict_data')     as answers_column;
