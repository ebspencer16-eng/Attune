-- Migration 052: category on posts
-- ============================================================================
-- practice.html filters In Practice by four categories, but they exist only as
-- markup on that page: the posts table has no category column, so the app
-- cannot group by anything and the admin editor cannot set one.
--
-- Text rather than an enum, so adding a shelf is a code change rather than a
-- migration. Nullable, because an uncategorised post should still appear under
-- All rather than vanish.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.posts
  add column if not exists category text;

comment on column public.posts.category is
  'One of: Getting Started, When It''s Difficult, Understanding Each Other, Methodology. Null means uncategorised, which still shows under All.';

create index if not exists posts_category_idx on public.posts (category);

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'posts'
      and column_name = 'category')     as column_exists,
  (select count(*) from public.posts
    where category is not null)         as categorised;
