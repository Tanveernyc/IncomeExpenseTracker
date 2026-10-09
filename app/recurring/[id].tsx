// Modal: edit every field of a recurring rule (README §4.3, extended).
// By default a change applies only to months not yet posted. The switch at the
// bottom also rewrites months already posted from a chosen month onward - but
// never a month the user edited by hand (is_edited), and never a deleted one.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { listCategories } from '@/db/categories';
import { listProperties } from '@/db/properties';
import { applyRuleToPostedEntries, getRecurringRule, syncRule, updateRecurringRule } from '@/db/recurring';
import { orderCategoriesByRecent } from '@/lib/add-transaction-state';
import { isValidISODate, monthKey, todayISO } from '@/lib/dates';
import { collectionNoun, kindsOf, partyLabel } from '@/lib/ledger-copy';
import { validateRecurringRuleForm, type RecurringRuleValidation } from '@/lib/recurring-rule-validation';
import type { EndMode, RecurringRule } from '@/types';
import { ScreenLoading } from '@/components/screen-state';
import { CategoryHint } from '@/components/category-hint';
import { DateField } from '@/components/date-field';
import { GlassButton, GlassChip, GlassSegmented, GlassSurface } from '@/components/glass';
import { colors, moneyDisplay, rhythm, space, type, ui } from '@/theme';

const END_OPTIONS = [
  { value: 'until_stopped', label: 'Until I stop it' },
  { value: 'count', label: 'After N months' },
] as const;

export default function EditRecurringRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rule, isPending } = useQuery({
    queryKey: ['recurring', 'rule', id],
    queryFn: () => getRecurringRule(id),
  });

  // The editor mounts only once the rule is here, so its fields start from the
  // row instead of being written in afterwards by an effect.
  if (isPending || !rule) return <ScreenLoading />;
  return <RuleEditor id={id} rule={rule} />;
}

