// History & Trends screen (Phase 9) — pick property + category, see a line chart
// and a period table: total, change, % change. Math lives in calcCategoryTrend.
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { listCategories } from '@/db/categories';
import { listPropertyExpenses } from '@/db/expenses';
import { listProperties } from '@/db/properties';
import { calcCategoryTrend } from '@/lib/aggregate';
import { categoriesForLedger } from '@/lib/categories';
import { formatMonthShort } from '@/lib/dates';
import { collectionNoun, kindsOf } from '@/lib/ledger-copy';
import { formatMoney } from '@/lib/money';
import { GlassChip, GlassSegmented, GlassSurface } from '@/components/glass';
import { colors, money, space, ui } from '@/theme';

const GROUP_OPTIONS = [
  { value: 'year', label: 'By year' },
  { value: 'month', label: 'By month' },
] as const;

export default function HistoryScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'year' | 'month'>('year');

  const { data: properties } = useQuery({
    queryKey: ['properties', { includeArchived: true }],
    queryFn: () => listProperties({ includeArchived: true }),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const { data: expenses } = useQuery({
    queryKey: ['expenses', { propertyId }],
    queryFn: () => listPropertyExpenses(propertyId!),
    enabled: !!propertyId,
  });

  const selected = (properties ?? []).find((p) => p.id === propertyId);
  const expenseCategories = categoriesForLedger(
    categories ?? [],
    selected ?? { ledger_kind: 'property', property_subtype: 'rental' },
    'expense'
  );

  const trend = useMemo(
    () => (categoryId ? calcCategoryTrend(expenses ?? [], categoryId, groupBy) : []),
    [expenses, categoryId, groupBy]
  );

  // Chart wants numeric x; keep the period label alongside for the table.
  const chartData = trend.map((point, index) => ({ x: index, y: point.total }));

  return (
    <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.label}>{collectionNoun(kindsOf(properties ?? []))}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        {(properties ?? []).map((p) => (
          <GlassChip key={p.id} label={p.name} selected={propertyId === p.id} onPress={() => setPropertyId(p.id)} />
        ))}
      </ScrollView>

      <Text style={styles.label}>Expense category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        {expenseCategories.map((c) => (
          <GlassChip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>

      <GlassSegmented options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} style={styles.groupBy} />

      {trend.length === 0 ? (
        <Text style={styles.empty}>
          {propertyId && categoryId
            ? 'No expenses for this category yet.'
            : `Pick a ${collectionNoun(kindsOf(properties ?? [])).toLowerCase()} and a category to see the trend.`}
        </Text>
      ) : (
        <>
          {/* Line chart needs 2+ points to draw a line */}
          {chartData.length >= 2 ? (
            <GlassSurface style={styles.chartBox}>
              <CartesianChart data={chartData} xKey="x" yKeys={['y']}>
                {({ points }) => <Line points={points.y} color={colors.brass} strokeWidth={3} />}
              </CartesianChart>
            </GlassSurface>
          ) : null}

          {/* Period table: period / amount / change / % change */}
          <GlassSurface style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.headText]}>Period</Text>
              <Text style={[styles.cellRight, styles.headText]}>Total</Text>
              <Text style={[styles.cellRight, styles.headText]}>Change</Text>
              <Text style={[styles.cellRight, styles.headText]}>%</Text>
            </View>
            {trend.map((point) => (
              <View key={point.period} style={styles.tableRow}>
                <Text style={styles.cell}>{formatMonthShort(point.period)}</Text>
                <Text style={styles.cellRight}>{formatMoney(point.total)}</Text>
                <Text style={[styles.cellRight, changeStyle(point.changeFromPrev)]}>
                  {/* Em dash, not a hyphen: "no previous period", never a minus. */}
                  {point.changeFromPrev === null ? '—' : formatMoney(point.changeFromPrev)}
                </Text>
                <Text style={[styles.cellRight, changeStyle(point.changeFromPrev)]}>
                  {/* toFixed would emit an ASCII hyphen next to the true minus
                      in the Change cell, so the sign is written by hand. */}
                  {point.pctChangeFromPrev === null
                    ? '—'
                    : `${point.pctChangeFromPrev >= 0 ? '+' : '−'}${Math.abs(point.pctChangeFromPrev).toFixed(1)}%`}
                </Text>
              </View>
            ))}
          </GlassSurface>
        </>
      )}
    </ScrollView>
  );
}

// Increases are red (costs went up), decreases green.
function changeStyle(change: number | null) {
  if (change === null) return undefined;
  return change > 0 ? styles.up : styles.down;
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 60, gap: space.xs },
  label: { ...ui.label },
  // Chips scroll edge to edge; the strip cancels the screen padding.
  chipStrip: { marginHorizontal: -space.lg, flexGrow: 0 },
  chipRow: { gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.lg },
  groupBy: { marginTop: space.lg },
  empty: { ...ui.empty, marginTop: 32 },
  chartBox: { height: 240, marginTop: space.lg, padding: space.md },
  table: { marginTop: space.md },
  tableHead: { borderBottomColor: 'rgba(14, 26, 43, 0.14)' },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headText: { fontWeight: '700', color: colors.slate, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  cell: { flex: 1.2, fontSize: 14, color: colors.ink },
  cellRight: { ...money, flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  up: { color: colors.danger },
  down: { color: colors.gain },
});
