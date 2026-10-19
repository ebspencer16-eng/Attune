-- ============================================================================
-- 086: WHO the three non-binary rows are. One table, nothing else.
--
-- ── WHY A SECOND ONE ────────────────────────────────────────────────────────
-- 085 printed two tables: the three accounts, and a count per pronoun for a
-- denominator. Ellie ran it and got one back: "Only printed one table."
--
-- The Supabase SQL editor shows the result of the LAST statement in the box.
-- Two SELECTs means the first is computed and thrown away, which is a thing
-- about that editor rather than about the query, and asking somebody to scroll
-- up for a table that was never rendered is asking for something that does not
-- exist.
--
-- So this is one statement. It is the first half of 085, on its own.
--
-- ── WHAT TO DO WITH IT ──────────────────────────────────────────────────────
-- Run it and send the table back. It names the accounts whose pronouns are
-- they/them and says which are already marked as demos. If one of them is a
-- tester I will mark them; if one is a customer they stay exactly as they are.
--
-- Run in the Supabase SQL Editor and click Run. It changes nothing.
-- ============================================================================

select p.id,
       p.name,
       p.email,
       p.is_demo,
       p.created_at::date as joined,
       (p.ex1_answers is not null) as answered_communication,
       (p.ex2_answers is not null) as answered_expectations,
       exists (select 1 from public.orders o where o.user_id = p.id) as has_order
  from public.profiles p
 where lower(trim(p.pronouns)) = 'they/them'
 order by p.created_at;
