// Account deletion confirmation (Phase 13). Required by App Store Review
// Guideline 5.1.1(v). Deletion is immediate and permanent; the typed word is
// the only thing standing between a tap and unrecoverable data loss.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassButton, GlassSurface } from '@/components/glass';
import { useSession } from '@/components/session-provider';
import { deleteAccount } from '@/db/account';
import { CONFIRM_WORD, isDeleteConfirmed, usesSignInWithApple } from '@/lib/delete-account';
import { getAppleAuthorizationCode } from '@/lib/social-auth';
import { colors, rhythm, space, type, ui } from '@/theme';

export default function DeleteAccountScreen() {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { session } = useSession();

  const canDelete = isDeleteConfirmed(confirmation) && !submitting;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    // An Apple account confirms with Apple first, so its Apple tokens can be
    // revoked too. Backing out of Apple's sheet backs out of the delete. If Apple
    // fails for any other reason, the account is still deleted: the user's right
    // to delete must not hang on Apple being reachable.
    let appleCode: string | undefined;
    if (process.env.EXPO_OS === 'ios' && usesSignInWithApple(session?.user)) {
      const apple = await getAppleAuthorizationCode();
      if (apple.ok) {
        appleCode = apple.code;
      } else if (apple.outcome.kind === 'cancelled') {
        setSubmitting(false);
        setError('Confirm with Apple to delete your account.');
        return;
      }
    }
    const { error: deleteError } = await deleteAccount(appleCode);
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
  container: { padding: space.lg, gap: rhythm.item },
  heading: { ...type.title },
  card: { padding: space.lg, gap: space.sm },
  body: { ...type.body, fontWeight: '600' },
  list: { gap: space.xs, paddingLeft: space.xs },
  listItem: { ...type.body },
  warning: { fontSize: 14, color: colors.danger, lineHeight: 20 },
  // The container's gap already sits on either side; the label adds only the rest.
  label: { ...ui.label, marginTop: rhythm.section - rhythm.item, marginBottom: 0 },
  input: { ...ui.input },
  error: { ...ui.error, fontSize: 14 },
  button: { marginTop: space.sm },
});
