// Add tab — expense (Phase 5) and income (Phase 6) rapid entry behind one toggle.
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { AddTransactionForm } from '@/components/add-transaction-form';
import { GlassSegmented } from '@/components/glass';
import type { CategoryKind } from '@/types';
import { space, ui } from '@/theme';

const KIND_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

export default function AddScreen() {
  const [kind, setKind] = useState<CategoryKind>('expense');
  // Set when a ledger's screen sends the user here to add to that ledger.
  const { propertyId } = useLocalSearchParams<{ propertyId?: string }>();

  // The form resets itself on a switch, so it is not remounted and the switch
  // keeps its slide. It rides inside the form's scroll view so it scrolls under
  // the glass header.
  return (
    <AddTransactionForm
      kind={kind}
      propertyId={propertyId}
      header={
        <>
          <GlassSegmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
          <Link href={{ pathname: '/recurring/new', params: { kind } }} style={styles.recurringLink}>
            Repeats every month? Set up a recurring {kind} →
          </Link>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  recurringLink: { ...ui.link, fontSize: 13, textAlign: 'center', marginTop: space.md },
});
