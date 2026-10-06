# Security setup the owner does by hand

Found in the 2026-10-06 security review. The code side is done and tested. These
steps happen in dashboards only the owner can reach, so they are listed here in
the order to do them. **Do steps 1–3 before the 1.2 build goes out.**

## 1. Apply the database hardening (required)

`supabase/migrations/2026-10-07-security-hardening.sql` closes three gaps:

- A user could create a category marked "system", which would then appear in
  **every** user's category list.
- A user who learned another user's property or category id could attach their
  own entries to it.
- Text fields had no length limit.

`__tests__/db/security.test.mjs` proves each gap exists without the migration
and is closed with it, and that deleting a rule, a property or a whole account
still works afterwards.

Supabase dashboard → SQL Editor → paste the whole file → Run. It is safe to run
more than once, and existing rows are untouched.

## 2. Password reset email (required for "Forgot password?")

The app now has a "Forgot password?" flow that asks for the code from the email.
Supabase's default email only contains a link, which does not work for an app.

Dashboard → Authentication → Emails → **Reset Password** → set the body to:

```html
<h2>Reset your password</h2>
<p>Enter this code in Income Expense Tracker App:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>If you didn't ask to reset your password, ignore this email. Your password stays the same.</p>
```

Subject: `Your Income Expense Tracker App reset code`

## 3. Auth settings (required)

Dashboard → Authentication → Providers → Email, and Authentication → Policies:

| Setting | Value | Why |
|---|---|---|
| Minimum password length | **8** | Matches the app's new sign-up rule. Existing users with shorter passwords can still sign in. |
| Password requirements | letters and digits | Cheap protection against the weakest passwords. |
| Secure password change | on | Changing a password needs a recent sign-in. |
| Confirm email | on | Stops sign-ups with someone else's address. The app now shows "check your email" when this is on. |
| Email OTP expiry | 3600 seconds or less | Recovery codes stop working after an hour. |
| Leaked password protection | on, if your plan has it | Blocks passwords known from breaches. |

Dashboard → Authentication → URL Configuration → **Site URL**: set it to
`https://tanveernyc.github.io/PropertyLedger/support.html`. The confirmation
link in sign-up emails lands there after confirming. Today it may point at
`localhost`, which shows an error page even though the confirmation worked.

## 4. Publish the legal pages (required)

`docs/privacy.html`, `docs/terms.html` and `docs/support.html` were rewritten
for the new name and for what the app actually does now. The app links to all
three, so they must be live before 1.2 ships: push `main` to GitHub, and GitHub
Pages republishes them.

## 5. App Store Connect privacy answers (required)

Google sign-in hands the user's **name** to Supabase, so App Privacy needs one
more row: Contact Info → Name, used for App Functionality, linked to the user,
not used for tracking. The listing doc's table is already updated.

## 6. Sign in with Apple token revocation (recommended)

Apple asks apps that offer Sign in with Apple to revoke the user's Apple token
when they delete their account. That needs the Apple sign-in private key (.p8)
stored as a Supabase secret and a call from the `delete-account` function.
Deletion already removes every record; this step only also tells Apple. Ask for
it when you are ready to create the key.

## 7. Repository (recommended)

The GitHub repo is **public**, and `LICENSE` is the MIT license copied from the
Expo template, still naming "650 Industries, Inc. (aka Expo)". Together that
tells anyone they may copy the app's code. Either make the repo private (GitHub
Pages then needs a paid plan, or move the three pages elsewhere), or replace
`LICENSE` with your own all-rights-reserved notice. No secrets are in the repo
or its history: the 2026-10-06 scan found none.
