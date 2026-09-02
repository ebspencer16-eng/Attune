-- Grant Exercise 5 (Conflict Patterns) to the beta testers
-- ============================================================================
-- A direct entitlement grant rather than a promo code, because a code would
-- have to travel through the payment path: validate-promo, the checkout
-- summary, the payment intent, the Stripe webhook. That path has never been
-- exercised with a real transaction, and this is not the moment to find out.
-- A grant writes the same flag the webhook would write, in one statement.
--
-- WHY ALL FOUR. Exercise 5 results gate on both partners finishing, like every
-- other exercise. Granting Carolina without Aaron would let her take it and
-- never see a result. Same for Ellie without Preston.
--
-- WHAT THIS SETS
--   orders.addon_conflict     the source of truth the entitlement engine reads
--   profiles.addon_conflict   the mirror the app and partner sync read
--
-- Both, because computeEntitlements reads orders while the client's pkg
-- capability reads the profile mirror. Setting one and not the other produces
-- the state where the exercise is owned but invisible, or visible but not
-- owned.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

do $$
declare
  emails constant text[] := array[
    lower('ebspencer16@gmail.com'),    -- Ellie
    lower('mightyhunter00@gmail.com'), -- Preston
    lower('carolina.c.cannon@gmail.com'), -- Carolina
    lower('aaron.m.miner@gmail.com')   -- Aaron, so Carolina's results can unlock
  ];
  uids uuid[];
  n_profiles int;
  n_orders int;
begin
  select coalesce(array_agg(id), '{}') into uids
    from auth.users where lower(email) = any(emails);

  if coalesce(array_length(uids, 1), 0) <> 4 then
    raise exception 'Expected 4 auth users, found %. Nothing changed.',
      coalesce(array_length(uids, 1), 0);
  end if;

  -- The mirror the client reads.
  update public.profiles set addon_conflict = true where id = any(uids);
  get diagnostics n_profiles = row_count;

  -- The source of truth the entitlement engine reads. Every order belonging to
  -- these people, so it survives an entitlement recompute.
  update public.orders o set addon_conflict = true
   where o.user_id = any(uids)
      or lower(o.email) in (select lower(email) from auth.users where id = any(uids));
  get diagnostics n_orders = row_count;

  raise notice 'profiles granted: %, orders updated: %', n_profiles, n_orders;

  if n_orders = 0 then
    raise notice 'No order rows matched. The profile flag alone still grants access in the app, but an entitlement recompute could clear it. Check the orders table column names if this persists.';
  end if;
end $$;

-- ── Verification. Expect owns_conflict = true for all four. ────────────────
select
  u.email,
  p.addon_conflict                                   as profile_flag,
  (select count(*) from public.orders o
     where (o.user_id = u.id or lower(o.email) = lower(u.email))
       and o.addon_conflict)                         as orders_with_addon,
  coalesce(p.addon_conflict, false)                  as owns_conflict,
  p.conflict_data is not null                        as has_taken_it,
  p.partner_profile_id is not null                   as partner_linked
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) in (
  'ebspencer16@gmail.com',
  'mightyhunter00@gmail.com',
  'carolina.c.cannon@gmail.com',
  'aaron.m.miner@gmail.com'
)
order by u.email;
