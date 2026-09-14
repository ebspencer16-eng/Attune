-- Migration 063: turn row level security on for admin_presets
-- ============================================================================
-- WHY
--
-- Every other table in this schema has row level security enabled. This one,
-- added in migration 036, does not, and a table in the public schema without
-- it is reachable by anyone holding the publishable key, which the site prints
-- on every page. Not only readable: the anon role is granted insert, update
-- and delete on public tables by default, so a stranger could add a preset,
-- change one, or delete the lot.
--
-- The rows themselves are harmless. They are saved Explore crosstab views:
-- a row field, a column field, a cell mode and some filters. Nothing about a
-- person is in them. What is at stake is Ellie and Carolina's saved work.
--
-- NO POLICY, ON PURPOSE
--
-- api/admin-presets.js reads and writes this table with the service-role key,
-- which bypasses row level security. So enabling it with no policy is exactly
-- right: the endpoint keeps working and every other caller is refused. A
-- policy here would be a way in, not a way to work.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.admin_presets enable row level security;

-- Show the result: rowsecurity should be true, and no policies listed.
select relname, relrowsecurity from pg_class where relname = 'admin_presets';
select policyname from pg_policies where schemaname = 'public' and tablename = 'admin_presets';
