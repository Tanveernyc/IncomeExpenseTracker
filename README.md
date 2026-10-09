# Income Expense Tracker

Income and expense tracking for rental properties, with month-by-month recurring bills and a year-end profit-and-loss per property. iOS app built with Expo; data lives in Supabase under row-level security.

App Store: **Income Expense Tracker App** (bundle `com.trueorganichub.propertyledger`). Version 1.0.0 is live on the App Store. 1.2.0 (recurring items, households, social sign-in) build 32 was uploaded to App Store Connect on 2026-10-07; its Android build (version code 2) is built but not submitted. Work after that build (archiving, category order, the ledger Add button and others) needs a new build. See `WORKLOG.md` for the build log.

## What it does

- **Ledgers** - each one a property (rental, primary residence, investment or flip) or a household. Properties carry optional address and purchase details; households are just a name. A mixed account sees them grouped as *Properties* and *Households*. Archived ledgers move to their own **Archived (n)** bucket, where they can be deleted for good.
- **Archived means out of the totals.** An archived ledger's money never counts toward the Dashboard, the Reports portfolio, per-ledger cards or category totals. Reports lists archived ledgers in a separate *Archived* section with their own totals (`splitActive` in `src/lib/aggregate.ts`).
- **Entries** - expenses and income, each with a category, date, optional vendor/source, notes, and (expenses) the period a bill covers.
- **Recurring rules** - a template that posts one entry on the 1st of every month from a start month until stopped or for N months. Backfills past months on creation, catches up on every launch, never duplicates, and never overwrites a month you edited or deleted. Rules are fully editable; optionally rewrite already-posted months from a chosen month.
- **Reports** - portfolio and per-ledger results for this month / last month / this year / last year / all time / custom range; expenses by category. The result reads **Profit** when every ledger in view earns money (rental, investment, flip) and **Left over** otherwise (`netLabel`).
- **History** - one category over time, by month or year, with change and % change.
- **Export** - spreadsheet-ready CSV of every entry via the share sheet.
- **Account** - email/password, Apple and Google sign-in; Settings (profile icon on the Dashboard) holds categories, export, support, sign out and in-app account deletion (App Store 5.1.1(v)).

Money is `numeric(12,2)` in Postgres and integer-cent math in the app. Dates are ISO `YYYY-MM-DD` strings end to end.

## Using the app

**First run.** Sign up with an email and password. The app asks *What do you want to track?* - *A rental property*, *My own budget*, or *Both* - and creates the first ledger(s) for you ("My first property" / "Household"). Add more later from the ledgers tab (titled **Properties**, **Budgets**, or **Ledgers** depending on what you have) → **+ Add**: pick *Rental property* or *Personal budget*, name it, save.

