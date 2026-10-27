-- ============================================================================
-- 096: is the Engagement page empty because it is broken, or because nothing
-- has been recorded? READ ONLY. Writes nothing.
--
-- Ellie: "Go on to this page and rebuild in the way you think makes the most
-- sense, Currently a lot of it isn't readable."
--
-- Before rebuilding it I drew the page against a full set of made-up data and
-- every tile on it worked: the funnel, the visits line, all five time-per-page
-- charts and the detailed pages picker. So the page is not broken.
--
-- Every one of those tiles is gated on one thing: `page_events` having any
-- rows at all. With none, each tile says "Nothing recorded yet" and the page
-- is a column of grey boxes, which is exactly what "a lot of it isn't
-- readable" would look like. A rebuild cannot fix that; only data can.
--
-- This says which it is, and if there IS data, where it stops.
--
-- Run in the Supabase SQL Editor and click Run. One table comes back.
-- ============================================================================

select 'page_events rows in total'                        as question,
       count(*)::text                                     as answer
  from public.page_events
union all
select 'rows in the last 30 days (what the page shows)',
       count(*) filter (where created_at > now() - interval '30 days')::text
  from public.page_events
union all
select 'rows in the 30 days before that (the comparison)',
       count(*) filter (where created_at > now() - interval '60 days'
                          and created_at <= now() - interval '30 days')::text
  from public.page_events
union all
select 'distinct kinds of event recorded',
       count(distinct kind)::text
  from public.page_events
union all
select 'page_time rows, which every time-per-page chart needs',
       count(*) filter (where kind = 'page_time')::text
  from public.page_events
union all
select 'rows with no owner, counted as anonymous visits',
       count(*) filter (where owner_id is null)::text
  from public.page_events
union all
-- The most recent event, so "nothing is being recorded any more" can be told
-- from "nothing ever was".
select 'most recent event',
       coalesce(to_char(max(created_at), 'YYYY-MM-DD HH24:MI'), 'never')
  from public.page_events
union all
-- And what is being recorded, so a chart drawing nothing can be matched to a
-- key nobody writes.
select 'kind: ' || kind,
       count(*)::text
  from public.page_events
 group by kind
 order by question;
