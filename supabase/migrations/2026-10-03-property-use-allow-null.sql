-- URGENT FIX for 2026-10-02-property-use.sql.
--
-- That migration required property_use on every rental row. The shipped 1.0
-- client does not send the column, so once the migration was applied every
-- "Create Property" from a not-yet-updated binary failed with a raw CHECK
-- violation. A column DEFAULT does not fix it either: the same old client
-- creating a personal budget would then inherit the default and break the
-- other branch of the constraint.
--
-- Null is already treated as long_term_rental everywhere in the app
-- (ledgerHasTenants, ledgerMetaLabel, the form's fallback), so allowing it
-- costs nothing. A budget still must not carry a use.
alter table properties drop constraint if exists properties_use_shape;
alter table properties add constraint properties_use_shape check (
  property_type = 'rental' or property_use is null
);
