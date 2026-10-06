// Sign-in / sign-up screen (Phase 2). Validation happens locally first
// (src/lib/auth-validation.ts); Supabase Auth errors surface below the form.
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassButton, GlassSurface } from '@/components/glass';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/db/supabase';
import { validateSignIn, type SignInValidation } from '@/lib/auth-validation';
import {
  configureGoogleSignIn,
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
  signInWithApple,
  signInWithGoogle,
  type SocialResult,
} from '@/lib/social-auth';
import { backdrop, colors, space, type, ui } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInValidation['errors']>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const googleAvailable = isGoogleSignInConfigured();

  useEffect(() => {
    configureGoogleSignIn();
    let cancelled = false;
    isAppleSignInAvailable().then((available) => {
      if (!cancelled) setAppleAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // One sheet at a time: a double tap must not open two sheets or create two sessions.
  // The guard is a ref, not `submitting` — two taps in the same tick both read the
  // pre-render value of state, so a state guard would let the second one through.
  const providerInFlight = useRef(false);
  const runProvider = async (start: () => Promise<SocialResult>) => {
    if (providerInFlight.current || submitting) return;
    providerInFlight.current = true;
    setAuthError(null);
    setSubmitting(true);
    const result = await start();
    providerInFlight.current = false;
    setSubmitting(false);
    // ok: the session lands in SessionProvider and the root layout routes.
    // cancelled: the user backed out, which is not something to report.
    if (!result.ok && result.outcome.kind === 'error') {
      setAuthError(result.outcome.message);
    }
  };

  const submit = async () => {
    setAuthError(null);
    // Local validation first — no network call for an obviously bad form.
    const validation = validateSignIn(email, password);
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSubmitting(true);
    const credentials = { email: email.trim(), password };
    const { error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setSubmitting(false);

    // On success the session change propagates through SessionProvider and the
    // root layout's guards route to (tabs) — no manual navigation needed here.
    if (error) setAuthError(error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Ionicons name="book" size={26} color={colors.brassBright} />
        </View>
        <Text style={styles.title}>PropertyLedger</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign-in' ? 'Sign in to your ledger' : 'Create your account'}
        </Text>
      </View>

      <GlassSurface style={styles.form}>

        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            testID="apple-sign-in"
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={27}
            style={styles.appleButton}
            onPress={() => runProvider(signInWithApple)}
          />
        ) : null}

        {googleAvailable ? (
          <GlassButton
            testID="google-sign-in"
            variant="secondary"
            label="Continue with Google"
            onPress={() => runProvider(signInWithGoogle)}
            disabled={submitting}
          />
        ) : null}

        {appleAvailable || googleAvailable ? (
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.mist}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email"
        />
        {fieldErrors.email ? <Text style={styles.error}>{fieldErrors.email}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.mist}
          secureTextEntry
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Password"
        />
        {fieldErrors.password ? <Text style={styles.error}>{fieldErrors.password}</Text> : null}

        {authError ? <Text style={styles.error}>{authError}</Text> : null}

        <GlassButton
          label={mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          onPress={submit}
          loading={submitting}
          style={styles.button}
        />

        <Pressable
          onPress={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setAuthError(null);
          }}
        >
          <Text style={styles.switchText}>
            {mode === 'sign-in'
              ? 'No account yet? Sign up'
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </GlassSurface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Shown outside the signed-in stack's chrome, so it paints its own backdrop.
  container: { ...backdrop, flex: 1, justifyContent: 'center', padding: space.lg, gap: space.xl },
  brand: { alignItems: 'center', gap: space.sm },
  mark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    marginBottom: space.xs,
  },
  title: { ...type.display, textAlign: 'center' },
  subtitle: { ...type.label, fontSize: 15, textAlign: 'center' },
  form: { padding: space.xl, gap: space.md, borderRadius: 28 },
  input: { ...ui.input },
  error: { ...ui.error },
  button: { marginTop: space.xs },
  switchText: { ...ui.link, textAlign: 'center', marginTop: space.sm },
  appleButton: { height: 54 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(14, 26, 43, 0.14)' },
  dividerText: { ...type.hint },
});
