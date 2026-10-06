// Edit-property screen (Phase 3): edit fields, archive/unarchive (never delete).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { GlassButton } from '@/components/glass';
import { PropertyForm } from '@/components/property-form';
import { getProperty, setPropertyArchived, updateProperty } from '@/db/properties';
import type { NewProperty } from '@/types';
import { space, ui } from '@/theme';
import { nounFor } from '@/lib/ledger-copy';

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: property, isPending, error } = useQuery({
    queryKey: ['property', id],
    queryFn: () => getProperty(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['property', id] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: NewProperty) => updateProperty(id, values),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e: Error) => Alert.alert('Could not save changes', e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (archived: boolean) => setPropertyArchived(id, archived),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e: Error) => Alert.alert('Could not update archive state', e.message),
  });

  if (isPending) return <ScreenLoading />;
  if (error || !property) {
    return <ScreenError message={(error as Error | null)?.message ?? 'Not found.'} />;
  }

  const toggleArchive = () => {
    const archiving = !property.is_archived;
    const noun = nounFor(property.ledger_kind).one.toLowerCase();
    Alert.alert(
      archiving ? `Archive ${noun}?` : `Unarchive ${noun}?`,
      archiving
        ? `It will be hidden from your ${noun} lists but all its history is kept.`
        : `It will reappear in your active ${noun} lists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: archiving ? 'Archive' : 'Unarchive',
          style: archiving ? 'destructive' : 'default',
          onPress: () => archiveMutation.mutate(archiving),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Edit ${nounFor(property.ledger_kind).one}` }} />
      <PropertyForm
        initial={property}
        onSubmit={(values) => saveMutation.mutate(values)}
        submitting={saveMutation.isPending}
        submitLabel={(kind) => `Save ${nounFor(kind).one}`}
        footer={
          <GlassButton
            variant={property.is_archived ? 'secondary' : 'destructive'}
            label={`${property.is_archived ? 'Unarchive' : 'Archive'} ${nounFor(property.ledger_kind).one}`}
            onPress={toggleArchive}
            style={styles.archiveButton}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...ui.screen },
  error: { ...ui.error, padding: 16 },
  archiveButton: { marginTop: space.md },
});
