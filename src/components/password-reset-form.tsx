// "Forgot password?" on the sign-in screen: request a code by email, then enter
// it with a new password. Success signs the user in, and the root layout moves
// them to the signed-in screens on its own.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { resetWithCode, sendResetCode } from '@/db/password-reset';
import { validateEmail, validatePassword } from '@/lib/auth-validation';
import { colors, space, type, ui } from '@/theme';
import { GlassButton, GlassSurface } from './glass';

export function PasswordResetForm({
  initialEmail,
  onCancel,
}: {
  initialEmail: string;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    setError(null);
    setBusy(true);
    const result = await sendResetCode(email);
    setBusy(false);
    if (result.error) return setError(result.error);
    setStep('code');
  };

  const submitCode = async () => {
    if (!/^\d{6,10}$/.test(code.trim())) return setError('Enter the code from the email.');
    const passwordError = validatePassword(password, 'sign-up');
    if (passwordError) return setError(passwordError);
    setError(null);
    setBusy(true);
    const result = await resetWithCode(email, code, password);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  return (
    <GlassSurface style={styles.form}>
      <Text style={styles.heading}>Reset your password</Text>
      {step === 'email' ? (
        <>
          <Text style={styles.body}>{"Enter your account email and we'll send you a code."}</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.mist}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Reset email"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GlassButton testID="send-reset-code" label="Send code" onPress={requestCode} loading={busy} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            If {email.trim()} has an account, a code is on its way. Enter it with a new password.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Code"
            placeholderTextColor={colors.mist}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            value={code}
            onChangeText={setCode}
            maxLength={10}
            accessibilityLabel="Reset code"
          />
          <TextInput
            style={styles.input}
            placeholder="New password (8+ characters)"
            placeholderTextColor={colors.mist}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="New password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GlassButton testID="reset-password" label="Set new password" onPress={submitCode} loading={busy} />
          <Pressable onPress={() => setStep('email')}>
            <Text style={styles.link}>Send a new code</Text>
          </Pressable>
        </>
      )}
      <Pressable testID="reset-cancel" onPress={onCancel}>
        <Text style={styles.link}>Back to sign in</Text>
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  form: { padding: space.xl, gap: space.md, borderRadius: 28 },
  heading: { ...type.title, textAlign: 'center' },
  body: { ...type.label, fontSize: 15, textAlign: 'center' },
  input: { ...ui.input },
  error: { ...ui.error },
  link: { ...ui.link, textAlign: 'center', marginTop: space.sm },
});
