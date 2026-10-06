// The system category catalog: its own rules, then what each kind of ledger is
// offered, walked through the real situations people log money in.
import {
  CATEGORY_MERGES,
  CATEGORY_RENAMES,
  SYSTEM_CATEGORIES,
  type CatalogCategory,
} from '../src/lib/category-catalog';
import { categoriesForLedger, categoriesVisibleToLedger } from '../src/lib/categories';
import type { Category, CategoryKind, LedgerKind, PropertySubtype } from '../src/types';
import previous from './fixtures/system-categories-2026-10-05.json';

const asCategory = (c: CatalogCategory, i: number): Category => ({
  id: `sys-${i}`,
  user_id: null,
  name: c.name,
  kind: c.kind,
  is_system: true,
  scope: c.scope,
  tenant_only: c.tenantOnly ?? false,
  description: c.description ?? null,
  created_at: '2026-10-06T00:00:00Z',
});
const ALL = SYSTEM_CATEGORIES.map(asCategory);

const ledger = (kind: LedgerKind, subtype: PropertySubtype | null = null) => ({
  ledger_kind: kind,
  property_subtype: subtype,
});
const RENTAL = ledger('property', 'rental');
const HOME = ledger('property', 'primary_residence');
const INVESTMENT = ledger('property', 'investment');
const FLIP = ledger('property', 'flip');
const BUDGET = ledger('budget');
const PROPERTIES = [RENTAL, HOME, INVESTMENT, FLIP];

const names = (l: ReturnType<typeof ledger>, kind: CategoryKind) =>
  categoriesForLedger(ALL, l, kind).map((c) => c.name);
const find = (name: string) => SYSTEM_CATEGORIES.find((c) => c.name === name);

