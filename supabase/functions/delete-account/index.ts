// Permanently deletes the calling user's account (Phase 13).
//
// The caller is identified solely by their JWT — there is no id parameter, so
// this endpoint cannot be induced to delete anyone else. Deleting the auth user
// cascades through properties, categories, expenses, and income via the foreign
// keys in supabase/schema.sql.
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected
// into Edge Functions by Supabase; none of them is configured by hand.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { revokeAppleTokens } from './apple.ts';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token' }, 401);
  }
  const jwt = authHeader.slice('Bearer '.length);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: 'Function is misconfigured' }, 500);
  }

  // Resolve the token to a user with the anon key — never trust the body.
  const caller = createClient(url, anonKey);
  const { data, error } = await caller.auth.getUser(jwt);
  if (error || !data.user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  // An account that used Sign in with Apple sends a fresh code from Apple so its
  // Apple tokens can be revoked (App Store Review 5.1.1(v)). Revoke first, while
  // the account still exists; a failure is logged but never blocks the delete.
  const body = (await req.json().catch(() => null)) as { appleAuthorizationCode?: unknown } | null;
  const appleCode = typeof body?.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : null;
  let appleRevoked = false;
  if (appleCode) {
    const failure = await revokeAppleTokens(appleCode);
    if (failure) console.error(`Apple token revocation for ${data.user.id}: ${failure}`);
    appleRevoked = failure === null;
  }

  // Service-role client is the only thing that may delete an auth user.
  const admin = createClient(url, serviceRoleKey);
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    // The detail goes to the function log, not to the caller.
    console.error(`deleteUser failed for ${data.user.id}: ${deleteError.message}`);
    return json({ error: 'Could not delete the account' }, 500);
  }

  return json({ ok: true, appleRevoked }, 200);
});
