-- ============================================================
-- ATTUNE — DATABASE SCHEMA
-- Run this once in the Supabase SQL Editor (Database → SQL Editor → New query)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per user. Created automatically when a new auth.users row is inserted.
-- Mirrors the account shape used in the app's localStorage.
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  name            text,
  pronouns        text default '',
  partner_name    text default '',
  partner_pronouns text default '',
  partner_email   text default '',
  email_opt_in    boolean default false,
  invite_code     text unique,
  partner_joined  boolean default false,
  pkg             text default 'core',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    lower(substring(md5(random()::text) from 1 for 8))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── partner_sessions ─────────────────────────────────────────────────────────
-- Stores Partner B's completed exercise answers, keyed by the invite_code
-- that Partner A generated. This is how cross-device sync works:
-- Partner B completes exercises → writes here → Partner A reads here.
create table if not exists public.partner_sessions (
  id              uuid default gen_random_uuid() primary key,
  invite_code     text not null,          -- matches profiles.invite_code of Partner A
  partner_b_id    uuid references auth.users(id) on delete set null,
  partner_b_name  text,
  ex1_answers     jsonb,                  -- Exercise 01 (Communication) raw answers
  ex2_answers     jsonb,                  -- Exercise 02 (Expectations) raw answers
  completed_at    timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(invite_code)                     -- one Partner B per invite code
);

-- ── exercise_sessions ────────────────────────────────────────────────────────
-- Stores a user's own completed exercise answers persistently.
-- Replaces attune_ex1 / attune_ex2 localStorage keys.
create table if not exists public.exercise_sessions (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  ex1_answers     jsonb,
  ex2_answers     jsonb,
  ex3_answers     jsonb,
  couple_type     jsonb,                  -- derived type object (name, id, color, etc.)
  exp_gaps        jsonb,                  -- derived expectation gaps array
  completed_at    timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)                         -- one active session per user (retake overwrites)
);

-- ── orders ───────────────────────────────────────────────────────────────────
-- Written by the checkout flow. Read by portal and admin.
create table if not exists public.orders (
  id              uuid default gen_random_uuid() primary key,
  order_num       text unique not null,   -- e.g. ATT-20260401-XXXX
  user_id         uuid references auth.users(id) on delete set null,
  buyer_name      text,
  buyer_email     text,
  partner_name    text,
  partner_email   text,
  pkg_key         text,                   -- core | newlywed | anniversary | premium
  pkg_name        text,
  is_gift         boolean default false,
  is_physical     boolean default false,
  total           numeric(8,2),
  addon_workbook  text,                   -- 'digital' | 'print' | null
  workbook_status text default 'pending', -- pending | generating | ready | print_queued | sent
  stripe_session_id text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── workbooks ────────────────────────────────────────────────────────────────
-- Stores generated workbook metadata and download URL.
create table if not exists public.workbooks (
  id              uuid default gen_random_uuid() primary key,
  order_id        uuid references public.orders(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  storage_path    text,                   -- Supabase Storage path
  download_url    text,                   -- signed URL (refreshed on demand)
  generated_at    timestamptz default now(),
  expires_at      timestamptz             -- for time-limited download links
);

-- ── feedback ─────────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete set null,
  type            text,                   -- beta_survey | general | lmft_review
  couple_type     text,
  answers         jsonb,
  message         text,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.partner_sessions  enable row level security;
alter table public.exercise_sessions enable row level security;
alter table public.orders            enable row level security;
alter table public.workbooks         enable row level security;
alter table public.feedback          enable row level security;

-- profiles: users can read/update only their own row
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- partner_sessions: Partner B can insert/update their session.
-- Partner A can read by invite_code (matched via their profile).
create policy "partner_sessions: partner B writes" on public.partner_sessions
  for insert with check (auth.uid() = partner_b_id);

create policy "partner_sessions: partner B updates" on public.partner_sessions
  for update using (auth.uid() = partner_b_id);

create policy "partner_sessions: partner A reads" on public.partner_sessions
  for select using (
    invite_code in (
      select invite_code from public.profiles where id = auth.uid()
    )
  );

create policy "partner_sessions: partner B reads own" on public.partner_sessions
  for select using (auth.uid() = partner_b_id);

-- exercise_sessions: users can only access their own
create policy "exercise_sessions: own row" on public.exercise_sessions
  for all using (auth.uid() = user_id);

-- orders: users can read their own orders; service role can write
create policy "orders: own read" on public.orders
  for select using (auth.uid() = user_id);

-- workbooks: users can read their own
create policy "workbooks: own read" on public.workbooks
  for select using (auth.uid() = user_id);

-- feedback: users can insert their own
create policy "feedback: insert own" on public.feedback
  for insert with check (auth.uid() = user_id or user_id is null);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_partner_sessions_invite_code on public.partner_sessions(invite_code);
create index if not exists idx_exercise_sessions_user_id    on public.exercise_sessions(user_id);
create index if not exists idx_orders_user_id               on public.orders(user_id);
create index if not exists idx_orders_order_num             on public.orders(order_num);
create index if not exists idx_workbooks_user_id            on public.workbooks(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_profiles          before update on public.profiles          for each row execute function touch_updated_at();
create trigger touch_partner_sessions  before update on public.partner_sessions  for each row execute function touch_updated_at();
create trigger touch_exercise_sessions before update on public.exercise_sessions for each row execute function touch_updated_at();
create trigger touch_orders            before update on public.orders            for each row execute function touch_updated_at();
