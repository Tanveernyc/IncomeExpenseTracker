// Export screen (Phase 10) — "Export CSV": writes a CSV of every transaction and
// hands it to the native share sheet. This is the escape hatch that keeps the
// data portable (spec §5 Phase 10).
import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassButton, GlassSurface } from '@/components/glass';
import { listCategories } from '@/db/categories';
import { listAllExpenses } from '@/db/expenses';
import { listAllIncome } from '@/db/income';
import { listProperties } from '@/db/properties';
import { todayISO } from '@/lib/dates';
import { buildTransactionsCsv } from '@/lib/export';
import { colors, space, type, ui } from '@/theme';

export default function ExportScreen() {
  const [busy, setBusy] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ['properties', { includeArchived: true }],
    queryFn: () => listProperties({ includeArchived: true }),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const { data: expenses } = useQuery({ queryKey: ['expenses', 'all'], queryFn: listAllExpenses });
  const { data: income } = useQuery({ queryKey: ['income', 'all'], queryFn: listAllIncome });

  const ready = properties && categories && expenses && income;

  const exportAll = async () => {
    if (!ready) return;
    setBusy(true);
    let csvFile: File | null = null;
    try {
      const tables = { properties, categories, expenses, income };
      const stamp = todayISO();

      // Write the file to the app cache, then hand it to the share sheet.
      csvFile = new File(Paths.cache, `income-expense-transactions-${stamp}.csv`);
      csvFile.write(buildTransactionsCsv(tables));
      await Sharing.shareAsync(csvFile.uri, { mimeType: 'text/csv' });
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      // The share sheet has finished with it (it copies what it sends), so do not
      // leave a full copy of someone's books sitting in the cache.
      try {
        if (csvFile?.exists) csvFile.delete();
      } catch {
        // The OS clears the cache eventually; never fail an export over this.
      }
      setBusy(false);
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <GlassSurface style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="document-text-outline" size={26} color={colors.brassBright} />
        </View>
        <Text style={styles.heading}>Export to CSV</Text>
        <Text style={styles.body}>
          Creates a spreadsheet-ready CSV of every income and expense entry across all your ledgers and
          opens the share sheet. Email it, save it to Files, or hand it to your accountant — your data is
          never locked in.
        </Text>
        <GlassButton label="Export CSV" onPress={exportAll} disabled={!ready} loading={busy} style={styles.button} />
        {!ready ? <Text style={styles.loading}>Loading data…</Text> : null}
      </GlassSurface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg },
  card: { padding: space.xl, gap: space.md },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  heading: { ...type.title },
  body: { ...type.label, lineHeight: 21 },
  button: { marginTop: space.sm },
  loading: { ...type.hint, textAlign: 'center' },
});
