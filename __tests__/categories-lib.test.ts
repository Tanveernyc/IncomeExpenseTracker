// Phase 4 tests — category helpers (spec §5 Phase 4):
// expense/income lists filter by kind correctly; system categories are undeletable.
import {
  canDeleteCategory,
  categoriesForLedger,
  filterCategoriesByKind,
  ledgerHasTenants,
  splitCategoriesByKind,
} from '../src/lib/categories';
import type { Category, PropertySubtype } from '../src/types';

const cat = (overrides: Partial<Category>): Category => ({
  id: 'c1',
  user_id: null,
  name: 'Insurance',
  kind: 'expense',
  is_system: true,
  scope: 'property',
  tenant_only: false,
  created_at: '2026-07-15T00:00:00Z',
  ...overrides,
});

const fixtures: Category[] = [
  cat({ id: 'e1', name: 'Insurance', kind: 'expense', is_system: true }),
  cat({ id: 'e2', name: 'Repairs', kind: 'expense', is_system: true }),
  cat({ id: 'e3', name: 'Custom Expense', kind: 'expense', is_system: false, user_id: 'u1' }),
  cat({ id: 'i1', name: 'Rent', kind: 'income', is_system: true }),
  cat({ id: 'i2', name: 'Custom Income', kind: 'income', is_system: false, user_id: 'u1' }),
];

describe('filterCategoriesByKind', () => {
  it('returns only expense categories for kind=expense', () => {
    const result = filterCategoriesByKind(fixtures, 'expense');
    expect(result.map((c) => c.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('returns only income categories for kind=income', () => {
    const result = filterCategoriesByKind(fixtures, 'income');
    expect(result.map((c) => c.id)).toEqual(['i1', 'i2']);
  });
});

describe('splitCategoriesByKind', () => {
  it('partitions the list with nothing lost or duplicated', () => {
    const { expense, income } = splitCategoriesByKind(fixtures);
    expect(expense).toHaveLength(3);
    expect(income).toHaveLength(2);
    expect(expense.length + income.length).toBe(fixtures.length);
  });
});

describe('canDeleteCategory', () => {
  it('forbids deleting system categories', () => {
    expect(canDeleteCategory(cat({ is_system: true }))).toBe(false);
  });

  it('allows deleting custom categories', () => {
    expect(canDeleteCategory(cat({ is_system: false, user_id: 'u1' }))).toBe(true);
  });
});

describe('categoriesForLedger', () => {
  const scoped: Category[] = [
    cat({ id: 'r', name: 'Mortgage Interest', kind: 'expense', scope: 'property' }),
    cat({ id: 'b', name: 'Electric', kind: 'expense', scope: 'both' }),
    cat({ id: 'p', name: 'Groceries', kind: 'expense', scope: 'budget' }),
    cat({ id: 'pi', name: 'Salary', kind: 'income', scope: 'budget' }),
  ];
  const rental = { ledger_kind: 'property', property_subtype: 'rental' } as const;
  const budget = { ledger_kind: 'budget', property_subtype: null } as const;

  it('a property sees property + both, never budget', () => {
    expect(categoriesForLedger(scoped, rental, 'expense').map((c) => c.id)).toEqual(['r', 'b']);
  });
  it('a budget sees budget + both, never property', () => {
    expect(categoriesForLedger(scoped, budget, 'expense').map((c) => c.id)).toEqual(['b', 'p']);
  });
  it('still filters by entry kind', () => {
    expect(categoriesForLedger(scoped, budget, 'income').map((c) => c.id)).toEqual(['pi']);
  });
});

describe('tenant-only categories', () => {
  const income: Category[] = [
    cat({ id: 'rent', name: 'Rent', kind: 'income', scope: 'property', tenant_only: true }),
    cat({ id: 'payout', name: 'Insurance Payout', kind: 'income', scope: 'property' }),
  ];
  const property = (subtype: PropertySubtype) => ({ ledger_kind: 'property', property_subtype: subtype } as const);

  it('a rental and an investment collect rent', () => {
    expect(ledgerHasTenants(property('rental'))).toBe(true);
    expect(ledgerHasTenants(property('investment'))).toBe(true);
  });

  it('a flip and a primary home do not', () => {
    expect(ledgerHasTenants(property('flip'))).toBe(false);
    expect(ledgerHasTenants(property('primary_residence'))).toBe(false);
  });

  it('a property from before uses existed is still treated as rented', () => {
    expect(ledgerHasTenants({ ledger_kind: 'property', property_subtype: null })).toBe(true);
  });

  it('hides Rent from a primary home but keeps the rest of its income', () => {
    expect(categoriesForLedger(income, property('primary_residence'), 'income').map((c) => c.id)).toEqual(
      ['payout']
    );
  });

  it('a long-term rental still sees Rent', () => {
    expect(
      categoriesForLedger(income, property('rental'), 'income').map((c) => c.id)
    ).toEqual(['rent', 'payout']);
  });
});
