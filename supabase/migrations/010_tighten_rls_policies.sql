-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Tighten RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
-- The original schema had wide-open policies like
--   create policy "profiles_service" on profiles using (true) with check (true)
-- which grants access to ANYONE using the anon key (i.e. anyone who can read
-- the website source). This migration removes those and replaces them with
-- properly scoped policies.
--
-- Service role (used by API endpoints with SUPABASE_SERVICE_KEY) bypasses
-- RLS automatically, so explicit "service" policies were always redundant.
--
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── PROFILES: COLUMN FOR RESULTS-EMAIL DEDUP ────────────────────────────────
-- Used by /api/send-email's results_viewed handler to prevent duplicate
-- emails when both partners hit the results page simultaneously.

alter table public.profiles
  add column if not exists results_email_sent_at timestamptz;

-- ── PROFILES ────────────────────────────────────────────────────────────────
-- Users can read/write their own profile.
-- Partner A can read Partner B's profile (and vice versa) ONLY if linked
-- via partner_profile_id. This is required so the dashboard can display the
-- partner's exercise answers in the joint results view.

drop policy if exists "profiles_self"    on public.profiles;
drop policy if exists "profiles_service" on public.profiles;

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_partner_select"
  on public.profiles for select
  using (
    auth.uid() in (
      select id from public.profiles where partner_profile_id = profiles.id
    )
  );

create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ── ORDERS ──────────────────────────────────────────────────────────────────
-- Users can read their own orders (matched by user_id OR by buyer_email
-- against their auth email — since older orders may be missing user_id).
-- Writes happen exclusively via the Stripe webhook using service role,
-- which bypasses RLS.

drop policy if exists "orders_service" on public.orders;

create policy "orders_self_select"
  on public.orders for select
  using (
    auth.uid() = user_id
    or buyer_email = (select email from auth.users where id = auth.uid())
  );

create policy "orders_self_update_link"
  on public.orders for update
  using (
    auth.uid() = user_id
    or (user_id is null and buyer_email = (select email from auth.users where id = auth.uid()))
  )
  with check (
    -- Only allow setting user_id to self; everything else is server-side.
    auth.uid() = user_id
  );

-- ── PARTNER_SESSIONS ────────────────────────────────────────────────────────
-- Legacy table, no longer used by the app (data now lives on profiles).
-- We keep the table for any historical rows but lock it down so anon key
-- can no longer read it.

drop policy if exists "partner_sessions_write"   on public.partner_sessions;
drop policy if exists "partner_sessions_service" on public.partner_sessions;

-- Without any policy + RLS enabled, anon access is fully blocked.
-- Service role bypasses RLS and can still maintain the table if needed.

-- ── LMFT_REQUESTS ───────────────────────────────────────────────────────────
-- Bookings come in via the Calendly webhook (service role) or the legacy
-- /api/lmft-request endpoint (also service role). No client-side reads or
-- writes via anon key are needed.

drop policy if exists "lmft_requests_service" on public.lmft_requests;

-- Same pattern: no policy + RLS enabled = anon blocked. Service role
-- bypasses for webhook writes and admin-page reads (which use the anon
-- key BUT the admin page is meant to be private — protected by a passcode
-- in the page itself, not RLS. If you want admin to use anon key for
-- reads, add: create policy "lmft_admin_read" on lmft_requests for select
-- using (true);  — but the safer pattern is admin uses service role.)

-- ── FEEDBACK_SUBMISSIONS ────────────────────────────────────────────────────
-- Public feedback widget needs to be able to insert without auth.

drop policy if exists "feedback_service" on public.feedback_submissions;

create policy "feedback_anon_insert"
  on public.feedback_submissions for insert
  with check (true);

-- Reads stay locked down (admin uses service role).

-- ── BETA_CODES ──────────────────────────────────────────────────────────────
-- Anyone needs to read beta_codes to validate codes at checkout.
-- Verify which policies exist first; this is a no-op if not yet set up.

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'beta_codes') then
    -- Allow anon to read codes (so client-side validation works).
    -- Writes are admin-only via service role.
    drop policy if exists "beta_codes_anon_select" on public.beta_codes;
    create policy "beta_codes_anon_select" on public.beta_codes for select using (true);
  end if;
end $$;

-- ── QR_TOKENS ───────────────────────────────────────────────────────────────
-- Reads happen via /api/qr-claim (service role). No anon needed.

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'qr_tokens') then
    drop policy if exists "qr_tokens_service" on public.qr_tokens;
    -- No anon policy. Service role bypasses RLS.
  end if;
end $$;

-- ── VERIFICATION ────────────────────────────────────────────────────────────
-- After running, confirm the policies look right:
--
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
