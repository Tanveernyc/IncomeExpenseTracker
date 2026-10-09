// Shared rapid-entry form for expenses (Phase 5) and income (Phase 6).
// Same shape both ways: property defaults to last used, categories recent-first,
// post-save keeps property/category so ten entries are ten "amount → save" taps.
// Income differs only in: date column (received_on), source instead of vendor,
// income categories, and no covers-period fields (the income table has none).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createCategory, listCategories } from '@/db/categories';
import { createExpense } from '@/db/expenses';
import { createIncome } from '@/db/income';
import { listProperties } from '@/db/properties';
import {
  initialAddState,
  orderCategoriesByRecent,
  pushRecentCategory,
  resetAfterSave,
  type AddTransactionState,
} from '@/lib/add-transaction-state';
import { validateTransactionForm, type TransactionValidation } from '@/lib/expense-validation';
import { collectionNoun, kindsOf, partyLabel } from '@/lib/ledger-copy';
import { recordSavedEntry } from '@/lib/review-prompt';
import type { CategoryKind } from '@/types';
import { colors, moneyDisplay, rhythm, space, type, ui } from '@/theme';
import { CategoryHint } from './category-hint';
import { DateField } from './date-field';
import { GlassButton, GlassChip, GlassSurface } from './glass';

// Last-used property is shared across kinds; recent categories are per kind.
const LAST_PROPERTY_KEY = 'add:last-property-id';
const recentCategoriesKey = (kind: CategoryKind) => `add:recent-${kind}-category-ids`;

