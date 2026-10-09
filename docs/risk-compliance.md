# Risk compliance: PropertyLedger (Income Expense Tracker App)

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
| R7 | Privacy policy accuracy | **Partial / Verify** | The policy (`docs/privacy.html`) matches the code: email, Google name, Supabase, US storage, no analytics. It's linked at sign-up (`app/(auth)/sign-in.tsx:199`) and in `store.config.json`. | (a) Confirm the App Store privacy label includes **Name** from Google sign-in (`setup-security.md` step 5). (b) Confirm the Supabase project region really is the US, as the policy says. |
| R8 | Data rights and deletion | **Partial** | In-app deletion (`app/delete-account.tsx`, `supabase/functions/delete-account`). Export (`app/export.tsx`). The policy promises a 30-day response. | (a) **Android:** Google Play needs a web page where users can request deletion without the app. Add a "Request deletion" section to `docs/support.html` with the support email. (b) Sign Supabase's data processing agreement (dashboard → Legal) if you haven't. |
| R9 | Sign-in rules | **Gap** | Sign in with Apple is offered alongside Google, as guideline 4.8 requires. But `delete-account` does **not** revoke the user's Apple tokens, which Apple requires (`setup-security.md` step 6, marked "recommended"). | Create the Sign in with Apple .p8 key, store it as a Supabase secret, and call Apple's `/auth/revoke` from `delete-account`. |
| R10 | Security of user data | **Compliant / Verify** | RLS is on every table (`supabase/schema.sql:63-66,121`), and `2026-10-07-security-hardening.sql` closes the cross-user and system-category gaps. Only the anon key is public (`.env.example`). The session is kept in the Keychain (`src/db/secure-session-storage.ts`). The delete function trusts only the JWT. | (a) Verify **Confirm email** and **Leaked password protection** are on in Supabase Auth. (b) Move DMARC from `p=none` to `p=quarantine` once mail flows cleanly. (c) Write a short breach-response note: who to tell, and the 72-hour GDPR clock. |
| R11 | Vulnerable dependencies | **Gap** | `npm audit --omit=dev`: 70 findings (1 critical, 55 high). The critical one is `shell-quote`, reached through React Native's build CLI, not the app bundle. Most of the high ones sit in the `expo`, `react-native`, `reanimated` and `skia` dependency trees. | Run `npx expo install --fix` and update to the latest SDK 57 patch releases. Re-run the audit and record what's left as build-tool only. |
| R12 | Advice claims | **Compliant** | The terms say "not tax, legal, accounting, investment, or financial advice" (`docs/terms.html:30`), and so does the store description. Money uses exact-cent arithmetic. | None. |
| R13 | Accessibility | **Partial** | 49 `accessibilityLabel`s, roles on controls, 44pt fields and chips (`rhythm.field`). There has been no VoiceOver pass, and Dynamic Type has never been tested at the largest sizes. | Do one VoiceOver run through sign-in, Add, Ledgers and Reports. Check the slate-on-glass text contrast against 4.5:1. EAA microenterprise exemption likely applies. |
| R14 | Licenses | **Compliant** | `LICENSE` is now an all-rights-reserved notice (`d63aa3c`). It replaced the copied Expo MIT license. | The repo is still public. If that's unintended, make it private (GitHub Pages then needs a paid plan). |
| R15 | Trademarks | **Compliant / Verify** | The Google button uses Google's logo (`54a5bfd`). "Income Expense Tracker App" is a descriptive name. | Check the Google button against Google's branding guidelines (logo colors, the words "Continue with Google"). |
| R16 | Store declarations | **Gap** (minor) | `ITSAppUsesNonExemptEncryption: false` is correct, since the app uses HTTPS only (`app.json:16`). Reviews use the system prompt (`src/lib/review-prompt.ts`). **But** `ios/PropertyLedger/PrivacyInfo.xcprivacy` declares `NSPrivacyCollectedDataTypes` as an empty array, though the app collects email, name, financial info and a user ID. | Declare those four data types in the privacy manifest (through `ios.privacyManifests` in `app.json`, so prebuild keeps them). Android: the Data Safety form is still to do before the first Play release. |
| R17 | Ads and tracking | **Compliant** | No ad SDKs. `NSPrivacyTracking` is false. No ATT prompt is needed. | None. |
| R18 | AI features | **Not applicable** | No AI. | Read R18 first if you ever add receipt scanning or auto-categorizing. |
| R19 | Cookies | **Not applicable** | The legal pages on GitHub Pages set no cookies. | None. |
| R20 | Test accounts and secrets | **Partial** | `.env` is git-ignored, and the demo password lives only there. The 2026-10-06 history scan found no secrets. The demo account holds test ledgers (Home222, Assad Assad, Dasdasd). | Rotate the demo password after the 1.2 approval (there's a pending memory note for this). Delete the test ledgers before the next screenshots. |
| R21 | Payment card data | **Not applicable** | No payments. | None. |
| R22 | Terms of use | **Compliant** | `docs/terms.html` covers disclaimers, liability capped at $50 or 12 months' fees, Pennsylvania law, and notice of changes. Agreement is shown at sign-up. | None. |

## Gaps to fix, most urgent first

1. **Apple token revocation on account deletion (R9).** Apple asks for it, and
   reviewers can reject an app over it.
2. **Privacy manifest data types (R16).** Make the manifest match the App
   Privacy label.
3. **Dependency updates (R11).** Apply the patch releases and re-audit.
4. **Before the first Android release (R8, R16):** a web deletion-request page
   and the Data Safety form.
5. **Dashboard checks (R7, R10):** Name in the App Privacy label, Supabase
   region, Confirm email, leaked password protection, Supabase DPA.
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
