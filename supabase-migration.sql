-- ============================================================
-- Attune — Supabase Schema v2 (full, safe to re-run)
-- Run this in Supabase SQL Editor → New query → Run
-- Uses IF NOT EXISTS / DO NOTHING so it's safe to run multiple times
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── user_profiles ─────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text,
  name               text,
  pronouns           text default '',
  partner_name       text default '',
  partner_pronouns   text default '',
  partner_email      text default '',
  invite_code        text unique,
  email_opt_in       boolean default true,
  partner_joined     boolean default false,
  pkg                text default 'core',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Safe: add any columns that might be missing from an earlier version
do $$ begin
  begin alter table public.user_profiles add column if not exists pronouns text default ''; exception when others then null; end;
  begin alter table public.user_profiles add column if not exists partner_pronouns text default ''; exception when others then null; end;
  begin alter table public.user_profiles add column if not exists partner_email text default ''; exception when others then null; end;
  begin alter table public.user_profiles add column if not exists email_opt_in boolean default true; exception when others then null; end;
  begin alter table public.user_profiles add column if not exists partner_joined boolean default false; exception when others then null; end;
  begin alter table public.user_profiles add column if not exists pkg text default 'core'; exception when others then null; end;
end $$;

-- RLS
alter table public.user_profiles enable row level security;
drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can view own profile"   on public.user_profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid() = id);

-- ── partner_sessions ──────────────────────────────────────────────────────
create table if not exists public.partner_sessions (
  id              uuid primary key default uuid_generate_v4(),
  invite_code     text unique not null,
  partner_b_id    uuid references auth.users(id) on delete set null,
  partner_b_name  text,
  ex1_answers     jsonb,
  ex2_answers     jsonb,
  ex3_answers     jsonb,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

do $$ begin
  begin alter table public.partner_sessions add column if not exists ex3_answers jsonb; exception when others then null; end;
end $$;

alter table public.partner_sessions enable row level security;
drop policy if exists "Service role full access partner_sessions" on public.partner_sessions;
create policy "Service role full access partner_sessions"
  on public.partner_sessions using (true) with check (true);

-- ── orders ────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                        uuid primary key default uuid_generate_v4(),
  order_num                 text unique not null,
  user_id                   uuid references auth.users(id) on delete set null,
  buyer_name                text,
  buyer_email               text,
  partner1_name             text,
  partner2_name             text,
  partner_email             text,
  pkg_key                   text not null,
  pkg_name                  text,
  is_gift                   boolean default false,
  is_physical               boolean default false,
  total                     numeric(8,2),
  addon_workbook            text,
  addon_lmft                boolean default false,
  gift_note                 text,
  workbook_status           text default 'pending',
  stripe_payment_intent_id  text,
  stripe_session_id         text,
  shipping_name             text,
  shipping_address          text,
  shipping_city             text,
  shipping_state            text,
  shipped_at                timestamptz,
  tracking_number           text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

do $$ begin
  begin alter table public.orders add column if not exists partner1_name text; exception when others then null; end;
  begin alter table public.orders add column if not exists partner2_name text; exception when others then null; end;
  begin alter table public.orders add column if not exists addon_lmft boolean default false; exception when others then null; end;
  begin alter table public.orders add column if not exists gift_note text; exception when others then null; end;
  begin alter table public.orders add column if not exists stripe_payment_intent_id text; exception when others then null; end;
end $$;

alter table public.orders enable row level security;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Service role full access orders" on public.orders;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Service role full access orders" on public.orders using (true) with check (true);

-- ── indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_partner_sessions_invite on public.partner_sessions(invite_code);
create index if not exists idx_orders_user_id          on public.orders(user_id);
create index if not exists idx_orders_buyer_email      on public.orders(buyer_email);
create index if not exists idx_orders_stripe_pi        on public.orders(stripe_payment_intent_id);
create index if not exists idx_user_profiles_invite    on public.user_profiles(invite_code);

-- ── updated_at trigger ────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists orders_updated_at   on public.orders;
drop trigger if exists profiles_updated_at on public.user_profiles;
create trigger orders_updated_at   before update on public.orders   for each row execute procedure public.handle_updated_at();
create trigger profiles_updated_at before update on public.user_profiles for each row execute procedure public.handle_updated_at();

-- ── auto-create profile on signup ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Done. ✓
