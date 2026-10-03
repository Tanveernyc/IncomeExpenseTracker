-- How a property ledger is used: long-term rental, flip, investment, or the owner's
-- own home. Label axis only — category scope and form fields still key off
-- property_type, so adding a use never re-opens the rental/personal split. Additive.
alter table properties
  add column if not exists property_use text
  check (property_use in ('long_term_rental', 'flip', 'investment', 'primary_home'));

-- Every existing property ledger predates uses; they were all rentals.
update properties set property_use = 'long_term_rental'
  where property_type = 'rental' and property_use is null;

-- A property ledger always carries a use; a personal budget never does.
alter table properties drop constraint if exists properties_use_shape;
alter table properties add constraint properties_use_shape check (
  (property_type = 'rental' and property_use is not null)
  or (property_type = 'personal' and property_use is null)
);
