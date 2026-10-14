-- ============================================================================
-- 082: demo accounts stop being counted as people.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "Alex and sam and test profiles should not be included in admin."
--
-- They are rows in profiles like anybody else, so every figure the admin draws
-- has been counting them: couple types, demographics, engagement, the
-- completion funnel, the survey's segments. With a handful of real couples that
-- is a large share of every number on the page.
--
-- ── WHAT IT ADDS ────────────────────────────────────────────────────────────
-- One column, `is_demo`, false for everybody by default. The admin endpoints
-- filter on it; nothing else in the product reads it, and no customer-facing
-- surface changes.
--
-- ── WHO IT MARKS ────────────────────────────────────────────────────────────
-- The two she named, and anything that calls itself a test. The match is on
-- the name and the email together, and the last statement prints every row it
-- marked so you can see it caught what you meant and nobody else. If a real
-- customer is ever caught by it, one update puts them back:
--
--   update public.profiles set is_demo = false where id = '<the id>';
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.profiles add column if not exists is_demo boolean not null default false;

comment on column public.profiles.is_demo is
  'True for demo and test accounts. Every admin analytics endpoint excludes these rows; nothing else reads the column.';

-- The admin reads the whole table, so the index pays for itself at once.
create index if not exists profiles_is_demo_idx on public.profiles (is_demo) where is_demo;

-- ── The two she named ───────────────────────────────────────────────────────
-- The whole name, not a prefix. `alex%` catches Alexandra and `sam%` catches
-- Samantha, and a rule that quietly drops a customer out of every figure with
-- nobody the wiser is worse than counting two demos.
update public.profiles
   set is_demo = true
 where is_demo = false
   and (name ilike 'alex' or name ilike 'sam');

-- ── And anything that says it is a test ─────────────────────────────────────
-- Deliberately narrow: "test" as a whole word in a name, or a test-looking
-- email. `%test%` alone would catch Testa and protest.
update public.profiles
   set is_demo = true
 where is_demo = false
   and (
        name ~* '(^|[^a-z])test([^a-z]|$)'
     or email ilike '%@example.com'
     or email ilike '%+test@%'
     or email ilike 'test@%'
     or email ilike '%@test.%'
   );

-- ── Verification ────────────────────────────────────────────────────────────
-- Everybody now marked as a demo. Read this list: it is what the admin will
-- stop counting.
select id, name, email, created_at
  from public.profiles
 where is_demo
 order by created_at;

-- And what is left, which is what the figures are about.
select count(*) filter (where not is_demo) as real_profiles,
       count(*) filter (where is_demo)     as demo_profiles
  from public.profiles;