**Personal budgets.** A budget is a ledger with `property_type = 'personal'`; everything else (entries, recurring rules, reports, export) is the same engine. What changes is the wording and the category list: a budget is called a *Budget*, its counterparties are *Payee*/*Source* instead of *Vendor*/*Source*, and its category picker shows the household set plus shared ones; rental ledgers keep the landlord set. Household categories are bill-level on purpose: people log what they pay each month, not every receipt, so **Credit Card Bill** (one payment covering the card's shopping) leads, with Rent/Mortgage, utilities, Phone, Internet, Subscriptions, car, Loan Payment, Childcare and Travel/Vacation. Groceries, Dining Out and the like still exist further back. New categories you create take the scope of the ledger you are in. The dashboard and **Reports** add a *This Month* / *Last Month* preset and a **savings rate** line (income minus expenses, as a share of income) for budgets. An account with only rental properties keeps its Property/Properties wording throughout; the kind picker on the ledger form and the month line on the dashboard are the only additions it sees.

Behaviour notes for budgets (decisions made while building, so nobody re-litigates them):
- **First run.** A signed-in account with no ledgers at all is taken to a chooser: *A rental property* / *My own budget* / *Both*. It creates the ledger(s) with default names ("My first property", "Household") and is safe to retry - a ledger whose name already exists is not created twice.
- **Switching a ledger's kind.** Turning a rental into a budget hides the address and purchase fields but keeps their values; switch back and they reappear. Nothing is cleared silently.
- **Categories you created before scopes existed** are visible on every ledger kind. New ones take the scope of the ledger you create them from (the Categories screen lets you pick Shared / Rental / Personal).
- **Reports** shows the savings rate under Net for budgets; there is no separate "Saved" row because it would repeat Net.
- **Recurring rules** on a budget copy the rule's payee/source onto each posted month, exactly like a rental's vendor.


**Log a one-off entry.** **Add** tab, or **+ Add expense or income** at the bottom of any active ledger's screen (opens the form with that ledger picked) → slide or tap the *Expense / Income* switch → tap the ledger → tap a category (tap **+ New** to create one on the spot) → amount → date defaults to today → optional vendor/source, covers-period, notes → **Save**. The form keeps the ledger and category selected so the next entry is amount + save.

**Category order.** The picker shows only the selected kind (the label says *Expense category* or *Income category*), your recently used categories first, then the common ones for that kind of ledger (a rental's income starts with Rent; a household's expenses with Rent/Mortgage and Credit Card Bill), then the rest, with *Other …* last. The per-ledger lists are `COMMON_CATEGORIES` in `src/lib/categories.ts`; a test checks every name exists in the catalog.

**Archive or delete a ledger.** Ledger → edit (pencil) → **Archive**. It moves to **Archived (n)** at the bottom of the ledgers tab, stops counting toward any current total, and its screen hides the Add button (unarchive to add entries again). In the Archived bucket, **Delete** removes the ledger with all its entries and recurring rules after a confirmation that says how many entries go with it. Only archived ledgers can be deleted (`deleteArchivedProperty` filters on `is_archived` inside the DELETE).

**Set up a monthly bill or rent.** On the **Add** tab tap *Repeats every month? Set up a recurring…*, or from a property tap **Recurring → + Expense rule / + Income rule**. Pick property, category, monthly amount, vendor/source, the **start month**, and whether it runs *until I stop it* or *for N months*. Save: every month from the start month through today is posted at once (the form shows how many), and each new month posts automatically when the app opens. Recurring entries show a ↻ mark.

**Change a recurring bill.** Property → **Recurring → Edit**. Change anything - amount, vendor, category, start month, end. By default only future months change. Turn on **Also update months already posted** and pick a from-month to rewrite past entries too; months you edited by hand are left alone. **Stop** ends the rule and keeps history; **Delete** removes the rule and keeps its entries.

**Fix or remove one month.** Tap the entry → edit and save (the rule will never overwrite it). To delete, open the property and swipe the row left → **Delete**; a deleted recurring month is not re-posted.

**Read the ledger.** Tap a ledger: filter by category chips (only categories that ledger has entries in, expenses before income) or a date range, and tap the sort chip to switch *Oldest first* (Jan → Dec), *Newest first*, or *Largest first*. **Recurring** sits beside the sort chip; the pencil in the header edits the ledger.

**Reports.** *This Month / Last Month / This Year / Last Year / All Time / Custom* → portfolio, per-ledger results, an *Archived* section kept apart from the totals, and expenses by category. **History & trends** charts one category over time to spot rising costs.

**Export.** Settings → **Export data** → share a CSV of every entry (Files, Mail, accountant).

**Account.** Settings (profile icon on the Dashboard): Categories, Export, Support (email), Privacy, Terms, Sign out, Delete account (removes everything, immediately).

## Stack

Expo SDK 57 · expo-router · React Native 0.86 · TypeScript · @tanstack/react-query · @supabase/supabase-js · date-fns · victory-native (charts) · Jest + jest-expo.

## Layout

```
app/                 expo-router screens
  (auth)/sign-in     (tabs)/{index,properties,add,reports}
  property/[id]/     ledger, edit, recurring rules
  recurring/         new rule (modal), edit rule (modal)
  transaction/       edit one entry
  history, export, categories, delete-account
src/
  types/             shared row types, mirror supabase/schema.sql
  lib/               pure functions - no React, no network (money, dates, validation,
                     timeline, aggregate, recurring engine, dashboard model, export)
  db/                Supabase access; every insert stamps user_id (RLS WITH CHECK)
  components/        forms and the dashboard view
  theme.ts           colour, type scale, shared styles - the only place hex values live
supabase/
  schema.sql         canonical schema (run once on a new project)
  seed_categories.sql
  migrations/        additive migrations applied to the live project, in order
  functions/delete-account
scripts/             live e2e smoke test for recurring rules (see below)
__tests__/           Jest; pure logic and mocked DB payloads
docs/                App Store listing notes, privacy/support pages (GitHub Pages),
                     superpowers/{specs,plans} for design docs
```

## Recurring rules - exact behaviour

Implemented in `src/lib/recurring.ts` (pure) and `src/db/recurring.ts` (network).

- A rule has property, category, kind, amount, vendor/source, notes, `start_month`, and an end mode: `until_stopped` or `count` with `occurrences`.
- `generateDueEntries(rule, existingDates, today)` returns one entry per month from `start_month` through the current month, skipping any month that already has an entry for that rule (any day in the month counts) and any month in `rule.skipped_months`. Never future months, never past `stopped_on`, never beyond `occurrences`.
- Generation runs on app launch (tabs layout) and right after a rule is created or edited. One failing rule is logged and skipped so the rest still post.
- Editing a generated entry sets `is_edited = true`; the generator never touches existing rows. Deleting a generated entry records its month in `skipped_months` so it is not re-posted. Moving an entry to another month does the same for the vacated month.
- Changing a rule affects future months only, unless "Also update months already posted" is on - then posted, un-edited entries from the chosen month onward are rewritten (`applyRuleToPostedEntries`).
- Stopping sets `stopped_on` and `is_active = false`; history stays. Deleting a rule leaves its entries with `recurring_id = null`.

## Development

```bash
npm install
cp .env.example .env      # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (anon key only)
npm test                  # Jest
npx tsc --noEmit          # typecheck
npx expo start            # dev server (needs a dev client; see below)
```

Both `npm test` and `npx tsc --noEmit` must be clean before any commit.

### Simulator builds

SDK 57 needs Xcode 26 to build locally. On older Xcode, use an EAS simulator build:

```bash
npx eas-cli@latest build -p ios --profile preview-sim
```

and install the resulting `.app` with `xcrun simctl install booted <path>`. With Xcode 27 a local dev build works: `npx expo run:ios --device <simulator udid>`. Rebuild whenever a native module is added (a stale dev client fails with *Cannot find native module …*).

Run Metro in your own terminal (`npx expo start`), not as a background job of a tool that times out, or the simulator loses its bundle mid-test. After starting Metro, `xcrun simctl terminate` then `launch` the app: launching an already-running app keeps the old bundle.

Maestro (`~/.maestro/bin`) drives the simulator for screenshots and checks; it needs `export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home` (Homebrew's JDK is keg-only). Tab bar taps work best as points (`12%|37%|62%|87%, 96%`). `cliclick` cannot focus React Native text inputs.

### Live e2e for recurring rules

Exercises the real `src/db` layer against the live project as a signed-in user (RLS, user_id stamping, idempotency, edited/skipped months, rule edits). Cleans up after itself.

```bash
E2E_DEMO_EMAIL=… E2E_DEMO_PASSWORD=… node --env-file=.env --import ./scripts/e2e-recurring.loader.mjs scripts/e2e-recurring.ts
```

Credentials come from the environment. Never commit them.

### Database changes

Migrations are additive only and live in `supabase/migrations/`. Apply with psql (`SUPABASE_DB_PASSWORD` in `.env`) and mirror the DDL into `supabase/schema.sql` so a fresh project can be created from it alone. RLS is enabled on every table.

```bash
set -a; source .env; set +a
PGPASSWORD="$SUPABASE_DB_PASSWORD" /opt/homebrew/opt/libpq/bin/psql \
  "host=db.dxjwyaldmxquuztmnrsb.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
  -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql
```

**System categories** come from `src/lib/category-catalog.ts`. To add or rename one: edit the catalog (renames go in `CATEGORY_RENAMES` so the row and its entries are kept), run `npm run categories:sql` to regenerate `supabase/seed_categories.sql` and `supabase/migrations/2026-10-06-category-catalog.sql`, list any brand-new name in `__tests__/category-catalog.test.ts`, run `npm test`, then apply the migration file above. It is idempotent. Last applied 2026-10-08 (72 system categories: added Credit Card Bill; Debt Payment → Loan Payment, Travel → Travel/Vacation).

## Release

```bash
npx eas-cli@latest build -p ios --profile production --auto-submit   # build + upload to App Store Connect
```

To submit an existing build: `npx eas-cli submit -p ios --profile production --id <build id>`. Android submission needs a Google Play service-account key at `./google-service-account.json` (gitignored, never committed); without it `eas submit -p android` stops.

Internal TestFlight testers receive each build automatically. App Store metadata, screenshots and review info are managed through the ASC API (see `docs/app-store-listing.md` for the copy). `docs/` is published with GitHub Pages for the privacy and support URLs; `docs/_config.yml` excludes internal docs from that build.

## Docs

- `docs/app-store-listing.md` - store copy, keywords, privacy answers, What's New.
- `docs/superpowers/specs/` - design specs (account deletion, personal budgets).
- `docs/superpowers/plans/` - implementation plans.
- `WORKLOG.md` - per-phase start/finish log with test counts.
