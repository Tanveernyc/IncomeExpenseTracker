// Reports tab (Phase 8): portfolio-wide and per-property P&L for
// This Year / Last Year / All Time / Custom, plus expense-by-category totals.
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateField } from '@/components/date-field';
import { GlassChip, GlassPressable, GlassSurface } from '@/components/glass';
import { listCategories } from '@/db/categories';
import { listAllExpenses } from '@/db/expenses';
import { listAllIncome } from '@/db/income';
import { listProperties } from '@/db/properties';
import {
  calcByCategory,
  calcPL,
  calcPLByProperty,
  lastMonthRange,
  lastYearRange,
  savingsRate,
  splitActive,
  thisMonthRange,
  thisYearRange,
  type DateRange,
  type PropertyPL,
} from '@/lib/aggregate';
import { todayISO } from '@/lib/dates';
import { collectionNoun, kindsOf, netLabel } from '@/lib/ledger-copy';
import { formatMoney } from '@/lib/money';
import type { Property } from '@/types';
import { colors, money, serif, space, type } from '@/theme';

type Preset = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time' | 'custom';

export default function ReportsScreen() {
  // Null until the user picks: the default depends on data that arrives later,
  // so it is derived below rather than written into state by an effect.
  const [chosenPreset, setPreset] = useState<Preset | null>(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { data: properties } = useQuery({
    queryKey: ['properties', { includeArchived: true }],
    queryFn: () => listProperties({ includeArchived: true }),
  });
  const { data: expenses } = useQuery({ queryKey: ['expenses', 'all'], queryFn: listAllExpenses });
  const { data: income } = useQuery({ queryKey: ['income', 'all'], queryFn: listAllIncome });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  // Kind-aware default (spec §8.2): budget-only users land on This Month;
  // property-only (and mixed) users keep This Year. An explicit choice always wins.
  const kinds = kindsOf(properties ?? []);
  const defaultPreset: Preset =
    kinds.length === 1 && kinds[0] === 'budget' ? 'this-month' : 'this-year';
  const preset = chosenPreset ?? defaultPreset;

  const range: DateRange = useMemo(() => {
    switch (preset) {
      case 'this-month':
        return thisMonthRange(todayISO());
      case 'last-month':
        return lastMonthRange(todayISO());
      case 'this-year':
        return thisYearRange(todayISO());
      case 'last-year':
        return lastYearRange(todayISO());
      case 'all-time':
        return {};
      case 'custom':
        return { from: customFrom.trim() || undefined, to: customTo.trim() || undefined };
    }
  }, [preset, customFrom, customTo]);

  // All math is delegated to src/lib/aggregate.ts (spec §4: no inline arithmetic).
  // Archived ledgers are reported on their own, below, and never mixed into the
  // portfolio, the per-ledger cards or the category totals.
  const { active, archived, activeExpenses, activeIncome } = splitActive(properties ?? [], expenses ?? [], income ?? []);
  const portfolio = calcPL(activeExpenses, activeIncome, range);
  const perProperty = calcPLByProperty(active, activeExpenses, activeIncome, range);
  const perArchived = calcPLByProperty(archived, expenses ?? [], income ?? [], range);
  const byCategory = calcByCategory(activeExpenses, range, categories ?? []);
  const rate = savingsRate(portfolio);
  const portfolioHasBudget = kindsOf(active).includes('budget');

  return (
    <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presets}
        style={styles.presetStrip}
      >
        {(
          [
            ['this-month', 'This Month'],
            ['last-month', 'Last Month'],
            ['this-year', 'This Year'],
            ['last-year', 'Last Year'],
            ['all-time', 'All Time'],
            ['custom', 'Custom'],
          ] as const
        ).map(([value, label]) => (
          <GlassChip key={value} label={label} selected={preset === value} onPress={() => setPreset(value)} />
        ))}
      </ScrollView>

      {preset === 'custom' ? (
        <View style={styles.customRow}>
          <DateField
            value={customFrom}
            onChange={setCustomFrom}
            placeholder="From"
            clearable
            accessibilityLabel="From date"
            style={styles.dateInput}
          />
          <DateField
            value={customTo}
            onChange={setCustomTo}
            placeholder="To"
            clearable
            accessibilityLabel="To date"
            style={styles.dateInput}
          />
        </View>
      ) : null}

      <GlassSurface style={styles.card}>
        <Text style={styles.cardTitle}>Portfolio</Text>
        <PLRow label="Income" value={portfolio.totalIncome} positive />
        <PLRow label="Expenses" value={portfolio.totalExpense} />
        <View style={styles.divider} />
        <PLRow label={netLabel(active)} value={portfolio.net} positive={portfolio.net >= 0} bold />
        {portfolioHasBudget && rate !== null ? (
          <Text style={styles.savingsRate}>
            {rate >= 0 ? 'Savings rate' : 'Overspent by'} {Math.abs(Math.round(rate * 100))}% of
            income
          </Text>
        ) : null}
      </GlassSurface>

      <Text style={styles.sectionTitle}>By {collectionNoun(kindsOf(properties ?? [])).toLowerCase()}</Text>
      {perProperty.map((p) => (
        <LedgerCard key={p.propertyId} pl={p} ledger={properties?.find((pr) => pr.id === p.propertyId)} />
      ))}

      {perArchived.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Archived</Text>
          <Text style={styles.sectionHint}>Kept for your records. Not counted in the totals above.</Text>
          {perArchived.map((p) => (
            <LedgerCard key={p.propertyId} pl={p} ledger={properties?.find((pr) => pr.id === p.propertyId)} />
          ))}
        </>
      ) : null}

      <GlassPressable onPress={() => router.push('/history')} contentStyle={styles.historyLink}>
        <View style={styles.historyText}>
          <Text style={styles.historyTitle}>History &amp; trends</Text>
          <Text style={styles.historyHint}>“Did my insurance go up?”</Text>
        </View>
        <Text style={styles.historyChevron}>›</Text>
      </GlassPressable>

      <Text style={styles.sectionTitle}>Expenses by category</Text>
      <GlassSurface style={styles.card}>
        {byCategory.length === 0 ? (
          <Text style={styles.emptyText}>No expenses in this range.</Text>
        ) : (
          byCategory.map((c) => <PLRow key={c.categoryId} label={c.name} value={c.total} />)
        )}
      </GlassSurface>
    </ScrollView>
  );
}

