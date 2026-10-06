// User-facing nouns that depend on ledger kind (spec §3). Pure; the only place
// "Property" vs "Household" is decided, so no screen hard-codes either word.
import type { CategoryKind, LedgerKind, Property, PropertySubtype } from '@/types';
import { LEDGER_KINDS } from './property-validation';

const NOUNS: Record<LedgerKind, { one: string; many: string }> = {
  property: { one: 'Property', many: 'Properties' },
  budget: { one: 'Household', many: 'Households' },
};

export function nounFor(kind: LedgerKind): { one: string; many: string } {
  return NOUNS[kind];
}

/** Who the money went to / came from. Landlords have vendors; households have payees. */
export function partyLabel(kind: LedgerKind, entryKind: CategoryKind): string {
  if (entryKind === 'income') return 'Source';
  return kind === 'budget' ? 'Payee' : 'Vendor';
}

/** Distinct kinds among the user's active (non-archived) ledgers, property first. */
export function kindsOf(ledgers: Pick<Property, 'ledger_kind' | 'is_archived'>[]): LedgerKind[] {
  const set = new Set(ledgers.filter((l) => !l.is_archived).map((l) => l.ledger_kind));
  return LEDGER_KINDS.filter((k) => set.has(k));
}

const SUBTYPE_LABELS: Record<PropertySubtype, string> = {
  rental: 'Rental',
  primary_residence: 'Primary residence',
  investment: 'Investment',
  flip: 'Flip',
};

/**
 * Title-case label for a property's subtype — the form's picker. Subtypes are meant
 * to grow, and the value arrives unvalidated from the database, so an unknown one
 * falls back to itself rather than rendering undefined.
 */
export function propertySubtypeLabel(subtype: PropertySubtype): string {
  return SUBTYPE_LABELS[subtype] ?? subtype;
}

const SUBTYPE_HINTS: Record<PropertySubtype, string> = {
  rental: 'Tenants pay rent',
  primary_residence: 'The home you live in',
  investment: 'Held to grow in value',
  flip: 'Bought to renovate and sell',
};

/** One line under a subtype in the picker, saying what it is for. */
export function propertySubtypeHint(subtype: PropertySubtype): string {
  return SUBTYPE_HINTS[subtype] ?? '';
}

/**
 * The lowercase word under a ledger's name in a list row: a property's subtype
 * ("rental", "primary residence"), or "household".
 */
export function ledgerMetaLabel(
  ledger: Pick<Property, 'ledger_kind' | 'property_subtype'>
): string {
  if (ledger.ledger_kind === 'budget') return 'household';
  return propertySubtypeLabel(ledger.property_subtype ?? 'rental').toLowerCase();
}

/** Tab / section title for the whole collection: one kind's plural, or "Ledgers" when mixed or empty. */
export function collectionTitle(kinds: LedgerKind[]): string {
  return kinds.length === 1 ? NOUNS[kinds[0]].many : 'Ledgers';
}

export function collectionNoun(kinds: LedgerKind[]): string {
  return kinds.length === 1 ? NOUNS[kinds[0]].one : 'Ledger';
}
