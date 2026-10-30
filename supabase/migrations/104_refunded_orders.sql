-- ============================================================================
-- 104: where a refunded order goes (A204f).
--
-- Ellie, asked what a refund in Stripe should do: "A", which was "take the
-- access away and stop counting the sale".
--
-- A fully refunded order is moved out of `orders` into this table by
-- /api/stripe-webhook. Moving it, rather than marking it, is the point: about
-- twenty places read `orders` to decide what somebody owns or what the admin
-- counts, and every one of them stops seeing the order without being edited.
-- A flag would have needed all twenty to remember to read it.
--
--   order_num                 the order's own number, so a retried refund
--                             signal cannot write it twice
--   user_id, buyer_email      who it belonged to, so deleting an account
--                             also deletes this (api/delete-account.js)
--   stripe_payment_intent_id  the payment it came from
--   refunded_at               when Stripe said it was refunded
--   order_row                 the whole order as it was, kept as one value
--                             so a column added to `orders` later cannot
--                             stop a refund from moving
--
-- Row level security on, with no policies: only the server's key reads or
-- writes it, the same as `orders`.
--
-- Safe to run again: every statement checks before it creates.
-- ============================================================================

create table if not exists public.refunded_orders (
  order_num                text primary key,
  user_id                  uuid,
  buyer_email              text,
  stripe_payment_intent_id text,
  refunded_at              timestamptz not null default now(),
  order_row                jsonb not null
);
alter table public.refunded_orders enable row level security;

create index if not exists refunded_orders_user_id_idx on public.refunded_orders (user_id);
create index if not exists refunded_orders_buyer_email_idx on public.refunded_orders (buyer_email);
