-- SECURITY HARDENING — closes three gaps found in the 2026-10-06 review.
-- Idempotent: safe to run more than once. Proven by __tests__/db/security.test.mjs.
--
-- 1. A user could insert or update their own category with is_system = true. The
--    select policy shows every system row to every user, so that category would
--    appear in everyone's picker. Users may now only write non-system rows.
--
-- 2. Foreign keys skip RLS, so a user could attach their own expense, income or
--    recurring rule to another user's property, category or rule id. Ids are
--    random, so this needed a leaked id, but it should be impossible, not
--    unlikely. A trigger now requires every referenced row to be the writer's
--    own (or a system category).
--
-- 3. Text columns had no length limit, so one account could store unbounded text.
--    Limits are far above anything the app's forms produce. NOT VALID: existing
--    rows are not rechecked, every new or updated row is.

-- 1. System categories are read-only to users --------------------------------
drop policy if exists "insert own categories" on categories;
create policy "insert own categories" on categories for insert
  with check (auth.uid() = user_id and is_system = false);

drop policy if exists "update own categories" on categories;
create policy "update own categories" on categories for update
  using (auth.uid() = user_id and is_system = false)
  with check (auth.uid() = user_id and is_system = false);

drop policy if exists "delete own categories" on categories;
create policy "delete own categories" on categories for delete
  using (auth.uid() = user_id and is_system = false);

-- 2. Every reference must be the writer's own --------------------------------
-- SECURITY DEFINER so the lookups see the row whatever its owner, and decide
-- ownership by comparing user_id explicitly; search_path is pinned so the
-- function cannot be redirected to look-alike tables.
--
-- On UPDATE a reference is only rechecked when it (or user_id) changed. That
-- matters for cascades: deleting a rule sets recurring_id to null on its
-- entries, and during an account or property delete the property may already
-- be gone when that update runs. Rechecking unchanged columns there would make
-- the delete fail.
create or replace function enforce_own_references() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_changed boolean := tg_op = 'INSERT' or new.user_id is distinct from old.user_id;
begin
  if (owner_changed or new.property_id is distinct from old.property_id)
     and not exists (select 1 from properties p
                      where p.id = new.property_id and p.user_id = new.user_id) then
    raise exception 'property not found' using errcode = '42501';
  end if;

  if (owner_changed or new.category_id is distinct from old.category_id)
     and not exists (select 1 from categories c
                      where c.id = new.category_id
                        and (c.is_system or c.user_id = new.user_id)) then
    raise exception 'category not found' using errcode = '42501';
  end if;

  -- recurring_rules has no recurring_id, and PL/pgSQL resolves every field in
  -- an IF even when an earlier condition is false, so this check returns early.
  if tg_table_name = 'recurring_rules' then
    return new;
  end if;

  if new.recurring_id is not null
     and (owner_changed or new.recurring_id is distinct from old.recurring_id)
     and not exists (select 1 from recurring_rules r
                      where r.id = new.recurring_id and r.user_id = new.user_id) then
    raise exception 'recurring rule not found' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function enforce_own_references() from public;

drop trigger if exists expenses_own_references on expenses;
create trigger expenses_own_references
  before insert or update on expenses
  for each row execute function enforce_own_references();

drop trigger if exists income_own_references on income;
create trigger income_own_references
  before insert or update on income
  for each row execute function enforce_own_references();

drop trigger if exists recurring_rules_own_references on recurring_rules;
create trigger recurring_rules_own_references
  before insert or update on recurring_rules
  for each row execute function enforce_own_references();

-- 3. Text length limits -------------------------------------------------------
alter table properties drop constraint if exists properties_text_lengths;
alter table properties add constraint properties_text_lengths check (
  char_length(name) <= 200 and char_length(coalesce(address, '')) <= 500
  and char_length(coalesce(notes, '')) <= 5000
) not valid;

alter table categories drop constraint if exists categories_text_lengths;
alter table categories add constraint categories_text_lengths check (
  char_length(name) <= 100 and char_length(coalesce(description, '')) <= 500
) not valid;

alter table expenses drop constraint if exists expenses_text_lengths;
alter table expenses add constraint expenses_text_lengths check (
  char_length(coalesce(vendor, '')) <= 200 and char_length(coalesce(notes, '')) <= 5000
) not valid;

alter table income drop constraint if exists income_text_lengths;
alter table income add constraint income_text_lengths check (
  char_length(coalesce(source, '')) <= 200 and char_length(coalesce(notes, '')) <= 5000
) not valid;

alter table recurring_rules drop constraint if exists recurring_rules_text_lengths;
alter table recurring_rules add constraint recurring_rules_text_lengths check (
  char_length(coalesce(party, '')) <= 200 and char_length(coalesce(notes, '')) <= 5000
) not valid;
