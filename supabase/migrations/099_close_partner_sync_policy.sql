-- ============================================================================
-- 099: close the last open rule the 098 check found.
--
-- After 098, supabase/diagnostics/open-policies.sql printed one row:
--
--   policy | partner_sync | service role only lets public ALL
--
-- Its name says it is for the server, and its test is `true` for the role
-- every browser holds, so anybody with the site's public key can read and
-- change every row of partner_sync. No file in this repo creates that table
-- or reads it: it was made by hand in the dashboard, and the server reaches
-- every table with the service key, which ignores these rules altogether.
-- So the rule grants the server nothing and the public everything.
--
-- ── SAFE TO RUN AGAIN, AND ON A DATABASE WITHOUT THE TABLE ──────────────────
-- DROP POLICY IF EXISTS skips a missing rule but still fails on a missing
-- table (that is what stopped the first 098), so the drop runs only when the
-- table is there. It writes no rows and reads none.
--
-- Afterwards, run open-policies.sql again. It should print nothing.
-- ============================================================================

do $$
begin
  if to_regclass('public.partner_sync') is not null then
    drop policy if exists "service role only" on public.partner_sync;
  end if;
end
$$;