export function AddTransactionForm({
  kind,
  header,
  propertyId,
}: {
  kind: CategoryKind;
  header?: ReactNode;
  /** Preselects this ledger, e.g. when opened from a ledger's own screen. */
  propertyId?: string;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AddTransactionState>(initialAddState);
  // Declared here, not further down: the effects below call it, and a const
  // referenced before its declaration only works by accident of effect timing.
  const set = (patch: Partial<AddTransactionState>) => setState((s) => ({ ...s, ...patch }));
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<TransactionValidation['errors']>({});
  const [savedFlash, setSavedFlash] = useState(false);

  // Switching expense ↔ income starts the form clean but keeps the ledger. Done
  // here rather than by remounting, so the Expense/Income switch above stays
  // mounted and its thumb can slide.
  const [formKind, setFormKind] = useState(kind);
  if (formKind !== kind) {
    setFormKind(kind);
    setState((s) => ({ ...initialAddState(), propertyId: s.propertyId }));
    setErrors({});
    setSavedFlash(false);
  }

  const isExpense = kind === 'expense';
  const dateLabel = isExpense ? 'Paid on' : 'Received on';

  const { data: properties } = useQuery({
    queryKey: ['properties', { includeArchived: false }],
    queryFn: () => listProperties(),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  // Restore last-used property (unless one was passed in) + this kind's recent
  // categories on mount, kind switch, or a new ledger handed over.
  useEffect(() => {
    (async () => {
      const [lastProperty, recentJson] = await Promise.all([
        AsyncStorage.getItem(LAST_PROPERTY_KEY),
        AsyncStorage.getItem(recentCategoriesKey(kind)),
      ]);
      const pick = propertyId ?? lastProperty;
      if (pick) setState((s) => ({ ...s, propertyId: pick }));
      setRecentCategoryIds(recentJson ? JSON.parse(recentJson) : []);
      // Category selection does not carry across kinds (expense ids ≠ income ids).
      setState((s) => ({ ...s, categoryId: null }));
    })();
  }, [kind, propertyId]);

  // The picked ledger, else the first one: categories are only ranked for a real
  // ledger, and a stale remembered id (since archived or deleted) must not stick.
  const ledgerId =
    (properties ?? []).find((p) => p.id === state.propertyId)?.id ?? properties?.[0]?.id ?? null;
  const selectedLedger = (properties ?? []).find((p) => p.id === ledgerId);
  const ledgerKind = selectedLedger?.ledger_kind;
  const kindCategories = orderCategoriesByRecent(categories ?? [], recentCategoryIds, kind, selectedLedger);

  // Category selection tracks the selected ledger's scope. Derived, not written back
  // by an effect: switching ledger must never leave a render holding a category the
  // new ledger does not offer.
  const categoryId =
    state.categoryId && kindCategories.some((c) => c.id === state.categoryId)
      ? state.categoryId
      : null;

  const isBudget = ledgerKind === 'budget';

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateTransactionForm({
        amountText: state.amountText,
        date: state.date,
        propertyId: ledgerId,
        categoryId,
        periodStart: isExpense && !isBudget ? state.periodStart : undefined,
        periodEnd: isExpense && !isBudget ? state.periodEnd : undefined,
      });
      setErrors(validation.errors);
      if (!validation.valid || validation.amount === undefined) {
        throw Object.assign(new Error('validation'), { silent: true });
      }
      const common = {
        property_id: ledgerId!,
        category_id: categoryId!,
        amount: validation.amount,
        notes: state.notes.trim() || null,
      };
      if (isExpense) {
        return createExpense({
          ...common,
          paid_on: state.date.trim(),
          period_start: state.periodStart.trim() || null,
          period_end: state.periodEnd.trim() || null,
          vendor: state.vendor.trim() || null,
        });
      }
      return createIncome({
        ...common,
        received_on: state.date.trim(),
        source: state.vendor.trim() || null,
      });
    },
    onSuccess: () => {
      // Stay on the screen; clear per-entry fields, keep property/category.
      const recents = pushRecentCategory(recentCategoryIds, categoryId!);
      setRecentCategoryIds(recents);
      AsyncStorage.setItem(LAST_PROPERTY_KEY, ledgerId!);
      AsyncStorage.setItem(recentCategoriesKey(kind), JSON.stringify(recents));
      setState(resetAfterSave(state));
      setErrors({});
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      queryClient.invalidateQueries({ queryKey: [isExpense ? 'expenses' : 'income'] });
      // After the saved flash, so the rating sheet never covers the confirmation.
      setTimeout(recordSavedEntry, 1600);
    },
    onError: (e: Error & { silent?: boolean }) => {
      if (!e.silent) Alert.alert(`Could not save ${kind}`, e.message);
    },
  });


  // Create a category without leaving the form; the new one is selected right away.
  const newCategoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(name, kind, ledgerKind ?? 'both'),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      set({ categoryId: category.id });
    },
    onError: (e: Error) => Alert.alert('Could not add category', e.message),
  });
  const promptNewCategory = () => {
    // Alert.prompt is iOS-only; this app is iOS-first (same convention as the Categories screen).
    Alert.prompt(`New ${kind} category`, undefined, (name) => {
      const trimmed = name?.trim().slice(0, 100) ?? '';
      if (trimmed) newCategoryMutation.mutate(trimmed);
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      // Scroll the focused field (and the Save button) above the keyboard instead of hiding them.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      {header}
      <GlassSurface style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount *</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountCurrency}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={state.amountText}
            onChangeText={(amountText) => set({ amountText })}
            placeholder="0.00"
            placeholderTextColor={colors.mist}
            keyboardType="decimal-pad"
            accessibilityLabel="Amount"
          />
        </View>
      </GlassSurface>
      {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}

      <Text style={styles.label}>{collectionNoun(kindsOf(properties ?? []))} *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        {(properties ?? []).map((p) => (
          <GlassChip
            key={p.id}
            label={p.name}
            selected={ledgerId === p.id}
            onPress={() => set({ propertyId: p.id })}
          />
        ))}
      </ScrollView>
      {errors.property ? <Text style={styles.error}>{errors.property}</Text> : null}

      <Text style={styles.label}>{isExpense ? 'Expense' : 'Income'} category</Text>
      {/* Keyed so a new kind or ledger starts the strip at its most likely categories. */}
      <ScrollView
        key={`${kind}-${ledgerId}`}
        horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        <GlassChip label="+ New" selected={false} onPress={promptNewCategory} />
        {kindCategories.map((c) => (
          <GlassChip
            key={c.id}
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => set({ categoryId: c.id })}
          />
        ))}
      </ScrollView>
      {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      <CategoryHint category={kindCategories.find((c) => c.id === categoryId)} />

      <Text style={styles.label}>{dateLabel} *</Text>
      <DateField
        value={state.date}
        onChange={(date) => set({ date })}
        placeholder="Add date"
        accessibilityLabel="Date"
      />
      {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}

      {isExpense && ledgerKind !== 'budget' ? (
        <>
          <Text style={styles.label}>Covers period (optional)</Text>
          <Text style={styles.hint}>For one bill that covers several months.</Text>
          <View style={styles.periodRow}>
            <DateField
              value={state.periodStart}
              onChange={(periodStart) => set({ periodStart })}
              placeholder="Start"
              clearable
              accessibilityLabel="Period start"
              style={styles.periodInput}
            />
            <DateField
              value={state.periodEnd}
              onChange={(periodEnd) => set({ periodEnd })}
              placeholder="End"
              clearable
              accessibilityLabel="Period end"
              style={styles.periodInput}
            />
          </View>
          {errors.period ? <Text style={styles.error}>{errors.period}</Text> : null}
        </>
      ) : null}

      <Text style={styles.label}>{partyLabel(ledgerKind ?? 'property', kind)}</Text>
      <TextInput
        style={styles.input}
        value={state.vendor}
        maxLength={200}
        onChangeText={(vendor) => set({ vendor })}
        placeholder={
          isExpense
            ? ledgerKind === 'budget'
              ? 'e.g. Grocery store'
              : 'e.g. Insurance company'
            : 'e.g. tenant name'
        }
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.input}
        value={state.notes}
        maxLength={5000}
        onChangeText={(notes) => set({ notes })}
        placeholder="optional"
        placeholderTextColor={colors.mist}
      />

      <GlassButton
        label={saveMutation.isPending ? 'Saving…' : isExpense ? 'Save Expense' : 'Save Income'}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={styles.saveButton}
      />
      {savedFlash ? <Text style={styles.savedFlash}>Saved ✓</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 120 },
  label: { ...ui.label },
  // Chips scroll edge to edge; the row cancels the screen padding. Unclipped so the
  // glass shadow fades out instead of ending in a pale band behind the row.
  chipStrip: { marginHorizontal: -space.lg, overflow: 'visible' },
  chipRow: { gap: space.sm, paddingHorizontal: space.lg },
  input: { ...ui.input },
  amountCard: { paddingHorizontal: space.xl, paddingVertical: space.md, marginTop: rhythm.section },
  amountLabel: { ...ui.label, marginTop: 0, marginLeft: 0, marginBottom: 0 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  amountCurrency: { ...moneyDisplay, fontSize: 26, color: colors.brass },
  amountInput: { ...moneyDisplay, fontSize: 36, flex: 1, paddingVertical: 0 },
  periodRow: { flexDirection: 'row', gap: space.sm },
  hint: { ...type.hint, marginTop: -space.xs, marginBottom: space.sm, marginLeft: space.xs },
  periodInput: { flex: 1 },
  error: { ...ui.error },
  saveButton: { marginTop: rhythm.section },
  savedFlash: { color: colors.gain, textAlign: 'center', marginTop: space.sm, fontWeight: '600' },
});
