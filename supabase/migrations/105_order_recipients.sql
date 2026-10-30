-- ============================================================================
-- 105: who an order is for, and the link that sets up their account (A206).
--
-- Ellie (A205b): "If it's a purchase for you, two boxes should pop up, one
-- for your email and one for your partner's. If you select gift, one box
-- should pop up, for the email of one recipient." Plus a checkbox, "I will
-- invite my partner later".
--
-- The account is made when the payment goes through, for the buyer or for
-- the gift's recipient, and the confirmation email carries a link to choose a
-- password. That link is ours, not Supabase's, because Supabase's own links
-- expire after about an hour and an email is often opened the next day.
--
--   partner_email         the partner a buyer invited at checkout
--   recipient_email       who a gift is for
--   invite_partner_later  the buyer ticked "I will invite my partner later"
--   setup_token           the secret in the set-up link; every order has one
--   setup_used_at         when that link was first used. After that it
--                         sends the person to sign in rather than to set a
--                         password, so a forwarded email cannot reset it
--
-- And on profiles, partner_invited_at, for the "invite your partner" prompt
-- the dashboard shows somebody who chose "later" (below).
--
-- Safe to run again: every statement checks before it adds.
-- ============================================================================

alter table public.orders add column if not exists partner_email        text;
alter table public.orders add column if not exists recipient_email      text;
alter table public.orders add column if not exists invite_partner_later boolean not null default false;
alter table public.orders add column if not exists setup_token          uuid not null default gen_random_uuid();
alter table public.orders add column if not exists setup_used_at        timestamptz;

create unique index if not exists orders_setup_token_idx on public.orders (setup_token);

-- When this person last had us email their partner an invitation, from the
-- dashboard or the app (api/invite-partner.js). Ten minutes apart at most, so
-- the button cannot be used to send mail to anyone as often as it is pressed.
alter table public.profiles add column if not exists partner_invited_at timestamptz;
