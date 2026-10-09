// Revokes a user's Sign in with Apple tokens, which Apple requires when an
// account that used Sign in with Apple is deleted. The app sends a fresh
// authorization code; it is traded for a refresh token, then revoked.
//
// Needs four Edge Function secrets (docs/setup-security.md step 6):
// APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 contents) and
// APPLE_CLIENT_ID (the app's bundle id).
import { importPKCS8, SignJWT } from 'npm:jose@5';

const APPLE = 'https://appleid.apple.com';

interface AppleConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
  clientId: string;
}

function readConfig(): AppleConfig | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  if (!teamId || !keyId || !privateKey || !clientId) return null;
  // Secrets pasted on one line keep their line breaks as literal "\n".
  return { teamId, keyId, privateKey: privateKey.replace(/\\n/g, '\n'), clientId };
}

/** The short-lived signed JWT Apple accepts in place of a client secret. */
async function clientSecret(config: AppleConfig): Promise<string> {
  const key = await importPKCS8(config.privateKey, 'ES256');
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setSubject(config.clientId)
    .setAudience(APPLE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

async function post(path: string, fields: Record<string, string>): Promise<Response> {
  return await fetch(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
}

/**
 * Trades the code for a token and revokes it. Returns why it could not, or
 * null on success. Never throws: deleting the account must not depend on Apple.
 */
export async function revokeAppleTokens(code: string): Promise<string | null> {
  const config = readConfig();
  if (!config) return 'Apple secrets are not configured';
  try {
    const secret = await clientSecret(config);
    const exchange = await post('/auth/token', {
      client_id: config.clientId,
      client_secret: secret,
      code,
      grant_type: 'authorization_code',
    });
    if (!exchange.ok) return `token exchange failed (${exchange.status})`;
    const tokens = (await exchange.json()) as { refresh_token?: string; access_token?: string };
    const token = tokens.refresh_token ?? tokens.access_token;
    if (!token) return 'Apple returned no token';

    const revoke = await post('/auth/revoke', {
      client_id: config.clientId,
      client_secret: secret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    });
    return revoke.ok ? null : `revoke failed (${revoke.status})`;
  } catch (e) {
    return e instanceof Error ? e.message : 'unknown error';
  }
}
