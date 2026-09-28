-- 076: one Shared Budget and one Merging Lives Checklist per couple.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "Budget and checklist should be mirrored for each partner. One partner
-- checking something off should show on both partners' checklists, same with
-- budget inputs. This structure should persist regardless of where the users are
-- accessing the resources (app or site)."
--
-- Both tools were stored on profiles.checklist_data and profiles.budget_data,
-- which is one each. Nothing anywhere read a partner's copy: /api/tool-data
-- selected and wrote id=eq.<the caller>, and a search across the server, the
-- website and the app found no read of the other side. So two people filled in
-- two budgets, neither could see the other, and the tool is called Shared Budget
-- and keys both of their incomes by name.
--
-- ── WHAT THIS ADDS ──────────────────────────────────────────────────────────
-- One row per couple, keyed by the same sorted-pair string shared notes use, so
-- both partners compute it from opposite sides and land on the same row.
--
-- `editing` is not data. It records who currently has a field open, so the other
-- one can be told, and it is rewritten constantly and read as ephemeral: a stamp
-- older than a few seconds means nobody is there. It lives on this row rather
-- than in a presence service because the app deliberately does not carry a
-- realtime client.
--
-- ── WHAT THIS DOES NOT DO ───────────────────────────────────────────────────
-- It does not drop profiles.checklist_data or profiles.budget_data, and it does
-- not copy them. A couple's existing work is moved up by the endpoint the first
-- time either of them opens the tool, because that is the only moment both
-- profiles are in hand and it can tell which side has something in it. Dropping
-- the old columns is a later migration, once every couple has been through.
--
-- ── ACCESS ──────────────────────────────────────────────────────────────────
-- Row level security on, and no policy. Nothing reaches this table except
-- /api/tool-data with the service key, which authenticates the caller and works
-- out their couple. A partner is not a role the database knows about, so a
-- policy here would have to re-derive the pairing from profiles on every read,
-- and that rule already exists in one place on the server.

create table if not exists public.couple_tools (
  couple_key   text primary key,
  checklist_data jsonb,
  budget_data    jsonb,
  -- { "<field id>": { "by": "<profile id>", "at": "<iso timestamp>" } }
  editing        jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.couple_tools enable row level security;

-- Reads always come with a couple key the server worked out, so this is the
-- only lookup shape there is. It is the primary key, so no extra index.

comment on table public.couple_tools is
  'One Shared Budget and one Merging Lives Checklist per couple, keyed by the sorted pair of profile ids. Written only by /api/tool-data with the service key.';
comment on column public.couple_tools.editing is
  'Ephemeral. Who has which field open right now, so the other partner can be shown. A stamp more than a few seconds old means nobody.';
