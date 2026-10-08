// The system categories every user gets — pure data, no React, no network.
// This is the source of truth: supabase/seed_categories.sql is generated from it
// (scripts/build-category-seed.mjs) and the tests hold the live migration to it.
//
// How the money actually moves decides the list, not how a textbook files it:
//
// Mortgage. Most owners make one payment that includes escrow (property tax and
// insurance the lender pays for them). Others pay the lender principal and
// interest only and pay taxes and insurance themselves. Landlords who want the
// deductible part on its own split interest from principal. Escrow can also be
// paid on its own (a shortage after the annual review), and PMI is sometimes
// billed outside the payment. Each path has exactly one category, and the
// descriptions say which other categories that path must NOT also use, so a
// tax bill is never counted twice.
//
// Property tax. Some places send one combined bill; others (New York, for one)
// bill school, county and city/town separately, at different times of year.
//
// Scope says which ledgers see a category: property, budget, or both.
// tenantOnly narrows a property category to subtypes with a tenant (rental,
// investment): a primary residence or a flip never collects rent or pays a
// property manager.
import type { CategoryKind, CategoryScope } from '@/types';

export interface CatalogCategory {
  name: string;
  kind: CategoryKind;
  scope: CategoryScope;
  tenantOnly?: boolean;
  /** One line shown under the picker; only where the name alone could be misread. */
  description?: string;
}

