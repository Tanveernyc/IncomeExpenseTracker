# Risk compliance: Income Expense Tracker App

Audited 2026-10-09 against `../RISK-README.md` (the workspace root), on version
1.2.0 at commit `a1aadcd`. The audit covers the code, the legal pages in `docs/`,
the store metadata and the Supabase schema. Settings that live only in the
Supabase, App Store Connect or Play Console dashboards are marked **Verify**.

**Overall:** the app is in good shape. It has no analytics, no ads, no
tracking, no payments, no user-shared content and no AI. It bundles its fonts,
and its privacy policy and terms are accurate. Most of the risks from the
original list of six don't apply or are already handled. The real gaps are
Apple token revocation on account deletion, the privacy manifest, the
Android-only requirements, and dependency updates.

## Summary

| # | Risk | Status | Evidence | Action |
|---|---|---|---|---|
| R1 | Children's data | **Compliant** (low risk) | `docs/terms.html:46` sets a minimum age of 13. `docs/privacy.html:103` says the app is not directed to children. The store age rating is all `NONE` (`store.config.json`). The app is a general-audience finance tool. | None required. Don't add a non-neutral "Are you 13?" checkbox. If you ever ask for age, ask for a birth date. |
| R2 | Third-party fonts and CDNs | **Compliant** | Playfair Display is embedded at build time through the `expo-font` plugin (`app.json:43`). The legal pages use system fonts and load no external scripts or styles. | Keep it that way on any future marketing site. |
| R3 | Session replay and pixels | **Compliant** | No analytics, replay, crash-reporting or chat SDKs in `package.json`. The privacy policy says so. | If you add crash reporting later, update the policy and the privacy labels, and turn replay off. |
| R4 | Marketing email and SMS | **Compliant** | The only emails are transactional (sign-up confirmation and password reset through Resend, `docs/setup-security.md`). The reset email has a sender identity and footer. There's no SMS. | Before any newsletter or "what's new" email, add an unsubscribe link and a postal address. |
| R5 | Subscriptions | **Not applicable** | The app is free, with no in-app purchases. | Read R5 before adding a paid tier. |
| R6 | Copyright and uploads | **Not applicable** for DMCA. Own assets **compliant**. | No uploads and no shared content. Playfair Display is under the SIL Open Font License. `@expo/vector-icons` is MIT. Screenshots are your own. | None. |
| R7 | Privacy policy accuracy | **Compliant** (checked 2026-10-09) | The policy (`docs/privacy.html`) matches the code: email, Google name, Supabase, US storage, no analytics. It's linked at sign-up (`app/(auth)/sign-in.tsx:199`) and in `store.config.json`. | (a) Done 2026-10-09: the App Store privacy label now lists **Name** and **User ID** too, so it matches the six types in the privacy manifest (all App Functionality, linked, no tracking). (b) ~~Region~~ Confirmed us-east-1 on 2026-10-09. |
| R8 | Data rights and deletion | **Partial** | In-app deletion (`app/delete-account.tsx`, `supabase/functions/delete-account`). Export (`app/export.tsx`). The policy promises a 30-day response. | (a) **Android:** Google Play needs a web page where users can request deletion without the app. Add a "Request deletion" section to `docs/support.html` with the support email. (b) Sign Supabase's data processing agreement (dashboard → Legal) if you haven't. |
| R9 | Sign-in rules | **Compliant** (verified 2026-10-09) | Sign in with Apple is offered alongside Google, as guideline 4.8 requires. Since 2026-10-09, deleting an Apple account asks Apple for a one-time code, and `delete-account` revokes the Apple tokens (`supabase/functions/delete-account/apple.ts`). | None. Verified on build 51: Apple's confirmation sheet appeared, `delete-account` returned 200 with no revocation error, and the app left the phone's Sign in with Apple list. |
| R10 | Security of user data | **Compliant / Verify** | RLS is on every table (`supabase/schema.sql:63-66,121`), and `2026-10-07-security-hardening.sql` closes the cross-user and system-category gaps. Only the anon key is public (`.env.example`). The session is kept in the Keychain (`src/db/secure-session-storage.ts`). The delete function trusts only the JWT. | (a) Checked 2026-10-09: **Confirm email** is on. **Leaked password protection** is off because Supabase offers it only on Pro; accepted on the Free plan (8+ characters with letters and digits is enforced). (b) Move DMARC from `p=none` to `p=quarantine` once mail flows cleanly. (c) Write a short breach-response note: who to tell, and the 72-hour GDPR clock. |
| R11 | Vulnerable dependencies | **Partial** | 2026-10-09: Expo SDK 57 patch releases applied and `npm audit fix` run. The critical `shell-quote` issue is gone. 63 findings remain (47 high, 16 moderate). All of them trace back to `braces`, `node-forge`, `sprintf-js` (no patched release exists), `image-size`, `decode-uri-component` and `uuid` (fixes need major versions inside Expo's tooling), reached through Metro, Jest and the Expo CLI. | Re-run `npm audit --omit=dev` on each SDK patch release. Don't use `--force`, which would downgrade Expo. |
| R12 | Advice claims | **Compliant** | The terms say "not tax, legal, accounting, investment, or financial advice" (`docs/terms.html:30`), and so does the store description. Money uses exact-cent arithmetic. | None. |
| R13 | Accessibility | **Partial** | 49 `accessibilityLabel`s, roles on controls, 44pt fields and chips (`rhythm.field`). There has been no VoiceOver pass, and Dynamic Type has never been tested at the largest sizes. | Do one VoiceOver run through sign-in, Add, Ledgers and Reports. Check the slate-on-glass text contrast against 4.5:1. EAA microenterprise exemption likely applies. |
| R14 | Licenses | **Compliant** | `LICENSE` is now an all-rights-reserved notice (`d63aa3c`). It replaced the copied Expo MIT license. | The repo is still public. If that's unintended, make it private (GitHub Pages then needs a paid plan). |
| R15 | Trademarks | **Compliant / Verify** | The Google button uses Google's logo (`54a5bfd`). "Income Expense Tracker App" is a descriptive name. | Check the Google button against Google's branding guidelines (logo colors, the words "Continue with Google"). |
| R16 | Store declarations | **Compliant** (iOS) | `ITSAppUsesNonExemptEncryption: false` is correct, since the app uses HTTPS only. Reviews use the system prompt (`src/lib/review-prompt.ts`). Since 2026-10-09, `app.json` declares the six collected data types in `ios.privacyManifests` (email, name, physical address, other financial info, other user content, user ID), matching the App Store label. | Android: the Data Safety form is still to do before the first Play release. |
| R17 | Ads and tracking | **Compliant** | No ad SDKs. `NSPrivacyTracking` is false. No ATT prompt is needed. | None. |
| R18 | AI features | **Not applicable** | No AI. | Read R18 first if you ever add receipt scanning or auto-categorizing. |
| R19 | Cookies | **Not applicable** | The legal pages on GitHub Pages set no cookies. | None. |
| R20 | Test accounts and secrets | **Partial** | `.env` is git-ignored, and the demo password lives only there. The 2026-10-06 history scan found no secrets. The demo account holds test ledgers (Home222, Assad Assad, Dasdasd). | Rotate the demo password after the 1.2 approval (there's a pending memory note for this). Delete the test ledgers before the next screenshots. |
| R21 | Payment card data | **Not applicable** | No payments. | None. |
| R22 | Terms of use | **Compliant** | `docs/terms.html` covers disclaimers, liability capped at $50 or 12 months' fees, Pennsylvania law, and notice of changes. Agreement is shown at sign-up. | None. |

## Gaps to fix, most urgent first

1. ~~Apple token revocation (R9)~~ Done and verified on a device 2026-10-09
   (build 51).
2. ~~Privacy manifest data types (R16)~~ Done 2026-10-09.
3. ~~Dependency updates (R11)~~ Patch releases applied 2026-10-09. What's left
   has no safe fix yet.
4. **Before the first Android release (R8, R16):** a web deletion-request page
   and the Data Safety form.
5. **Dashboard checks (R7, R10):** Supabase checked 2026-10-09 (region, Confirm
   email, rate limits, Security Advisor). App Privacy label fixed 2026-10-09
   (Name and User ID added). Still to do: sign the Supabase DPA. Leaked-password protection and backups
   need Pro, which is declined; take manual dumps instead (S14).
6. **Housekeeping (R13, R20):** a VoiceOver pass, rotate the demo password,
   clear the test ledgers.

## The original six, in one line each

1. **Age check / COPPA:** fine. The app is a general-audience finance tool, the
   terms require age 13, and the policy says so.
2. **Google Fonts:** fine. The fonts are bundled into the app, and nothing loads
   from Google's servers.
3. **Session replay:** fine. There's no replay or analytics of any kind.
4. **Unsubscribe link:** fine. There's no marketing email, only password resets
   and confirmations.
5. **Renewal terms:** doesn't apply. The app is free with no subscription.
6. **DMCA agent:** doesn't apply. Users can't upload or share content.

## Security checklist (S1 to S17)

Audited 2026-10-09 against the security checklist in `../RISK-README.md`.
Checks were run, not assumed. The commands are listed under each finding.

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| S1 | Secrets and env vars | **Compliant** | The production iOS bundle was built from Metro (`dev=false&minify=true`) and searched for every `.env` value. The anon key, Supabase URL and the two Google client IDs are present, as intended, since all four are public by design. `SUPABASE_DB_PASSWORD` and `E2E_DEMO_PASSWORD` appear 0 times. The service role key is only an Edge Function secret. | None. |
| S2 | Admin routes | **Compliant / Verify** | The app has no admin screens. The only privileged code is `delete-account`, which acts only on the caller from their JWT. | Verify two-factor sign-in on GitHub, Supabase, Apple Developer, Google Cloud, Expo, Resend and Cloudflare. |
| S3 | Authentication | **Compliant** (checked 2026-10-09) | Supabase Auth, minimum password length 8 with letters and digits, sessions in the iOS Keychain (`src/db/secure-session-storage.ts`), and local sign-out on delete. Google's nonce check is skipped by necessity (`setup-security.md` step 8). Supabase still verifies the token's signature and audience. | Confirm email is on. Leaked-password protection needs the Pro plan, so it stays off on Free (accepted). |
| S4 | Authorization | **Compliant** | RLS with `auth.uid()` policies on all five tables (`supabase/schema.sql:63-83,121-123`). The `enforce_own_references` trigger blocks writes that point at another user's property, category or rule. `__tests__/db/security.test.mjs` checks this as a second user. | None. |
| S5 | Input validation | **Compliant** | Database length limits and system-category checks (`2026-10-07-security-hardening.sql`), plus client validators (`src/lib/*-validation.ts`) with tests. | None. |
| S6 | XSS and injection | **Compliant** | No WebView, `dangerouslySetInnerHTML`, `innerHTML` or `eval` in `app/` or `src/`. All queries go through supabase-js (parameterized). The CSV export prefixes `= + - @` cells (`src/lib/export.ts`). | None. |
| S7 | Rate limiting | **Compliant** (checked 2026-10-09) | Auth endpoints rely on Supabase Auth's built-in limits. `delete-account` needs a valid session and can only delete the caller once. The data API has no per-user row cap. | Checked 2026-10-09: 30 emails per hour, 30 sign-ins and 30 OTP verifications per 5 minutes per IP, 150 token refreshes per 5 minutes per IP. A row cap is optional, since abuse costs little on the current plan. |
| S8 | API endpoints | **Compliant** (fixed 2026-10-09) | `delete-account` accepts POST only, authenticates from the bearer token, and type-checks the optional Apple code. It used to return Supabase's raw error text on failure. It now returns a generic message and logs the detail. | Deployed 2026-10-09. |
| S9 | CORS | **Compliant** | `delete-account` sends no CORS headers, so browsers can't call it cross-origin. Only the native app calls it. | Add an exact-origin allowlist if a web app ever calls it. |
| S10 | Security headers | **Compliant** (fixed 2026-10-09) | GitHub Pages can't set headers. The three legal pages now carry a meta CSP (`default-src 'none'`, inline styles only, no scripts, no forms) and `referrer=no-referrer`. GitHub Pages already enforces HTTPS. | None. |
| S11 | Debug mode | **Compliant** | Store builds use the EAS `production` profile (release, no dev client). Three `console.warn` calls log only a rule ID and an error message: no tokens, emails or amounts. | None. |
| S12 | Dependencies | **Partial** | See R11: patch releases applied, and no unused packages (every dependency is imported or is a config plugin). 63 advisories remain in build and test tooling, with no non-breaking fix. | Re-audit on each SDK patch. |
| S13 | Exposed files | **Compliant** (tightened 2026-10-09) | `.env`, `*.p8`, `*.key`, `*.pem` and `google-service-account.json` are git-ignored. GitHub Pages now excludes `setup-security.md`, `setup-social-sign-in.md` and this file, so the site serves only the legal pages. The repo itself is public, so internal docs are still readable on GitHub. | Make the repo private if internal docs shouldn't be public (see R14). |
| S14 | Database | **Partial** (no backups) | RLS everywhere. `enforce_own_references()` is the one `security definer` function. It pins `search_path`, and since 2026-10-09 (`2026-10-09-advisor-warnings.sql`) only `postgres` and `service_role` may execute it; triggers still fire (tested). `properties_sync_legacy_type()` now pins `search_path` too. The Security Advisor shows 0 errors and only the leaked-password warning (Pro only). | **The Free plan has no backups.** If the database is lost, so is every user's data. Pro is declined, so back up by hand before each release and monthly. `supabase db dump` needs Docker, which this Mac doesn't have, so export each table as JSON instead: `supabase db query --linked --project-ref dxjwyaldmxquuztmnrsb -o json "select json_agg(t) from <table> t"` for `public.categories`, `properties`, `recurring_rules`, `expenses`, `income`, plus `auth.users` and `auth.identities`. Save them to `_secrets-backup/income-expense-tracker/db-backup-<date>/` (never the repo; the auth files hold emails and password hashes). First backup taken 2026-10-09. |
| S15 | Password storage | **Compliant** | Supabase Auth stores bcrypt hashes. The app sends the password only to `signInWithPassword` and `signUp`, and never stores or logs it. | None. |
| S16 | Secrets in git history | **Compliant** | No gitleaks or trufflehog installed, so: `git log --all -p` was searched for JWTs (none), `sk_`, `re_`, AWS, GitHub, Slack and Google API key patterns, and private-key headers (none). Every `.env` value was searched with `git log -S`: only the public Supabase URL appears. No `.env`, `.p8`, `.pem` or service-account file was ever committed. | Install `gitleaks` and add it as a pre-commit hook (optional). |
| S17 | Audit and verification | **Done** | This table. Fixes are covered by tests (332 passing) and re-checks. | Re-run S1, S4, S12 and S16 before each release. |
