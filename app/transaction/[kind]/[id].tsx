// Edit-transaction screen (Phase 7): amount, date, party, notes, and (expenses
// only) the covers-period fields. Kind comes from the route: /transaction/expense/:id.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getExpense, updateExpense } from '@/db/expenses';
import { getIncome, updateIncome } from '@/db/income';
import { getProperty } from '@/db/properties';
import { skipRecurringMonth } from '@/db/recurring';
import { monthKey } from '@/lib/dates';
import { validateTransactionForm, type TransactionValidation } from '@/lib/expense-validation';
import { partyLabel } from '@/lib/ledger-copy';
import type { Expense, Income } from '@/types';
import { ScreenLoading } from '@/components/screen-state';
import { GlassButton, GlassSurface } from '@/components/glass';
import { colors, moneyDisplay, space, type, ui } from '@/theme';

export default function EditTransactionScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: 'expense' | 'income'; id: string }>();
  const isExpense = kind === 'expense';

  const { data: transaction, isPending } = useQuery<Expense | Income>({
    queryKey: [isExpense ? 'expense' : 'income-entry', id],
    queryFn: () => (isExpense ? getExpense(id) : getIncome(id)),
  });

  // The editor mounts only once the row is here, so its fields start from the
  // transaction instead of being written in afterwards by an effect.
  if (isPending || !transaction) return <ScreenLoading />;
  return <TransactionEditor id={id} isExpense={isExpense} transaction={transaction} />;
}

function TransactionEditor({
  id,
  isExpense,
  transaction,
}: {
  id: string;
  isExpense: boolean;
  transaction: Expense | Income;
}) {
  const queryClient = useQueryClient();
  const { data: property } = useQuery({
    queryKey: ['property', transaction.property_id],
    queryFn: () => getProperty(transaction.property_id),
  });
  const ledgerKind = property?.ledger_kind;

  const isExpenseRow = 'paid_on' in transaction;
  const [amountText, setAmountText] = useState(String(transaction.amount));
  const [date, setDate] = useState(isExpenseRow ? transaction.paid_on : transaction.received_on);
  const [party, setParty] = useState(
    isExpenseRow ? (transaction.vendor ?? '') : (transaction.source ?? '')
  );
  const [notes, setNotes] = useState(transaction.notes ?? '');
  const [periodStart, setPeriodStart] = useState(
    isExpenseRow ? (transaction.period_start ?? '') : ''
  );
  const [periodEnd, setPeriodEnd] = useState(isExpenseRow ? (transaction.period_end ?? '') : '');
  const [errors, setErrors] = useState<TransactionValidation['errors']>({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateTransactionForm({
        amountText,
        date,
        // Property/category are not edited here; pass placeholders that satisfy the validator.
        propertyId: transaction?.property_id ?? null,
        categoryId: transaction?.category_id ?? null,
        periodStart: isExpense && ledgerKind !== 'budget' ? periodStart : undefined,
        periodEnd: isExpense && ledgerKind !== 'budget' ? periodEnd : undefined,
      });
      setErrors(validation.errors);
      if (!validation.valid || validation.amount === undefined) {
        throw Object.assign(new Error('validation'), { silent: true });
      }
      if (transaction?.recurring_id) {
        const originalDate = 'paid_on' in transaction ? transaction.paid_on : transaction.received_on;
        if (monthKey(date.trim()) !== monthKey(originalDate)) {
          // Same "skip first" ordering as delete: the vacated month must never be re-posted.
          await skipRecurringMonth(transaction.recurring_id, originalDate);
        }
      }
      if (isExpense) {
        return updateExpense(id, {
          amount: validation.amount,
          paid_on: date.trim(),
          period_start: periodStart.trim() || null,
          period_end: periodEnd.trim() || null,
          vendor: party.trim() || null,
          notes: notes.trim() || null,
          is_edited: transaction?.recurring_id ? true : undefined,
        });
      }
      return updateIncome(id, {
        amount: validation.amount,
        received_on: date.trim(),
        source: party.trim() || null,
        notes: notes.trim() || null,
        is_edited: transaction?.recurring_id ? true : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isExpense ? 'expenses' : 'income'] });
      queryClient.invalidateQueries({ queryKey: [isExpense ? 'expense' : 'income-entry', id] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      router.back();
    },
    onError: (e: Error & { silent?: boolean }) => {
      if (!e.silent) Alert.alert('Could not save changes', e.message);
    },
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      // Scroll the focused field (and the Save button) above the keyboard instead of hiding them.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <Stack.Screen options={{ title: isExpense ? 'Edit Expense' : 'Edit Income' }} />

      {transaction?.recurring_id ? (
        <GlassSurface style={styles.recurringCard}>
          <Text style={styles.recurringNote}>
            ↻ Posted by a monthly rule. Changes here apply to this month only; the rule keeps posting
            future months at its own amount. Moving it to another month leaves the original month
            empty for good.
          </Text>
        </GlassSurface>
      ) : null}

      <Text style={styles.label}>Amount ($) *</Text>
      <TextInput
        style={[styles.input, styles.amountInput]}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
      />
      {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}

      <Text style={styles.label}>{isExpense ? 'Paid on' : 'Received on'} *</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.mist}
        autoCapitalize="none"
      />
      {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}

      {isExpense && ledgerKind !== 'budget' ? (
        <>
          <Text style={styles.label}>Covers period (optional)</Text>
          <View style={styles.periodRow}>
            <TextInput
              style={[styles.input, styles.periodInput]}
              value={periodStart}
              onChangeText={setPeriodStart}
              placeholder="start YYYY-MM-DD"
              placeholderTextColor={colors.mist}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.periodInput]}
              value={periodEnd}
              onChangeText={setPeriodEnd}
              placeholder="end YYYY-MM-DD"
              placeholderTextColor={colors.mist}
              autoCapitalize="none"
            />
          </View>
          {errors.period ? <Text style={styles.error}>{errors.period}</Text> : null}
        </>
      ) : null}

      <Text style={styles.label}>{partyLabel(ledgerKind ?? 'property', isExpense ? 'expense' : 'income')}</Text>
      <TextInput style={styles.input} value={party} onChangeText={setParty} />

      <Text style={styles.label}>Notes</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} />

      <GlassButton
        label={saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 60, gap: space.xs },
  label: { ...ui.label },
  recurringCard: { padding: space.lg, marginBottom: space.sm },
  recurringNote: { ...type.label, fontSize: 13, lineHeight: 19 },
  input: { ...ui.input },
  amountInput: { ...moneyDisplay, fontSize: 30 },
  periodRow: { flexDirection: 'row', gap: space.sm },
  periodInput: { flex: 1 },
  error: { ...ui.error },
  saveButton: { marginTop: space.xl },
});
