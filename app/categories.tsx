// Categories management screen (Phase 4): system + custom lists split by kind;
// add / rename / delete custom categories. Reached from the Dashboard.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createCategory, deleteCategory, listCategories, renameCategory } from '@/db/categories';
import { canDeleteCategory } from '@/lib/categories';
import type { Category, CategoryKind, CategoryScope } from '@/types';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { GlassButton, GlassChip, GlassSurface } from '@/components/glass';
import { colors, space, type, ui } from '@/theme';

const SCOPE_CYCLE: CategoryScope[] = ['both', 'property', 'budget'];
const SCOPE_LABELS: Record<CategoryScope, string> = {
  both: 'Both',
  property: 'Property',
  budget: 'Household',
};

export default function CategoriesScreen() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<CategoryKind>('expense');
  const [newScope, setNewScope] = useState<CategoryScope>('both');

  const { data, isPending, error } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });
  const onError = (e: Error) => Alert.alert('Category error', e.message);

  const addMutation = useMutation({
    mutationFn: () => createCategory(newName, newKind, newScope),
    onSuccess: () => {
      setNewName('');
      invalidate();
    },
    onError,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCategory(id, name),
    onSuccess: invalidate,
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
    onError,
  });

  if (isPending) return <ScreenLoading />;
  if (error) return <ScreenError message={(error as Error).message} />;

  const scopes: { scope: CategoryScope; label: string }[] = [
    { scope: 'both', label: 'Shared' },
    { scope: 'property', label: 'Property' },
    { scope: 'budget', label: 'Household' },
  ];
  const sections = (['expense', 'income'] as const).flatMap((kind) =>
    scopes
      .map(({ scope, label }) => ({
        title: `${label} ${kind} categories`,
        data: (data ?? []).filter((c) => c.kind === kind && c.scope === scope),
      }))
      .filter((s) => s.data.length > 0)
  );

  const promptRename = (category: Category) => {
    // Alert.prompt is iOS-only; this app is iOS-first (spec §1).
    Alert.prompt('Rename category', category.name, (name) => {
      if (name && name.trim()) renameMutation.mutate({ id: category.id, name });
    });
  };

  const confirmDelete = (category: Category) => {
    Alert.alert('Delete category?', `"${category.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(category) },
    ]);
  };

  return (
    <SectionList
      style={ui.screen}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      stickySectionHeadersEnabled={false}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <GlassSurface style={styles.addCard}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="New category name"
            placeholderTextColor={colors.mist}
          />
          <View style={styles.addRow}>
            <GlassChip
              label={newKind === 'expense' ? 'Expense' : 'Income'}
              selected
              onPress={() => setNewKind(newKind === 'expense' ? 'income' : 'expense')}
              accessibilityLabel="Toggle category kind"
            />
            <GlassChip
              label={SCOPE_LABELS[newScope]}
              selected
              onPress={() =>
                setNewScope(SCOPE_CYCLE[(SCOPE_CYCLE.indexOf(newScope) + 1) % SCOPE_CYCLE.length])
              }
              accessibilityLabel="Toggle category scope"
            />
            <GlassButton
              label="Add"
              disabled={addMutation.isPending || newName.trim().length === 0}
              onPress={() => addMutation.mutate()}
              style={styles.addButton}
            />
          </View>
        </GlassSurface>
      }
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <GlassSurface style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowName}>{item.name}</Text>
            {item.description ? <Text style={styles.rowDescription}>{item.description}</Text> : null}
          </View>
          {item.is_system ? (
            <Text style={styles.systemBadge}>system</Text>
          ) : (
            <View style={styles.rowActions}>
              <Pressable onPress={() => promptRename(item)}>
                <Text style={styles.action}>Rename</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} disabled={!canDeleteCategory(item)}>
                <Text style={[styles.action, styles.deleteAction]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </GlassSurface>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: space.lg, paddingBottom: 60 },
  error: { ...ui.error, padding: 16 },
  addCard: { padding: space.md, gap: space.md },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { ...ui.input },
  addButton: { flex: 1 },
  sectionHeader: { ...type.eyebrow, marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs },
  separator: { height: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  rowText: { flex: 1, gap: 2, paddingRight: space.md },
  rowName: { ...type.body },
  rowDescription: { ...type.hint, fontSize: 12, lineHeight: 16 },
  rowActions: { flexDirection: 'row', gap: 16 },
  action: { ...ui.link },
  deleteAction: { color: colors.danger },
  systemBadge: { fontSize: 12, color: colors.mist, fontStyle: 'italic' },
});
