-- The relationship journal's anchor type.
--
-- ── WHAT THIS IS FOR ────────────────────────────────────────────────────────
-- Ellie: "I want to build a 'relationship journal' into the notes section that
-- is kind of a running diary."
--
-- An entry is a note anchored to the day it was written, which is why there is
-- no new table here: a note already has an owner, a body, a created_at and a
-- visibility, and /api/notes already writes and reads them under the right
-- row-level policies. The only thing in the way is this column's CHECK, which
-- lists the anchor types by hand and was written before the journal existed.
--
-- ── WHY IT MATTERS THAT THIS IS A SEPARATE LIST ─────────────────────────────
-- api/_lib/tags.js has the same list in JavaScript. Teaching that one about
-- 'journal' and not this one is exactly how the journal failed the first time
-- it was tried: the request passed validation, reached the database, and
-- Postgres refused the row. The app said "That entry did not save", which is
-- true and says nothing about why.
--
-- check-anchor-types.mjs now holds the two lists to each other and fails the
-- build if either learns a type the other does not know.
--
-- ── SAFE TO RUN TWICE ───────────────────────────────────────────────────────
-- Dropping by name first, so a second run is not an error. Nothing is
-- rewritten: adding a value to a CHECK only widens what is allowed, so no
-- existing row can fail it.

alter table public.notes
  drop constraint if exists notes_anchor_type_check;

alter table public.notes
  add constraint notes_anchor_type_check check (
    anchor_type is null or anchor_type in (
      'results_dimension',
      'results_section',
      'results_question',
      'expectations_item',
      'intimacy_dimension',
      'post',
      'post_block',
      'journal'
    )
  );
