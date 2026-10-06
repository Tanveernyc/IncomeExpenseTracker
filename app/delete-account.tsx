// Account deletion confirmation (Phase 13). Required by App Store Review
// Guideline 5.1.1(v). Deletion is immediate and permanent; the typed word is
// the only thing standing between a tap and unrecoverable data loss.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassButton, GlassSurface } from '@/components/glass';
import { deleteAccount } from '@/db/account';
import { CONFIRM_WORD, isDeleteConfirmed } from '@/lib/delete-account';
import { colors, space, type, ui } from '@/theme';

export default function DeleteAccountScreen() {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canDelete = isDeleteConfirmed(confirmation) && !submitting;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: deleteError } = await deleteAccount();
    if (deleteError) {
      setSubmitting(false);
      setError(deleteError);
      return;
    }
    // Success: the session is gone, SessionProvider fires, and the root layout
    // guard routes to sign-in. Deliberately no setState here — this screen is
    // already unmounting.
  };

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Delete your account</Text>

      <GlassSurface style={styles.card}>
        <Text style={styles.body}>This permanently deletes:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Every property and household you have added</Text>
          <Text style={styles.listItem}>• Every expense and income record</Text>
          <Text style={styles.listItem}>• Your custom categories</Text>
          <Text style={styles.listItem}>• Your sign-in credentials</Text>
        </View>
      </GlassSurface>

      <Text style={styles.warning}>
        This cannot be undone and there is no way to recover your records afterwards. Export your
        data first if you want to keep a copy.
      </Text>

      <Text style={styles.label}>Type {CONFIRM_WORD} to confirm</Text>
      <TextInput
        testID="confirmation-input"
        style={styles.input}
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!submitting}
        placeholder={CONFIRM_WORD}
        placeholderTextColor={colors.mist}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GlassButton
        testID="delete-button"
        variant="destructive"
        label="Delete my account"
        disabled={!canDelete}
        loading={submitting}
        onPress={submit}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  heading: { ...type.title },
  card: { padding: space.lg, gap: space.sm },
  body: { ...type.body, fontWeight: '600' },
  list: { gap: space.xs, paddingLeft: space.xs },
  listItem: { ...type.body },
  warning: { fontSize: 14, color: colors.danger, lineHeight: 20 },
  label: { ...ui.label },
  input: { ...ui.input },
  error: { ...ui.error, fontSize: 14 },
  button: { marginTop: space.sm },
});
