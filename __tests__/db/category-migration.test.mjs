// Run by Node's own test runner (npm run test:db, part of npm test), not Jest:
// PGlite loads its WebAssembly in a way Jest's module sandbox cannot.
//
// Runs the real migration SQL against Postgres (PGlite, in-process) starting
// from the live system categories as they were on 2026-10-05, with entries and
// recurring rules on every category that gets renamed or merged. Proves no entry
// is lost or orphaned, user categories are untouched, the result is exactly the
// catalog, and a second run changes nothing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before as beforeAll, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { CATEGORY_MERGES, CATEGORY_RENAMES, SYSTEM_CATEGORIES } from '../../src/lib/category-catalog.ts';
import previous from '../fixtures/system-categories-2026-10-05.json' with { type: 'json' };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATION = readFileSync(join(ROOT, 'supabase/migrations/2026-10-06-category-catalog.sql'), 'utf8');
const SEED = readFileSync(join(ROOT, 'supabase/seed_categories.sql'), 'utf8');
const USER = '00000000-0000-0000-0000-0000000000aa';

// The columns the migration touches, shaped like the live tables (no RLS: this is
// about data, and the migration runs as the owner).
const SCHEMA = `
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  kind text not null check (kind in ('expense','income')),
  is_system boolean not null default false,
  scope text not null default 'property' check (scope in ('property','budget','both')),
  tenant_only boolean not null default false,
  created_at timestamptz not null default now()
);
create table expenses (id serial primary key, category_id uuid not null references categories(id), amount numeric(12,2) not null);
create table income (id serial primary key, category_id uuid not null references categories(id), amount numeric(12,2) not null);
create table recurring_rules (id serial primary key, category_id uuid not null references categories(id), amount numeric(12,2) not null);
`;

async function systemRows(db) {
  const { rows } = await db.query(
    `select name, kind, scope, tenant_only, description from categories where is_system order by kind, name`
  );
  return rows;
}

const catalogRows = () =>
  SYSTEM_CATEGORIES.map((c) => ({
    name: c.name,
    kind: c.kind,
    scope: c.scope,
    tenant_only: c.tenantOnly ?? false,
    description: c.description ?? null,
  })).sort((a, b) => (a.kind === b.kind ? (a.name < b.name ? -1 : 1) : a.kind < b.kind ? -1 : 1));

async function idOf(db, name, system = true) {
  const { rows } = await db.query(
    `select id from categories where name = $1 and is_system = $2`,
    [name, system]
  );
  if (rows.length !== 1) throw new Error(`expected one ${system ? 'system' : 'user'} "${name}", found ${rows.length}`);
  return rows[0].id;
}

/** Live state on 2026-10-05: the system set, two user categories, and money on every renamed or merged row. */
async function liveLikeDatabase() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  for (const c of previous) {
    await db.query(`insert into categories (name, kind, scope, tenant_only, is_system) values ($1,$2,$3,$4,true)`, [
      c.name,
      c.kind,
      c.scope,
      c.tenant_only,
    ]);
  }
  // What a real user did: their own "Mortgage", and a duplicate "School Tax".
  // A user category that shares a name with a merged system row must not be merged.
  for (const [name, kind] of [
    ['Mortgage', 'expense'],
    ['School Tax', 'expense'],
    ['Sewer', 'expense'],
  ]) {
    await db.query(`insert into categories (user_id, name, kind, scope) values ($1,$2,$3,'both')`, [USER, name, kind]);
  }

  const spend = async (table, name, amount, system = true) =>
    db.query(`insert into ${table} (category_id, amount) values ($1, $2)`, [await idOf(db, name, system), amount]);

  for (const name of [...Object.keys(CATEGORY_RENAMES), ...Object.keys(CATEGORY_MERGES)]) {
    const kind = previous.find((c) => c.name === name).kind;
    await spend(kind === 'income' ? 'income' : 'expenses', name, 100);
  }
  await spend('recurring_rules', 'Parking', 75);
  await spend('recurring_rules', 'Savings Transfer', 200);
  await spend('recurring_rules', 'Insurance', 120);
  await spend('income', 'Rent', 2150);
  await spend('expenses', 'Mortgage Interest', 842.17);
  await spend('expenses', 'Mortgage', 1900, false);
  await spend('expenses', 'Sewer', 40, false);
  return db;
}

async function moneySnapshot(db) {
  const { rows } = await db.query(`
    select 'expenses' t, count(*)::int n, coalesce(sum(amount),0)::text total from expenses
    union all select 'income', count(*)::int, coalesce(sum(amount),0)::text from income
    union all select 'recurring_rules', count(*)::int, coalesce(sum(amount),0)::text from recurring_rules
    order by 1`);
  return rows;
}

