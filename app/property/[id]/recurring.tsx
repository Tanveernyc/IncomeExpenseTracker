// Per-property recurring rules: active and stopped, with Stop (README §4.4) and
// Delete (history kept via on delete set null). Edit → /recurring/[id] (amount/notes,
// README §4.3). New rule → /recurring/new modal.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listCategories } from '@/db/categories';
import { getProperty } from '@/db/properties';
import { deleteRecurringRule, listRecurringRules, stopRecurringRule } from '@/db/recurring';
import { confirmDelete } from '@/lib/confirm-delete';
import { formatDateLabel, formatMonthShort } from '@/lib/dates';
import { nounFor } from '@/lib/ledger-copy';
import { formatMoney } from '@/lib/money';
import type { RecurringRule } from '@/types';
import { GlassButton, GlassSurface } from '@/components/glass';
import { colors, money, rhythm, space, type, ui } from '@/theme';

export default function PropertyRecurringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: property } = useQuery({ queryKey: ['property', id], queryFn: () => getProperty(id) });
  const { data: rules, isPending } = useQuery({
    queryKey: ['recurring', { propertyId: id }],
    queryFn: () => listRecurringRules(id),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recurring'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['income'] });
  };
  const stopMutation = useMutation({
    mutationFn: (ruleId: string) => stopRecurringRule(ruleId),
    onSuccess: invalidate,
    onError: (e: Error) => Alert.alert('Could not stop rule', e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRecurringRule(ruleId),
    onSuccess: invalidate,
    onError: (e: Error) => Alert.alert('Could not delete rule', e.message),
  });

  const categoryName = (catId: string) => categories?.find((c) => c.id === catId)?.name ?? 'Unknown';
  const endsLabel = (r: RecurringRule) =>
    r.end_mode === 'count' ? `for ${r.occurrences} months` : r.stopped_on ? `stopped ${formatDateLabel(r.stopped_on)}` : 'until stopped';

  const onStop = (r: RecurringRule) =>
    Alert.alert('Stop this rule?', 'No more months will be posted. Past entries are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => stopMutation.mutate(r.id) },
    ]);
  const onDelete = (r: RecurringRule) =>
    confirmDelete(
      'Delete this rule?',
      'Entries already posted stay in your ledger and still count toward totals.',
      () => deleteMutation.mutate(r.id)
    );

  return (
    <>
      <Stack.Screen
        options={{ title: `${property?.name ?? nounFor(property?.ledger_kind ?? 'property').one} · Recurring` }}
      />
      <FlatList
        style={ui.screen}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={isPending ? [] : rules}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <GlassButton
              variant="secondary"
              label="+ Expense rule"
              onPress={() => router.push({ pathname: '/recurring/new', params: { kind: 'expense', propertyId: id } })}
              style={styles.headerButton}
            />
            <GlassButton
              variant="secondary"
              label="+ Income rule"
              onPress={() => router.push({ pathname: '/recurring/new', params: { kind: 'income', propertyId: id } })}
              style={styles.headerButton}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          isPending ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <Text style={styles.empty}>
              No recurring rules yet. Add one for anything that repeats every month, like rent or a
              mortgage, and it will be filled in for you.
            </Text>
          )
        }
        renderItem={({ item }) => (
          // Stopped rules dim their text, never the glass: opacity on a GlassView kills the effect.
          <GlassSurface style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, !item.is_active && styles.inactiveText]}>
                {categoryName(item.category_id)} · {item.kind === 'income' ? '+' : '−'}
                {formatMoney(item.amount)}/mo
              </Text>
              <Text style={[styles.rowMeta, !item.is_active && styles.inactiveText]}>
                from {formatMonthShort(item.start_month)} · {endsLabel(item)}
                {item.notes ? ` · ${item.notes}` : ''}
              </Text>
            </View>
            <View style={styles.actions}>
              {item.is_active ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: item.id } })}
                  hitSlop={10}
                  accessibilityRole="button"
                >
                  <Text style={styles.edit}>Edit</Text>
                </Pressable>
              ) : null}
              {item.is_active && item.end_mode === 'until_stopped' ? (
                <Pressable onPress={() => onStop(item)} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.stop}>Stop</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => onDelete(item)} hitSlop={10} accessibilityRole="button">
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          </GlassSurface>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: space.lg, paddingBottom: 60 },
  header: { flexDirection: 'row', gap: space.md, marginBottom: rhythm.section },
  headerButton: { flex: 1 },
  spinner: { marginTop: 32 },
  empty: { ...ui.empty },
  separator: { height: rhythm.item },
  row: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  inactiveText: { color: colors.mist },
  rowText: { flex: 1 },
  rowTitle: { ...money, fontSize: 15 },
  rowMeta: { ...type.hint, marginTop: 2 },
  // Wide gaps so each small text button has its own tap area.
  actions: { flexDirection: 'row', gap: 22 },
  edit: { ...ui.link },
  stop: { color: colors.brass, fontSize: 14, fontWeight: '600' },
  delete: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
