-- Migration 070: give the test couple a relationship status
-- ============================================================================
-- WHY
--
-- Ellie, walking through Physical Intimacy Expectations as the tester: "Q6
-- feels weird. 'When you turn your partner down, you expect to want them to'.
-- Is this an error?"
--
-- Not an error in the question. That exercise asks eleven of its eighteen
-- questions two ways: one for a couple who are already physically intimate and
-- one for a couple who are not yet. Which one someone gets is decided by
-- profiles.relationship_status, and anything that is not 'married' or
-- 'remarried' gets the not-yet wording. 067 created the couple without a
-- status, so the tester was being asked the whole exercise the other way.
--
-- Whether an unset status should mean not-yet at all is a product question
-- rather than a fix, and it is Q7 in TASKS.md.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

update public.profiles
   set relationship_status = 'married'
 where id in (
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333'
 );

-- ── Verification ───────────────────────────────────────────────────────────
select email, relationship_status
  from public.profiles
 where id in (
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333'
 );
