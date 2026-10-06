// Dashboard tab (Phase 11): portfolio net this year, per-property mini P&L,
// five most recent transactions, quick-add. Math in src/lib/dashboard.ts;
// presentation in src/components/dashboard-view.tsx.
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { DashboardView } from '@/components/dashboard-view';
import { listCategories } from '@/db/categories';
import { listAllExpenses } from '@/db/expenses';
import { listAllIncome } from '@/db/income';
import { listProperties } from '@/db/properties';
import { buildDashboardModel } from '@/lib/dashboard';
import { todayISO } from '@/lib/dates';
import { collectionTitle, kindsOf } from '@/lib/ledger-copy';
import { shouldOnboard } from '@/lib/onboarding';

export default function DashboardScreen() {
  const { data: properties, isFetching } = useQuery({
    queryKey: ['properties', { includeArchived: true }],
    queryFn: () => listProperties({ includeArchived: true }),
  });
  const { data: expenses } = useQuery({ queryKey: ['expenses', 'all'], queryFn: listAllExpenses });
  const { data: income } = useQuery({ queryKey: ['income', 'all'], queryFn: listAllIncome });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  // First run: a signed-in user with no ledgers (archived included) is sent to
  // the chooser instead of an empty dashboard. Onboarding invalidates
  // ['properties'] (refetchType 'all') on success, so the stale [] is refetched
  // even while this screen is unmounted; the isFetching guard covers the gap.
  useEffect(() => {
    if (shouldOnboard(properties, isFetching)) router.replace('/onboarding');
  }, [properties, isFetching]);

  const model = buildDashboardModel(properties ?? [], expenses ?? [], income ?? [], todayISO());
  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]));

  // The scroll view is the screen's first child so the large title collapses with it.
  return (
    <DashboardView
      model={model}
      categoryNames={categoryNames}
      collectionTitle={collectionTitle(kindsOf(properties ?? []))}
      onQuickAdd={() => router.push('/add')}
      onOpenProperty={(id) => router.push({ pathname: '/property/[id]', params: { id } })}
      onOpenTransaction={(entry) =>
        router.push({
          pathname: '/transaction/[kind]/[id]',
          params: { kind: entry.kind, id: entry.id },
        })
      }
    />
  );
}
