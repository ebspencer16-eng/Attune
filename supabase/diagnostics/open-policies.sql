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
--   any row        that table is open to that command. Paste it back.

select
  tablename                         as "table",
  policyname                        as "policy",
  cmd                               as "lets them",
  array_to_string(roles, ', ')      as "who"
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')
  and roles && array['public', 'anon', 'authenticated']::name[]
order by tablename, policyname;
