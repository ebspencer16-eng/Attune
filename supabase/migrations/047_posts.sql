-- Migration 047: In Practice posts
-- ============================================================================
-- The In Practice tab: blog-style posts people read, save into folders, tag,
-- and annotate.
--
-- IN THE DATABASE, NOT IN THE REPO. Ellie's call, and it is the right one for
-- what this has to do: publishing a post should not require a deploy, and
-- scheduling one should not mean a commit sitting in main waiting for a date.
--
-- ── BLOCKS, AND WHY ───────────────────────────────────────────────────────
-- The body is stored as an ordered array of blocks, each with its own stable
-- id, rather than as one string of markdown.
--
-- That is what makes annotation work. A highlight anchors to a block id (see
-- notes.anchor_type = 'post_block'), so editing a typo in paragraph four does
-- not move a note attached to paragraph seven. One long string would put every
-- annotation on character offsets, which is exactly the fragility we rejected
-- for results.
--
-- Block ids are assigned once and never reused. Deleting a block orphans its
-- annotations, which the app surfaces as "the passage this was attached to was
-- removed" rather than hiding.
--
-- ── TAGGING ───────────────────────────────────────────────────────────────
-- dimension_keys links a post to what it is about, using the same keys as the
-- standard tags ('dim:conflict', 'expcat:household'). That is what lets the
-- home screen say "new post on something you tagged" rather than "new post".
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.posts (
  id              text primary key,              -- slug, e.g. 'repair-after-a-hard-week'
  title           text not null,
  subtitle        text,
  -- Ordered blocks: [{ id, type, text }] where type is paragraph | heading |
  -- quote | list | prompt. id is stable for the life of the block.
  blocks          jsonb not null default '[]'::jsonb,
  -- What this post is about, using standard tag keys so it can be matched to a
  -- person's own tags.
  dimension_keys  text[] not null default '{}',
  read_minutes    integer,
  hero_color      text,

  -- Draft until published_at is set and in the past. Scheduling is just a
  -- future timestamp; no separate state to get out of step.
  published_at    timestamptz,
  -- Bumped when the body changes materially, so a reader who annotated an
  -- earlier version can be told it has been revised.
  revision        integer not null default 1,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- The published feed, newest first. Partial index because drafts are never
-- listed and there will be far more reads than drafts.
create index if not exists posts_published_idx
  on public.posts (published_at desc) where published_at is not null;

-- "Posts about something this person tagged."
create index if not exists posts_dimensions_idx on public.posts using gin (dimension_keys);

comment on column public.posts.blocks is
  'Ordered blocks, each with a stable id. Annotations anchor to block ids, so editing one paragraph does not move a note on another.';
comment on column public.posts.published_at is
  'Null means draft. A future timestamp means scheduled. There is no separate status column to fall out of step.';

-- Per-person read state, for the home screen and the unread badge.
create table if not exists public.post_reads (
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  post_id      text not null references public.posts(id) on delete cascade,
  read_at      timestamptz not null default now(),
  -- The revision they read, so a substantive edit can resurface a post they
  -- have already seen rather than silently staying marked read.
  revision     integer not null default 1,
  primary key (owner_id, post_id)
);
create index if not exists post_reads_owner_idx on public.post_reads (owner_id, read_at desc);

alter table public.posts      enable row level security;
alter table public.post_reads enable row level security;

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from public.posts)                                  as posts,
  (select count(*) from public.posts where published_at is not null)   as published,
  (select count(*) from public.post_reads)                             as reads;
