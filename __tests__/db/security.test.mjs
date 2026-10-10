// Run by Node's own test runner (npm run test:db, part of npm test), not Jest.
//
// Builds the real schema (supabase/schema.sql) plus the security-hardening
// migration on Postgres (PGlite, in-process), then acts as two signed-in users
// through RLS exactly as the Data API does: role `authenticated`, auth.uid()
// from the JWT subject. Proves one user can neither read nor touch another's
// books, cannot plant a "system" category in everyone's picker, and that
// account and property deletion still cascade cleanly.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before as beforeAll, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SCHEMA = readFileSync(join(ROOT, 'supabase/schema.sql'), 'utf8');
const HARDENING = readFileSync(join(ROOT, 'supabase/migrations/2026-10-07-security-hardening.sql'), 'utf8');
const ADVISOR = readFileSync(join(ROOT, 'supabase/migrations/2026-10-09-advisor-warnings.sql'), 'utf8');

const ALICE = '00000000-0000-0000-0000-00000000a11c';
const BOB = '00000000-0000-0000-0000-000000000b0b';

// The slice of Supabase that the schema leans on: auth.users, auth.uid(), and
// the authenticated role the Data API switches to.
const SUPABASE_STUB = `
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role authenticated;
create role anon;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
`;

let db;

/** Runs `fn` as a signed-in user, the way PostgREST does, then drops back to the owner. */
async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(SCHEMA);
  await db.exec(HARDENING);
  await db.exec(HARDENING); // idempotent
  // Supabase grants EXECUTE on new functions to anon and authenticated directly.
  await db.exec(`grant execute on all functions in schema public to anon, authenticated;`);
  await db.exec(ADVISOR);
  await db.exec(ADVISOR); // idempotent
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
  await db.query(`insert into auth.users (id) values ($1), ($2)`, [ALICE, BOB]);
  await db.query(
    `insert into categories (name, kind, is_system, scope) values ('Repairs', 'expense', true, 'property')`
  );
});

async function seedBooks(user, label) {
  return as(user, async () => {
    const property = await one(
      `insert into properties (user_id, name, ledger_kind, property_subtype) values ($1, $2, 'property', 'rental') returning id`,
      [user, `${label} Duplex`]
    );
    const category = await one(
      `insert into categories (user_id, name, kind, scope) values ($1, $2, 'expense', 'property') returning id`,
      [user, `${label} Custom`]
    );
    const rule = await one(
      `insert into recurring_rules (user_id, property_id, category_id, kind, amount, start_month, end_mode)
       values ($1, $2, $3, 'expense', 100, '2026-01-01', 'until_stopped') returning id`,
      [user, property.id, category.id]
    );
    const expense = await one(
      `insert into expenses (user_id, property_id, category_id, amount, paid_on, recurring_id)
       values ($1, $2, $3, 100, '2026-01-01', $4) returning id`,
      [user, property.id, category.id, rule.id]
    );
    return { property: property.id, category: category.id, rule: rule.id, expense: expense.id };
  });
}