describe('category migration on a live-shaped database', () => {
  let db;
  let before;

  beforeAll(async () => {
    db = await liveLikeDatabase();
    const ids = {};
    for (const name of ['Insurance', 'Water', 'Laundry/Vending', 'Capital Improvement', 'Other Expense', 'Rent', 'Mortgage Interest']) {
      ids[name] = await idOf(db, name);
    }
    for (const name of ['Mortgage', 'School Tax', 'Sewer']) ids[`user:${name}`] = await idOf(db, name, false);
    before = { ids, money: await moneySnapshot(db) };
    await db.exec(MIGRATION);
  });

  after(() => db.close());

  it('leaves exactly the catalog as system categories', async () => {
    assert.deepEqual(await systemRows(db), catalogRows());
  });

  it('keeps every entry and recurring rule, to the cent', async () => {
    assert.deepEqual(await moneySnapshot(db), before.money);
  });

  it('renames in place, so entries keep their category row', async () => {
    assert.equal(await idOf(db, 'Home Insurance'), before.ids.Insurance);
    assert.equal(await idOf(db, 'Water & Sewer'), before.ids.Water);
    assert.equal(await idOf(db, 'Other Rental Income'), before.ids['Laundry/Vending']);
    assert.equal(await idOf(db, 'Renovation/Improvements'), before.ids['Capital Improvement']);
  });

  it('moves entries off merged categories onto the survivor', async () => {
    const count = async (table, name) =>
      (await db.query(`select count(*)::int n from ${table} where category_id = $1`, [await idOf(db, name)])).rows[0].n;
    assert.equal(await count('expenses', 'Water & Sewer'), 2); // Water + Sewer
    assert.equal(await count('income', 'Other Rental Income'), 2); // Laundry/Vending + Parking
    assert.equal(await count('recurring_rules', 'Other Rental Income'), 1); // Parking rule
    assert.equal(await count('expenses', 'Other Expense'), 1); // Savings Transfer
    assert.equal(await count('recurring_rules', 'Other Expense'), 1);
    assert.equal(await count('recurring_rules', 'Home Insurance'), 1);
  });

  it('removes merged rows, leaving nothing pointing at a missing category', async () => {
    for (const gone of Object.keys(CATEGORY_MERGES)) {
      const { rows } = await db.query(`select 1 from categories where is_system and name = $1`, [gone]);
      assert.deepEqual([gone, rows.length], [gone, 0]);
    }
    const { rows } = await db.query(`
      select 1 from expenses e left join categories c on c.id = e.category_id where c.id is null
      union all select 1 from income i left join categories c on c.id = i.category_id where c.id is null
      union all select 1 from recurring_rules r left join categories c on c.id = r.category_id where c.id is null`);
    assert.deepEqual(rows, []);
  });

  it('never touches user-created categories or their entries, even one named like a merged row', async () => {
    const { rows } = await db.query(
      `select id, name, description, scope from categories where not is_system order by name`
    );
    assert.deepEqual(rows, [
      { id: before.ids['user:Mortgage'], name: 'Mortgage', description: null, scope: 'both' },
      { id: before.ids['user:School Tax'], name: 'School Tax', description: null, scope: 'both' },
      { id: before.ids['user:Sewer'], name: 'Sewer', description: null, scope: 'both' },
    ]);
    const { rows: own } = await db.query(`select count(*)::int n from expenses where category_id = $1`, [
      before.ids['user:Sewer'],
    ]);
    assert.equal(own[0].n, 1);
  });

  it('keeps untouched categories on the same row', async () => {
    assert.equal(await idOf(db, 'Rent'), before.ids.Rent);
    assert.equal(await idOf(db, 'Mortgage Interest'), before.ids['Mortgage Interest']);
  });

  it('makes a property manager tenant-only, as the catalog says', async () => {
    const { rows } = await db.query(
      `select tenant_only from categories where is_system and name = 'Property Management Fee'`
    );
    assert.equal(rows[0].tenant_only, true);
  });

  it('is idempotent: running it again changes nothing', async () => {
    const snapshot = async () => ({
      rows: (await db.query(`select id, name, kind, scope, tenant_only, description, is_system from categories order by id`)).rows,
      money: await moneySnapshot(db),
    });
    const first = await snapshot();
    await db.exec(MIGRATION);
    assert.deepEqual(await snapshot(), first);
  });
});

describe('a fresh database', () => {
  it('gets exactly the catalog from the seed, and the migration agrees with it', async () => {
    const db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(`alter table categories add column description text;`);
    await db.exec(SEED);
    assert.deepEqual(await systemRows(db), catalogRows());
    await db.exec(MIGRATION);
    assert.deepEqual(await systemRows(db), catalogRows());
    await db.close();
  });
});

describe('a migration that would leave a stray system category', () => {
  it('refuses and rolls everything back', async () => {
    const db = await liveLikeDatabase();
    await db.query(`insert into categories (name, kind, is_system) values ('Mystery Fee', 'expense', true)`);
    await assert.rejects(db.exec(MIGRATION), /missing from the catalog: Mystery Fee/);
    await db.exec('rollback');
    // Nothing applied: the old names are all still there.
    const { rows } = await db.query(`select 1 from categories where is_system and name in ('Insurance', 'Sewer', 'Parking')`);
    assert.equal(rows.length, 3);
    await db.close();
  });
});
