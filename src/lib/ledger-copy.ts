// User-facing nouns that depend on ledger kind (spec §3). Pure; the only place
// "Property" vs "Budget" is decided, so no screen hard-codes either word.
import type { CategoryKind, LedgerKind, Property, PropertyUse } from '@/types';
import { PROPERTY_TYPES } from './property-validation';

const NOUNS: Record<LedgerKind, { one: string; many: string }> = {
  rental: { one: 'Property', many: 'Properties' },
  personal: { one: 'Budget', many: 'Budgets' },
};

export function nounFor(kind: LedgerKind): { one: string; many: string } {
  return NOUNS[kind];
}

/** Who the money went to / came from. Landlords have vendors; households have payees. */
export function partyLabel(kind: LedgerKind, entryKind: CategoryKind): string {
  if (entryKind === 'income') return 'Source';
  return kind === 'personal' ? 'Payee' : 'Vendor';
}

/** Distinct kinds among the user's active (non-archived) ledgers, rental first. */
export function kindsOf(ledgers: Pick<Property, 'property_type' | 'is_archived'>[]): LedgerKind[] {
  const set = new Set(ledgers.filter((l) => !l.is_archived).map((l) => l.property_type));
  return PROPERTY_TYPES.filter((k) => set.has(k));
}

const USE_LABELS: Record<PropertyUse, string> = {
  long_term_rental: 'Long-term rental',
  flip: 'Flip',
  investment: 'Investment property',
  primary_home: 'Primary home',
};

/** Title-case label for a property's use — the form's picker chips. */
export function propertyUseLabel(use: PropertyUse): string {
  return USE_LABELS[use];
}

/**
 * The lowercase word under a ledger's name in a list row: its use when it is a
 * property ("flip", "primary home"), otherwise the plain kind ("rental", "budget").
 */
export function ledgerMetaLabel(
  ledger: Pick<Property, 'property_type' | 'property_use'>
): string {
  if (ledger.property_type === 'personal') return 'budget';
  if (!ledger.property_use || ledger.property_use === 'long_term_rental') return 'rental';
  return USE_LABELS[ledger.property_use].toLowerCase();
}

/** Tab / section title for the whole collection: one kind's plural, or "Ledgers" when mixed or empty. */
export function collectionTitle(kinds: LedgerKind[]): string {
  return kinds.length === 1 ? NOUNS[kinds[0]].many : 'Ledgers';
}

export function collectionNoun(kinds: LedgerKind[]): string {
  return kinds.length === 1 ? NOUNS[kinds[0]].one : 'Ledger';
}
