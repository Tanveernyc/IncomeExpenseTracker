// Native date pickers hand back local Dates; the app stores ISO strings. These
// conversions must never shift a day, whatever the device timezone.
import { formatDateLabel, isoToPickerDate, pickerDateToISO } from '../src/lib/dates';

describe('isoToPickerDate', () => {
  it('reads a day as local midnight, not UTC', () => {
    const date = isoToPickerDate('2026-01-01')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 0, 1]);
    expect(date.getHours()).toBe(0);
  });

  it('reads a month as its 1st', () => {
    const date = isoToPickerDate('2026-09')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 1]);
  });

  it('returns null for empty or malformed input', () => {
    for (const bad of ['', 'soon', '2026/01/01', '26-01-01']) expect(isoToPickerDate(bad)).toBeNull();
  });
});

describe('pickerDateToISO', () => {
  it('round-trips with isoToPickerDate', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2024-02-29', '2026-12-31']) {
      expect(pickerDateToISO(isoToPickerDate(iso)!)).toBe(iso);
    }
  });

  it('uses the local calendar day, even late at night', () => {
    expect(pickerDateToISO(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });
});

describe('formatDateLabel', () => {
  it('formats days and months for display', () => {
    expect(formatDateLabel('2026-10-05')).toBe('Oct 5, 2026');
    expect(formatDateLabel('2026-10')).toBe('October 2026');
  });

  it('shows anything unparseable as-is rather than hiding it', () => {
    expect(formatDateLabel('garbage')).toBe('garbage');
  });
});
