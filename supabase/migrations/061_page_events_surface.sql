-- Migration 061: which surface an engagement event came from
-- ============================================================================
-- WHY
--
-- The website's portal and the iOS app both file screen time under the same
-- key shape, 'app:<view>', because the view names come from one registry and
-- that was the point: time per exercise is one calculation over both.
--
-- The Engagement page now needs the opposite as well. Ellie asked for the
-- exercises, the resources and the results as clustered columns, app against
-- site, and nothing in a row says which one it came from.
--
-- WHAT IT DOES NOT DO
--
-- It does not identify anyone, and it does not get close. 'site' or 'app' is
-- a fact about the software, not about the person: everybody using the app
-- writes the same value. The privacy paragraph is unaffected and needs no
-- edit.
--
-- Existing rows have no surface and keep null. They are page_time and visit
-- rows from before this shipped, and the charts count them under "unknown"
-- rather than guessing, because a guess here would be invented data in a
-- comparison whose whole purpose is the difference between two numbers.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.page_events
  add column if not exists surface text check (surface is null or surface in ('site', 'app'));

comment on column public.page_events.surface is
  'Which software the event came from: site (the marketing pages and the portal) or app (iOS). Null on rows written before migration 061. Says nothing about the person.';

create index if not exists page_events_surface_idx
  on public.page_events (kind, surface, key);
