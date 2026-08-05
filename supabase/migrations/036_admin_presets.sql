-- 036_admin_presets.sql
-- Saved Explore crosstab presets, shared across admins (Ellie + Carolina see the
-- same set). Each preset stores the full view: row field, column field, cell
-- mode, optional measure, and any filters.

create table if not exists public.admin_presets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  config     jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Seed the six starter presets once (skip if any defaults already exist so a
-- re-run does not duplicate them).
insert into public.admin_presets (name, config, is_default)
select v.name, v.config::jsonb, true
from (values
  ('Individual type × Gender',                        '{"row":"type","col":"gender","cell":"count","measure":"","filters":[]}'),
  ('Package × Age',                                   '{"row":"pkg","col":"age_range","cell":"count","measure":"","filters":[]}'),
  ('Package × Signup source',                         '{"row":"pkg","col":"signup_source","cell":"count","measure":"","filters":[]}'),
  ('Financial risk tolerance × Individual type',      '{"row":"lq_money_risk","col":"type","cell":"count","measure":"","filters":[]}'),
  ('When family & partner conflict × Individual type','{"row":"lq_family_conf","col":"type","cell":"count","measure":"","filters":[]}'),
  ('Conflict × Gender',                               '{"row":"dim_conflict","col":"gender","cell":"count","measure":"","filters":[]}')
) as v(name, config)
where not exists (select 1 from public.admin_presets where is_default = true);
