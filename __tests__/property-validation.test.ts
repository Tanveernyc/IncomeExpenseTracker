// Phase 3 tests — property create/edit validation (spec §5 Phase 3):
// name required; type must be property|budget.
import { PROPERTY_SUBTYPES, parsePriceInput, validateProperty } from '../src/lib/property-validation';

describe('validateProperty', () => {
  it('requires a name', () => {
    const result = validateProperty({ name: '', ledger_kind: 'property' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('rejects a whitespace-only name', () => {
    expect(validateProperty({ name: '   ', ledger_kind: 'property' }).valid).toBe(false);
  });

  it('requires type to be property or budget', () => {
    for (const bad of ['', 'condo', 'RENTAL', 'commercial']) {
      const result = validateProperty({ name: '12 Maple St', ledger_kind: bad });
      expect(result.valid).toBe(false);
      expect(result.errors.ledger_kind).toBeDefined();
    }
  });

  it('accepts both valid types', () => {
    expect(validateProperty({ name: '12 Maple St', ledger_kind: 'property' }).valid).toBe(true);
    expect(validateProperty({ name: 'Home', ledger_kind: 'budget' }).valid).toBe(true);
  });
});

describe('PROPERTY_SUBTYPES', () => {
  it('offers rental, primary residence, investment and flip', () => {
    expect(PROPERTY_SUBTYPES).toEqual(['rental', 'primary_residence', 'investment', 'flip']);
  });
});

describe('parsePriceInput', () => {
  it('treats empty input as null (price is optional)', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('   ')).toBeNull();
  });

  it('rejects non-numeric and non-positive input', () => {
    for (const bad of ['abc', '-5', '0', '12x']) {
      expect(parsePriceInput(bad)).toBeUndefined();
    }
  });

  it('parses valid prices', () => {
    expect(parsePriceInput('250000')).toBe(250000);
    expect(parsePriceInput('99.99')).toBe(99.99);
  });
});
