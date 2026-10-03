// Tab group layout. Mounting this group means the user is signed in (root layout
// guards it), so it is also where the recurring catch-up runs once per launch
// (README §4.2): post any months that became due since the app last opened.
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, type ColorValue } from 'react-native';
import { listProperties } from '@/db/properties';
import { syncRecurringEntries } from '@/db/recurring';
import { collectionTitle, kindsOf } from '@/lib/ledger-copy';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Outline glyph when idle, filled when this tab is selected. */
function tabIcon(idle: IconName, active: IconName) {
  function TabBarIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : idle} color={color} size={size} />;
  }
  return TabBarIcon;
}

export default function TabsLayout() {
  const queryClient = useQueryClient();

  const { data: ledgers } = useQuery({
    queryKey: ['properties', { includeArchived: false }],
    queryFn: () => listProperties(),
  });
  const ledgersTitle = collectionTitle(kindsOf(ledgers ?? []));

  useEffect(() => {
    let cancelled = false;
    syncRecurringEntries()
      .then((inserted) => {
        if (cancelled || inserted === 0) return;
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['income'] });
      })
      .catch((e: Error) => console.warn('recurring sync failed', e.message));
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.mist,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: tabIcon('grid-outline', 'grid'),
          // Account lives behind this, off the Dashboard itself.
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
              accessibilityRole="button"
              hitSlop={12}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons name="person-circle-outline" size={26} color={colors.ink} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        // A house would be wrong whenever this tab reads "Budgets"; a book covers
        // every title it takes, and matches the paper-ledger direction in theme.ts.
        options={{ title: ledgersTitle, tabBarIcon: tabIcon('book-outline', 'book') }}
      />
      <Tabs.Screen
        name="add"
        options={{ title: 'Add', tabBarIcon: tabIcon('add-circle-outline', 'add-circle') }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reports', tabBarIcon: tabIcon('bar-chart-outline', 'bar-chart') }}
      />
    </Tabs>
  );
}
