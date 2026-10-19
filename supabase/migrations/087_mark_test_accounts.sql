-- ============================================================================
-- 087: the three test accounts stop being counted as people.
--
-- ── WHAT 086 ANSWERED ───────────────────────────────────────────────────────
-- Ellie ran 086 and sent back four rows with pronouns of they/them:
--
--   Alex          (no email)                               is_demo true
--   Tester        tester@attune-relationships.com          is_demo FALSE
--   Testpartner   tester-partner@attune-relationships.com  is_demo FALSE
--   Solo          tester-alone@attune-relationships.com    is_demo FALSE
--
-- So her original reading was right: "none of our beta testers are non binary."
-- Nobody non-binary has ever used Attune. Every they/them row is one of ours,
-- and three of the four are inside every figure the admin draws.
--
-- ── WHY 082 MISSED THEM ─────────────────────────────────────────────────────
-- 082 marked demos deliberately narrowly, because a rule that guesses drops a
-- real customer out of every figure with nobody the wiser. Its name match is
-- `test` as a WHOLE WORD, so "Tester" and "Testpartner" are both `test`
-- followed by a letter and neither matches. Its email match wants `test@`,
-- `%+test@%`, `@example.com` or `@test.%`, and `tester@` is none of them.
--
-- The narrow rule was the right call and this is the cost of it: it has to be
-- topped up by hand when a tester is made. Which is why the last statement
-- here prints everybody who is NOT marked, rather than just the three.
--
-- ── WHAT THIS DOES ──────────────────────────────────────────────────────────
-- Marks exactly three rows, by id, named one per line. No pattern, nothing
-- guessed, nothing that could catch a customer. Reversing one is one line:
--
--   update public.profiles set is_demo = false where id = '<the id>';
--
-- This is wider than the pronoun tile. These three have been inside the couple
-- types, the demographics, the engagement figures and the completion funnel
-- since the day each was made, and one of them carries an order, so they have
-- been inside the revenue figures too.
--
-- ── THE TABLE IT PRINTS ─────────────────────────────────────────────────────
-- Everybody the admin still counts, which is what the figures are about. The
-- update above it returns no table of its own, so the editor shows this one.
-- Read it and tell me whether anybody on it is another tester: that is the
-- half no query can answer, because a tester and a customer look the same.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

update public.profiles
   set is_demo = true
 where is_demo = false
   and id in (
     '11111111-1111-4111-8111-111111111111',  -- Tester
     '22222222-2222-4222-8222-222222222222',  -- Testpartner
     '33333333-3333-4333-8333-333333333333'   -- Solo
   );

-- Everybody the admin counts, after the update above. If a name here is one of
-- yours rather than a customer's, send it back and I will add it to the list.
select p.name,
       p.email,
       p.pronouns,
       p.created_at::date as joined,
       (p.ex1_answers is not null) as answered_communication,
       exists (select 1 from public.orders o where o.user_id = p.id) as has_order
  from public.profiles p
 where p.is_demo = false
 order by p.created_at;
