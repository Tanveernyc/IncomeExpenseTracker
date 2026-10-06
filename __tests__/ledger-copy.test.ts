// Personal budgets - every user-facing noun that depends on ledger kind (spec §3).
import {
  collectionNoun,
  collectionTitle,
  kindsOf,
  ledgerMetaLabel,
  nounFor,
  partyLabel,
  propertySubtypeLabel,
} from '../src/lib/ledger-copy';
import type { PropertySubtype } from '../src/types';

describe('nounFor', () => {
  it('property is Property, budget is Household', () => {
    expect(nounFor('property')).toEqual({ one: 'Property', many: 'Properties' });
    expect(nounFor('budget')).toEqual({ one: 'Household', many: 'Households' });
  });
});

describe('partyLabel', () => {
  it('property expenses have a Vendor; budget expenses have a Payee; income is always Source', () => {
    expect(partyLabel('property', 'expense')).toBe('Vendor');
    expect(partyLabel('budget', 'expense')).toBe('Payee');
    expect(partyLabel('property', 'income')).toBe('Source');
    expect(partyLabel('budget', 'income')).toBe('Source');
  });
});

describe('kindsOf', () => {
  it('returns distinct kinds of active ledgers only', () => {
    expect(
      kindsOf([
        { ledger_kind: 'property', is_archived: false },
        { ledger_kind: 'property', is_archived: false },
        { ledger_kind: 'budget', is_archived: true },
      ])
    ).toEqual(['property']);
  });
  it('is empty with no ledgers', () => {
    expect(kindsOf([])).toEqual([]);
  });
});

describe('propertySubtypeLabel', () => {
  it('labels each property subtype', () => {
    expect(propertySubtypeLabel('rental')).toBe('Rental');
    expect(propertySubtypeLabel('flip')).toBe('Flip');
    expect(propertySubtypeLabel('investment')).toBe('Investment');
    expect(propertySubtypeLabel('primary_residence')).toBe('Primary residence');
  });
});

describe('ledgerMetaLabel', () => {
  it('a budget reads "budget" whatever else is on the row', () => {
    expect(ledgerMetaLabel({ ledger_kind: 'budget', property_subtype: null })).toBe('household');
  });

  it('a rental reads "rental"', () => {
    expect(ledgerMetaLabel({ ledger_kind: 'property', property_subtype: 'rental' })).toBe('rental');
  });

  it('other subtypes read as themselves, lowercased', () => {
    expect(ledgerMetaLabel({ ledger_kind: 'property', property_subtype: 'flip' })).toBe('flip');
    expect(ledgerMetaLabel({ ledger_kind: 'property', property_subtype: 'primary_residence' })).toBe(
      'primary residence'
    );
    expect(ledgerMetaLabel({ ledger_kind: 'property', property_subtype: 'investment' })).toBe(
      'investment'
    );
  });

  it('falls back to "rental" for a property row with no subtype', () => {
    expect(ledgerMetaLabel({ ledger_kind: 'property', property_subtype: null })).toBe('rental');
  });

  it('survives a subtype this build has never heard of', () => {
    // Subtypes are meant to grow; a client older than a new value must not crash.
    const future = 'co_living' as PropertySubtype;
    expect(propertySubtypeLabel(future)).toBe('co_living');
    expect(ledgerMetaLabel({ ledger_kind: 'property', property_subtype: future })).toBe('co_living');
  });
});

describe('collectionTitle / collectionNoun', () => {
  it('all property → Properties/Property', () => {
    expect(collectionTitle(['property'])).toBe('Properties');
    expect(collectionNoun(['property'])).toBe('Property');
  });
  it('all budget → Households/Household', () => {
    expect(collectionTitle(['budget'])).toBe('Households');
    expect(collectionNoun(['budget'])).toBe('Household');
  });
  it('mixed or none → Ledgers/Ledger', () => {
    expect(collectionTitle(['property', 'budget'])).toBe('Ledgers');
    expect(collectionTitle([])).toBe('Ledgers');
    expect(collectionNoun([])).toBe('Ledger');
  });
});
