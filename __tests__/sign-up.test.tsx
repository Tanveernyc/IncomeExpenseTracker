// Email sign-up: new accounts need an 8+ character password, and when Supabase
// requires email confirmation the user is told so instead of seeing nothing.
// Kept apart from sign-in-screen.test.tsx, whose in-flight provider test leaves
// an act() scope open that breaks renders after it.
jest.mock('../src/lib/social-auth', () => ({
  configureGoogleSignIn: jest.fn(),
  isAppleSignInAvailable: jest.fn().mockResolvedValue(false),
  isGoogleSignInConfigured: jest.fn().mockReturnValue(false),
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
}));
jest.mock('../src/db/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn(), signUp: jest.fn() } },
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignInScreen from '../app/(auth)/sign-in';
import { supabase } from '../src/db/supabase';

const signUp = supabase.auth.signUp as jest.Mock;

beforeEach(() => jest.clearAllMocks());

async function fillSignUp(password: string) {
  const screen = await render(<SignInScreen />);
  await fireEvent.press(screen.getByTestId('auth-mode-toggle'));
  await fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByTestId('email-submit'));
  return screen;
}

it('tells the user to confirm their email when sign-up returns no session', async () => {
  signUp.mockResolvedValue({ data: { session: null, user: { id: 'u' } }, error: null });
  const screen = await fillSignUp('long-enough-pass');
  await waitFor(() => expect(screen.getByText(/Check your email/)).toBeTruthy());
  expect(signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'long-enough-pass' });
});

it('rejects a short password before calling the server', async () => {
  const screen = await fillSignUp('short12');
  await waitFor(() => expect(screen.getByText(/at least 8 characters/)).toBeTruthy());
  expect(signUp).not.toHaveBeenCalled();
});
