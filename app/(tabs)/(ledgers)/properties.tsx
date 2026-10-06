// Properties tab (Phase 3): list with archived toggle, links to create and edit.
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, Switch, Text, View } from 'react-native';
import { GlassButton, GlassPressable, GlassSurface } from '@/components/glass';
import { listProperties } from '@/db/properties';
import { collectionTitle, kindsOf, ledgerMetaLabel, nounFor } from '@/lib/ledger-copy';
import { LEDGER_KINDS } from '@/lib/property-validation';
import type { Property } from '@/types';
import { colors, radius, space, type, ui } from '@/theme';

export default function PropertiesScreen() {
  const [showArchived, setShowArchived] = useState(false);

  // Query key includes the toggle so both views cache independently.
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['properties', { includeArchived: showArchived }],
    queryFn: () => listProperties({ includeArchived: showArchived }),
  });

  const kinds = kindsOf(data ?? []);
  const sections =
    kinds.length > 1
      ? LEDGER_KINDS.map((k) => ({
          title: nounFor(k).many,
          data: (data ?? []).filter((p) => p.ledger_kind === k),
        }))
      : [{ title: '', data: data ?? [] }];

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
        <View style={styles.header}>
          <GlassButton
            label="Add property or budget"
            accessibilityLabel="Add property"
            onPress={() => router.push('/property/new')}
          />
          <GlassSurface style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show archived</Text>
            <Switch value={showArchived} onValueChange={setShowArchived} trackColor={{ true: colors.brass }} />
          </GlassSurface>
          {error ? <Text style={styles.error}>{(error as Error).message}</Text> : null}
        </View>
      }
      renderSectionHeader={({ section }) =>
        section.title === '' ? null : <Text style={styles.sectionHeader}>{section.title}</Text>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        isPending ? null : (
          <Text style={styles.empty}>
            {showArchived
              ? 'Nothing here yet.'
              : `No active ${collectionTitle(kinds).toLowerCase()}. Add one to start.`}
          </Text>
        )
      }
      renderItem={({ item }) => <PropertyRow property={item} />}
    />
  );
}

function PropertyRow({ property }: { property: Property }) {
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
      {property.is_archived ? <Text style={styles.archivedBadge}>Archived</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.mist} />
    </GlassPressable>
  );
}

/** "primary residence" → "Primary residence"; never touches the address after it. */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  listContent: { padding: space.lg, paddingBottom: 120 },
  header: { gap: space.md, marginBottom: space.lg },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  toggleLabel: { ...type.label, color: colors.ink },
  sectionHeader: { ...type.section, marginTop: space.md, marginBottom: space.md },
  separator: { height: space.md },
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
  archivedBadge: { fontSize: 12, color: colors.mist, fontStyle: 'italic' },
  empty: { ...ui.empty, paddingHorizontal: 24 },
  error: { ...ui.error },
});