/** One ledger's income, expenses and what was left over in the range. */
function LedgerCard({ pl, ledger }: { pl: PropertyPL; ledger?: Property }) {
  const isBudget = ledger?.ledger_kind === 'budget';
  // An archived ledger is worded as it was when active.
  const label = netLabel(ledger ? [{ ...ledger, is_archived: false }] : []);
  const cardRate = savingsRate(pl);
  return (
    <GlassSurface style={styles.card}>
      <Text style={styles.cardTitle}>{pl.name}</Text>
      <PLRow label="Income" value={pl.totalIncome} positive />
      <PLRow label="Expenses" value={pl.totalExpense} />
      <View style={styles.divider} />
      <PLRow label={label} value={pl.net} positive={pl.net >= 0} bold />
      {isBudget && cardRate !== null ? (
        <Text style={styles.savingsRate}>
          {cardRate >= 0 ? 'Savings rate' : 'Overspent by'} {Math.abs(Math.round(cardRate * 100))}% of income
        </Text>
      ) : null}
    </GlassSurface>
  );
}

function PLRow({
  label,
  value,
  positive = false,
  bold = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={styles.plRow}>
      <Text style={[styles.plLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[positive ? styles.plPositive : styles.plValue, bold && styles.bold]}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 120, gap: space.md },
  // Chips scroll edge to edge; the strip cancels the screen padding.
  presetStrip: { marginHorizontal: -space.lg, flexGrow: 0 },
  presets: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
  customRow: { flexDirection: 'row', gap: space.sm },
  dateInput: { flex: 1 },
  card: { padding: space.lg + 2, gap: space.sm },
  cardTitle: { ...type.section, fontSize: 18, marginBottom: space.xs },
  sectionTitle: { ...type.section, marginTop: space.md },
  sectionHint: { ...type.hint, marginTop: -space.sm },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  plLabel: { fontSize: 15, color: colors.slate },
  plValue: { ...money, fontSize: 15, fontWeight: '500' },
  plPositive: { ...money, fontSize: 15, fontWeight: '500', color: colors.gain },
  bold: { fontWeight: '700', color: colors.ink, fontFamily: serif.bold, fontSize: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.xs },
  emptyText: { ...type.hint },
  historyLink: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  historyText: { flex: 1, gap: 2 },
  historyTitle: { ...type.body, fontWeight: '600' },
  historyHint: { ...type.hint },
  historyChevron: { fontSize: 24, color: colors.brass },
  savingsRate: { ...type.hint, textAlign: 'right' },
});
