# App Store Listing — Income Expense Tracker App

ASC App ID `6813181506` · Bundle `com.trueorganichub.propertyledger`

**1.0.0 (build 16) is live — "Ready for Distribution" as of 2026-09-28.**
Everything below is the **1.2** metadata. It was first written on 2026-09-28
and reworked on 2026-10-06 for the rename to "Income Expense Tracker App" (see
"Name & Subtitle"). It is copy-paste ready for App Store
Connect; the 1.2 build itself has not been made yet. Claims were checked against
the actual implementation — nothing here describes a feature the app doesn't
have. Spec: `docs/superpowers/specs/2026-09-21-personal-budgets-design.md` §7.

---

## Name & Subtitle

**App Name** (30 max, 26 used) — 1.2, replaces the 1.0 name
```
Income Expense Tracker App
```

Renamed 2026-10-06 so the app ranks for what people actually type. The 1.0 name
only matched searches for its exact wording. `Income Expense Tracker` was
already reserved by another developer, so the owner saved this variant in App
Store Connect on the 1.2 version. The name is the field Apple weights most, and
"income and expense tracker" shows up in Apple's own search suggestions.

The app is an income and expense tracker, **not a budgeting app**: it sets no
spending limits and makes no plans. Keep "budget" out of every field.

**Home-screen name** — `Income Expense` (`ios.infoPlist.CFBundleDisplayName`
in `app.json`). Apple rejects under Guideline 2.3.8 when the name under the icon
doesn't match the store name, so it can't keep the 1.0 name. The full name
is too long for the home screen.

**Subtitle** (30 max, 29 used) — 1.2, replaces `Track rental income & expenses`
```
Rental property & home ledger
```

Adds words the name lacks (rental, property, home, ledger) instead of repeating
income, expense or tracker, which Apple gives no extra credit for.

---

## Promotional Text (170 max — editable without a new build)

```
Every property, every dollar, in one place. Log income and expenses in seconds, see profit and loss per property, and export a clean CSV when tax season arrives.
```

---

## Description

The opening paragraph is the 1.2 rewrite; every section below it is unchanged
from 1.0.

```
Income Expense Tracker App tracks the money coming in and going out of your
properties — and, if you like, your own household too. Log income and expenses
in seconds, see profit and loss for each property, and export a clean CSV when
tax season arrives. No spreadsheet, no subscription to accounting software
built for something else.

RENTALS, HOMES, FLIPS AND INVESTMENTS
Mark each property as a long-term rental, the home you live in, a flip, or an
investment. Tenant income like rent and late fees only shows where it belongs.
Add a household ledger to track everyday income and expenses next to your
properties, with monthly totals and how much you kept.

EVERY PROPERTY, TRACKED SEPARATELY
Add as many properties as you own. Each one keeps its own income, expenses, and
running profit, so you always know which unit earns and which one drains. Sold a
property? Archive it — the records stay intact for your return.

LOG A TRANSACTION IN SECONDS
Amount, date, category, property. That's the whole flow. Add a vendor or a note
when it matters, skip them when it doesn't. Expenses and income use the same
fast form.

CATEGORIES FOR HOW OWNERS PAY
Dozens of built-in categories covering the expense and income lines owners
actually track — mortgage interest, repairs, insurance, property tax, management fees,
rent, deposits, and more. Add your own when your books need something specific.

BILLS THAT SPAN A PERIOD
A school tax bill paid in September can cover the following year. The app
records when money moved and, optionally, the period the bill covers — so your
numbers land in the right year.

RECURRING INCOME AND BILLS
Set up rent, a mortgage payment, or any monthly bill once, and it is logged for
you every month.

PROFIT AND LOSS AT A GLANCE
A dashboard for the whole portfolio and a P&L for each property. Income,
expenses, and net, calculated in exact cents — no floating-point drift, no
rounding surprises.

SEE HOW SPENDING MOVES
Chart any category over time and compare periods, so a creeping repair bill or a
rising insurance premium shows up before it's a year-end surprise.

EXPORT FOR YOUR ACCOUNTANT
Send a clean CSV straight from the share sheet — email it, drop it in Files, or
hand it to whoever does your taxes.

YOUR DATA STAYS YOURS
Your account is yours alone. Every record is protected at the database level by
row-level security, so no other user can read your books. No ads, no analytics,
no trackers, and nothing sold to anyone.

Built for landlords and homeowners with one property or twenty who want their
numbers straight and their tax prep boring.

The app keeps your records and adds them up. It is not tax, legal or financial
advice; check anything you file with a tax professional.
```

---

## What's New (1.2)

```
A fresh new look. Mark each property as a rental, your home, a flip, or an investment. Track your household's income and expenses next to your properties. Set up recurring rent and bills once and they are logged every month. Sign in with Apple or Google, reset a forgotten password right in the app, and pick dates with the native date picker. Your sign-in is now kept in the iOS Keychain.
```

---

## Keywords (100 max, 93 used)

```
landlord,rent,real estate,profit,tax,mortgage,bookkeeping,cash flow,flip,household,accountant
```

