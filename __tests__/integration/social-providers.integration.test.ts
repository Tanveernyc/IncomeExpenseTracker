// Integration test — NOT part of `npm test`. Run with `npm run test:integration`.
//
// Everything in social-auth.test.ts mocks supabase.auth.signInWithIdToken, so it proves our
// code calls Supabase correctly but never proves Supabase itself accepts the call. This file
// hits the real dxjwyaldmxquuztmnrsb project over the network and checks that the Apple and
// Google providers enabled in docs/setup-social-sign-in.md §3 are actually live.
//
// We can't complete a real sign-in without a genuine Apple/Google identity token, so instead
// we send a syntactically valid JWT — correct issuer, correct audience (the client IDs from
// §2), correct nonce — with a signature we can't produce, since we don't have Apple's or
// Google's private key. Verified against this project directly (see the commands in the PR/
// commit that added this file): a provider that is NOT enabled rejects with
// error_code "provider_disabled" ("Provider ... is not enabled") before it even looks at the
// token's audience. A provider that IS enabled gets far enough to reject our unsignable token
// instead, with a different error_code. That's the line this test checks.
//
// Uses Node's `https` directly rather than `fetch`: the RN/jest-expo preset stubs global
// fetch for component tests, which would make this pass against a mock instead of the network.
import { createHash } from 'crypto';
import * as https from 'https';
import * as fs from 'fs';

const ENV_PATH = `${__dirname}/../../.env`;

function loadDotEnvIfPresent(): void {
  let contents: string;
  try {
    contents = fs.readFileSync(ENV_PATH, 'utf8');
  } catch {
    return; // no local .env (e.g. CI) — the describe.skip below handles it
  }
  for (const line of contents.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}
loadDotEnvIfPresent();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Public by design (see .env.example) — the same value shipped in every build.
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const APPLE_BUNDLE_ID = 'com.trueorganichub.propertyledger';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function base64url(input: object): string {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function fakeIdToken(issuer: string, audience: string, rawNonce: string): string {
  const header = base64url({ alg: 'RS256', typ: 'JWT' });
  const nonceHash = createHash('sha256').update(rawNonce).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url({
    iss: issuer,
    aud: audience,
    sub: 'integration-test-subject',
    email: 'integration-test@example.com',
    nonce: nonceHash,
    iat: now,
    exp: now + 300,
  });
  return `${header}.${payload}.signature-we-cannot-produce`;
}

function exchangeIdToken(
  provider: 'apple' | 'google',
  idToken: string,
  rawNonce: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ provider, id_token: idToken, nonce: rawNonce });
    const req = https.request(
      `${SUPABASE_URL}/auth/v1/token?grant_type=id_token`,
      {
        method: 'POST',
        headers: {
          apikey: ANON_KEY!,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
          } catch {
            reject(new Error(`Non-JSON response (status ${res.statusCode}): ${raw}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const hasEnv = Boolean(SUPABASE_URL && ANON_KEY && GOOGLE_WEB_CLIENT_ID);
const describeIfConfigured = hasEnv ? describe : describe.skip;

describeIfConfigured('Supabase provider config (live project)', () => {
  it('has Apple enabled with the bundle id authorized', async () => {
    const rawNonce = 'integration-test-apple-nonce';
    const idToken = fakeIdToken('https://appleid.apple.com', APPLE_BUNDLE_ID, rawNonce);
    const { status, body } = await exchangeIdToken('apple', idToken, rawNonce);

    expect(status).toBe(400); // we expect rejection — we only care *why*
    expect(body.error_code).not.toBe('provider_disabled');
    expect(String(body.msg ?? '')).not.toMatch(/not enabled/i);
  });

  it('has Google enabled with the web client id authorized', async () => {
    const rawNonce = 'integration-test-google-nonce';
    const idToken = fakeIdToken('https://accounts.google.com', GOOGLE_WEB_CLIENT_ID!, rawNonce);
    const { status, body } = await exchangeIdToken('google', idToken, rawNonce);

    expect(status).toBe(400);
    expect(body.error_code).not.toBe('provider_disabled');
    expect(String(body.msg ?? '')).not.toMatch(/not enabled/i);
  });
});

if (!hasEnv) {
  // eslint-disable-next-line no-console
  console.warn(
    'Skipping social-providers.integration.test.ts: EXPO_PUBLIC_SUPABASE_URL, ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY, or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not found in .env.'
  );
}
