// New recurring rule (README §4.1): property, category, amount, start month,
// end condition. On save: insert the rule, then immediately sync it so the
// first month(s) appear right away (README §4.2 "right after a rule is created").
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { listCategories } from '@/db/categories';
import { listProperties } from '@/db/properties';
import { createRecurringRule, syncRule } from '@/db/recurring';
import { orderCategoriesByRecent } from '@/lib/add-transaction-state';
import { isValidISODate, monthKey, todayISO } from '@/lib/dates';
import { collectionNoun, kindsOf, partyLabel } from '@/lib/ledger-copy';
import {
  monthsToBackfill,
  validateRecurringRuleForm,
  type RecurringRuleValidation,
} from '@/lib/recurring-rule-validation';
import type { CategoryKind, EndMode } from '@/types';
import { colors, moneyDisplay, rhythm, space, type, ui } from '@/theme';
import { CategoryHint } from './category-hint';
import { DateField } from './date-field';
import { GlassButton, GlassChip, GlassSegmented } from './glass';

const END_OPTIONS = [
  { value: 'until_stopped', label: 'Until I stop it' },
  { value: 'count', label: 'After N months' },
] as const;

interface Props {
  kind: CategoryKind;
  initialPropertyId?: string;
  onSaved: () => void;
}

export function RecurringRuleForm({ kind, initialPropertyId, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [chosenPropertyId, setPropertyId] = useState<string | null>(initialPropertyId ?? null);
  const [chosenCategoryId, setCategoryId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [startMonthText, setStartMonthText] = useState(monthKey(todayISO()));
  const [endMode, setEndMode] = useState<EndMode>('until_stopped');
  const [occurrencesText, setOccurrencesText] = useState('12');
  const [party, setParty] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<RecurringRuleValidation['errors']>({});

  const isExpense = kind === 'expense';

  const { data: properties } = useQuery({
    queryKey: ['properties', { includeArchived: false }],
    queryFn: () => listProperties(),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  // The selection only becomes real once the user picks; until then it follows the
  // data. Derived rather than written back by an effect, so there is no render
  // where the form holds a property or category that is not on offer.
  const propertyId = chosenPropertyId ?? properties?.[0]?.id ?? null;
  const selectedLedger = (properties ?? []).find((p) => p.id === propertyId);
  const ledgerKind = selectedLedger?.ledger_kind;
  const kindCategories = orderCategoriesByRecent(categories ?? [], [], kind, selectedLedger);

  const categoryId =
    chosenCategoryId && kindCategories.some((c) => c.id === chosenCategoryId)
      ? chosenCategoryId
      : null;

  // Live preview of how many months will post immediately (finding 4) — independent of
  // full form validation so it updates as soon as the start month looks parseable.
  const trimmedStartMonth = startMonthText.trim();
  let pending = 0;
  if (/^\d{4}-\d{2}$/.test(trimmedStartMonth) && isValidISODate(`${trimmedStartMonth}-01`)) {
    pending = monthsToBackfill(`${trimmedStartMonth}-01`, todayISO());
    if (endMode === 'count') pending = Math.min(pending, Number(occurrencesText) || 0);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateRecurringRuleForm({
        propertyId,
        categoryId,
        amountText,
        startMonthText,
        endMode,
        occurrencesText,
      });
      setErrors(validation.errors);
      if (!validation.valid || validation.amount === undefined || !validation.startMonth) {
        throw Object.assign(new Error('validation'), { silent: true });
      }

      let willBackfill = monthsToBackfill(validation.startMonth, todayISO());
      if (endMode === 'count') willBackfill = Math.min(willBackfill, validation.occurrences!);
      if (willBackfill > 12) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            `Post ${willBackfill} months now?`,
            `This backfills ${willBackfill} entries immediately. Deleting the rule later keeps them.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Continue', onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) throw Object.assign(new Error('cancelled'), { silent: true });
      }

      const rule = await createRecurringRule({
        property_id: propertyId!,
        category_id: categoryId!,
        kind,
        amount: validation.amount,
        notes: notes.trim() || null,
        party: party.trim() || null,
        start_month: validation.startMonth,
        end_mode: endMode,
        occurrences: endMode === 'count' ? validation.occurrences! : null,
      });
      try {
        return await syncRule(rule);
      } catch (e) {
        // The rule exists; the launch catch-up will post its months. Don't let the user re-create it.
        console.warn('recurring first sync failed', (e as Error).message);
        return null;
      }
    },
    onSuccess: (inserted) => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: [isExpense ? 'expenses' : 'income'] });
      if (inserted === null) {
        Alert.alert('Recurring rule saved', 'Entries will post the next time the app opens.', [
          { text: 'OK', onPress: onSaved },
        ]);
        return;
      }
      Alert.alert(
        'Recurring rule saved',
        inserted === 1 ? '1 entry was posted.' : `${inserted} entries were posted.`,
        [{ text: 'OK', onPress: onSaved }]
      );
    },
    onError: (e: Error & { silent?: boolean }) => {
      if (!e.silent) Alert.alert('Could not save rule', e.message);
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
      <Text style={styles.help}>
        Posts one {kind} on the 1st of every month, starting from the month you pick — including
        past months up to today. You can edit or delete any single month afterwards.
      </Text>

      <Text style={styles.label}>{collectionNoun(kindsOf(properties ?? []))} *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        {(properties ?? []).map((p) => (
          <GlassChip key={p.id} label={p.name} selected={propertyId === p.id} onPress={() => setPropertyId(p.id)} />
        ))}
      </ScrollView>
      {errors.property ? <Text style={styles.error}>{errors.property}</Text> : null}

      <Text style={styles.label}>{isExpense ? 'Expense' : 'Income'} category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        {kindCategories.map((c) => (
          <GlassChip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>
      {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      <CategoryHint category={kindCategories.find((c) => c.id === categoryId)} />

      <Text style={styles.label}>Amount ($) each month *</Text>
      <TextInput
        style={[styles.input, styles.amountInput]}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0.00"
        placeholderTextColor={colors.mist}
        keyboardType="decimal-pad"
      />
      {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}

      <Text style={styles.label}>Start month *</Text>
      <DateField
        value={startMonthText}
        onChange={setStartMonthText}
        granularity="month"
        placeholder="Pick a month"
        accessibilityLabel="Start month"
      />
      {errors.startMonth ? <Text style={styles.error}>{errors.startMonth}</Text> : null}
      {pending > 0 ? <Text style={styles.help}>Will post {pending} month(s) now</Text> : null}

      <Text style={styles.label}>Ends *</Text>
      <GlassSegmented options={END_OPTIONS} value={endMode} onChange={setEndMode} />
      {endMode === 'count' ? (
        <>
          <Text style={styles.label}>Number of months *</Text>
          <TextInput
            style={styles.input}
            value={occurrencesText}
            onChangeText={setOccurrencesText}
            keyboardType="number-pad"
          />
          {errors.occurrences ? <Text style={styles.error}>{errors.occurrences}</Text> : null}
        </>
      ) : null}

      <Text style={styles.label}>{partyLabel(ledgerKind ?? 'property', kind)}</Text>
      <TextInput
        style={styles.input}
        value={party}
        maxLength={200}
        onChangeText={setParty}
        placeholder={
          isExpense
            ? ledgerKind === 'budget'
              ? 'e.g. Grocery store'
              : 'e.g. Mortgage lender'
            : 'e.g. tenant name'
        }
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} maxLength={5000} placeholder="optional" placeholderTextColor={colors.mist} />

      <GlassButton
        label={saveMutation.isPending ? 'Saving…' : 'Save Recurring Rule'}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 60 },
  help: { ...type.label, marginBottom: space.sm, lineHeight: 20 },
  label: { ...ui.label },
  // Chips scroll edge to edge; the strip cancels the screen padding.
  chipStrip: ui.chipStrip,
  chipRow: ui.chipRow,
  input: { ...ui.input },
  // The amount is the one field allowed to be taller than the rest.
  amountInput: { ...moneyDisplay, fontSize: 28, height: 56 },
  saveButton: { marginTop: rhythm.section },
  error: { ...ui.error },
});
