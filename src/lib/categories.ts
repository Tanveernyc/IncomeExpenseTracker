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