function RuleEditor({ id, rule }: { id: string; rule: RecurringRule }) {
  const queryClient = useQueryClient();

  const { data: properties } = useQuery({
    queryKey: ['properties', { includeArchived: false }],
    queryFn: () => listProperties(),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const [chosenPropertyId, setPropertyId] = useState<string | null>(rule.property_id);
  const [chosenCategoryId, setCategoryId] = useState<string | null>(rule.category_id);
  const [amountText, setAmountText] = useState(String(rule.amount));
  const [party, setParty] = useState(rule.party ?? '');
  const [notes, setNotes] = useState(rule.notes ?? '');
  const [startMonthText, setStartMonthText] = useState(monthKey(rule.start_month));
  const [endMode, setEndMode] = useState<EndMode>(rule.end_mode);
  const [occurrencesText, setOccurrencesText] = useState(rule.occurrences ? String(rule.occurrences) : '12');
  const [applyToPosted, setApplyToPosted] = useState(false);
  const [applyFromText, setApplyFromText] = useState(monthKey(todayISO()));
  const [errors, setErrors] = useState<RecurringRuleValidation['errors'] & { applyFrom?: string }>({});

  const isExpense = rule.kind === 'expense';
  const propertyId = chosenPropertyId;
  const selectedLedger = (properties ?? []).find((p) => p.id === propertyId);
  const ledgerKind = selectedLedger?.ledger_kind;
  const scopedCategories = orderCategoriesByRecent(categories ?? [], [], rule.kind, selectedLedger);
  // A rule written before the ledger became a flip or a primary residence may sit on a
  // category that is no longer offered (Rent, say). Keep its own category in the
  // list, or there would be nothing valid left to pick.
  const ruleCategory = (categories ?? []).find((c) => c.id === rule.category_id);
  const kindCategories =
    ruleCategory && !scopedCategories.some((c) => c.id === ruleCategory.id)
      ? [ruleCategory, ...scopedCategories]
      : scopedCategories;

  // Derived, not reset by an effect: while the category lists are still loading
  // kindCategories is empty, and blanking the selection then would lose the
  // rule's own category before the user ever saw it.
  const categoryId =
    chosenCategoryId && (!categories || kindCategories.some((c) => c.id === chosenCategoryId))
      ? chosenCategoryId
      : null;

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
      const nextErrors: typeof errors = { ...validation.errors };
      const applyFrom = applyFromText.trim();
      const applyFromValid = /^\d{4}-\d{2}$/.test(applyFrom) && isValidISODate(`${applyFrom}-01`);
      if (applyToPosted && !applyFromValid) nextErrors.applyFrom = 'Month must be YYYY-MM.';
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0 || validation.amount === undefined || !validation.startMonth) {
        throw Object.assign(new Error('validation'), { silent: true });
      }

      const updated = await updateRecurringRule(id, {
        property_id: propertyId!,
        category_id: categoryId!,
        amount: validation.amount,
        notes: notes.trim() || null,
        party: party.trim() || null,
        start_month: validation.startMonth,
        end_mode: endMode,
        occurrences: endMode === 'count' ? validation.occurrences! : null,
      });
      const rewritten = applyToPosted ? await applyRuleToPostedEntries(updated, `${applyFrom}-01`) : 0;
      // An earlier start month may now owe months; post them right away.
      const posted = await syncRule(updated);
      return { rewritten, posted };
    },
    onSuccess: ({ rewritten, posted }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      const parts: string[] = [];
      if (rewritten > 0) parts.push(`${rewritten} posted ${rewritten === 1 ? 'month' : 'months'} updated`);
      if (posted > 0) parts.push(`${posted} new ${posted === 1 ? 'month' : 'months'} posted`);
      if (parts.length === 0) {
        router.back();
        return;
      }
      Alert.alert('Rule saved', `${parts.join(', ')}.`, [{ text: 'OK', onPress: () => router.back() }]);
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
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <Stack.Screen options={{ title: isExpense ? 'Edit Expense Rule' : 'Edit Income Rule' }} />

      <Text style={styles.help}>
        Changes apply to months that haven&apos;t been posted yet. To change months already in your
        ledger too, turn on the switch at the bottom.
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
        keyboardType="decimal-pad"
      />
      {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}

      <Text style={styles.label}>{partyLabel(ledgerKind ?? 'property', rule?.kind ?? 'expense')}</Text>
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

      <Text style={styles.label}>Start month *</Text>
      <DateField
        value={startMonthText}
        onChange={setStartMonthText}
        granularity="month"
        placeholder="Pick a month"
        accessibilityLabel="Start month"
      />
      {errors.startMonth ? <Text style={styles.error}>{errors.startMonth}</Text> : null}

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

      <GlassSurface style={styles.applyCard}>
        <View style={styles.applyRow}>
          <View style={styles.applyText}>
            <Text style={styles.applyTitle}>Also update months already posted</Text>
            <Text style={styles.applyHint}>
              Rewrites this rule&apos;s posted entries with the new amount, {partyLabel(ledgerKind ?? 'property', rule.kind).toLowerCase()},
              category and notes. Months you edited by hand are left alone.
            </Text>
          </View>
          <Switch value={applyToPosted} onValueChange={setApplyToPosted} trackColor={{ true: colors.brass }} />
        </View>
        {applyToPosted ? (
          <>
            <Text style={styles.label}>From month</Text>
            <DateField
              value={applyFromText}
              onChange={setApplyFromText}
              granularity="month"
              placeholder="Pick a month"
              accessibilityLabel="Apply from month"
            />
            {errors.applyFrom ? <Text style={styles.error}>{errors.applyFrom}</Text> : null}
          </>
        ) : null}
      </GlassSurface>

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
  container: { padding: space.lg, paddingBottom: 60 },
  help: { ...type.label, marginBottom: space.sm, lineHeight: 20 },
  label: { ...ui.label },
  // Chips scroll edge to edge; the strip cancels the screen padding.
  chipStrip: { flexGrow: 0, flexShrink: 0, marginHorizontal: -space.lg },
  chipRow: { gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.lg },
  input: { ...ui.input },
  // The amount is the one field allowed to be taller than the rest.
  amountInput: { ...moneyDisplay, fontSize: 28, height: 56 },
  applyCard: { padding: space.lg, marginTop: rhythm.section },
  applyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  applyText: { flex: 1 },
  applyTitle: { ...type.body, fontWeight: '600' },
  applyHint: { ...type.hint, marginTop: 2, lineHeight: 17 },
  saveButton: { marginTop: rhythm.section },
  error: { ...ui.error },
});
