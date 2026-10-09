// Properties tab (Phase 3): active ledgers, then an Archived bucket whose ledgers
// can be deleted for good; links to create and edit.
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { GlassButton, GlassPressable } from '@/components/glass';
import { countLedgerEntries, deleteArchivedProperty, listProperties } from '@/db/properties';
import { confirmDelete } from '@/lib/confirm-delete';
import { kindsOf, ledgerMetaLabel, nounFor } from '@/lib/ledger-copy';
import { LEDGER_KINDS } from '@/lib/property-validation';
import type { Property } from '@/types';
import { colors, rhythm, space, type, ui } from '@/theme';

export default function PropertiesScreen() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

  // One query for everything; archived ledgers are split off into their own bucket.
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['properties', { includeArchived: true }],
    queryFn: () => listProperties({ includeArchived: true }),
  });
  const active = (data ?? []).filter((p) => !p.is_archived);
  const archived = (data ?? []).filter((p) => p.is_archived);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArchivedProperty(id),
    onSuccess: () => {
      for (const key of ['properties', 'property', 'expenses', 'income', 'recurring']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e: Error) => Alert.alert('Could not delete', e.message),
  });

  const onDelete = async (ledger: Property) => {
    let entries: number;
    try {
      entries = await countLedgerEntries(ledger.id);
    } catch (e) {
      Alert.alert('Could not delete', (e as Error).message);
      return;
    }
    const noun = nounFor(ledger.ledger_kind).one.toLowerCase();
    const what =
      entries === 0
        ? `the ${noun} and any recurring rules`
        : `the ${noun}, its ${entries === 1 ? '1 entry' : `${entries} entries`} and any recurring rules`;
    confirmDelete(
      `Delete ${ledger.name} for good?`,
      `This removes ${what}. It cannot be undone.`,
      () => deleteMutation.mutate(ledger.id)
    );
  };

  const kinds = kindsOf(active);
  const titled = kinds.length > 1;
  const sections: { title: string; archived?: boolean; data: Property[] }[] =
    titled
      ? LEDGER_KINDS.map((k) => ({
          title: nounFor(k).many,
          data: active.filter((p) => p.ledger_kind === k),
        }))
      : [{ title: '', data: active }];
  // The archived bucket: a header that always shows the count, rows only when opened.
  if (archived.length > 0) {
    sections.push({ title: 'Archived', archived: true, data: showArchived ? archived : [] });
  }

  return (
    <SectionList
      style={ui.screen}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshing={isPending}
      onRefresh={refetch}
      ListHeaderComponent={
        <View style={[styles.header, !titled && styles.headerUntitled]}>
          <GlassButton
            label="Add property or household"
            accessibilityLabel="Add property"
            onPress={() => router.push('/property/new')}
          />
          {error ? <Text style={styles.error}>{(error as Error).message}</Text> : null}
        </View>
      }
      renderSectionHeader={({ section }) =>
        section.archived ? (
          <Pressable
            onPress={() => setShowArchived((v) => !v)}
            style={styles.archivedHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: showArchived }}
          >
            <View style={styles.archivedTitleRow}>
              <Text style={styles.sectionHeaderText}>Archived ({archived.length})</Text>
              <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={18} color={colors.slate} />
            </View>
            <Text style={styles.archivedHint}>
              Not counted in your Dashboard or report totals.
            </Text>
          </Pressable>
        ) : section.title === '' ? null : (
          <Text style={[styles.sectionHeaderText, styles.sectionHeader]}>{section.title}</Text>
        )
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        isPending ? null : (
          <Text style={styles.empty}>No ledgers yet. Add a property or household to start.</Text>
        )
      }
      renderItem={({ item }) => (
        <PropertyRow property={item} onDelete={item.is_archived ? () => onDelete(item) : undefined} />
      )}
    />
  );
}

function PropertyRow({ property, onDelete }: { property: Property; onDelete?: () => void }) {
  const isBudget = property.ledger_kind === 'budget';
  return (
    <GlassPressable
      onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
      contentStyle={styles.row}
      accessibilityLabel={property.name}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={isBudget ? 'wallet-outline' : 'business-outline'} size={20} color={colors.brass} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {property.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {sentenceCase(ledgerMetaLabel(property))}
          {property.address ? ` · ${property.address}` : ''}
        </Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Delete ${property.name}`}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.mist} />
      )}
    </GlassPressable>
  );
}

/** "primary residence" → "Primary residence"; never touches the address after it. */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  listContent: { padding: space.lg, paddingBottom: 120 },
  header: { gap: space.md },
  // With no headings the list starts straight after the button, a section gap below it.
  headerUntitled: { marginBottom: rhythm.section },
  sectionHeaderText: { ...type.section },
  sectionHeader: { marginTop: rhythm.section, marginBottom: rhythm.item },
  archivedHeader: { marginTop: rhythm.section, marginBottom: rhythm.item, gap: 2 },
  archivedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  archivedHint: { ...type.hint },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  separator: { height: rhythm.item },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brassSoft,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...type.body, fontSize: 17, fontWeight: '600' },
  rowMeta: { ...type.hint },
  empty: { ...ui.empty, paddingHorizontal: 24 },
  error: { ...ui.error },
});
