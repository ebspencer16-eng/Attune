-- Migration 049: notifications
-- ============================================================================
-- A place in the app to see alerts from Attune and from a partner.
--
-- api/_lib/notifications.js already decides what is PUSH-ELIGIBLE and applies
-- rate limits, but it stores nothing: it answers "should we push this now" and
-- then forgets. An in-app list needs a record.
--
-- ── TWO THINGS WORTH KNOWING ──────────────────────────────────────────────
-- Read state is per person, not per couple. "Preston finished" is read by
-- Ellie and never seen by Preston, so a row belongs to one owner even when the
-- event concerns both.
--
-- deep_link carries where tapping it goes, so the app routes without
-- re-deriving intent from the kind.
--
-- ── NO DEDUPE INDEX, DELIBERATELY ─────────────────────────────────────────
-- Two attempts at a unique index on "same person, same kind, same day" failed
-- with 42P17. A date derived from a timestamptz depends on the session
-- timezone, so Postgres will not index it, and each workaround made the schema
-- harder to read for a rule that is simple to state.
--
-- That rule lives in the API instead, where it is plain JavaScript, testable,
-- and adjustable without a migration. A duplicate row is cosmetic, not a
-- correctness problem, which is the wrong trade for a constraint that keeps
-- breaking the schema.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,

  -- Matches the kinds in api/_lib/notifications.js. Text rather than an enum,
  -- so adding one is a code change, not a migration.
  kind        text not null,
  title       text not null,
  body        text,
  -- Where tapping it goes, e.g. '/results?s=conflict-overview'.
  deep_link   text,

  -- Who or what it is about: a partner's profile id, a post id. Nullable.
  subject_id  text,

  -- True when this also went out as a push. False means the rate limiter
  -- suppressed the push but the alert still belongs in the list.
  pushed      boolean not null default false,

  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- The list, which is the only query the app makes.
create index if not exists notifications_owner_idx
  on public.notifications (owner_id, created_at desc);

-- The unread badge.
create index if not exists notifications_unread_idx
  on public.notifications (owner_id) where read_at is null;

-- Supports the duplicate check described above.
create index if not exists notifications_recent_idx
  on public.notifications (owner_id, kind, created_at desc);

comment on table public.notifications is
  'Per-person in-app alerts. Read state is per owner, not per couple: "your partner finished" belongs to the other partner only.';
comment on column public.notifications.pushed is
  'True when this also went out as a push. False means the rate limiter suppressed the push but the alert still belongs in the list.';

alter table public.notifications enable row level security;

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from public.notifications)                        as rows,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications')  as columns;
