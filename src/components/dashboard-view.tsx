// Dashboard presentation (Phase 11) — pure view over DashboardModel, no data
// fetching and no router imports, so tests can render it directly (empty-state
// render is a spec §5 Phase 11 test).
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DashboardModel } from '@/lib/dashboard';
import { ledgerMetaLabel } from '@/lib/ledger-copy';
import { formatMoney } from '@/lib/money';
import type { TimelineEntry } from '@/lib/timeline';
import { colors, glass, money, moneyDisplay, radius, space, type, ui } from '@/theme';
import { GlassButton, GlassPressable, GlassSurface, tapFeedback } from './glass';

interface Props {
  model: DashboardModel;
  /** category_id → display name (falls back to the id when unknown). */
  categoryNames: Map<string, string>;
  /** "Properties" / "Households" / "Ledgers" — matches the tab's title (spec §3). */
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
    <ScrollView
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      testID="dashboard"
    >
      {/* Portfolio net this year: the one loud thing on the screen, midnight glass. */}
      <GlassSurface tint={glass.inkTint} style={styles.hero}>
        <Text style={styles.heroLabel}>Net this year · all {collectionTitle.toLowerCase()}</Text>
        <Text
          style={[styles.heroValue, yearPL.net < 0 && styles.heroNegative]}
          adjustsFontSizeToFit
          numberOfLines={1}
          selectable
        >
          {formatMoney(yearPL.net)}
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>In</Text>
            <Text style={styles.heroStatValue}>{formatMoney(yearPL.totalIncome)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Out</Text>
            <Text style={styles.heroStatValue}>{formatMoney(yearPL.totalExpense)}</Text>
          </View>
        </View>
        <Text style={styles.heroMonth}>
          This month {formatMoney(monthPL.net)}
          {monthSavingsRate !== null
            ? // Tracking language, not budgeting: what share of income was kept, or how
              // far spending ran past it. -0.62 means spending was 162% of income.
              monthSavingsRate >= 0
              ? ` · kept ${Math.round(monthSavingsRate * 100)}%`
              : ` · spent ${Math.abs(Math.round(monthSavingsRate * 100))}% more than came in`
            : ''}
        </Text>
      </GlassSurface>

      {/* The app's most-used action: filled, not an outline that reads as disabled. */}
      <GlassButton label="Add expense or income" accessibilityLabel="Quick add" onPress={onQuickAdd} />

      <Text style={styles.sectionTitle}>{collectionTitle}</Text>
      {propertyCards.length === 0 ? (
        <Text style={styles.empty}>
          No {collectionTitle.toLowerCase()} yet — add one on the {collectionTitle} tab.
        </Text>
      ) : (
        propertyCards.map((card) => (
          <GlassPressable
            key={card.propertyId}
            onPress={() => onOpenProperty(card.propertyId)}
            contentStyle={styles.propertyCard}
            accessibilityLabel={card.name}
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
            <View style={styles.propertyBottom}>
              <Text style={styles.propertyKind}>
                {ledgerMetaLabel({ ledger_kind: card.kind, property_subtype: card.subtype })}
              </Text>
              <Text style={styles.propertySub} numberOfLines={1}>
                In {formatMoney(card.totalIncome)} · Out {formatMoney(card.totalExpense)}
              </Text>
            </View>
          </GlassPressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Recent activity</Text>
      {recent.length === 0 ? (
        <Text style={styles.empty}>No transactions yet.</Text>
      ) : (
        <GlassSurface style={styles.recentGroup}>
          {recent.map((entry, index) => (
            <Pressable
              key={`${entry.kind}-${entry.id}`}
              style={({ pressed }) => [
                styles.recentRow,
                index === recent.length - 1 && styles.recentRowLast,
                pressed && styles.recentRowPressed,
              ]}
              onPress={() => {
                tapFeedback();
                onOpenTransaction(entry);
              }}
            >
              <View style={[styles.recentIcon, entry.kind === 'income' && styles.recentIconIn]}>
                <Ionicons
                  name={entry.kind === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={14}
                  color={entry.kind === 'income' ? colors.gain : colors.ink}
                />
              </View>
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
          ))}
        </GlassSurface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 120, gap: space.md },
  hero: { padding: space.xl, gap: space.sm, borderRadius: 28 },
  heroLabel: { ...type.eyebrow, color: colors.onInkMuted },
  heroValue: { ...moneyDisplay, color: colors.onInk, fontSize: 46 },
  heroNegative: { color: colors.onInkDanger },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xs },
  heroStat: { gap: 2 },
  heroStatLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: colors.brassBright },
  heroStatValue: { ...money, color: colors.onInk, fontSize: 15 },
  heroDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.onInkMuted },
  heroMonth: { ...money, color: colors.onInkMuted, fontSize: 13, fontWeight: '500', marginTop: space.sm },
  sectionTitle: { ...type.section, marginTop: space.md },
  empty: { ...type.hint, fontSize: 14 },
  propertyCard: { padding: space.lg, gap: space.sm },
  propertyTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  propertyName: { ...type.body, fontSize: 17, fontWeight: '600', flex: 1 },
  propertyNet: { ...money, fontSize: 17, fontWeight: '700' },
  propertyNetNegative: { color: colors.danger },
  propertyBottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  propertyKind: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.brass,
    backgroundColor: colors.brassSoft,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  propertySub: { ...type.hint, fontSize: 12, flex: 1 },
  recentGroup: { paddingVertical: space.xs },
  recentRow: { ...ui.row, gap: space.md, backgroundColor: 'transparent' },
  recentRowLast: { borderBottomWidth: 0 },
  recentRowPressed: { backgroundColor: 'rgba(14, 26, 43, 0.04)' },
  recentIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 26, 43, 0.06)',
  },
  recentIconIn: { backgroundColor: 'rgba(30, 117, 80, 0.10)' },
  recentText: { flex: 1 },
  recentCategory: { ...type.body, fontWeight: '600' },
  recentMeta: { ...type.hint, fontSize: 12, marginTop: 2 },
  amountIn: { ...money, color: colors.gain },
  amountOut: { ...money },
});
