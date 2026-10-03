// Personal budgets - every user-facing noun that depends on ledger kind (spec §3).
import {
  collectionNoun,
  collectionTitle,
  kindsOf,
  ledgerMetaLabel,
  nounFor,
  partyLabel,
  propertyUseLabel,
} from '../src/lib/ledger-copy';

describe('nounFor', () => {
  it('rental is Property, personal is Budget', () => {
    expect(nounFor('rental')).toEqual({ one: 'Property', many: 'Properties' });
    expect(nounFor('personal')).toEqual({ one: 'Budget', many: 'Budgets' });
  });
});

describe('partyLabel', () => {
  it('rental expenses have a Vendor; personal expenses have a Payee; income is always Source', () => {
    expect(partyLabel('rental', 'expense')).toBe('Vendor');
    expect(partyLabel('personal', 'expense')).toBe('Payee');
    expect(partyLabel('rental', 'income')).toBe('Source');
    expect(partyLabel('personal', 'income')).toBe('Source');
  });
});

describe('kindsOf', () => {
  it('returns distinct kinds of active ledgers only', () => {
    expect(
      kindsOf([
        { property_type: 'rental', is_archived: false },
        { property_type: 'rental', is_archived: false },
        { property_type: 'personal', is_archived: true },
      ])
    ).toEqual(['rental']);
  });
  it('is empty with no ledgers', () => {
    expect(kindsOf([])).toEqual([]);
  });
});

describe('propertyUseLabel', () => {
  it('labels each property use', () => {
    expect(propertyUseLabel('long_term_rental')).toBe('Long-term rental');
    expect(propertyUseLabel('flip')).toBe('Flip');
    expect(propertyUseLabel('investment')).toBe('Investment property');
    expect(propertyUseLabel('primary_home')).toBe('Primary home');
  });
});

describe('ledgerMetaLabel', () => {
  it('a budget reads "budget" whatever else is on the row', () => {
    expect(ledgerMetaLabel({ property_type: 'personal', property_use: null })).toBe('budget');
  });

  it('a long-term rental keeps the plain word "rental"', () => {
    expect(ledgerMetaLabel({ property_type: 'rental', property_use: 'long_term_rental' })).toBe(
      'rental'
    );
  });

  it('other uses read as themselves, lowercased', () => {
    expect(ledgerMetaLabel({ property_type: 'rental', property_use: 'flip' })).toBe('flip');
    expect(ledgerMetaLabel({ property_type: 'rental', property_use: 'primary_home' })).toBe(
      'primary home'
    );
    expect(ledgerMetaLabel({ property_type: 'rental', property_use: 'investment' })).toBe(
      'investment property'
    );
  });

  it('falls back to "rental" for a property row that predates uses', () => {
    expect(ledgerMetaLabel({ property_type: 'rental', property_use: null })).toBe('rental');
  });
});

describe('collectionTitle / collectionNoun', () => {
  it('all rental → Properties/Property', () => {
    expect(collectionTitle(['rental'])).toBe('Properties');
    expect(collectionNoun(['rental'])).toBe('Property');
  });
  it('all personal → Budgets/Budget', () => {
    expect(collectionTitle(['personal'])).toBe('Budgets');
    expect(collectionNoun(['personal'])).toBe('Budget');
  });
  it('mixed or none → Ledgers/Ledger', () => {
    expect(collectionTitle(['rental', 'personal'])).toBe('Ledgers');
    expect(collectionTitle([])).toBe('Ledgers');
    expect(collectionNoun([])).toBe('Ledger');
  });
});
