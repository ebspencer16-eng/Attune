-- ============================================================
-- Attune — Supabase Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
-- Safe to run in order; each block is idempotent.
-- ============================================================

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text,
  pronouns              text default '',
  partner_name          text default '',
  partner_pronouns      text default '',
  partner_email         text default '',
  email_opt_in          boolean default true,
  invite_code           text unique,
  partner_joined        boolean default false,
  pkg                   text default 'core',
  ex3_completed         boolean default false,
  checkin_6mo_sent_at   timestamptz,
  checkin_1yr_sent_at   timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
alter table public.profiles enable row level security;
create policy if not exists "profiles_self" on public.profiles
  using (auth.uid() = id) with check (auth.uid() = id);
create policy if not exists "profiles_service" on public.profiles using (true) with check (true);

create table if not exists public.partner_sessions (
  invite_code       text primary key,
  partner_b_id      uuid,
  partner_b_name    text,
  ex1_answers       jsonb,
  ex2_answers       jsonb,
  ex3_answers       jsonb,
  completed_at      timestamptz,
  created_at        timestamptz default now()
);
alter table public.partner_sessions enable row level security;
create policy if not exists "partner_sessions_write" on public.partner_sessions
  for insert using (true) with check (true);
create policy if not exists "partner_sessions_service" on public.partner_sessions using (true) with check (true);

create table if not exists public.orders (
  id                        bigserial primary key,
  order_num                 text unique not null,
  buyer_name                text,
  buyer_email               text,
  partner1_name             text,
  partner2_name             text,
  pkg_key                   text,
  is_gift                   boolean default false,
  is_physical               boolean default false,
  total                     numeric(8,2),
  addon_workbook            text,
  addon_lmft                boolean default false,
  gift_note                 text,
  stripe_payment_intent_id  text unique,
  workbook_status           text default 'pending',
  card_status               text default 'pending',
  fulfillment_notes         text,
  created_at                timestamptz default now()
);
alter table public.orders enable row level security;
create policy if not exists "orders_service" on public.orders using (true) with check (true);

create table if not exists public.feedback_submissions (
  id             bigserial primary key,
  type           text,
  rating         text,
  text           text,
  email          text,
  couple_type    text,
  source         text,
  submitted_at   timestamptz default now()
);
alter table public.feedback_submissions enable row level security;
create policy if not exists "feedback_service" on public.feedback_submissions using (true) with check (true);

create table if not exists public.lmft_requests (
  id             bigserial primary key,
  p1_name        text not null,
  p2_name        text,
  email          text not null,
  timezone       text,
  availability   text,
  notes          text,
  order_id       text,
  status         text default 'pending',
  scheduled_at   timestamptz,
  created_at     timestamptz default now()
);
alter table public.lmft_requests enable row level security;
create policy if not exists "lmft_requests_service" on public.lmft_requests using (true) with check (true);

create index if not exists profiles_invite_code_idx on public.profiles(invite_code);
create index if not exists profiles_checkin_6mo_idx on public.profiles(checkin_6mo_sent_at);
create index if not exists profiles_checkin_1yr_idx on public.profiles(checkin_1yr_sent_at);
create index if not exists orders_pkg_key_idx on public.orders(pkg_key);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── exercise answer columns on profiles (add if missing) ────────────────────
-- Added to support cross-device results retrieval
alter table public.profiles add column if not exists ex1_answers jsonb;
alter table public.profiles add column if not exists ex2_answers jsonb;
alter table public.profiles add column if not exists ex3_answers jsonb;
