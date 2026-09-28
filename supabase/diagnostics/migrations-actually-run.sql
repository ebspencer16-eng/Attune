-- Which migrations has this database actually had?
--
-- Run this in the Supabase SQL Editor. It reads only; it writes nothing.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
-- Migrations here are run by hand, deliberately, and nothing records which
-- ones have been. So ten places in the server carry a comment like "tolerant of
-- migration 057 not having been run yet" and quietly do less when the column is
-- missing. That tolerance is right: it means a behind schema degrades instead of
-- erroring. It also means a behind schema is invisible.
--
-- Every row below is a place where a missing object costs something real and
-- says nothing. The ones that go quiet on their own are the dangerous half: a
-- highlight that will not save, a consent record that is never written, a
-- deleted partner's results that cannot be found.
--
-- ── HOW TO READ IT ────────────────────────────────────────────────────────
-- PRESENT   nothing to do.
-- MISSING   run that migration file. The last column says what is degraded
--           until you do.
--
-- Migration numbers are sequential and are meant to be run in order, so a
-- MISSING row with a low number usually means the whole tail is missing.
-- Running an already-run migration here is harmless: every one of these files
-- uses IF NOT EXISTS.
--
-- ── WHAT THIS DELIBERATELY DOES NOT COVER ─────────────────────────────────
-- Only the migrations the code tolerates being absent. A migration nothing is
-- tolerant of would have thrown an error the first time anything touched it, so
-- it is not a silent failure and does not need a diagnostic.
--
-- It does not check row-level security policies, indexes or defaults, only that
-- the table or column exists. A column added without its policy would read as
-- PRESENT here and still be unreachable from a browser.

with checks (migration, object, kind, degraded) as (
  values
    ('016_partner_b_addons',
     'profiles.addon_reflection', 'column',
     'An invited partner inherits no add-ons, so what was bought for them is not theirs.'),
    ('028_profiles_is_comp',
     'profiles.is_comp', 'column',
     'Comp accounts cannot be granted, which is how your own test couples get everything.'),
    ('036_admin_presets',
     'admin_presets', 'table',
     'The admin presets endpoint answers 500 rather than degrading.'),
    ('057_annotation_kinds',
     'notes.kind', 'column',
     'Highlights and underlines cannot be saved at all. A plain note still can.'),
    ('058_consent_events',
     'consent_events', 'table',
     'Nothing records that someone agreed to anything. The screen still asks.'),
    ('059_results_survive_deletion',
     'profiles.partner_deleted_at', 'column',
     'Someone whose partner deleted their account is shown a waiting screen forever instead of their own results.'),
    ('060_page_events',
     'page_events', 'table',
     'No engagement data is collected. Every figure on the Engagement page reads zero.'),
    ('061_page_events_surface',
     'page_events.surface', 'column',
     'App and website engagement cannot be told apart. The page says so.'),
    ('066_tag_bin',
     'tags.deleted_at', 'column',
     'A deleted tag comes straight back, because there is nowhere to put it.'),
    ('076_couple_tools',
     'couple_tools', 'table',
     'The Shared Budget and the checklist go back to being one each. Both partners still see their own, neither sees the other, and nothing says so.')
)
select
  c.migration,
  c.object,
  case
    when c.kind = 'table' then
      case when to_regclass('public.' || c.object) is not null then 'PRESENT' else 'MISSING' end
    else
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name  = split_part(c.object, '.', 1)
          and column_name = split_part(c.object, '.', 2)
      ) then 'PRESENT' else 'MISSING' end
  end as status,
  c.degraded as until_you_run_it
from checks c
order by c.migration;

-- ── 065_website_article_reads, which is a constraint rather than an object ──
--
-- It DROPS a foreign key, so it cannot be checked the same way: the thing it
-- creates is an absence. Until it is run, marking a static In Practice article
-- as read fails, because post_reads.post_id still insists on a row in posts and
-- the twelve website articles are not rows.
--
-- PRESENT here means the constraint is gone, which is what 065 does.
select
  '065_website_article_reads' as migration,
  'post_reads_post_id_fkey (dropped)' as object,
  case when exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'post_reads'
      and constraint_name = 'post_reads_post_id_fkey'
  ) then 'MISSING' else 'PRESENT' end as status,
  'Marking a static In Practice article as read fails silently.' as until_you_run_it;
