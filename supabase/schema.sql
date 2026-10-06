-- PropertyLedger schema — spec §3. Run once in the Supabase SQL Editor (Phase 1).
-- Money columns are numeric(12,2), never float (float sums drift). RLS on every table.

-- PROPERTIES
create table properties (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  address       text,
  property_type text not null check (property_type in ('rental','personal')),
  purchase_date date,
  purchase_price numeric(12,2),
  notes         text,
  is_archived   boolean not null default false,  -- archive instead of delete: sell a property, keep the records
  created_at    timestamptz not null default now()
);

-- EXPENSE CATEGORIES (seeded system defaults + user-created; see seed_categories.sql)
create table categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade, -- null = system default
  name       text not null,
  kind       text not null check (kind in ('expense','income')),
  is_system  boolean not null default false,
  created_at timestamptz not null default now()
);

-- EXPENSES
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  property_id  uuid not null references properties(id) on delete cascade,
  category_id  uuid not null references categories(id),
  amount       numeric(12,2) not null check (amount > 0),
  paid_on      date not null,  -- when money left the account
  period_start date,           -- optional: what span this bill covers (e.g. 2026 school tax paid Sep 2025)
  period_end   date,
  vendor       text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- INCOME
create table income (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  category_id uuid not null references categories(id),
  amount      numeric(12,2) not null check (amount > 0),
  received_on date not null,
  source      text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Indexes for the P&L / history queries (filter by user + property/category + date)
create index on expenses (user_id, property_id, paid_on);
create index on expenses (user_id, category_id, paid_on);
create index on income   (user_id, property_id, received_on);

-- ROW LEVEL SECURITY — every table, every operation.
-- Without RLS, anyone holding the anon key can read all rows via the Data API.
alter table properties enable row level security;
alter table categories enable row level security;
alter table expenses   enable row level security;
alter table income     enable row level security;

create policy "own properties" on properties for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Categories: users see system defaults + their own; can only mutate their own.
create policy "own or system categories" on categories for select
  using (auth.uid() = user_id or is_system = true);
create policy "insert own categories" on categories for insert
  with check (auth.uid() = user_id);
create policy "update own categories" on categories for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own categories" on categories for delete
  using (auth.uid() = user_id);

create policy "own expenses" on expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own income" on income for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RECURRING RULES (Phase 15)

create table if not exists recurring_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  category_id uuid not null references categories(id),
  kind        text not null check (kind in ('expense','income')),
  amount      numeric(12,2) not null check (amount > 0),
  notes       text,
  start_month date not null check (extract(day from start_month) = 1),
  end_mode    text not null check (end_mode in ('count','until_stopped')),
  occurrences int check (occurrences is null or occurrences > 0),
  stopped_on  date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  -- count rules must carry a count; until_stopped rules must not
  constraint recurring_rules_end_mode_shape check (
    (end_mode = 'count' and occurrences is not null)
    or (end_mode = 'until_stopped' and occurrences is null)
  )
);

alter table expenses
  add column if not exists recurring_id uuid references recurring_rules(id) on delete set null,
  add column if not exists is_edited boolean not null default false;

alter table income
  add column if not exists recurring_id uuid references recurring_rules(id) on delete set null,
  add column if not exists is_edited boolean not null default false;

create index if not exists recurring_rules_user_property_idx on recurring_rules (user_id, property_id);
create index if not exists expenses_recurring_idx on expenses (recurring_id) where recurring_id is not null;
create index if not exists income_recurring_idx   on income   (recurring_id) where recurring_id is not null;

alter table recurring_rules enable row level security;

create policy "own recurring" on recurring_rules for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Months the user deleted from a rule; the generator treats them as already present.
alter table recurring_rules
  add column if not exists skipped_months date[] not null default '{}';

-- Phase 15b: vendor/source template on recurring rules.
alter table recurring_rules
  add column if not exists party text;

-- CATEGORY SCOPE (personal budgets)
alter table categories
  add column if not exists scope text not null default 'rental'
  check (scope in ('rental', 'personal', 'both'));

-- PROPERTY USE — how a property ledger is used. Label axis only: category scope
-- and form fields still key off property_type, so adding a use never re-opens
-- the rental/personal split.
alter table properties
  add column if not exists property_use text
  check (property_use in ('long_term_rental', 'flip', 'investment', 'primary_home'));