describe('row level security', () => {
  let alice;
  let bob;
  beforeAll(async () => {
    alice = await seedBooks(ALICE, 'Alice');
    bob = await seedBooks(BOB, 'Bob');
  });

  it("hides another user's rows on every table", async () => {
    await as(ALICE, async () => {
      for (const table of ['properties', 'expenses', 'recurring_rules']) {
        const { rows } = await db.query(`select user_id from ${table}`);
        assert.ok(rows.length > 0, table);
        assert.ok(rows.every((r) => r.user_id === ALICE), `${table} leaked another user's rows`);
      }
      const { rows } = await db.query(`select name from categories where not is_system`);
      assert.deepEqual(rows.map((r) => r.name), ['Alice Custom']);
    });
  });

  it("cannot update or delete another user's rows", async () => {
    await as(ALICE, async () => {
      const upd = await db.query(`update expenses set amount = 1 where id = $1`, [bob.expense]);
      assert.equal(upd.affectedRows, 0);
      const del = await db.query(`delete from properties where id = $1`, [bob.property]);
      assert.equal(del.affectedRows, 0);
    });
    assert.equal((await one(`select amount from expenses where id = $1`, [bob.expense])).amount, '100.00');
  });

  it('cannot write rows owned by someone else', async () => {
    await as(ALICE, () =>
      assert.rejects(
        db.query(`insert into properties (user_id, name, ledger_kind, property_subtype) values ($1, 'x', 'property', 'rental')`, [BOB]),
        /row-level security/
      )
    );
    await as(ALICE, () =>
      assert.rejects(db.query(`update properties set user_id = $1 where id = $2`, [BOB, alice.property]), /row-level security/)
    );
  });

  it("cannot attach an entry to another user's property, category or rule", async () => {
    const attempts = [
      [`insert into expenses (user_id, property_id, category_id, amount, paid_on) values ($1, $2, $3, 5, '2026-02-01')`, [ALICE, bob.property, alice.category], /property not found/],
      [`insert into expenses (user_id, property_id, category_id, amount, paid_on) values ($1, $2, $3, 5, '2026-02-01')`, [ALICE, alice.property, bob.category], /category not found/],
      [`insert into expenses (user_id, property_id, category_id, amount, paid_on, recurring_id) values ($1, $2, $3, 5, '2026-02-01', $4)`, [ALICE, alice.property, alice.category, bob.rule], /recurring rule not found/],
      [`insert into income (user_id, property_id, category_id, amount, received_on) values ($1, $2, $3, 5, '2026-02-01')`, [ALICE, bob.property, alice.category], /property not found/],
      [`insert into recurring_rules (user_id, property_id, category_id, kind, amount, start_month, end_mode) values ($1, $2, $3, 'expense', 5, '2026-02-01', 'until_stopped')`, [ALICE, alice.property, bob.category], /category not found/],
      [`update expenses set property_id = $2 where user_id = $1`, [ALICE, bob.property], /property not found/],
    ];
    for (const [sql, params, error] of attempts) {
      await as(ALICE, () => assert.rejects(db.query(sql, params), error, sql));
    }
  });

  it('runs the ownership trigger without EXECUTE on it', async () => {
    const grants = await one(
      `select has_function_privilege('authenticated', 'enforce_own_references()', 'execute') as authed,
              has_function_privilege('anon', 'enforce_own_references()', 'execute') as anon`
    );
    assert.deepEqual(grants, { authed: false, anon: false });
    // seedBooks inserted through the trigger as authenticated; the attach test
    // above proves it still rejects foreign references.
    const fresh = await seedBooks(ALICE, 'Alice again');
    assert.ok(fresh.expense);
    await as(ALICE, () => db.query(`delete from properties where id = $1`, [fresh.property]));
  });

  it('can use system categories', async () => {
    const system = await one(`select id from categories where is_system`);
    await as(ALICE, () =>
      db.query(`insert into expenses (user_id, property_id, category_id, amount, paid_on) values ($1, $2, $3, 7, '2026-03-01')`, [
        ALICE,
        alice.property,
        system.id,
      ])
    );
  });

  it('cannot create, promote, edit or delete a system category', async () => {
    const system = await one(`select id from categories where is_system`);
    await as(ALICE, async () => {
      await assert.rejects(
        db.query(`insert into categories (user_id, name, kind, is_system) values ($1, 'Visit evil.example', 'expense', true)`, [ALICE]),
        /row-level security/
      );
      await assert.rejects(db.query(`update categories set is_system = true where id = $1`, [alice.category]), /row-level security/);
      const edit = await db.query(`update categories set name = 'hacked' where id = $1`, [system.id]);
      assert.equal(edit.affectedRows, 0);
      const del = await db.query(`delete from categories where id = $1`, [system.id]);
      assert.equal(del.affectedRows, 0);
    });
    await as(BOB, async () => {
      const { rows } = await db.query(`select name from categories where is_system`);
      assert.deepEqual(rows.map((r) => r.name), ['Repairs']);
    });
  });

  it('rejects oversized text', async () => {
    await as(ALICE, () =>
      assert.rejects(
        db.query(`update expenses set notes = repeat('x', 5001) where id = $1`, [alice.expense]),
        /expenses_text_lengths/
      )
    );
  });

  it('still lets a user delete a rule, then a property, with entries attached', async () => {
    await as(ALICE, async () => {
      await db.query(`delete from recurring_rules where id = $1`, [alice.rule]);
      assert.equal((await one(`select recurring_id from expenses where id = $1`, [alice.expense])).recurring_id, null);
      await db.query(`delete from properties where id = $1`, [alice.property]);
      assert.equal((await db.query(`select 1 from expenses`)).rows.length, 0);
    });
  });

  it('still cascades a whole account away (delete-account edge function)', async () => {
    await db.query(`delete from auth.users where id = $1`, [BOB]);
    for (const table of ['properties', 'categories', 'expenses', 'recurring_rules']) {
      const { rows } = await db.query(`select 1 from ${table} where user_id = $1`, [BOB]);
      assert.equal(rows.length, 0, table);
    }
  });
});
