-- Migration 060: the engagement measures
-- ============================================================================
-- WHY
--
-- Ellie asked the Engagement tab for nine measures. Four came from what the
-- product already stored. Five needed the site to record something it did not
-- record: how many people visit, and how long they spend on a page, on an
-- exercise, and in the dashboard.
--
-- This is that record. It is behavioural data about customers, so it is built
-- to hold as little as it can and still answer the question.
--
-- WHAT A ROW HOLDS, AND WHAT IT DOES NOT
--
--   kind        'visit' or 'page_time'
--   key         a path on the marketing site, or 'app:<view>' inside the
--               product. An exercise is a view, so time per exercise and time
--               per dashboard page are the same measure over different keys,
--               and the view names come from api/_exercises.js rather than
--               being written down again.
--   ms          how long, for page_time. Null for a visit.
--   owner_id    only for the signed-in surfaces, and ON DELETE SET NULL so a
--               deleted account leaves an anonymous row rather than deleting
--               a month of aggregates.
--   country     two letters, from the edge. Never an address, never an IP.
--
-- There is no session id, no device id, no referrer and no user agent. Two
-- visits from the same person on the same day are two rows that cannot be
-- joined to each other. That is a deliberate limit: it makes "how many people
-- visited" answerable as "how many visits", and nothing finer. Anything finer
-- is tracking a person rather than measuring a product.
--
-- CONSENT
--
-- Nothing is sent where consent is required and has not been given. The rule
-- is api/_lib/consent-region.js and the answer is the one the banner stores.
-- The privacy policy describes this table; if that paragraph is edited, edit
-- this comment too.
--
-- RETENTION
--
-- Ninety days. The measures are averages and rates, and a year of rows answers
-- nothing a quarter of rows does not. The delete is a cron, not a policy
-- sentence: api/cron-prune-events.js.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.page_events (
  id          bigserial primary key,

  kind        text not null check (kind in ('visit', 'page_time')),
  key         text not null,
  ms          integer check (ms is null or (ms >= 0 and ms <= 7200000)),

  owner_id    uuid references public.profiles(id) on delete set null,
  country     text,

  created_at  timestamptz not null default now()
);

-- The two questions the admin asks: everything of one kind in a window, and
-- everything about one key.
create index if not exists page_events_kind_time_idx
  on public.page_events (kind, created_at desc);
create index if not exists page_events_key_idx
  on public.page_events (kind, key);

comment on table public.page_events is
  'Engagement measures. No session id, no device id, no IP, no user agent: two events from the same person cannot be joined. Pruned to 90 days by api/cron-prune-events.js.';

alter table public.page_events enable row level security;

-- No policy for anyone. The endpoint writes with the service key and the admin
-- reads with it. Nothing in the product reads these back to a person.
