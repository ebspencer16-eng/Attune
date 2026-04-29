-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Calendly-driven LMFT scheduling
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the manual "request availability via form" flow with Calendly
-- self-scheduling. The /api/calendly-webhook endpoint receives invitee.created
-- and invitee.canceled events from Calendly and writes here.
--
-- Old columns (availability, notes, timezone) are kept so legacy rows still
-- work and the admin page can show both legacy + new requests in one table.
--
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.lmft_requests
  add column if not exists event_uri          text,            -- Calendly scheduled_event URI (uniquely identifies the booking)
  add column if not exists invitee_uri        text,            -- Calendly invitee URI (used for cancellation lookups)
  add column if not exists event_type_uri     text,            -- which Calendly event type was booked (LMFT 50min)
  add column if not exists scheduled_start    timestamptz,     -- when the session starts
  add column if not exists scheduled_end      timestamptz,     -- when the session ends
  add column if not exists video_url          text,            -- Zoom/Google Meet URL from Calendly
  add column if not exists reschedule_url     text,            -- Calendly reschedule link (per-invitee)
  add column if not exists cancel_url         text,            -- Calendly cancellation link
  add column if not exists therapist_name     text,            -- the LMFT assigned (host name from Calendly)
  add column if not exists therapist_email    text,            -- the LMFT email
  add column if not exists cancelled_at       timestamptz,     -- when the booking was cancelled
  add column if not exists cancellation_reason text,           -- reason given on cancel (if any)
  add column if not exists calendly_payload   jsonb,           -- full webhook payload for debugging / reprocessing
  add column if not exists user_id            uuid references public.profiles(id) on delete set null;

-- Idempotency: prevent duplicate inserts when Calendly retries the same webhook.
-- event_uri is null for legacy rows so we use a partial unique index.
create unique index if not exists lmft_requests_event_uri_uniq
  on public.lmft_requests(event_uri)
  where event_uri is not null;

-- For admin page sort by scheduled time
create index if not exists lmft_requests_scheduled_start_idx
  on public.lmft_requests(scheduled_start);

-- For looking up by order
create index if not exists lmft_requests_order_id_idx
  on public.lmft_requests(order_id);

-- Status values for the new flow:
--   'pending'    — legacy: form submitted, awaiting manual scheduling
--   'scheduled'  — Calendly booking exists (set by invitee.created webhook)
--   'cancelled'  — Calendly booking cancelled (set by invitee.canceled webhook)
--   'completed'  — manually marked complete in admin after the session
--   'rescheduled'— manually flagged in admin (Calendly handles reschedule via reschedule_url)
-- The default 'pending' stays for any legacy rows.