describe('catalog shape', () => {
  it('has no duplicate name within a kind', () => {
    const keys = SYSTEM_CATEGORIES.map((c) => `${c.kind}:${c.name.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only marks property categories as tenant-only', () => {
    for (const c of SYSTEM_CATEGORIES.filter((x) => x.tenantOnly)) expect(c.scope).toBe('property');
  });

  it('keeps names short enough for a chip and descriptions to one sentence or two', () => {
    for (const c of SYSTEM_CATEGORIES) {
      expect(c.name.length).toBeLessThanOrEqual(34);
      expect(c.name).toBe(c.name.trim());
      if (c.description) {
        expect(c.description.length).toBeLessThanOrEqual(160);
        expect(c.description).toMatch(/\.$/);
      }
    }
  });

  it('has a catch-all of each kind every ledger can use', () => {
    expect(find('Other Expense')).toMatchObject({ kind: 'expense', scope: 'both' });
    expect(find('Other Income')).toMatchObject({ kind: 'income', scope: 'both' });
  });

  it('gives every ledger at least a dozen expense choices and some income ones', () => {
    for (const l of [...PROPERTIES, BUDGET]) {
      expect(names(l, 'expense').length).toBeGreaterThanOrEqual(12);
      expect(names(l, 'income').length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('the cleanup', () => {
  const previousNames = new Set(previous.map((c) => c.name));
  const catalogNames = new Set(SYSTEM_CATEGORIES.map((c) => c.name));

  it('accounts for every category that existed before: kept, renamed or merged', () => {
    for (const old of previous) {
      const fate = catalogNames.has(old.name) || old.name in CATEGORY_RENAMES || old.name in CATEGORY_MERGES;
      expect([old.name, fate]).toEqual([old.name, true]);
    }
  });

  it('renames and merges only point at categories in the catalog, of the same kind', () => {
    for (const [from, to] of [...Object.entries(CATEGORY_RENAMES), ...Object.entries(CATEGORY_MERGES)]) {
      const target = find(to);
      expect(target).toBeDefined();
      expect(previous.find((c) => c.name === from)?.kind).toBe(target!.kind);
    }
  });

  it('never renames and merges the same category', () => {
    for (const from of Object.keys(CATEGORY_MERGES)) expect(CATEGORY_RENAMES).not.toHaveProperty(from);
  });

  it('drops the categories almost nobody used', () => {
    for (const gone of ['Sewer', 'Parking', 'Laundry/Vending', 'Savings Transfer', 'Insurance', 'Garbage']) {
      expect(catalogNames.has(gone)).toBe(false);
    }
  });

  it('does not count a transfer to savings as spending', () => {
    expect(names(BUDGET, 'expense').some((n) => /saving/i.test(n))).toBe(false);
  });

  it('only adds names that did not exist before or are deliberate renames', () => {
    const added = [...catalogNames].filter((n) => !previousNames.has(n));
    const renamedTo = new Set(Object.values(CATEGORY_RENAMES));
    const brandNew = added.filter((n) => !renamedTo.has(n));
    expect(brandNew.sort()).toEqual(
      [
        'Closing Costs',
        'Flood Insurance',
        'HELOC / Second Mortgage',
        'Home Warranty',
        'Mortgage Escrow (Paid Separately)',
        'Mortgage Insurance (PMI)',
        'Mortgage Payment (no Escrow)',
        'Mortgage Payment (with Escrow)',
        'Pets',
        'Property Tax (Combined)',
        'Sale Proceeds',
        'Selling Costs',
      ].sort()
    );
  });
});

describe('paying a mortgage, every way people do', () => {
  const mortgage = (l: ReturnType<typeof ledger>) => names(l, 'expense').filter((n) => /^Mortgage|^HELOC/.test(n));

  it('offers one category per payment style on every property', () => {
    for (const l of PROPERTIES) {
      expect(mortgage(l)).toEqual(
        expect.arrayContaining([
          'Mortgage Payment (with Escrow)',
          'Mortgage Payment (no Escrow)',
          'Mortgage Interest',
          'Mortgage Principal',
          'Mortgage Escrow (Paid Separately)',
          'Mortgage Insurance (PMI)',
          'HELOC / Second Mortgage',
        ])
      );
    }
  });

  it('keeps every mortgage category off a budget, which has Rent/Mortgage instead', () => {
    expect(mortgage(BUDGET)).toEqual([]);
    expect(names(BUDGET, 'expense')).toContain('Rent/Mortgage');
  });

  it('warns the escrow payment not to be doubled up with taxes or insurance', () => {
    expect(find('Mortgage Payment (with Escrow)')!.description).toMatch(/escrow/i);
    expect(find('Mortgage Payment (with Escrow)')!.description).toMatch(/do not also log/i);
  });

  it('tells a no-escrow payer where taxes and insurance go', () => {
    expect(find('Mortgage Payment (no Escrow)')!.description).toMatch(/taxes and insurance/i);
  });

  it('pairs interest with principal, and steers both away from a full payment', () => {
    expect(find('Mortgage Interest')!.description).toMatch(/Mortgage Principal/);
    expect(find('Mortgage Principal')!.description).toMatch(/Mortgage Interest/);
    for (const n of ['Mortgage Interest', 'Mortgage Principal']) {
      expect(find(n)!.description).toMatch(/not with a Mortgage Payment/);
    }
  });

  it('describes every mortgage option, since the names alone are easy to mix up', () => {
    for (const c of SYSTEM_CATEGORIES.filter((x) => /^Mortgage|^HELOC/.test(x.name))) {
      expect([c.name, Boolean(c.description)]).toEqual([c.name, true]);
    }
  });
});

describe('property tax, billed together or apart', () => {
  const TAXES = ['Property Tax (Combined)', 'School Tax', 'County Tax', 'City/Town Tax'];

  it('offers a combined bill and each separate bill on every property', () => {
    for (const l of PROPERTIES) expect(names(l, 'expense')).toEqual(expect.arrayContaining(TAXES));
  });

  it('keeps property tax off a budget', () => {
    for (const t of TAXES) expect(names(BUDGET, 'expense')).not.toContain(t);
  });

  it('tells the combined bill to step aside when the bills are separate', () => {
    expect(find('Property Tax (Combined)')!.description).toMatch(/school, county and city or town/i);
  });

  it('reminds every tax and insurance bill that escrow may already pay it', () => {
    for (const n of [...TAXES, 'Home Insurance', 'Flood Insurance']) {
      expect([n, find(n)!.description]).toEqual([n, expect.stringMatching(/escrow/i)]);
    }
  });

  it('covers a village tax under City/Town', () => {
    expect(find('City/Town Tax')!.description).toMatch(/village/i);
  });
});

describe('what each kind of property is offered', () => {
  it('a rental collects rent and the fees that come with tenants', () => {
    expect(names(RENTAL, 'income')).toEqual(
      expect.arrayContaining(['Rent', 'Late Fee', 'Pet Fee', 'Security Deposit Retained', 'Other Rental Income'])
    );
    expect(names(RENTAL, 'expense')).toContain('Property Management Fee');
  });

  it('an investment property can be rented out too', () => {
    expect(names(INVESTMENT, 'income')).toContain('Rent');
    expect(names(INVESTMENT, 'expense')).toContain('Property Management Fee');
  });

  it('a primary residence never sees tenant income or a property manager', () => {
    for (const n of ['Rent', 'Late Fee', 'Pet Fee', 'Security Deposit Retained', 'Other Rental Income']) {
      expect(names(HOME, 'income')).not.toContain(n);
    }
    expect(names(HOME, 'expense')).not.toContain('Property Management Fee');
  });

  it('a primary residence still has everything owning a home costs', () => {
    expect(names(HOME, 'expense')).toEqual(
      expect.arrayContaining(['Mortgage Payment (with Escrow)', 'Home Insurance', 'HOA Fees', 'Repairs', 'Home Warranty'])
    );
  });

  it('a flip covers buying, renovating, holding and selling', () => {
    expect(names(FLIP, 'expense')).toEqual(
      expect.arrayContaining(['Closing Costs', 'Renovation/Improvements', 'Mortgage Interest', 'Property Tax (Combined)', 'Selling Costs'])
    );
    expect(names(FLIP, 'income')).toContain('Sale Proceeds');
    expect(names(FLIP, 'income')).not.toContain('Rent');
    expect(names(FLIP, 'expense')).not.toContain('Property Management Fee');
  });

  it('any property can be sold or claim on insurance', () => {
    for (const l of PROPERTIES) expect(names(l, 'income')).toEqual(expect.arrayContaining(['Sale Proceeds', 'Insurance Payout']));
  });

  it('offers a flood policy apart from home insurance', () => {
    for (const l of PROPERTIES) expect(names(l, 'expense')).toEqual(expect.arrayContaining(['Home Insurance', 'Flood Insurance']));
  });
});

describe('what a budget is offered', () => {
  it('covers everyday household spending', () => {
    expect(names(BUDGET, 'expense')).toEqual(
      expect.arrayContaining(['Groceries', 'Dining Out', 'Fuel', 'Phone', 'Pets', 'Health/Medical', 'Subscriptions'])
    );
  });

  it('shares utilities, home insurance and upkeep with properties', () => {
    for (const n of ['Electric', 'Gas/Heating', 'Water & Sewer', 'Trash/Recycling', 'Internet/Cable', 'Home Insurance', 'Repairs']) {
      expect(names(BUDGET, 'expense')).toContain(n);
      expect(names(RENTAL, 'expense')).toContain(n);
    }
  });

  it('never sees landlord, flip or property-tax categories', () => {
    for (const n of ['Property Management Fee', 'Selling Costs', 'Closing Costs', 'Landscaping/Snow', 'Flood Insurance']) {
      expect(names(BUDGET, 'expense')).not.toContain(n);
    }
    expect(names(BUDGET, 'income')).not.toContain('Rent');
  });

  it('has household income, and no property income', () => {
    expect(names(BUDGET, 'income')).toEqual(
      expect.arrayContaining(['Salary', 'Bonus', 'Freelance', 'Interest/Dividends', 'Refund', 'Gift Received', 'Other Income'])
    );
    expect(names(BUDGET, 'income')).not.toContain('Sale Proceeds');
  });

  it('keeps household-only spending off properties', () => {
    for (const n of ['Groceries', 'Dining Out', 'Rent/Mortgage', 'Car Payment']) {
      for (const l of PROPERTIES) expect(names(l, 'expense')).not.toContain(n);
    }
  });
});

describe('every category is reachable', () => {
  it('each catalog category shows up on at least one kind of ledger', () => {
    const seen = new Set([...PROPERTIES, BUDGET].flatMap((l) => categoriesVisibleToLedger(ALL, l).map((c) => c.name)));
    for (const c of SYSTEM_CATEGORIES) expect([c.name, seen.has(c.name)]).toEqual([c.name, true]);
  });
});
