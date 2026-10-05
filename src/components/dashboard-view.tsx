// Dashboard presentation (Phase 11) — pure view over DashboardModel, no data
// fetching and no router imports, so tests can render it directly (empty-state
// render is a spec §5 Phase 11 test).
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DashboardModel } from '@/lib/dashboard';
import { ledgerMetaLabel } from '@/lib/ledger-copy';
import { formatMoney } from '@/lib/money';
import type { TimelineEntry } from '@/lib/timeline';
import { colors, money, radius, type, ui } from '@/theme';

interface Props {
  model: DashboardModel;
  /** category_id → display name (falls back to the id when unknown). */
  categoryNames: Map<string, string>;
  /** "Properties" / "Budgets" / "Ledgers" — matches the tab's title (spec §3). */
  collectionTitle: string;
  onQuickAdd: () => void;
  onOpenProperty: (propertyId: string) => void;
  onOpenTransaction: (entry: TimelineEntry) => void;
}

export function DashboardView({
  model,
  categoryNames,
  collectionTitle,
  onQuickAdd,
  onOpenProperty,
  onOpenTransaction,
}: Props) {
  const { yearPL, monthPL, monthSavingsRate, propertyCards, recent } = model;

  return (
    <ScrollView contentContainerStyle={styles.container} testID="dashboard">
      {/* Portfolio net this year */}
      <View style={styles.netCard}>
        <Text style={styles.netLabel}>Net this year, all {collectionTitle.toLowerCase()}</Text>
        <Text style={[styles.netValue, yearPL.net < 0 && styles.netNegative]}>
          {formatMoney(yearPL.net)}
        </Text>
        <View style={styles.netRow}>
          <Text style={styles.netBreakdown}>In {formatMoney(yearPL.totalIncome)}</Text>
          <Text style={styles.netBreakdown}>Out {formatMoney(yearPL.totalExpense)}</Text>
        </View>
        <Text style={styles.netMonth}>
          This month {formatMoney(monthPL.net)}
          {monthSavingsRate !== null
            ? ` · ${monthSavingsRate >= 0 ? 'saved' : 'over by'} ${Math.abs(Math.round(monthSavingsRate * 100))}%`
            : ''}
        </Text>
      </View>

      <Pressable style={styles.quickAdd} onPress={onQuickAdd} accessibilityLabel="Quick add">
        <Text style={styles.quickAddText}>Add expense or income</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>{collectionTitle}</Text>
      {propertyCards.length === 0 ? (
        <Text style={styles.empty}>
          No {collectionTitle.toLowerCase()} yet — add one on the {collectionTitle} tab.
        </Text>
      ) : (
        propertyCards.map((card) => (
          <Pressable
            key={card.propertyId}
            style={styles.propertyCard}
            onPress={() => onOpenProperty(card.propertyId)}
          >
            {/* Net sits right, like the amount on a Recent activity row, so every
                card answers the same question in the same place. */}
            <View style={styles.propertyTop}>
              <Text style={styles.propertyName} numberOfLines={1}>
                {card.name}
              </Text>
              <Text style={[styles.propertyNet, card.net < 0 && styles.propertyNetNegative]}>
                {formatMoney(card.net)}
              </Text>
            </View>
            <Text style={styles.propertySub} numberOfLines={1}>
              {ledgerMetaLabel({ ledger_kind: card.kind, property_subtype: card.subtype })} · In{' '}
              {formatMoney(card.totalIncome)} · Out {formatMoney(card.totalExpense)}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Recent activity</Text>
      {recent.length === 0 ? (
        <Text style={styles.empty}>No transactions yet.</Text>
      ) : (
        recent.map((entry) => (
          <Pressable
            key={`${entry.kind}-${entry.id}`}
            style={styles.recentRow}
            onPress={() => onOpenTransaction(entry)}
          >
            <View style={styles.recentText}>
              <Text style={styles.recentCategory}>
                {categoryNames.get(entry.category_id) ?? entry.category_id}
              </Text>
              <Text style={styles.recentMeta}>
                {entry.date}
                {entry.party ? ` · ${entry.party}` : ''}
              </Text>
            </View>
            <Text style={entry.kind === 'income' ? styles.amountIn : styles.amountOut}>
              {entry.kind === 'income' ? '+' : '−'}
              {formatMoney(entry.amount)}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48, gap: 10 },
  // The one loud thing on the screen: the year's bottom line, in ink on ink.
  netCard: { backgroundColor: colors.ink, borderRadius: radius.card, padding: 20, gap: 6 },
  netLabel: { color: '#B8C0D0', fontSize: 13 },
  netValue: { ...money, color: colors.card, fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  netNegative: { color: '#F2B8B5' },
  netRow: { flexDirection: 'row', gap: 16, marginTop: 2 },
  netBreakdown: { ...money, color: '#B8C0D0', fontSize: 13, fontWeight: '500' },
  netMonth: { ...money, color: '#B8C0D0', fontSize: 13, fontWeight: '500', marginTop: 6 },
  // The app's most-used action: filled, not an outline that reads as disabled.
  quickAdd: { ...ui.buttonPrimary, marginTop: 10 },
  quickAddText: { ...ui.buttonPrimaryText },
  sectionTitle: { ...type.title, fontSize: 17, marginTop: 8 },
  empty: { ...type.hint, fontSize: 14 },
  propertyCard: { ...ui.card, padding: 14, gap: 3 },
  propertyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  propertyName: { ...type.body, fontWeight: '600', flex: 1 },
  propertyNet: { ...money, fontSize: 16, fontWeight: '700' },
  propertyNetNegative: { color: colors.danger },
  propertySub: { ...type.hint, fontSize: 12 },
  recentRow: {
    ...ui.row,
    paddingHorizontal: 14,
    borderBottomWidth: 0,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  recentText: { flex: 1 },
  recentCategory: { ...type.body, fontWeight: '600' },
  recentMeta: { ...type.hint, fontSize: 12, marginTop: 2 },
  amountIn: { ...money, color: colors.gain },
  amountOut: { ...money },
});
