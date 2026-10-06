// Tab group layout. Native tabs: on iOS 26 the bar is the system's liquid glass,
// minimising as you scroll. Each tab hosts its own stack (the (group) folders)
// for its header. Mounting this group means the user is signed in (root layout
// guards it), so it is also where the recurring catch-up runs once per launch
// (README §4.2): post any months that became due since the app last opened.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { listProperties } from '@/db/properties';
import { syncRecurringEntries } from '@/db/recurring';
import { collectionTitle, kindsOf } from '@/lib/ledger-copy';
import { colors } from '@/theme';

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
    <NativeTabs tintColor={colors.brass} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="dashboard" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* A house would be wrong whenever this tab reads "Households"; books cover
          every title it takes. */}
      <NativeTabs.Trigger name="(ledgers)">
        <NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} md="menu_book" />
        <NativeTabs.Trigger.Label>{ledgersTitle}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(add)">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(reports)">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
        <NativeTabs.Trigger.Label>Reports</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
