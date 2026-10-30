-- ============================================================================
-- 102: every order's buyer email in lower case, now and from now on (A202).
--
-- Checkout and the Stripe webhook stored the address exactly as the buyer
-- typed it. Sign-in addresses are stored in lower case. Everything that finds
-- a buyer's order by address compares the two exactly: the row rule that lets
-- somebody read their own order, the website's order restore, and the
-- server's purchase check, entitlements and core-ownership lookups. So a
-- buyer who typed "Jane@Example.com" had an order nothing could find by
-- address, and unless it had already been linked to their account, the app
-- could refuse them as somebody who had not bought.
--
-- Two parts:
--   1. A trigger lower-cases buyer_email on every insert and update, so the
--      rule holds whoever writes the row: checkout, the webhook, or the SQL
--      editor. The code lower-cases too; this is what makes it a guarantee.
--   2. One update for the rows already stored.
--
-- Safe to run again: the function and trigger are replaced, and the update
-- only touches rows that are not already lower case.
-- ============================================================================

create or replace function public.orders_buyer_email_lower()
returns trigger
language plpgsql
as $$
begin
  if new.buyer_email is not null then
    new.buyer_email := lower(trim(new.buyer_email));
  end if;
  return new;
end
$$;

drop trigger if exists orders_buyer_email_lower on public.orders;
create trigger orders_buyer_email_lower
  before insert or update of buyer_email on public.orders
  for each row execute function public.orders_buyer_email_lower();

-- The count comes back as a result row: the SQL Editor shows a table, and
-- a NOTICE can go unseen.
with changed as (
  update public.orders
     set buyer_email = lower(trim(buyer_email))
   where buyer_email is not null
     and buyer_email <> lower(trim(buyer_email))
  returning 1
)
select count(*) as orders_lower_cased from changed;