Reworked 2026-10-06 for the rename. Drops `budget,savings,spending` (the app
is a tracker, not a budgeting app) and `expense,income,tracker` (now in the
name). Restores `real estate`. Adds `rent`, `mortgage`, `flip` and
`accountant` (the CSV export is made for one). Leaves out
every word already in the name or subtitle (income, expense, tracker, app,
rental, property, home, ledger), because Apple indexes those already and
repeating them wastes the field.

---

## Screenshots

**1.2 set, retaken 2026-10-09** for the lighter glass and the Settings button on
every tab: 10 screens, Apple's maximum. Captured on the iPhone 17e simulator
(iOS 27) at 1170×2532 with a 9:41 status bar, from the App Review demo account;
`scripts/frame-screenshots.py` scales each capture to 1060 px wide inside a
1320×2868 (6.9") canvas, so the source size makes no difference to the result.
The demo data is fictional: the addresses are in the town of "Sampleton" with no
state or ZIP, every vendor is a generic label ("Mortgage lender", "Grocery
store") instead of a real company or agency, and tenants are "Unit A tenant" and
so on. Keep it that way when reseeding: no real places, businesses, brands or
people. The development build's warning toast was silenced for the capture only.
Each shot is framed with a caption: Apple has indexed screenshot caption text for
search since June 2025, so every caption leads with words people search for. The
framed set is in `store-screenshots/1.2/` and the raw captures are in
`store-screenshots/1.2/raw/`. That folder is gitignored, so re-run the script
from the raw captures if it is missing. `ios.supportsTablet` is `false`, so no
iPad set is required. `npm run store-config` lists them in `store.config.json`
under `APP_IPHONE_67` (eas-cli 24+ uploads screenshots), so `metadata:push`
replaces the set in this order.

| # | Screen | Caption |
|---|---|---|
| 1 | Dashboard: left over this year, ledger cards | Track income & expenses / for every property |
| 2 | New ledger: Property / Household, and the four property types | Rentals, your home, / flips and investments |
| 3 | Ledgers: properties and households | Properties and household / side by side |
| 4 | Maple Street Duplex: transactions, oldest first | Every rent payment / and bill in one place |
| 5 | Add: amount, ledger and category chips, native date picker | Log an expense / in seconds |
| 6 | Reports: portfolio and per-ledger P&L | Profit and loss / for each property |
| 7 | Household: transactions, oldest first | Household income / and expenses too |
| 8 | New recurring expense | Recurring rent and bills / logged every month |
| 9 | History & Trends: Credit Card Bill by month | Spending trends / month by month |
| 10 | Export to CSV | Export to CSV / for your accountant |

Retake them if the demo data is reseeded.

---

## URLs

| Field | Value |
|---|---|
| Privacy Policy URL (required) | `https://tanveernyc.github.io/IncomeExpenseTracker/privacy.html` |
| Support URL (required) | `https://tanveernyc.github.io/IncomeExpenseTracker/support.html` (`docs/support.html`, contact `support@trueorganichub.com`) |
| Marketing URL (optional) | leave blank |

---

## App Privacy — nutrition label answers

Verified against `supabase/schema.sql`, `app/(auth)/sign-in.tsx`, and the full
dependency list. There are **no analytics, advertising, or crash-reporting SDKs**
in the project. Unchanged for 1.2 — household ledgers add no new data category.

**"Do you or your third-party partners collect data from this app?" → Yes**

For every row below: purpose is **App Functionality** only, data **is** linked to
the user's identity, and data is **not** used for tracking.

| Category | Data Type | Why it applies |
|---|---|---|
| Contact Info | Email Address | Supabase Auth sign-up / sign-in |
| Contact Info | Name | Google sign-in passes the user's name to Supabase Auth (stored in user metadata, never shown). Added 2026-10-06; Apple sign-in no longer requests a name. |
| Contact Info | Physical Address | `properties.address` — optional property address |
| Financial Info | Other Financial Info | `expenses.amount`, `income.amount`, `properties.purchase_price` |
| User Content | Other User Content | property names, notes, vendor, source fields |
| Identifiers | User ID | `user_id` on every row (Supabase auth UUID) |

**Explicitly NOT collected** — answer No to all: Location (the app never reads
device location; a typed address is Contact Info, not Location), Health &
Fitness, Payment Info (no card data — the app records amounts, it doesn't
process payments), Contacts, Browsing History, Search History, Purchases,
Usage Data, Diagnostics, Sensitive Info, Other Data.

**Tracking question → No.** Nothing is shared with data brokers or ad networks,
and there is no ATT prompt because there is nothing to track.

> ~~If Phase 17 (Sign in with Apple and Google) ships in or before 1.2,
> re-check this section.~~ Confirmed 2026-10-05: Phase 17 shipped and the table
> above is unchanged. Both providers return an email address, already covered by
> the Contact Info / Email Address row, and Apple's Hide My Email returns a relay
> address — still an email address, still the same row. Neither provider adds an
> advertising identifier, and nothing new is collected, so the answers to the
> tracking question and to every "not collected" row stand.

---

## Other App Store Connect fields

- **Age Rating:** 4+ — no objectionable content of any kind
- **Category:** Primary `Finance`, Secondary `Business`
- **Copyright:** `2026 True Organic Hub LLC`
- **Mac availability:** UNCHECK "available on Mac with Apple silicon" — this is
  what produced warning ITMS-90863 on the build 16 delivery
- **Sign-in required for review:** yes — Apple needs the demo account credentials
  in App Review Information

---

## Pushing the metadata

`store.config.json` (tracked as of 2026-10-05) holds everything in this document
that EAS Metadata can set. It is **generated** from these sections by
`npm run store-config` (`scripts/build-store-config.mjs`), so the two cannot
drift — edit this document, then regenerate; never hand-edit the JSON. The
generator also fails rather than writing if any field is over Apple's limit:
title, subtitle, promo text, description, keywords, release notes, the privacy
and support URLs, copyright, categories (`FINANCE`, `BUSINESS`), the age-rating
advisory answers pulled from the live 1.0 listing, and `release.automaticRelease`.

Push it with `npx eas-cli@latest metadata:push` — **owner-gated**, and only after
the 1.2 binary has been submitted (EAS Metadata refuses to push for a version
with no binary). Run `metadata:pull` first if anything was edited directly in App
Store Connect since this file was written, or the push will overwrite it.

Two things are deliberately **not** in the file:

- **`review`** (App Review contact and demo credentials). The demo password would
  be committed in plain text. Keep entering it in App Store Connect by hand.

The prose in this document is hard-wrapped at ~78 columns for reading. App Store
Connect renders newlines literally, so the generator rejoins each paragraph onto
one line and keeps the all-caps section headings on their own lines — do not
copy the wrapped form into ASC by hand.

---

## Before submitting 1.2

1. ~~Reconcile the version numbers.~~ Done 2026-09-29: `app.json`,
   `package.json` and the README all read `1.2.0`. 1.1 was never shipped, so its
   recurring-items work rolls into this release. ~~`store.config.json` is
   untracked and pinned to `apple.version: "1.0"`.~~ Done 2026-10-05: it is
   tracked, reads `apple.version: "1.2"`, and now carries this document's copy
   (see "Pushing the metadata" below).
2. ~~Take screenshot 7 (Household dashboard) at release time.~~ Done 2026-10-05: the full set was retaken for the redesign (see Screenshots).
3. ~~Confirm the `real estate` keyword drop.~~ Moot 2026-10-06: the keywords
   were reworked for the rename and `real estate` is back.
4. ~~Re-seed / refresh the demo account so the reviewer sees current months.~~ Done 2026-10-05: entries shifted forward one month; demo "Home" is now a primary residence.
5. ~~Decide whether Phase 17 social sign-in rides along.~~ It does, and the
   console work is finished: the owner completed `docs/setup-social-sign-in.md`
   §1–§3 on 2026-09-30, the real client IDs are in `.env` and on EAS for both
   the `preview` and `production` environments, and both buttons were verified
   against the real system sheets on an iPhone 17 simulator on 2026-10-01
   (WORKLOG Phase 17). Nothing here is blocked on it any more.
6. ~~Decide whether the 1.2 copy should cover more than personal budgets.~~
   Done 2026-10-06: the rename rewrite covers recurring items and the Phase 18
   property types. Two
   shipped features are absent from it, which is incomplete rather than
   inaccurate, so it is a copy call, not a correctness fix: **recurring items**
   (Phase 15 — 1.1 was never released, so its recurring-bill engine makes its
   store debut in 1.2, and the description never mentions it; the release notes
   do, in passing) and the **Phase 18** additions (a property can be labelled a
   long-term rental, flip, investment, or the owner's own home; tenant-only
   income like Rent and Late Fee is hidden on a flip or a primary home; account
   actions moved to a Settings screen). Edit the Description / What's New
   sections above and re-run `npm run store-config` if they should ride along.
7. ~~Retake screenshots 2, 3 and 7.~~ Done 2026-10-06: the whole set was
   retaken with the "Household" label and captioned (see Screenshots).
8. ~~The 1.2 binary still does not exist.~~ 1.2.0 (27) was built on EAS on
   2026-10-06 and auto-submitted to TestFlight for the owner to test before
   review. The note below is kept for the record.
   The 1.2 binary still does not exist. `npx eas-cli@latest build -p ios
   --profile production --auto-submit` is owner-gated and has not been run; the
   free-plan iOS build quota was exhausted as of 2026-10-01, so check it before
   assuming a cloud build will start.

---

## Resolved before 1.0 (kept for the record)

1. ~~In-app account deletion missing (Guideline 5.1.1(v))~~ — shipped in Phase
   13: `app/delete-account.tsx` plus the `delete-account` edge function.
2. ~~Demo account for App Review~~ — seeded, credentials in App Review
   Information. Now also carries a "Household" personal ledger.
3. ~~iPad screenshots required~~ — resolved by setting
   `ios.supportsTablet: false`; only the iPhone 6.9" set is needed.
4. ~~Support URL~~ — `docs/support.html` published to the same GitHub Pages site.
