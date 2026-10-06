// The selected category's one-line description, under the category chips. Only
// some system categories have one: the ones whose names are easy to mix up, like
// a mortgage payment with escrow versus without.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Category } from '@/types';
import { colors, space, type } from '@/theme';

export function CategoryHint({ category }: { category: Pick<Category, 'description'> | undefined }) {
  if (!category?.description) return null;
  return (
    <View style={styles.row} accessibilityRole="text">
      <Ionicons name="information-circle-outline" size={16} color={colors.brass} style={styles.icon} />
      <Text style={styles.text}>{category.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xs, paddingTop: space.xs },
  icon: { marginTop: 1 },
  text: { ...type.hint, flex: 1, lineHeight: 18, color: colors.slate },
});
