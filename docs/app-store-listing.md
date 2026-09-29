# App Store Listing — PropertyLedger: Rental P&L

ASC App ID `6813181506` · Bundle `com.trueorganichub.propertyledger`

**1.0.0 (build 16) is live — "Ready for Distribution" as of 2026-09-28.**
Everything below is the **1.2** metadata (personal budgets), applied on
2026-09-28 now that 1.0 has cleared review. It is copy-paste ready for App Store
Connect; the 1.2 build itself has not been made yet. Claims were checked against
the actual implementation — nothing here describes a feature the app doesn't
have. Spec: `docs/superpowers/specs/2026-09-21-personal-budgets-design.md` §7.

---

## Name & Subtitle

**App Name** (30 max, 26 used) — unchanged
```
PropertyLedger: Rental P&L
```

**Subtitle** (30 max, 26 used) — 1.2, replaces `Track rental income & expenses`
```
Rentals & personal budgets
```

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
PropertyLedger keeps the books for your rental properties — and, if you like,
for your own household too. Each ledger is either a rental property or a
personal budget: rentals get income, expenses, and a profit-and-loss picture
you can actually read; budgets get the same fast entry, monthly totals, and a
savings rate. No spreadsheet, no subscription to accounting software built for
something else.

EVERY PROPERTY, TRACKED SEPARATELY
Add as many properties as you own. Each one keeps its own income, expenses, and
running profit, so you always know which unit earns and which one drains. Sold a
property? Archive it — the records stay intact for your return.

LOG A TRANSACTION IN SECONDS
Amount, date, category, property. That's the whole flow. Add a vendor or a note
when it matters, skip them when it doesn't. Expenses and income use the same
fast form.

CATEGORIES THAT MATCH YOUR RETURN
36 built-in categories covering the expense and income lines landlords actually
file — mortgage interest, repairs, insurance, property tax, management fees,
rent, deposits, and more. Add your own when your books need something specific.

BILLS THAT SPAN A PERIOD
A school tax bill paid in September can cover the following year. PropertyLedger
records when money moved and, optionally, the period the bill covers — so your
numbers land in the right year.

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

PropertyLedger is for landlords with one property or twenty who want their
numbers straight and their tax prep boring.
```

---

## What's New (1.2)

```
Personal budgets. Alongside your rental properties you can now keep a household budget — same quick entry, recurring bills, and reports, with a This Month view and your savings rate. Categories are tailored to each ledger: landlord categories for rentals, everyday ones for budgets.
```

---

## Keywords (100 max, 98 used)

```
landlord,expense,income,tax,tracker,bookkeeping,profit,cash flow,budget,savings,spending,household
```

1.2 adds `budget,savings,spending,household`; drops `schedule e,deduction` per
the spec and `real estate` to fit the limit. Deliberately omits `rental`,
`property`, and `ledger` — Apple already indexes those from the name and
subtitle, so repeating them wastes the field. **Confirm the `real estate` drop at
release** (Phase 16 ruling 7).

---

## Screenshots

Existing iPhone 6.9" set carried over from 1.0. `ios.supportsTablet` is `false`,
so no iPad set is required.

**Add as screenshot 7 for 1.2:** the **Household** budget dashboard from the
App Review demo account, which is seeded with a personal ledger named
"Household" (salary, groceries, dining out, fuel, subscriptions, phone, rent
across the current and previous month). Take it at release time so the month
totals match the release month.

---

## URLs

| Field | Value |
|---|---|
| Privacy Policy URL (required) | `https://tanveernyc.github.io/PropertyLedger/privacy.html` |
| Support URL (required) | `https://tanveernyc.github.io/PropertyLedger/support.html` (`docs/support.html`, contact `support@trueorganichub.com`) |
| Marketing URL (optional) | leave blank |

---

## App Privacy — nutrition label answers

Verified against `supabase/schema.sql`, `app/(auth)/sign-in.tsx`, and the full
dependency list. There are **no analytics, advertising, or crash-reporting SDKs**
in the project. Unchanged for 1.2 — personal budgets add no new data category.

**"Do you or your third-party partners collect data from this app?" → Yes**

For every row below: purpose is **App Functionality** only, data **is** linked to
the user's identity, and data is **not** used for tracking.

| Category | Data Type | Why it applies |
|---|---|---|
| Contact Info | Email Address | Supabase Auth sign-up / sign-in |
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

> If Phase 17 (Sign in with Apple and Google) ships in or before 1.2, re-check
> this section: both providers return an email address, which the Contact Info /
> Email Address row already covers, so no new row is expected — but confirm
> before submitting.

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

## Before submitting 1.2

1. ~~Reconcile the version numbers.~~ Done 2026-09-29: `app.json`,
   `package.json` and the README all read `1.2.0`. 1.1 was never shipped, so its
   recurring-items work rolls into this release. (`store.config.json` is still
   untracked and pinned to `apple.version: "1.0"` — point it at 1.2 before using
   it to push metadata.)
2. Take screenshot 7 (Household dashboard) at release time.
3. Confirm the `real estate` keyword drop.
4. Re-seed / refresh the demo account so the reviewer sees current months.
5. Decide whether Phase 17 social sign-in rides along; if so, finish the console
   setup in `docs/setup-social-sign-in.md` §1–§3 and set the env flags first —
   an enabled flag without the console work burns Apple's one-shot name.

---

## Resolved before 1.0 (kept for the record)

1. ~~In-app account deletion missing (Guideline 5.1.1(v))~~ — shipped in Phase
   13: `app/delete-account.tsx` plus the `delete-account` edge function.
2. ~~Demo account for App Review~~ — seeded, credentials in App Review
   Information. Now also carries a "Household" personal ledger.
3. ~~iPad screenshots required~~ — resolved by setting
   `ios.supportsTablet: false`; only the iPhone 6.9" set is needed.
4. ~~Support URL~~ — `docs/support.html` published to the same GitHub Pages site.
