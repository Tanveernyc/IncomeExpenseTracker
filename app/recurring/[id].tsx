// Modal: edit every field of a recurring rule (README §4.3, extended).
// By default a change applies only to months not yet posted. The switch at the
// bottom also rewrites months already posted from a chosen month onward - but
// never a month the user edited by hand (is_edited), and never a deleted one.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { colors, money, type, ui } from '@/theme';

export default function EditRecurringRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rule, isPending } = useQuery({
    queryKey: ['recurring', 'rule', id],
    queryFn: () => getRecurringRule(id),
  });

  // The editor mounts only once the rule is here, so its fields start from the
  // row instead of being written in afterwards by an effect.
  if (isPending || !rule) return <ActivityIndicator style={styles.spinner} />;
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
          <Chip key={p.id} label={p.name} active={propertyId === p.id} onPress={() => setPropertyId(p.id)} />
        ))}
      </ScrollView>
      {errors.property ? <Text style={styles.error}>{errors.property}</Text> : null}

      <Text style={styles.label}>Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipStrip}>
        {kindCategories.map((c) => (
          <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>
      {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}

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
        onChangeText={setParty}
        placeholder={
          isExpense
            ? ledgerKind === 'budget'
              ? "e.g. Trader Joe's"
              : 'e.g. KeyBank'
            : 'e.g. tenant name'
        }
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="optional" />

      <Text style={styles.label}>Start month *</Text>
      <TextInput
        style={styles.input}
        value={startMonthText}
        onChangeText={setStartMonthText}
        placeholder="YYYY-MM"
        autoCapitalize="none"
      />
      {errors.startMonth ? <Text style={styles.error}>{errors.startMonth}</Text> : null}

      <Text style={styles.label}>Ends *</Text>
      <View style={styles.segment}>
        {(
          [
            ['until_stopped', 'Until I stop it'],
            ['count', 'After N months'],
          ] as const
        ).map(([mode, label]) => (
          <Pressable
            key={mode}
            style={[styles.segmentButton, endMode === mode && styles.segmentButtonActive]}
            onPress={() => setEndMode(mode)}
          >
            <Text style={endMode === mode ? styles.segmentTextActive : styles.segmentText}>{label}</Text>
          </Pressable>
        ))}
      </View>
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

      <View style={styles.applyCard}>
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
            <TextInput
              style={styles.input}
              value={applyFromText}
              onChangeText={setApplyFromText}
              placeholder="YYYY-MM"
              autoCapitalize="none"
            />
            {errors.applyFrom ? <Text style={styles.error}>{errors.applyFrom}</Text> : null}
          </>
        ) : null}
      </View>

      <Pressable style={styles.saveButton} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        <Text style={styles.saveButtonText}>{saveMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  spinner: { marginTop: 32 },
  help: { ...type.label, marginBottom: 8, lineHeight: 18 },
  label: { ...ui.label },
  chipStrip: { flexGrow: 0, flexShrink: 0 },
  chipRow: { gap: 6, paddingVertical: 4 },
  chip: { ...ui.chip },
  chipActive: { ...ui.chipActive },
  chipText: { ...ui.chipText },
  chipTextActive: { ...ui.chipTextActive },
  input: { ...ui.input },
  amountInput: { ...money, fontSize: 24, fontWeight: '700' },
  segment: { flexDirection: 'row', borderRadius: 10, backgroundColor: colors.line, padding: 3 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segmentButtonActive: { backgroundColor: colors.card },
  segmentText: { color: colors.slate, fontSize: 14 },
  segmentTextActive: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  applyCard: { ...ui.card, padding: 14, marginTop: 20 },
  applyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  applyText: { flex: 1 },
  applyTitle: { ...type.body, fontWeight: '600' },
  applyHint: { ...type.hint, marginTop: 2, lineHeight: 17 },
  saveButton: { ...ui.buttonPrimary, marginTop: 20 },
  saveButtonText: { ...ui.buttonPrimaryText },
  error: { ...ui.error },
});