update properties set property_use = 'long_term_rental'
  where property_type = 'rental' and property_use is null;

-- A budget never carries a use. A property may leave it null: clients older than
-- this column do not send it, and null reads as long_term_rental throughout.
alter table properties drop constraint if exists properties_use_shape;
alter table properties add constraint properties_use_shape check (
  property_type = 'rental' or property_use is null
);

-- TENANT-ONLY CATEGORIES — income that needs a tenant in place. Narrows the
-- rental set by property_use: a flip or primary home never sees Rent/Late Fee.
alter table categories
  add column if not exists tenant_only boolean not null default false;

update categories set tenant_only = true
 where is_system = true and kind = 'income'
   and name in ('Rent', 'Late Fee', 'Pet Fee', 'Security Deposit Retained',
                'Laundry/Vending', 'Parking');

-- LEDGER KIND + PROPERTY SUBTYPE — property is the master type, its use the subtype.
-- Full rationale and the 1.0 compatibility trigger: migrations/2026-10-05-ledger-kind-subtype.sql

-- 1. Ledger kind ------------------------------------------------------------
alter table properties add column if not exists ledger_kind text;

update properties
   set ledger_kind = case property_type when 'personal' then 'budget' else 'property' end
 where ledger_kind is null;

alter table properties alter column ledger_kind set not null;
alter table properties drop constraint if exists properties_ledger_kind_check;
alter table properties add constraint properties_ledger_kind_check
  check (ledger_kind in ('property', 'budget'));

-- 2. Property subtype (was property_use) -----------------------------------
alter table properties drop constraint if exists properties_use_shape;
alter table properties drop constraint if exists properties_property_use_check;
alter table properties rename column property_use to property_subtype;

update properties set property_subtype = case property_subtype
    when 'long_term_rental' then 'rental'
    when 'primary_home' then 'primary_residence'
    else property_subtype
  end;

-- Rows saved by 1.0 (or before subtypes existed) were all rentals.
update properties set property_subtype = 'rental'
 where ledger_kind = 'property' and property_subtype is null;
update properties set property_subtype = null where ledger_kind = 'budget';

alter table properties add constraint properties_property_subtype_check
  check (property_subtype in ('rental', 'primary_residence', 'investment', 'flip'));
alter table properties add constraint properties_subtype_shape check (
  (ledger_kind = 'property' and property_subtype is not null)
  or (ledger_kind = 'budget' and property_subtype is null)
);

-- 3. Legacy property_type: optional for new clients, kept in sync for 1.0 ----
alter table properties alter column property_type drop not null;

create or replace function properties_sync_legacy_type() returns trigger
language plpgsql as $$
begin
  -- An old client set or changed property_type without touching ledger_kind.
  if new.property_type is not null and (
       (tg_op = 'INSERT' and new.ledger_kind is null)
    or (tg_op = 'UPDATE' and new.property_type is distinct from old.property_type
                         and new.ledger_kind is not distinct from old.ledger_kind)
  ) then
    new.ledger_kind := case new.property_type when 'personal' then 'budget' else 'property' end;
  end if;

  if new.ledger_kind = 'budget' then
    new.property_subtype := null;
  elsif new.ledger_kind = 'property' and new.property_subtype is null then
    new.property_subtype := 'rental';
  end if;

  new.property_type := case new.ledger_kind when 'budget' then 'personal' else 'rental' end;
  return new;
end;
$$;

drop trigger if exists properties_sync_legacy_type on properties;
create trigger properties_sync_legacy_type
  before insert or update on properties
  for each row execute function properties_sync_legacy_type();

-- 4. Category scope --------------------------------------------------------
alter table categories drop constraint if exists categories_scope_check;
update categories set scope = case scope
    when 'rental' then 'property'
    when 'personal' then 'budget'
    else scope
  end;
alter table categories alter column scope set default 'property';
alter table categories add constraint categories_scope_check
  check (scope in ('property', 'budget', 'both'));


-- CATEGORY DESCRIPTIONS + CATALOG — one line under the picker for names that are
-- easy to mix up. The system rows themselves come from src/lib/category-catalog.ts
-- (seed_categories.sql and migrations/2026-10-06-category-catalog.sql are generated).
alter table categories add column if not exists description text;


-- SECURITY HARDENING (2026-10-07) — full rationale: migrations/2026-10-07-security-hardening.sql
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
