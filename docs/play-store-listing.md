# Google Play Listing — Income Expense Tracker App

Package `com.trueorganichub.incomeexpensetracker`. Android was never published, so it uses the new name; only the iOS bundle id keeps the old one.
Developer account: True Organic Hub (organization), owned by
`trueorganichubsupport@gmail.com`, ID `6320140218439912673`.

**Status 2026-10-09:** the app has not been created in the Play Console yet.
"Create app" stays locked until Google approves three account verifications:
identity (an official ID, owner only), the organization's website
(`trueorganichub.com`) and phone numbers. Everything below is ready to paste once
it unlocks. Claims were checked against the Android build: Sign in with Apple is
iOS-only, so Android offers email and Google sign-in.

---

## Create app

| Field | Value |
|---|---|
| App name | `Income Expense Tracker App` (26 of 30) |
| Default language | English (United States) |
| App or game | App |
| Free or paid | Free |

## Main store listing

**Short description** (79 of 80)
```
Track income and expenses for rentals and your household, with profit and loss.
```

**Full description** (2,733 of 4,000). The App Store description, with "drop it
in Files" changed to "save it to Drive or Files" for Android.
```
Income Expense Tracker App tracks the money coming in and going out of your properties — and, if you like, your own household too. Log income and expenses in seconds, see profit and loss for each property, and export a clean CSV when tax season arrives. No spreadsheet, no subscription to accounting software built for something else.

RENTALS, HOMES, FLIPS AND INVESTMENTS
Mark each property as a long-term rental, the home you live in, a flip, or an investment. Tenant income like rent and late fees only shows where it belongs. Add a household ledger to track everyday income and expenses next to your properties, with monthly totals and how much you kept.

EVERY PROPERTY, TRACKED SEPARATELY
Add as many properties as you own. Each one keeps its own income, expenses, and running profit, so you always know which unit earns and which one drains. Sold a property? Archive it — the records stay intact for your return.

LOG A TRANSACTION IN SECONDS
Amount, date, category, property. That's the whole flow. Add a vendor or a note when it matters, skip them when it doesn't. Expenses and income use the same fast form.

CATEGORIES FOR HOW OWNERS PAY
Dozens of built-in categories covering the expense and income lines owners actually track — mortgage interest, repairs, insurance, property tax, management fees, rent, deposits, and more. Add your own when your books need something specific.

BILLS THAT SPAN A PERIOD
A school tax bill paid in September can cover the following year. The app records when money moved and, optionally, the period the bill covers — so your numbers land in the right year.

RECURRING INCOME AND BILLS
Set up rent, a mortgage payment, or any monthly bill once, and it is logged for you every month.

PROFIT AND LOSS AT A GLANCE
A dashboard for the whole portfolio and a P&L for each property. Income, expenses, and net, calculated in exact cents — no floating-point drift, no rounding surprises.

SEE HOW SPENDING MOVES
Chart any category over time and compare periods, so a creeping repair bill or a rising insurance premium shows up before it's a year-end surprise.

EXPORT FOR YOUR ACCOUNTANT
Send a clean CSV straight from the share sheet — email it, save it to Drive or Files, or hand it to whoever does your taxes.

YOUR DATA STAYS YOURS
Your account is yours alone. Every record is protected at the database level by row-level security, so no other user can read your books. No ads, no analytics, no trackers, and nothing sold to anyone.

Built for landlords and homeowners with one property or twenty who want their numbers straight and their tax prep boring.

The app keeps your records and adds them up. It is not tax, legal or financial advice; check anything you file with a tax professional.
```

**Category:** Finance. **Tags:** pick the closest to bookkeeping and personal
finance. **Contact email:** `support@trueorganichub.com`. **Website:**
`https://tanveernyc.github.io/IncomeExpenseTracker/support.html`.
**Privacy policy:** `https://tanveernyc.github.io/IncomeExpenseTracker/privacy.html`.

**Graphics:** app icon 512×512 (from `assets/icon.png`), a 1024×500 feature
graphic, and 2 to 8 phone screenshots. Use Android captures, not the iPhone
set: the Android build draws translucent panes instead of liquid glass, and
Google treats screenshots that don't show the actual app as misleading.

---

## App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://tanveernyc.github.io/IncomeExpenseTracker/privacy.html` |
| App access | All or some functionality is restricted → add the App Review demo account by hand (never commit the password) |
| Ads | No, the app has no ads |
| Content rating | Utility / productivity questionnaire, every content question No → expected rating Everyone / PEGI 3 |
| Target audience | 18 and over. Not designed for children, so the Families policy doesn't apply |
| News app | No |
| Government app | No |
| Financial features | The app records amounts the user types. It moves no money, connects to no bank, gives no loans or advice. If a "personal finance tracking" option exists, pick it; otherwise "none" |
| Health | No |
| Data safety | See below |
| Account deletion | Yes, users can delete their account in the app. Web link: `https://tanveernyc.github.io/IncomeExpenseTracker/delete-account.html` |

---

## Data safety

Mapped from the App Store privacy label (`docs/app-store-listing.md`). There are
no analytics, ads or crash-reporting SDKs. Supabase stores the data as a service
provider, which Google does not count as "sharing".

- Does the app collect or share user data? **Yes, collects; shares nothing.**
- Is all data encrypted in transit? **Yes** (HTTPS only).
- Can users request deletion? **Yes** (in the app, and by the web link above).

| Play data type | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Optional (only from Google sign-in) | App functionality, Account management |
| Personal info → Email address | Yes | No | Required | App functionality, Account management |
| Personal info → User IDs | Yes | No | Required | App functionality, Account management |
| Personal info → Address | Yes | No | Optional (property address) | App functionality |
| Financial info → Other financial info | Yes | No | Required (amounts are the app) | App functionality |
| App activity → Other user-generated content | Yes | No | Optional (names, notes, vendors) | App functionality |

Everything else: not collected. None of it is processed ephemerally; it is kept
until the account is deleted.

---

## Release

0. **Google sign-in on Android (owner, once):** in Google Cloud → APIs &
   Services → Credentials, create an **Android** OAuth client for package
   `com.trueorganichub.incomeexpensetracker` with the SHA-1 of the Play App
   Signing key (Play Console → Test and release → App integrity), in the same
   project as the existing web client. Without it the Google button fails on
   Android with DEVELOPER_ERROR. Email sign-in works without it.
1. Build the Android App Bundle from `main`:
   `npx eas-cli@latest build -p android --profile production --local --non-interactive --output ~/Claudeworkspace/income-expense-tracker.aab`
   (or drop `--local` to build on EAS). Use the hotspot if uploads fail.
2. Upload it by hand in Play Console → Test and release → Production → Create
   new release. `eas submit` needs `google-service-account.json`, which this Mac
   doesn't have.
3. Release notes: reuse the iOS "What's New", minus Sign in with Apple.
4. Google's first review usually takes a few days.
