// Date helpers — pure functions, no React, no network (spec §4 rule).
// All dates are ISO YYYY-MM-DD strings, matching the Postgres date columns.
import { addMonths, format, isValid, parseISO, startOfMonth } from 'date-fns';

/** Today's date in the device's timezone as YYYY-MM-DD (paid_on default). */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** True when the string is a real calendar date in YYYY-MM-DD form. */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return isValid(parseISO(value));
}

/**
 * True when a period range is ordered: end >= start. ISO date strings compare
 * correctly as plain strings, no Date parsing needed.
 */
export function isPeriodOrdered(periodStart: string, periodEnd: string): boolean {
  return periodEnd >= periodStart;
}

/** Snaps a date to the first of its month: '2026-09-18' → '2026-09-01'. */
export function firstOfMonth(iso: string): string {
  return format(startOfMonth(parseISO(iso)), 'yyyy-MM-dd');
}

/** Adds n calendar months to a first-of-month date; n may be 0. Year rollover handled by date-fns. */
export function addCalendarMonths(firstOfMonthIso: string, n: number): string {
  return format(addMonths(parseISO(firstOfMonthIso), n), 'yyyy-MM-dd');
}

/** 'YYYY-MM' bucket key — the recurring engine's idempotency unit (README §4.2). */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * 'YYYY-MM-DD' (or 'YYYY-MM', read as the 1st) → a local-midnight Date for a
 * native date picker. Local, not UTC: parsing '2026-01-01' as UTC would show
 * Dec 31 to anyone west of Greenwich. Returns null for anything unparseable.
 */
export function isoToPickerDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, match[3] ? Number(match[3]) : 1);
  return isValid(date) ? date : null;
}

/** A native picker's Date → 'YYYY-MM-DD' in the device's timezone. */
export function pickerDateToISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** How a stored date reads in a field: '2026-10-05' → 'Oct 5, 2026'; 'YYYY-MM' → 'October 2026'. */
export function formatDateLabel(value: string): string {
  const date = isoToPickerDate(value);
  if (!date) return value;
  return value.trim().length === 7 ? format(date, 'MMMM yyyy') : format(date, 'MMM d, yyyy');
}

/** A month in a compact list or table: '2026-03' or '2026-03-01' → 'Mar 2026'; a bare year passes through. */
export function formatMonthShort(value: string): string {
  const date = isoToPickerDate(value.slice(0, 7));
  return date ? format(date, 'MMM yyyy') : value;
}
