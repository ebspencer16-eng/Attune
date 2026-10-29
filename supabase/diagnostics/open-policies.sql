-- Which tables can anybody holding the public key read or write?
--
-- Run this in the Supabase SQL Editor. It reads only; it writes nothing.
--
-- A policy whose test is always true, for a role a browser can be, opens its
-- table to anybody: the public key is in every visitor's browser. The server
-- uses the service key, which bypasses these rules, so it needs none of them.
--
-- ── WHAT ITS ANSWER MEANS ─────────────────────────────────────────────────
--   no rows        nothing is open. This is the answer after migration 098.
--   a policy row   that table is open to that command. Paste it back.
--   a bucket row   that bucket's files download without a signed link.
--                  Paste it back; it is a switch in Storage, not a migration.

select
  'policy'                          as "kind",
  tablename                         as "name",
  policyname || ' lets ' || array_to_string(roles, ', ') || ' ' || cmd as "what is open"
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')
  and roles && array['public', 'anon', 'authenticated']::name[]

union all

-- A storage bucket marked public serves its files to anybody with the address,
-- signed or not. The workbooks bucket holds each couple's full results, and the
-- code only ever hands out signed links, which is only private if the bucket is.
select
  'bucket',
  id,
  'public: anybody with a file address can download it'
from storage.buckets
where public

order by 1, 2;
