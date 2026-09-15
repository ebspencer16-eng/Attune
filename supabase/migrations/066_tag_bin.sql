-- Migration 066: a bin for tags
-- ============================================================================
-- Ellie: "if a tag is deleted there should be a greyed out row at the bottom of
-- the tag list where deleted tags live, and you can delete them from there
-- permanently, and the popup when you click delete out of that list should say
-- 'are you sure? This action cannot be undone'."
--
-- So a tag has two deaths. The first is recoverable and is this column. The
-- second removes the row, and with it the note_tags rows that point at it,
-- which is what "cannot be undone" means.
--
-- ── WHY NOT THE `hidden` COLUMN THAT IS ALREADY THERE ─────────────────────
-- Because nothing reads it, and a column called `hidden` holding "deleted, but
-- recoverable" is a rule written in the wrong word. This one also carries when,
-- which the bin can show and a boolean cannot.
--
-- ── WHAT HAPPENS TO THE NAME ──────────────────────────────────────────────
-- tags_owner_name_idx is unique on (owner_id, lower(name)), and a tag in the
-- bin still holds its name. Rather than free the name or weaken the index,
-- creating a tag whose name is in the bin brings that tag back. That is what
-- someone typing the name again means.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.tags
  add column if not exists deleted_at timestamptz;

comment on column public.tags.deleted_at is
  'In the bin since this moment. Null means live. Removing the row is the permanent delete.';

-- The list reads live tags and the bin separately, both by owner.
create index if not exists tags_owner_deleted_idx
  on public.tags (owner_id, deleted_at);

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from public.tags)                          as tags,
  (select count(*) from public.tags where deleted_at is null) as live,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'tags'
       and column_name = 'deleted_at')                        as column_exists;
