// Forgotten-password recovery by emailed code. A native app cannot rely on the
// email's link (it opens a web page), so the user types the code from the email
// into the app instead. Requires the Supabase "Reset Password" email template
// to include {{ .Token }} (see docs/setup-security.md, step 2).
import { supabase } from './supabase';

/**
 * Emails a recovery code. Supabase answers the same way whether or not the
 * address has an account, so this never reveals who is signed up.
 */
export async function sendResetCode(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return { error: error ? error.message : null };
}

/**
 * Checks the code, which signs the user in, then sets the new password. Both
 * steps run in one call because the sign-in moves the app to the signed-in
 * screens, unmounting the form; the password update must not depend on it.
 */
export async function resetWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'recovery',
  });
  if (verifyError) return { error: 'That code is wrong or has expired. Request a new one.' };

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    // The code was valid, so the user is signed in; only the new password failed.
    // Sign out rather than leave them in without the password they asked for.
    await supabase.auth.signOut({ scope: 'local' });
    return { error: updateError.message };
  }
  return { error: null };
}
