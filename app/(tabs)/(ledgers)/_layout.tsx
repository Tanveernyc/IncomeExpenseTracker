import { useQuery } from '@tanstack/react-query';
import { TabStack } from '@/components/tab-stack';
import { listProperties } from '@/db/properties';
import { collectionTitle, kindsOf } from '@/lib/ledger-copy';

export default function LedgersStack() {
  const { data: ledgers } = useQuery({
    queryKey: ['properties', { includeArchived: false }],
    queryFn: () => listProperties(),
  });
  return <TabStack screen="properties" title={collectionTitle(kindsOf(ledgers ?? []))} />;
}
