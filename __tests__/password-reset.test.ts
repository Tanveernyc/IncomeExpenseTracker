// Code-based password recovery: the code check and the new password happen in one
// call, a bad code says so plainly, and a rejected password never leaves the user
// signed in without the password they chose.
jest.mock('../src/db/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { resetWithCode, sendResetCode } from '../src/db/password-reset';
import { supabase } from '../src/db/supabase';

const auth = supabase.auth as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

it('emails a code to the trimmed address', async () => {
  await expect(sendResetCode('  owner@example.com ')).resolves.toEqual({ error: null });
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.com');
});

it('verifies the recovery code, then sets the new password', async () => {
  await expect(resetWithCode('owner@example.com', ' 123456 ', 'new-password-1')).resolves.toEqual({ error: null });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'owner@example.com', token: '123456', type: 'recovery' });
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-1' });
});

it('reports a wrong code without touching the password', async () => {
  auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } });
  const result = await resetWithCode('owner@example.com', '000000', 'new-password-1');
  expect(result.error).toMatch(/wrong or has expired/);
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it('signs back out when the new password is rejected', async () => {
  auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'Password is too weak' } });
  const result = await resetWithCode('owner@example.com', '123456', 'new-password-1');
  expect(result.error).toBe('Password is too weak');
  expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
