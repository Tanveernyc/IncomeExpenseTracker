// Dashboard model — pure functions (spec §4 rule). Phase 11 test: dashboard
// aggregates must match calcPL output for the same data, so this delegates all
// math to aggregate.ts and only assembles the view model.
import {
  calcPL,
  calcPLByProperty,
  savingsRate,
  splitActive,
  thisMonthRange,
  thisYearRange,
  type PL,
  type PropertyPL,
} from './aggregate';
import { buildTimeline, type TimelineEntry } from './timeline';
import type { Expense, Income, Property } from '@/types';

/** How many recent transactions the dashboard shows. */
export const RECENT_COUNT = 5;

export interface DashboardModel {
  /** P&L for the current calendar year across active ledgers (archived excluded). */
  yearPL: PL;
  /** Portfolio P&L for the current month - the household view. */
  monthPL: PL;
  /** monthPL.net ÷ monthPL.totalIncome, or null when the month has no income. */
  monthSavingsRate: number | null;
  /** This-year mini P&L per active (non-archived) property. */
  propertyCards: PropertyPL[];
  /** The five most recent transactions across active ledgers. */
  recent: TimelineEntry[];
}

export function buildDashboardModel(
  properties: Property[],
  expenses: Expense[],
  income: Income[],
  todayIso: string
): DashboardModel {
  const range = thisYearRange(todayIso);
  // An archived ledger is out of the picture: none of its money counts here, not
  // only its card. Reports shows archived ledgers on their own.
  const { active: activeProperties, activeExpenses, activeIncome } = splitActive(properties, expenses, income);
  const monthPL = calcPL(activeExpenses, activeIncome, thisMonthRange(todayIso));
  return {
    yearPL: calcPL(activeExpenses, activeIncome, range),
    monthPL,
    monthSavingsRate: savingsRate(monthPL),
    propertyCards: calcPLByProperty(activeProperties, activeExpenses, activeIncome, range),
    recent: buildTimeline(activeExpenses, activeIncome).slice(0, RECENT_COUNT),
  };
}
