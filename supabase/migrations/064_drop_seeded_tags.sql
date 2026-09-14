-- Migration 064: remove the seeded tags nobody has used
-- ============================================================================
-- WHY
--
-- Opening the Notes tab used to write twenty-one tags into a person's account:
-- one per communication dimension, one per expectations category, and six more
-- for Physical Intimacy if they owned it. Ellie: "I don't like our default
-- tags. Just have a spot for people to 'add a tag' then they see their own
-- list."
--
-- The app and the endpoint no longer seed anything. This clears the rows that
-- were already written, so an account created last month opens the same empty
-- list a new one does.
--
-- WHAT IS DELIBERATELY LEFT ALONE
--
-- A seeded tag that somebody actually filed a note under. Deleting it would
-- take the tag off their note, because note_tags cascades on delete, and that
-- is their filing, not ours. So this removes only the ones with nothing
-- against them.
--
-- Tags people made themselves are not touched at all: they have no
-- standard_key.
--
-- A seeded tag someone renamed and then never used does go. There is no column
-- recording that a tag was renamed, so there is no way to tell one from the
-- rest; api/_lib/tags.js reads a `renamed` field on reseed that this schema has
-- never had, which is its own small bug and is written up separately.
--
-- The labels an annotation is read through do not come from these rows any
-- more. /api/notes?action=tags sends them as reference data, derived from the
-- live dimension and category lists on every request, so removing the rows
-- cannot leave a note reading "Dim conflict".
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- What is about to go, before it goes.
select count(*) as unused_seeded_tags
from public.tags t
where t.standard_key is not null
  and not exists (select 1 from public.note_tags nt where nt.tag_id = t.id);

delete from public.tags t
where t.standard_key is not null
  and not exists (select 1 from public.note_tags nt where nt.tag_id = t.id);

-- What is left: seeded tags that are in use, and everything people made.
select
  count(*) filter (where standard_key is not null) as seeded_tags_still_in_use,
  count(*) filter (where standard_key is null)     as tags_people_made
from public.tags;
