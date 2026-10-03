// Money helpers — pure functions, no React, no network (spec §4 rule).
// Amounts are dollars backed by numeric(12,2) in Postgres; never floats in sums
// without rounding at the cent boundary.

/**
 * Parses an amount text field. Valid: positive number with at most 2 decimal
 * places (cents). Returns undefined for anything else — including 0, negatives,
 * non-numeric text, and 3+ decimal places (spec §5 Phase 5).
 */
export function parseAmountInput(text: string): number | undefined {
  const trimmed = text.trim();
  // Digits with an optional 1–2 digit decimal tail; rejects '1.234', '12x', '-5', ''.
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  if (!(value > 0)) return undefined;
  return value;
}

/**
 * Formats dollars for display: 1234.5 → "$1,234.50".
 * Negatives use a true minus (U+2212), not a hyphen: it is the same width as the
 * digits, so a column of amounts stays aligned, and it matches the signs the
 * screens prefix by hand. Display only — the CSV export writes raw toFixed(2).
 */
export function formatMoney(amount: number): string {
  // Intl formats negative zero as a signed "-$0.00"; -0 === 0 is true, so this
  // collapses it to a plain zero before formatting.
  const value = amount === 0 ? 0 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })
    .format(value)
    .replace('-', '−');
}