export const SYSTEM_CATEGORIES: readonly CatalogCategory[] = [
  // --- Mortgage and financing (property) ---
  {
    name: 'Mortgage Payment (with Escrow)',
    kind: 'expense',
    scope: 'property',
    description:
      'Your full monthly payment, including the property tax and insurance your lender pays from escrow. Do not also log those taxes or insurance.',
  },
  {
    name: 'Mortgage Payment (no Escrow)',
    kind: 'expense',
    scope: 'property',
    description:
      'Principal and interest paid to the lender. Log property taxes and insurance under their own categories when you pay them.',
  },
  {
    name: 'Mortgage Interest',
    kind: 'expense',
    scope: 'property',
    description:
      'Only the interest part of a payment you split. On a rental it is usually deductible. Use with Mortgage Principal, not with a Mortgage Payment.',
  },
  {
    name: 'Mortgage Principal',
    kind: 'expense',
    scope: 'property',
    description:
      'Only the principal part of a payment you split. It builds equity and is not deductible. Use with Mortgage Interest, not with a Mortgage Payment.',
  },
  {
    name: 'Mortgage Escrow (Paid Separately)',
    kind: 'expense',
    scope: 'property',
    description: 'Escrow paid on its own, such as a shortage or top-up after the annual escrow review.',
  },
  {
    name: 'Mortgage Insurance (PMI)',
    kind: 'expense',
    scope: 'property',
    description: 'Private mortgage insurance billed separately from your mortgage payment.',
  },
  {
    name: 'HELOC / Second Mortgage',
    kind: 'expense',
    scope: 'property',
    description: 'Payments on a home equity line or a second loan against the property.',
  },

  // --- Property tax (property) ---
  {
    name: 'Property Tax (Combined)',
    kind: 'expense',
    scope: 'property',
    description:
      'One property tax bill covering everything. If school, county and city or town tax come separately, use those instead. Skip it if escrow pays it.',
  },
  { name: 'School Tax', kind: 'expense', scope: 'property', description: 'School district tax billed on its own. Skip it if escrow pays it.' },
  { name: 'County Tax', kind: 'expense', scope: 'property', description: 'County tax billed on its own. Skip it if escrow pays it.' },
  {
    name: 'City/Town Tax',
    kind: 'expense',
    scope: 'property',
    description: 'City, town, township or village tax billed on its own. Skip it if escrow pays it.',
  },

  // --- Insurance ---
  {
    name: 'Home Insurance',
    kind: 'expense',
    scope: 'both',
    description: 'Homeowners, landlord or renters policy you pay directly. Skip it if escrow pays it.',
  },
  { name: 'Flood Insurance', kind: 'expense', scope: 'property', description: 'A separate flood policy. Skip it if escrow pays it.' },

  // --- Utilities and HOA (both) ---
  { name: 'Electric', kind: 'expense', scope: 'both' },
  { name: 'Gas/Heating', kind: 'expense', scope: 'both', description: 'Natural gas, propane or heating oil.' },
  { name: 'Water & Sewer', kind: 'expense', scope: 'both' },
  { name: 'Trash/Recycling', kind: 'expense', scope: 'both' },
  { name: 'Internet/Cable', kind: 'expense', scope: 'both' },
  { name: 'HOA Fees', kind: 'expense', scope: 'both', description: 'Homeowners or condo association dues and special assessments.' },

  // --- Upkeep ---
  { name: 'Repairs', kind: 'expense', scope: 'both', description: 'Fixing something that broke.' },
  { name: 'Maintenance', kind: 'expense', scope: 'both', description: 'Routine upkeep: servicing, inspections, filters.' },
  { name: 'Cleaning', kind: 'expense', scope: 'both' },
  { name: 'Supplies', kind: 'expense', scope: 'both' },
  { name: 'Appliances', kind: 'expense', scope: 'both' },
  { name: 'Home Warranty', kind: 'expense', scope: 'both' },
  { name: 'Landscaping/Snow', kind: 'expense', scope: 'property' },
  { name: 'Pest Control', kind: 'expense', scope: 'property' },
  {
    name: 'Renovation/Improvements',
    kind: 'expense',
    scope: 'property',
    description: 'Work that adds value or extends the life of the property: a new roof, kitchen, addition.',
  },

  // --- Running a rental (property) ---
  { name: 'Property Management Fee', kind: 'expense', scope: 'property', tenantOnly: true },
  { name: 'Advertising/Listing', kind: 'expense', scope: 'property', description: 'Finding a tenant or listing the property for sale.' },
  { name: 'Permits/Licenses', kind: 'expense', scope: 'property' },
  { name: 'Travel/Mileage', kind: 'expense', scope: 'property', description: 'Trips to the property for upkeep or showings.' },

  // --- Buying and selling (property) ---
  {
    name: 'Closing Costs',
    kind: 'expense',
    scope: 'property',
    description: 'Title, attorney, recording and lender fees when you buy or refinance.',
  },
  {
    name: 'Selling Costs',
    kind: 'expense',
    scope: 'property',
    description: 'Agent commission, transfer tax, staging and seller closing costs.',
  },

  // --- Fees (both) ---
  { name: 'Legal/Professional Fees', kind: 'expense', scope: 'both', description: 'Attorney, accountant or tax preparer.' },
  { name: 'Bank/Loan Fees', kind: 'expense', scope: 'both' },
  { name: 'Other Expense', kind: 'expense', scope: 'both' },

  // --- Household spending (budget) ---
  { name: 'Groceries', kind: 'expense', scope: 'budget' },
  { name: 'Dining Out', kind: 'expense', scope: 'budget' },
  {
    name: 'Rent/Mortgage',
    kind: 'expense',
    scope: 'budget',
    description: 'Your housing payment. Tracking the home as a property? Log the mortgage on that property instead.',
  },
  {
    name: 'Credit Card Bill',
    kind: 'expense',
    scope: 'budget',
    description:
      'The monthly payment on a card. It covers everything you bought with it, so there is no need to log each purchase as well.',
  },
  { name: 'Car Payment', kind: 'expense', scope: 'budget' },
  { name: 'Car Insurance', kind: 'expense', scope: 'budget' },
  { name: 'Fuel', kind: 'expense', scope: 'budget' },
  { name: 'Public Transit', kind: 'expense', scope: 'budget' },
  { name: 'Phone', kind: 'expense', scope: 'budget' },
  { name: 'Health/Medical', kind: 'expense', scope: 'budget', description: 'Doctor visits, prescriptions and premiums you pay yourself.' },
  { name: 'Childcare', kind: 'expense', scope: 'budget' },
  { name: 'Education', kind: 'expense', scope: 'budget' },
  { name: 'Subscriptions', kind: 'expense', scope: 'budget' },
  { name: 'Clothing', kind: 'expense', scope: 'budget' },
  { name: 'Personal Care', kind: 'expense', scope: 'budget' },
  { name: 'Pets', kind: 'expense', scope: 'budget' },
  { name: 'Entertainment', kind: 'expense', scope: 'budget' },
  { name: 'Gifts', kind: 'expense', scope: 'budget' },
  { name: 'Travel/Vacation', kind: 'expense', scope: 'budget' },
  { name: 'Charity', kind: 'expense', scope: 'budget' },
  {
    name: 'Loan Payment',
    kind: 'expense',
    scope: 'budget',
    description: 'Student, personal and other loans. A credit card payment goes under Credit Card Bill.',
  },

  // --- Property income ---
  { name: 'Rent', kind: 'income', scope: 'property', tenantOnly: true },
  { name: 'Late Fee', kind: 'income', scope: 'property', tenantOnly: true },
  { name: 'Pet Fee', kind: 'income', scope: 'property', tenantOnly: true },
  {
    name: 'Security Deposit Retained',
    kind: 'income',
    scope: 'property',
    tenantOnly: true,
    description: 'Only the part of a deposit you keep for damage or unpaid rent. A deposit you will return is not income.',
  },
  {
    name: 'Other Rental Income',
    kind: 'income',
    scope: 'property',
    tenantOnly: true,
    description: 'Parking, laundry, storage or utility reimbursements from tenants.',
  },
  { name: 'Insurance Payout', kind: 'income', scope: 'property', description: 'A claim paid out for damage to the property.' },
  { name: 'Sale Proceeds', kind: 'income', scope: 'property', description: 'What you received when the property sold, after the loan payoff.' },

  // --- Household income (budget) ---
  { name: 'Salary', kind: 'income', scope: 'budget' },
  { name: 'Bonus', kind: 'income', scope: 'budget' },
  { name: 'Freelance', kind: 'income', scope: 'budget' },
  { name: 'Interest/Dividends', kind: 'income', scope: 'budget' },
  { name: 'Refund', kind: 'income', scope: 'budget' },
  { name: 'Gift Received', kind: 'income', scope: 'budget' },

  { name: 'Other Income', kind: 'income', scope: 'both' },
];

/**
 * Old system category name → its name in this catalog. Renames keep the row (and
 * so every entry on it); merges move entries onto the surviving row and delete the
 * old one. The migration and its tests both read this.
 */
export const CATEGORY_RENAMES: Readonly<Record<string, string>> = {
  'City/Township Tax': 'City/Town Tax',
  Insurance: 'Home Insurance',
  Water: 'Water & Sewer',
  Garbage: 'Trash/Recycling',
  'Capital Improvement': 'Renovation/Improvements',
  'Laundry/Vending': 'Other Rental Income',
  // Household bills named the way people pay them: cards have their own category,
  // and a trip reads as a vacation, not a business expense.
  'Debt Payment': 'Loan Payment',
  Travel: 'Travel/Vacation',
};

/** Old system rows folded into another category; their entries move to the target. */
export const CATEGORY_MERGES: Readonly<Record<string, string>> = {
  Sewer: 'Water & Sewer',
  Parking: 'Other Rental Income',
  // A transfer to savings is not spending; counted as an expense it made the
  // savings rate read lower than it was. Any existing entries keep their amount.
  'Savings Transfer': 'Other Expense',
};
