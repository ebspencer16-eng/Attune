-- ============================================================================
-- 085: which accounts the Gender tile is counting as non-binary.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "Didn't I ask for demos to be removed from admin? I'm still seeing 3
-- non-binary testers."
--
-- The demo filter works and the tile reads the filtered list: every admin read
-- of profiles goes through api/_lib/demo-accounts.js, and check-demo-excluded
-- proves it over sixteen of them. So the three rows are accounts that are not
-- marked as demos. Migration 082 marks a narrow set on purpose: the two she
-- named, and anything that calls itself a test. A test account called Mya,
-- or one on a Gmail alias, is not caught by that and should not have been:
-- a rule that guesses drops real customers out of the figures silently.
--
-- So this asks the database who they are rather than guessing from here.
--
-- ── WHAT TO DO WITH IT ──────────────────────────────────────────────────────
-- Run it, read the list, and send it back. The second statement is the one
-- that marks a row, by id, commented out: nothing is marked until you say
-- which. A row marked as a demo disappears from every figure in the admin and
-- from nothing else.
--
-- Run in the Supabase SQL Editor and click Run. It changes nothing.
-- ============================================================================

select p.id,
       p.name,
       p.email,
       p.is_demo,
       p.created_at,
       p.pronouns,
       (p.ex1_answers is not null) as answered_communication,
       (p.ex2_answers is not null) as answered_expectations,
       exists (select 1 from public.orders o where o.user_id = p.id) as has_order
  from public.profiles p
 where lower(trim(p.pronouns)) = 'they/them'
 order by p.created_at;

-- And the same question for everybody, so the three have a denominator.
select coalesce(nullif(lower(trim(pronouns)), ''), '(not set)') as pronouns,
       count(*) filter (where not is_demo) as counted_in_admin,
       count(*) filter (where is_demo)     as marked_demo
  from public.profiles
 group by 1
 order by 2 desc;

-- ── To mark one, once you have read the list ────────────────────────────────
-- Put the ids in and uncomment. This is the only thing that changes a row.
--
-- update public.profiles
--    set is_demo = true
--  where id in ('00000000-0000-0000-0000-000000000000');
