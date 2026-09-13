-- Migration 058: record when someone accepted the Terms and Privacy Policy
-- ============================================================================
-- WHY
--
-- The published retention policy says:
--
--   "Timestamped records of user consent events (when each partner accepted
--    Terms and Privacy Policy). Retained for 7 years from the consent date for
--    legal compliance purposes. These records are retained even after account
--    deletion."
--
-- Nothing recorded one. There was no checkbox, no column and no table. The
-- EULA on the same page takes the position that buying is the act of agreeing,
-- which makes the order row the nearest thing we had, and deleting an account
-- deletes the orders. So nothing survived deletion, and the policy said these
-- records specifically do.
--
-- WHAT SURVIVES DELETION, AND WHAT THAT COSTS
--
-- user_id is ON DELETE SET NULL rather than CASCADE, so the row outlives the
-- account. That is the whole point of the paragraph: to be able to show that
-- someone agreed, after they are gone.
--
-- But a record that cannot be tied to anyone proves nothing, and a record that
-- holds an email address after deletion contradicts the promise one paragraph
-- earlier that the address is deleted. So this stores neither. It stores
-- subject_hash: SHA-256 of the lowercased email with a server-side pepper.
-- Nobody can read an address out of it. Somebody disputing a consent can be
-- checked by hashing the address they present and looking for the row.
--
-- THAT PART NEEDS A LAWYER
--
-- Whether a hashed address is personal data under GDPR depends on whether the
-- pepper is held separately, and whether seven years of these is the right
-- answer at all is not a question this migration can settle. It is written up
-- in LEGAL-VS-CODE.md. What it does do is stop the policy describing records
-- that do not exist.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.consent_events (
  id            uuid primary key default gen_random_uuid(),

  -- Nulled when the account is deleted, not cascaded. The row is the record.
  user_id       uuid references public.profiles(id) on delete set null,

  -- SHA-256 of lower(email) with the CONSENT_PEPPER env value appended. Lets a
  -- specific person's consent be found again without storing their address.
  subject_hash  text not null,

  -- Which words they agreed to. A hash of the Privacy Policy and Terms text,
  -- from api/_lib/legal-version.js, regenerated whenever either changes. Not a
  -- date: two of those documents are published with no date at all.
  legal_version text not null,

  -- Where the agreement happened: 'checkout' or 'account_creation'.
  source        text not null,

  accepted_at   timestamptz not null default now(),

  -- Kept for a dispute about where a consent came from. Country only, never
  -- the address itself.
  country       text
);

create index if not exists consent_events_subject_idx
  on public.consent_events (subject_hash, accepted_at desc);
create index if not exists consent_events_user_idx
  on public.consent_events (user_id);

comment on table public.consent_events is
  'When someone accepted the Terms and Privacy Policy. Survives account deletion by design; holds no address, only a peppered hash of one.';

alter table public.consent_events enable row level security;

-- No policy for anyone. Only the service role writes and reads these, which is
-- what the endpoints use. A person cannot read their own consent record from
-- the client, and nothing in the product needs them to.
