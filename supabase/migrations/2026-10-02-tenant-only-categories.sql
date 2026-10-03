-- Income that only exists when a tenant is in place. A flip is held to resell and
-- a primary home is lived in, so neither should be offered Rent or Late Fee.
-- Scope still decides rental-vs-budget; this narrows the rental set by property_use.
alter table categories
  add column if not exists tenant_only boolean not null default false;

update categories set tenant_only = true
 where is_system = true and kind = 'income'
   and name in ('Rent', 'Late Fee', 'Pet Fee', 'Security Deposit Retained',
                'Laundry/Vending', 'Parking');
