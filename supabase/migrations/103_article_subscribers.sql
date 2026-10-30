-- ============================================================================
-- 103: the In Practice list, and which articles it has been told about (A204a).
--
-- Ellie: "Can we build an automatic email that goes out to anyone who put
-- their email in that list and sends a notification that there's a new
-- article along with the article link?"
--
-- The signup on the In Practice page has never saved an address. These are
-- the two tables that let it:
--
--   article_subscribers    one row per address. `token` is the unsubscribe
--                          link's secret; nobody on this list has an account,
--                          so the account-based unsubscribe cannot reach them.
--                          Unsubscribing stamps unsubscribed_at rather than
--                          deleting, so signing up again is a fresh yes.
--   article_announcements  one row per article already announced, so each new
--                          article is emailed once. The first run of the job
--                          records every article that exists then without
--                          sending anything, so nobody gets thirteen emails.
--
-- Row level security on, with no policies: only the server's key reads or
-- writes either table. An email list is not something the public key may see.
--
-- Safe to run again: every statement checks before it creates.
-- ============================================================================

create table if not exists public.article_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  token           uuid not null unique default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.article_subscribers enable row level security;

create table if not exists public.article_announcements (
  slug         text primary key,
  announced_at timestamptz not null default now(),
  sent         integer not null default 0
);
alter table public.article_announcements enable row level security;
