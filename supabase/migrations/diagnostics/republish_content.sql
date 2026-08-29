-- Republish: change what EXISTING couples see
-- ============================================================================
-- Deliberate action, not a side effect of editing a file. Use this only when a
-- real error needs fixing for people who already have results: a typo, a
-- factual mistake, something Carolina flags as harmful.
--
-- Normal copy edits need none of this. They affect couples computed afterwards
-- and leave everyone else alone, which is the whole point of pinning.
--
-- HOW IT WORKS
-- Clearing content_version moves a couple back to rendering from current copy.
-- Setting it to a number pins them to that version. Clearing is the usual
-- intent: "show these people the corrected wording".
--
-- Scores are untouched either way. This only changes which copy their results
-- render from, never their type, their dimension scores, or their gaps.
--
-- Read the SELECT first, run the UPDATE second, and only after you have decided
-- who should move.
-- ============================================================================

-- ── 1. WHO WOULD MOVE. Run this first, on its own. ────────────────────────
select
  p1.email                                    as partner_a_email,
  p2.email                                    as partner_b_email,
  cr.couple_type,
  cr.content_version,
  cr.frozen_at::date                          as results_frozen,
  case when cr.content_version is null
       then 'already reading current copy'
       else 'pinned to v' || cr.content_version end as status
from public.couple_results cr
join auth.users p1 on p1.id = cr.partner_a
join auth.users p2 on p2.id = cr.partner_b
-- Narrow this to the cohort you actually mean. Examples, pick one:
--   where cr.content_version = 1                          -- everyone on v1
--   where cr.frozen_at < '2026-09-01'                     -- everyone before a date
--   where cr.couple_type = 'WX'                           -- one couple type
where cr.content_version is not null
order by cr.frozen_at;

-- ── 2. THE MOVE. Uncomment, match the WHERE to the SELECT above, then run. ─
-- Reports how many rows changed, so a wrong WHERE is visible immediately
-- rather than silently touching everyone.
--
-- do $$
-- declare n int;
-- begin
--   with moved as (
--     update public.couple_results
--        set content_version = null,     -- null = render from current copy
--            updated_at = now()
--      where content_version = 1         -- MATCH THIS TO YOUR SELECT
--      returning 1
--   ) select count(*) into n from moved;
--   raise notice 'republished % couples', n;
--   if n > 50 then
--     raise exception 'Refusing: % rows is more than expected. Narrow the WHERE and try again.', n;
--   end if;
-- end $$;

-- ── 3. CONFIRM ─────────────────────────────────────────────────────────────
select
  content_version,
  count(*) as couples
from public.couple_results
group by content_version
order by content_version nulls first;
