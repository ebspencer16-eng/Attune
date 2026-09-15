-- Migration 065: let a website In Practice article be marked read
-- ============================================================================
-- WHY
--
-- post_reads.post_id references posts(id), so only a row in the posts table
-- can be marked read. The twelve In Practice pieces are pages on the website,
-- not rows in that table, and they used to open in the browser, where nothing
-- could have recorded a read anyway.
--
-- They open in the app now. So someone reads one, closes it, and the row still
-- says nothing: the "Read" label appears for a published post and never for
-- these twelve, which reads as the app forgetting.
--
-- WHAT THIS CHANGES
--
-- The foreign key, and nothing else. post_id stays text and already holds the
-- slug; api/posts.js keeps deciding what is real, and it only ever writes an
-- id that is either a published post or one of the twelve in
-- api/_in-practice.js.
--
-- WHAT IS LOST BY DROPPING IT, AND WHY THAT IS ACCEPTABLE
--
-- The cascade. Deleting a post used to delete the read rows that pointed at
-- it; now they are left behind. A read row is (owner, post id, when, which
-- revision) and nothing reads one whose post is gone, so the cost is a few
-- rows nobody joins to. The alternative was inserting the twelve website
-- pieces into the posts table as empty rows, which would have made them
-- published posts with no body: the app serves the table first, so every one
-- of them would have opened blank.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.post_reads
  drop constraint if exists post_reads_post_id_fkey;

-- Show the result: the two remaining constraints should be the primary key and
-- the owner_id reference, and no post_id foreign key.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.post_reads'::regclass
order by conname;
