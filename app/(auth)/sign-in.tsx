// Sign-in / sign-up screen (Phase 2). Validation happens locally first
// (src/lib/auth-validation.ts); Supabase Auth errors surface below the form.
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassButton, GlassSurface } from '@/components/glass';
import { PasswordResetForm } from '@/components/password-reset-form';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/db/supabase';
import { validateSignIn, type AuthMode as Mode, type SignInValidation } from '@/lib/auth-validation';
import {
  configureGoogleSignIn,
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
  signInWithApple,
  signInWithGoogle,
  type SocialResult,
} from '@/lib/social-auth';
import { backdrop, colors, space, type, ui } from '@/theme';

const TERMS_URL = 'https://tanveernyc.github.io/IncomeExpenseTracker/terms.html';
const PRIVACY_URL = 'https://tanveernyc.github.io/IncomeExpenseTracker/privacy.html';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInValidation['errors']>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
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
    setNotice(null);
    // Local validation first — no network call for an obviously bad form.
    const validation = validateSignIn(email, password, mode);
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSubmitting(true);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setSubmitting(false);

    // On success the session change propagates through SessionProvider and the
    // root layout's guards route to (tabs) — no manual navigation needed here.
    if (error) {
      setAuthError(error.message);
    } else if (mode === 'sign-up' && !data.session) {
      // Email confirmation is on: the account exists but has no session yet.
      // Without this the button would just stop spinning and nothing would happen.
      setNotice('Check your email and tap the link to confirm your account, then sign in here.');
      setMode('sign-in');
      setPassword('');
    }
  };

  return (
    // Scrolls rather than squeezing: on a small phone with the keyboard up, a fixed
    // centred column pushed the title up under the status bar.
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <View style={styles.brand}>
        {/* The app icon itself, so sign-in looks like the app people tapped. */}
        <Image source={require('../../assets/brand-mark.png')} style={styles.mark} accessibilityIgnoresInvertColors />
        <Text style={styles.title}>Income Expense Tracker</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign-in' ? 'Sign in to your ledger' : 'Create your account'}
        </Text>
      </View>

      {resetting ? (
        <PasswordResetForm initialEmail={email} onCancel={() => setResetting(false)} />
      ) : (
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
            // Google's own "G", unmodified, as its sign-in branding guidelines require.
            icon={<Image source={require('../../assets/google-g.png')} style={styles.googleLogo} />}
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
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <GlassButton
            testID="email-submit"
            label={mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
            onPress={submit}
            loading={submitting}
            style={styles.button}
          />

          {mode === 'sign-in' ? (
            <Pressable
              testID="forgot-password"
              onPress={() => {
                setResetting(true);
                setAuthError(null);
                setNotice(null);
              }}
            >
              <Text style={styles.switchText}>Forgot password?</Text>
            </Pressable>
          ) : (
            <Text style={styles.legal}>
              By creating an account you agree to the{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
                Terms of Use
              </Text>{' '}
              and{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>
              .
            </Text>
          )}

          <Pressable
            testID="auth-mode-toggle"
            onPress={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setAuthError(null);
              setNotice(null);
            }}
          >
            <Text style={styles.switchText}>
              {mode === 'sign-in'
                ? 'No account yet? Sign up'
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </GlassSurface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Shown outside the signed-in stack's chrome, so it paints its own backdrop.
  screen: { ...backdrop, flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: space.lg, gap: space.xl },
  brand: { alignItems: 'center', gap: space.sm },
  mark: { width: 72, height: 72, marginBottom: space.xs },
  title: { ...type.display, textAlign: 'center' },
  subtitle: { ...type.label, fontSize: 15, textAlign: 'center' },
  form: { padding: space.xl, gap: space.md, borderRadius: 28 },
  input: { ...ui.input },
  error: { ...ui.error },
  legal: { ...type.label, fontSize: 12, textAlign: 'center' },
  legalLink: { color: colors.brass, fontWeight: '600' },
  notice: { ...type.label, fontSize: 14, color: colors.gain, textAlign: 'center' },
  button: { marginTop: space.xs },
  switchText: { ...ui.link, textAlign: 'center', marginTop: space.sm },
  googleLogo: { width: 20, height: 20 },
  appleButton: { height: 54 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(14, 26, 43, 0.14)' },
  dividerText: { ...type.hint },
});
