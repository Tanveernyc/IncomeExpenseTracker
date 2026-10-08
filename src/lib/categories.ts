// Category list helpers — pure functions, no React, no network (spec §4 rule).
// Phase 4 tests: expense/income lists filter by kind correctly.
import type { Category, CategoryKind, Property } from '@/types';

/** The two ledger fields that decide which categories it may use. */
export type LedgerCategoryScope = Pick<Property, 'ledger_kind' | 'property_subtype'>;

/** Only categories of the given kind (expense pickers must never show income rows). */
export function filterCategoriesByKind(categories: Category[], kind: CategoryKind): Category[] {
  return categories.filter((category) => category.kind === kind);
}

/** Splits one fetched list into the two sections the categories screen renders. */
export function splitCategoriesByKind(
  categories: Category[]
): Record<CategoryKind, Category[]> {
  return {
    expense: filterCategoriesByKind(categories, 'expense'),
    income: filterCategoriesByKind(categories, 'income'),
  };
}

/** System categories are seeded data shared by design — they can never be deleted. */
export function canDeleteCategory(category: Category): boolean {
  return !category.is_system;
}

/**
 * Whether rent actually comes in. A flip is held to resell and a primary residence
 * is lived in, so neither has a tenant paying rent, late fees or a deposit.
 */
export function ledgerHasTenants(ledger: LedgerCategoryScope): boolean {
  if (ledger.ledger_kind !== 'property') return false;
  return ledger.property_subtype !== 'flip' && ledger.property_subtype !== 'primary_residence';
}

/** Every category a ledger may use, of any entry kind (spec §4.1). */
export function categoriesVisibleToLedger(
  categories: Category[],
  ledger: LedgerCategoryScope
): Category[] {
  const hasTenants = ledgerHasTenants(ledger);
  return categories.filter(
    (c) =>
      (c.scope === 'both' || c.scope === ledger.ledger_kind) && (hasTenants || !c.tenant_only)
  );
}

/** Categories a ledger may use for `entryKind` entries (spec §4.1). */
export function categoriesForLedger(
  categories: Category[],
  ledger: LedgerCategoryScope,
  entryKind: CategoryKind
): Category[] {
  return categoriesVisibleToLedger(categories, ledger).filter((c) => c.kind === entryKind);
}

// The categories people reach for most, per kind of ledger, most common first.
// Names match the system catalog (src/lib/category-catalog.ts); a category the
// user renamed or created simply falls into the alphabetical rest.
const RENTAL_EXPENSES = [
  'Mortgage Payment (with Escrow)',
  'Mortgage Payment (no Escrow)',
  'Repairs',
  'Maintenance',
  'Property Tax (Combined)',
  'Home Insurance',
  'Property Management Fee',
  'Electric',
  'Water & Sewer',
  'Gas/Heating',
  'Trash/Recycling',
  'HOA Fees',
  'Landscaping/Snow',
  'Cleaning',
  'Advertising/Listing',
];
export const COMMON_CATEGORIES: Record<string, Record<CategoryKind, string[]>> = {
  rental: {
    expense: RENTAL_EXPENSES,
    income: ['Rent', 'Late Fee', 'Pet Fee', 'Other Rental Income', 'Security Deposit Retained'],
  },
  investment: {
    expense: RENTAL_EXPENSES,
    income: ['Rent', 'Late Fee', 'Pet Fee', 'Other Rental Income', 'Security Deposit Retained'],
  },
  primary_residence: {
    expense: [
      'Mortgage Payment (with Escrow)',
      'Mortgage Payment (no Escrow)',
      'Electric',
      'Gas/Heating',
      'Water & Sewer',
      'Internet/Cable',
      'Home Insurance',
      'Property Tax (Combined)',
      'HOA Fees',
      'Repairs',
      'Maintenance',
      'Trash/Recycling',
      'Landscaping/Snow',
    ],
    income: ['Insurance Payout', 'Sale Proceeds'],
  },
  flip: {
    expense: [
      'Closing Costs',
      'Renovation/Improvements',
      'Repairs',
      'Supplies',
      'Permits/Licenses',
      'Mortgage Payment (no Escrow)',
      'HELOC / Second Mortgage',
      'Electric',
      'Water & Sewer',
      'Property Tax (Combined)',
      'Home Insurance',
      'Selling Costs',
    ],
    income: ['Sale Proceeds', 'Insurance Payout'],
  },
  budget: {
    // Bills, not receipts: people log what they pay each month (one card payment
    // covers the shopping), so itemised spending like groceries waits further back.
    expense: [
      'Rent/Mortgage',
      'Credit Card Bill',
      'Electric',
      'Gas/Heating',
      'Water & Sewer',
      'Phone',
      'Internet/Cable',
      'Subscriptions',
      'Car Payment',
      'Car Insurance',
      'Health/Medical',
      'Loan Payment',
      'Childcare',
      'Travel/Vacation',
    ],
    income: ['Salary', 'Freelance', 'Bonus', 'Interest/Dividends', 'Refund', 'Gift Received'],
  },
};

const isCatchAll = (c: Category) => c.name === 'Other Expense' || c.name === 'Other Income';

/**
 * Orders a ledger's categories for a picker: the common ones for its kind of
 * ledger first (Rent before Insurance Payout on a rental), then the rest in their
 * given order, with the "Other …" catch-alls last.
 */
export function rankCategoriesForLedger(
  categories: Category[],
  ledger: LedgerCategoryScope,
  entryKind: CategoryKind
): Category[] {
  const key = ledger.ledger_kind === 'budget' ? 'budget' : (ledger.property_subtype ?? 'rental');
  const common = COMMON_CATEGORIES[key]?.[entryKind] ?? [];
  const rank = new Map(common.map((name, i) => [name, i]));
  const first = categories
    .filter((c) => c.is_system && rank.has(c.name))
    .sort((a, b) => rank.get(a.name)! - rank.get(b.name)!);
  const firstIds = new Set(first.map((c) => c.id));
  const rest = categories.filter((c) => !firstIds.has(c.id));
  return [...first, ...rest.filter((c) => !isCatchAll(c)), ...rest.filter(isCatchAll)];
}
