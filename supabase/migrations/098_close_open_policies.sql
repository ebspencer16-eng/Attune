-- ============================================================================
-- 098: nothing outside the server may read or write a table it does not own.
--
-- ── WHAT IS OPEN ────────────────────────────────────────────────────────────
-- 010 removed the original wide-open policies, `using (true) with check
-- (true)` with no role, which grant the table to anybody holding the public
-- key, and that key is in every visitor's browser. It also added two of its
-- own, and nothing since has taken them away:
--
--   beta_codes_anon_select   every promo code, free ones included, readable
--                            by anybody. Opened "so client-side validation
--                            works"; validation moved to /api/validate-promo
--                            on the server, and nothing in a browser reads
--                            this table any more.
--   feedback_anon_insert     anybody may write rows into feedback_submissions.
--                            Nothing writes that table from a browser now: the
--                            questionnaire it held is retired.
--
-- beta_codes_setup.sql, which created that table, made a second open read of
-- it, beta_codes_read_all. If it was run, both are live.
--
-- ── AND WHAT schema.sql WOULD HAVE REOPENED ─────────────────────────────────
-- supabase/schema.sql still created the six policies 010 removed. It could
-- not be run until A164b made it runnable, so from then until this commit,
-- pasting it into the live project reopened profiles, orders, partner_sessions,
-- feedback_submissions and lmft_requests to anybody. Nothing suggests it was
-- pasted. They are dropped here too, so this one file closes them whichever
-- way the database got to where it is. schema.sql no longer creates them.
--
-- ── WHY NOTHING BREAKS ──────────────────────────────────────────────────────
-- Every endpoint uses the service key, which bypasses row level security, so
-- a "service" policy never granted the server anything. The scoped policies
-- 010 and 019 created for a signed-in person's own rows are untouched.
--
-- ── SAFE TO RUN AGAIN ───────────────────────────────────────────────────────
-- Every statement is DROP POLICY IF EXISTS. A policy that is not there is
-- skipped. It writes no rows and reads none.
--
-- Afterwards, supabase/diagnostics/open-policies.sql lists anything still
-- open. It should print nothing.
-- ============================================================================

drop policy if exists "beta_codes_anon_select"  on public.beta_codes;
-- And the same open read from supabase/beta_codes_setup.sql, the script that
-- created the table, which no migration ever removed.
drop policy if exists "beta_codes_read_all"     on public.beta_codes;
drop policy if exists "feedback_anon_insert"    on public.feedback_submissions;

drop policy if exists "profiles_service"         on public.profiles;
drop policy if exists "partner_sessions_write"   on public.partner_sessions;
drop policy if exists "partner_sessions_service" on public.partner_sessions;
drop policy if exists "orders_service"           on public.orders;
drop policy if exists "feedback_service"         on public.feedback_submissions;
drop policy if exists "lmft_requests_service"    on public.lmft_requests;
