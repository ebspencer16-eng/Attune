-- Did a couple's results actually generate, and what do they say?
--
-- Run this in the Supabase SQL Editor. It reads only; it writes nothing.
--
-- Put either partner's email where it says REPLACE_WITH_THEIR_EMAIL, which
-- appears once, and run it. One row.
--
-- ── WHY THIS IS THE CONFIRMATION ──────────────────────────────────────────
-- Results are frozen: the first time a couple opens them, /api/results
-- computes them and writes one row to couple_results, keyed on the two ids in
-- sorted order. That row existing is the product saying "I generated these",
-- and its couple_type is what the two of them were actually shown.
--
-- So this answers a question no amount of reading the code can: not "should
-- their results open" but "did they, and what came out". Nothing can answer it
-- until one of them has opened the page, because that is what computes it.
--
-- content_version arrives with migration 046. If that has not run, this
-- errors on an unknown column rather than reporting it, which is the honest
-- failure: there is no way to read a column that is not there.
--
-- ── WHAT ITS ANSWERS MEAN ─────────────────────────────────────────────────
--   NOT GENERATED YET   no row. Either nobody has opened results since the
--                       fix deployed, or they still cannot.
--   GENERATED           a row, with the couple type and when it was frozen.
--   GENERATED, STALE    a row whose answers_hash no longer matches what the
--                       two of them have stored, which is what a retake looks
--                       like. The stored row is still what they see; this is
--                       information, not a fault.

with asked as (select lower('REPLACE_WITH_THEIR_EMAIL') as email),
pair as (
  select p.id as me, p.partner_profile_id as them, p.name, p.email
  from public.profiles p, asked a
  where lower(p.email) = a.email
),
ordered as (
  -- The same canonical order orderPair uses in api/_lib/results-store.js, so
  -- this looks for the row where the row actually is.
  select least(me, them) as a, greatest(me, them) as b, name, email from pair
)
select
  concat_ws(E'\n',
    'couple: ' || coalesce(o.name, '?') || ' <' || coalesce(o.email, '?') || '> and partner',
    '  stored results row: ' || case when r.partner_a is null then 'NOT GENERATED YET'
                                     else 'GENERATED' end,
    case when r.partner_a is null then
      '  nothing to report until one of them opens their results, which is what computes them'
    else concat_ws(E'\n',
      '  couple type: ' || coalesce(r.couple_type, 'none recorded'),
      '  frozen at: ' || coalesce(r.frozen_at::text, r.computed_at::text, 'unknown'),
      -- Cast before coalescing. Both of these are integer columns, and
      -- `coalesce(r.version, '?')` is a type error Postgres refuses outright:
      -- "COALESCE types integer and text cannot be matched". It parses
      -- perfectly, which is why the parser said yes and the database would
      -- have said no, in front of Ellie.
      '  engine version: ' || coalesce(r.version::text, '?')
        || ', content version: ' || coalesce(r.content_version::text, 'not set'),
      '  sections in the stored payload: '
        || coalesce((select count(*)::text from jsonb_object_keys(r.results)), 'unreadable')
    ) end
  ) as report
from ordered o
left join public.couple_results r
  on r.partner_a = o.a and r.partner_b = o.b;
