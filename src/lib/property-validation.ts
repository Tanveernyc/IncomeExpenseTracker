// Property form validation — pure functions, no React, no network (spec §4 rule).
// Phase 3 tests: name required; ledger_kind must be property|budget.
// Also the single source of truth for both enum lists: ledger-copy.ts and the
// properties list screen import these instead of redeclaring the values.
import type { LedgerKind, PropertySubtype } from '@/types';

export const LEDGER_KINDS: readonly LedgerKind[] = ['property', 'budget'] as const;

/** Subtypes offered for a property, in picker order. */
export const PROPERTY_SUBTYPES: readonly PropertySubtype[] = [
  'rental',
  'primary_residence',
  'investment',
  'flip',
] as const;

/** Type guard used by validation and by screens rendering the type picker. */
export function isLedgerKind(value: string): value is LedgerKind {
  return (LEDGER_KINDS as readonly string[]).includes(value);
}

export interface PropertyValidation {
  valid: boolean;
  errors: { name?: string; ledger_kind?: string };
}

/** Validates the create/edit form. Only name and type have hard rules (schema checks). */
export function validateProperty(input: { name: string; ledger_kind: string }): PropertyValidation {
  const errors: PropertyValidation['errors'] = {};
  if (input.name.trim().length === 0) errors.name = 'Name is required.';
  if (!isLedgerKind(input.ledger_kind)) {
    errors.ledger_kind = 'Type must be property or budget.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Parses the purchase-price text field: '' → null (price is optional),
 * otherwise must be a positive number. Returns undefined on invalid input.
 */
export function parsePriceInput(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}
