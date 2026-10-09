// Type-to-confirm guard for permanent account deletion (Phase 13).
// Pure logic so the destructive path is testable without rendering or network.

/** The word the user must type to unlock the delete button. */
export const CONFIRM_WORD = 'DELETE';

/**
 * True when the typed text confirms deletion. Compared case-insensitively after
 * trimming: mobile keyboards autocapitalize, and rejecting "delete" would read
 * as a bug rather than a safeguard.
 */
export function isDeleteConfirmed(input: string): boolean {
  return input.trim().toUpperCase() === CONFIRM_WORD;
}

interface ProviderInfo {
  identities?: { provider: string }[] | null;
  app_metadata?: { provider?: string; providers?: string[] };
}

/**
 * True when the account was ever signed in with Apple. Such an account must also
 * have its Apple tokens revoked when it is deleted (App Store Review 5.1.1(v)).
 */
export function usesSignInWithApple(user: ProviderInfo | null | undefined): boolean {
  if (!user) return false;
  if (user.identities?.some((identity) => identity.provider === 'apple')) return true;
  const meta = user.app_metadata;
  return meta?.provider === 'apple' || Boolean(meta?.providers?.includes('apple'));
}
