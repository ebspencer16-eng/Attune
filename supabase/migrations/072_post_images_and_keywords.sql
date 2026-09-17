-- ============================================================================
-- 072_post_images_and_keywords.sql
--
-- Two columns on posts, for the Learn tab.
--
-- ── hero_image ────────────────────────────────────────────────────────────
-- Ellie: "I want articles to have a little image like the natural cycles app."
-- Their cards are an illustration with a small ARTICLE label on it. A post has
-- a hero_color today, which is a tinted block; this is where the picture goes
-- when there is one. Nothing breaks without it: a card with no image keeps the
-- tinted block, so the shelf looks finished from the first day rather than
-- waiting on twelve illustrations.
--
-- ── keywords ──────────────────────────────────────────────────────────────
-- Ellie: "Can we have a search bar for the articles? You can manage this on
-- your backend but use key words and a tagging system to smart search for
-- relevant articles?"
--
-- The tagging system exists: dimension_keys already links a post to what it is
-- about, using the same keys as a reader's own tags. What it cannot carry is
-- the words someone would actually type. "Sex", "in-laws", "money fights" are
-- not dimension keys, and a search that only matches titles finds none of them.
--
-- So: free text search terms, set per post in the admin, searched alongside the
-- title, the standfirst, the shelf and the dimension keys. Empty by default,
-- which searches exactly as well as today.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.posts add column if not exists hero_image text;
alter table public.posts add column if not exists keywords text[] not null default '{}';

comment on column public.posts.hero_image is
  'Optional illustration for the card and the top of the article. A post without one falls back to hero_color.';
comment on column public.posts.keywords is
  'Extra words a reader might search for. Matched alongside title, subtitle, category and dimension_keys.';

-- Searching an array of words is a contains query, which wants an index once
-- there are more than a handful of posts.
create index if not exists posts_keywords_idx on public.posts using gin (keywords);

-- ── Verification ───────────────────────────────────────────────────────────
select
  count(*) filter (where hero_image is not null) as posts_with_an_image,
  count(*) filter (where cardinality(keywords) > 0) as posts_with_keywords,
  count(*) as posts
from public.posts;
