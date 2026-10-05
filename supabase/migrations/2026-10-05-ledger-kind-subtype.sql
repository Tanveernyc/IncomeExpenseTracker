-- Property is the master type; how it is used is its subtype.
--
-- Before: property_type 'rental' | 'personal' with property_use underneath, so the
-- form read "Rental property > Primary home" — a home you live in filed under rentals.
-- After:
--   ledger_kind      'property' | 'budget'
--   property_subtype 'rental' | 'primary_residence' | 'investment' | 'flip'  (null for a budget)
--   categories.scope 'property' | 'budget' | 'both'
--
-- The 1.0 client on the App Store still reads and writes property_type with the old
-- values and never sends a subtype. property_type is therefore kept as a legacy
-- mirror: a trigger derives ledger_kind from it when an old client writes it, and
-- rewrites it from ledger_kind on every write, so 1.0 keeps seeing 'rental' /
-- 'personal' exactly as before. New clients never touch property_type. Drop the
-- column and the trigger once 1.0 is retired.

begin;

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

commit;
