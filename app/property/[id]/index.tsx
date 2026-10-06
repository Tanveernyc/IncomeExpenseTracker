// Property transactions screen (Phase 7): expenses + income interleaved newest
// first, category and date-range filters, tap to edit, swipe to delete (confirmed).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { listCategories } from '@/db/categories';
import { deleteExpense, listPropertyExpenses } from '@/db/expenses';
import { deleteIncome, listPropertyIncome } from '@/db/income';
import { getProperty } from '@/db/properties';
import { skipRecurringMonth } from '@/db/recurring';
import { categoriesVisibleToLedger } from '@/lib/categories';
import { confirmDelete } from '@/lib/confirm-delete';
import { nounFor } from '@/lib/ledger-copy';
import { formatMoney } from '@/lib/money';
import {
  buildTimeline,
  filterTimeline,
  sortTimeline,
  TIMELINE_SORT_LABELS,
  type TimelineEntry,
  type TimelineSort,
} from '@/lib/timeline';
import { DateField } from '@/components/date-field';
import { GlassChip, GlassPressable } from '@/components/glass';
import { colors, money, radius, space, type, ui } from '@/theme';

export default function PropertyTransactionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // Ledger order: oldest first by default, like a paper ledger. Tap to cycle.
  const [sort, setSort] = useState<TimelineSort>('oldest');
  const SORT_CYCLE: TimelineSort[] = ['oldest', 'newest', 'largest'];
  const nextSort = () => setSort((s) => SORT_CYCLE[(SORT_CYCLE.indexOf(s) + 1) % SORT_CYCLE.length]);

  const { data: property } = useQuery({ queryKey: ['property', id], queryFn: () => getProperty(id) });
  const { data: expenses, isPending: loadingExpenses } = useQuery({
    queryKey: ['expenses', { propertyId: id }],
    queryFn: () => listPropertyExpenses(id),
  });
  const { data: income, isPending: loadingIncome } = useQuery({
    queryKey: ['income', { propertyId: id }],
    queryFn: () => listPropertyIncome(id),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const deleteMutation = useMutation({
    mutationFn: async (entry: TimelineEntry) => {
      // Record the skip first: if the delete then fails the month is merely hidden
      // from future generation, whereas the reverse order could resurrect it.
      if (entry.recurring_id) await skipRecurringMonth(entry.recurring_id, entry.date);
      return entry.kind === 'expense' ? deleteExpense(entry.id) : deleteIncome(entry.id);
    },
    onSuccess: (_, entry) => {
      queryClient.invalidateQueries({ queryKey: [entry.kind === 'expense' ? 'expenses' : 'income'] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
    onError: (e: Error) => Alert.alert('Could not delete', e.message),
  });

  const timeline = useMemo(
    () =>
      sortTimeline(
        filterTimeline(buildTimeline(expenses ?? [], income ?? []), {
          from: from.trim() || undefined,
          to: to.trim() || undefined,
          categoryId,
        }),
        sort
      ),
    [expenses, income, from, to, categoryId, sort]
  );

  const categoryName = (catId: string) =>
    categories?.find((c) => c.id === catId)?.name ?? 'Unknown';

  const onDelete = (entry: TimelineEntry) => {
    confirmDelete(
      `Delete this ${entry.kind}?`,
      entry.recurring_id
        ? `${formatMoney(entry.amount)} on ${entry.date} — this month will not be posted again by its rule.`
        : `${formatMoney(entry.amount)} on ${entry.date} — this cannot be undone.`,
      () => deleteMutation.mutate(entry)
    );
  };

  const loading = loadingExpenses || loadingIncome;

  const filters = (
    <View style={styles.filters}>
      {/* Filters: category chips + inclusive date range */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipStrip}
      >
        <GlassChip label="All" selected={!categoryId} onPress={() => setCategoryId(undefined)} />
        {/* Until the property loads, show the categories every ledger shares rather
            than an empty row that also never recovers if the query fails. */}
        {(property
          ? categoriesVisibleToLedger(categories ?? [], property)
          : (categories ?? []).filter((c) => c.scope === 'both')
        ).map((c) => (
          <GlassChip
            key={c.id}
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.dateRow}>
        <DateField
          value={from}
          onChange={setFrom}
          placeholder="From"
          clearable
          accessibilityLabel="From date"
          style={styles.dateInput}
        />
        <DateField
          value={to}
          onChange={setTo}
          placeholder="To"
          clearable
          accessibilityLabel="To date"
          style={styles.dateInput}
        />
      </View>
      <View style={styles.sortRow}>
        <GlassChip label={`↕ ${TIMELINE_SORT_LABELS[sort]}`} selected onPress={nextSort} />
      </View>
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: property?.name ?? nounFor(property?.ledger_kind ?? 'property').one,
          // On iOS 26 these render as one liquid glass capsule in the header.
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push({ pathname: '/property/[id]/recurring', params: { id } })}
                accessibilityLabel="Recurring"
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="repeat" size={22} color={colors.ink} />
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/property/[id]/edit', params: { id } })}
                accessibilityLabel="Edit details"
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={22} color={colors.ink} />
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        style={ui.screen}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={loading ? [] : timeline}
        keyExtractor={(entry) => `${entry.kind}-${entry.id}`}
        ListHeaderComponent={filters}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No transactions match.</Text>}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={(progress) => (
              // Rows are translucent glass, so the action fades in with the swipe
              // instead of showing red through the row at rest.
              <Animated.View
                style={[
                  styles.deleteActionWrap,
                  { opacity: progress.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }) },
                ]}
              >
                <Pressable style={styles.deleteAction} onPress={() => onDelete(item)}>
                  <Text style={styles.deleteActionText}>Delete</Text>
                </Pressable>
              </Animated.View>
            )}
          >
            <GlassPressable
              contentStyle={styles.row}
              accessibilityLabel={`${categoryName(item.category_id)} ${formatMoney(item.amount)}`}
              onPress={() =>
                router.push({
                  pathname: '/transaction/[kind]/[id]',
                  params: { kind: item.kind, id: item.id },
                })
              }
            >
              <View style={styles.rowText}>
                <Text style={styles.rowCategory}>
                  {item.recurring_id ? '↻ ' : ''}
                  {categoryName(item.category_id)}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.date}
                  {item.party ? ` · ${item.party}` : ''}
                </Text>
              </View>
              <Text style={item.kind === 'income' ? styles.amountIn : styles.amountOut}>
                {item.kind === 'income' ? '+' : '−'}
                {formatMoney(item.amount)}
              </Text>
            </GlassPressable>
          </Swipeable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Home-indicator clearance so the last row is never cut off.
  listContent: { padding: space.lg, paddingBottom: 60 },
  headerActions: { flexDirection: 'row', gap: 18, paddingHorizontal: 4 },
  filters: { gap: space.md, marginBottom: space.lg },
  // Chips scroll edge to edge; the strip cancels the list padding.
  chipStrip: { marginHorizontal: -space.lg, flexGrow: 0 },
  chipRow: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
  dateRow: { flexDirection: 'row', gap: space.sm },
  sortRow: { flexDirection: 'row' },
  dateInput: { flex: 1 },
  spinner: { marginTop: 32 },
  empty: { ...ui.empty },
  separator: { height: space.sm },
  // The ledger: amounts in a right-hand column of tabular figures.
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14 },
  rowText: { flex: 1 },
  rowCategory: { ...type.body, fontWeight: '600' },
  rowMeta: { ...type.hint, marginTop: 2 },
  amountIn: { ...money, color: colors.gain },
  amountOut: { ...money },
  deleteActionWrap: { width: 96, paddingLeft: space.sm },
  deleteAction: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: { color: colors.onInk, fontWeight: '700' },
});
