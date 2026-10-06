// First run: a signed-in user with no ledgers picks what to track. Creates the
// ledger(s) with a sensible default name and lands on the Ledgers tab.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassPressable } from '@/components/glass';
import { createProperty, listProperties } from '@/db/properties';
import type { NewProperty } from '@/types';
import { colors, space, type, ui } from '@/theme';

const CHOICES: {
  key: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  ledgers: NewProperty[];
}[] = [
  {
    key: 'property',
    title: 'A property',
    icon: 'business-outline',
    body: 'A rental, your own home, an investment or a flip — track what it earns and costs.',
    ledgers: [
      { name: 'My first property', ledger_kind: 'property', property_subtype: 'rental' },
    ],
  },
  {
    key: 'budget',
    title: 'My household',
    icon: 'wallet-outline',
    body: 'Log income and spending, set up monthly bills, and watch your savings rate.',
    ledgers: [{ name: 'Household', ledger_kind: 'budget' }],
  },
  {
    key: 'both',
    title: 'Both',
    icon: 'layers-outline',
    body: 'A property ledger and a household ledger, side by side.',
    ledgers: [
      { name: 'My first property', ledger_kind: 'property', property_subtype: 'rental' },
      { name: 'Household', ledger_kind: 'budget' },
    ],
  },
];

export default function OnboardingScreen() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    // Idempotent: a double tap (or a retry after a partial failure) must not
    // create a second "Household". Skip any ledger whose name already exists.
    mutationFn: async (ledgers: NewProperty[]) => {
      const existing = await listProperties({ includeArchived: true });
      const taken = new Set(existing.map((p) => p.name.trim().toLowerCase()));
      for (const l of ledgers) {
        if (taken.has(l.name.trim().toLowerCase())) continue;
        await createProperty(l);
      }
    },
    onSuccess: async () => {
      // 'all' also refetches the unmounted dashboard query, whose cached [] would
      // otherwise re-fire the onboarding redirect on the next Dashboard tap.
      await queryClient.invalidateQueries({ queryKey: ['properties'], refetchType: 'all' });
      router.replace('/properties');
    },
    onError: (e: Error) => Alert.alert('Could not set up', e.message),
  });

  return (
    <ScrollView style={ui.screen} contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Welcome', headerBackVisible: false }} />
      <Text style={styles.heading}>What do you want to track?</Text>
      <Text style={styles.sub}>You can add more ledgers any time. Names can be changed later.</Text>
      {CHOICES.map((c) => (
        <GlassPressable
          key={c.key}
          contentStyle={styles.choice}
          onPress={() => mutation.mutate(c.ledgers)}
          disabled={mutation.isPending}
          accessibilityLabel={c.title}
        >
          <View style={styles.choiceIcon}>
            <Ionicons name={c.icon} size={22} color={colors.brassBright} />
          </View>
          <View style={styles.choiceText}>
            <Text style={styles.choiceTitle}>{c.title}</Text>
            <Text style={styles.choiceBody}>{c.body}</Text>
          </View>
        </GlassPressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, gap: space.md },
  heading: { ...type.display, marginTop: space.md },
  sub: { ...type.label, marginBottom: space.md, lineHeight: 20 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl },
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceTitle: { ...type.section, fontSize: 19 },
  choiceBody: { ...type.label, lineHeight: 19 },
});
