-- Migration 044: notes, folders, tags, annotations
-- ============================================================================
-- The Notes tab: shared and private notes, folders, saved posts, user-defined
-- tags, and annotations attached to specific places in results and posts.
--
-- ── THE ANCHORING DECISION ────────────────────────────────────────────────
-- The hard part is what an annotation points AT.
--
-- The obvious approach, a character offset into rendered text, breaks
-- immediately here. Results prose is generated from answers: it changes when a
-- couple retakes an exercise, when the weights change, and when Carolina
-- revises a line. An annotation anchored to "characters 340 to 410 of the
-- Repairing tile" would silently drift onto different words, or onto nothing.
-- We have already changed the question set, the axis weights and the blend once
-- each in the last month.
--
-- So annotations anchor to STABLE IDENTIFIERS instead:
--
--   results_dimension   dimension id, e.g. 'conflict'
--   results_section     section id, matching the ?s= deep links, e.g. 'comm-hard'
--   results_question    question id, e.g. 'cf1'
--   expectations_item   category id plus item index
--   intimacy_dimension  intimacy dimension id
--   post                a post id
--   post_block          a post id plus a block id authored into the post
--
-- These survive a retake and a copy revision, because they name the thing
-- rather than its current wording. A note on Conflict Style is still a note on
-- Conflict Style after new answers.
--
-- The tradeoff, stated honestly: you cannot highlight an arbitrary sentence of
-- generated prose. Highlighting arbitrary text only works where the text is
-- stable, which is posts, hence post_block. For results, the unit is the thing
-- being discussed, not the sentence discussing it.
--
-- anchor_context stores the wording as it was when the note was written, so if
-- the prose later changes the app can show "this has been updated since you
-- wrote this" rather than pretending nothing moved.
--
-- ── SHARED VS PRIVATE ─────────────────────────────────────────────────────
-- visibility is 'private' or 'shared'. Shared means the partner can read it.
-- Nothing is shared by default, and there is no "shared with everyone" state.
-- couple_key is set only on shared notes, so a private note carries no pointer
-- to the other person at all.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- ── Folders ────────────────────────────────────────────────────────────────
create table if not exists public.note_folders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  -- 'notes' holds notes, 'posts' holds saved In Practice posts. Tags are not a
  -- folder: they are their own thing, listed in their own place.
  kind        text not null default 'notes' check (kind in ('notes', 'posts')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists note_folders_owner_idx on public.note_folders (owner_id, kind, sort_order);

-- ── Tags ───────────────────────────────────────────────────────────────────
-- Standard tags are seeded per person from the live dimension and category
-- lists (see api/_lib/tags.js), so they cannot drift from the product. People
-- can add their own and rename or hide the standard ones.
create table if not exists public.tags (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  color         text,
  -- Set for seeded tags, e.g. 'dim:conflict' or 'expcat:household'. Null for
  -- ones the person invented. Lets a reseed update rather than duplicate.
  standard_key  text,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index if not exists tags_owner_standard_idx
  on public.tags (owner_id, standard_key) where standard_key is not null;
create unique index if not exists tags_owner_name_idx
  on public.tags (owner_id, lower(name));

-- ── Notes and annotations ──────────────────────────────────────────────────
-- One table for both. An annotation is a note with an anchor; a standalone note
-- is one without. Splitting them would mean two of everything downstream, and
-- the only real difference is whether anchor_type is null.
create table if not exists public.notes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  folder_id       uuid references public.note_folders(id) on delete set null,

  visibility      text not null default 'private' check (visibility in ('private', 'shared')),
  -- Only on shared notes: the canonical pair key, so a partner can find notes
  -- shared with them without scanning anyone else's rows.
  couple_key      text,

  title           text,
  body            text not null default '',

  -- Null for a standalone note. See the anchoring note at the top.
  anchor_type     text check (anchor_type in (
                    'results_dimension', 'results_section', 'results_question',
                    'expectations_item', 'intimacy_dimension', 'post', 'post_block')),
  anchor_key      text,
  -- What the anchored thing said when the note was written, so the app can flag
  -- that it has changed rather than silently showing a note against new words.
  anchor_context  text,
  -- RESULTS_VERSION at the time, for the same reason.
  anchor_version  integer,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint notes_shared_has_couple check (visibility = 'private' or couple_key is not null),
  constraint notes_anchor_pairs check ((anchor_type is null) = (anchor_key is null))
);
create index if not exists notes_owner_idx on public.notes (owner_id, updated_at desc);
create index if not exists notes_folder_idx on public.notes (folder_id, updated_at desc);
create index if not exists notes_anchor_idx on public.notes (owner_id, anchor_type, anchor_key);
-- The partner's view of what has been shared with them.
create index if not exists notes_shared_idx on public.notes (couple_key, updated_at desc)
  where visibility = 'shared';

create table if not exists public.note_tags (
  note_id  uuid not null references public.notes(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);
create index if not exists note_tags_tag_idx on public.note_tags (tag_id);

-- ── Saved posts ────────────────────────────────────────────────────────────
create table if not exists public.saved_posts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  post_id    text not null,
  folder_id  uuid references public.note_folders(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists saved_posts_owner_post_idx on public.saved_posts (owner_id, post_id);

-- ── Access ─────────────────────────────────────────────────────────────────
-- Written and read through the API, which verifies the caller, the same as
-- couple_results. RLS on with no client policies, so a leaked anon key cannot
-- read anyone's private notes.
alter table public.note_folders enable row level security;
alter table public.tags         enable row level security;
alter table public.notes        enable row level security;
alter table public.note_tags    enable row level security;
alter table public.saved_posts  enable row level security;

comment on column public.notes.anchor_key is
  'Stable identifier, not a text offset. Dimension id, section id, question id, or post block id. Survives a retake and a copy revision.';
comment on column public.notes.anchor_context is
  'The wording at the time of writing, so a later change can be surfaced rather than hidden.';

-- ── Verification ───────────────────────────────────────────────────────────
select table_name,
       (select count(*) from information_schema.columns c
         where c.table_schema = 'public' and c.table_name = t.table_name) as columns
from (values ('note_folders'), ('tags'), ('notes'), ('note_tags'), ('saved_posts')) as t(table_name)
order by table_name;
