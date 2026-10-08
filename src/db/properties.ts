// Data access for the properties table. Screens never talk to supabase directly
// for property data — they go through these functions (tested with a mocked client).
import { supabase } from './supabase';
import type { NewProperty, Property } from '@/types';

/**
 * Lists properties (name order). Archived rows are excluded unless explicitly
 * requested — archiving hides a sold property without losing its history.
 */
export async function listProperties(
  opts: { includeArchived?: boolean } = {}
): Promise<Property[]> {
  let query = supabase.from('properties').select('*').order('name');
  if (!opts.includeArchived) query = query.eq('is_archived', false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Property[];
}

/** Fetches one property by id (RLS guarantees it belongs to the signed-in user). */
export async function getProperty(id: string): Promise<Property> {
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Property;
}

/**
 * Creates a property for the signed-in user. user_id is set explicitly because
 * the schema has no default and the RLS WITH CHECK requires auth.uid() = user_id.
 */
export async function createProperty(input: NewProperty): Promise<Property> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

/** Updates editable fields on a property. */
export async function updateProperty(
  id: string,
  patch: Partial<NewProperty>
): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

/**
 * Archives/unarchives a property. This is an UPDATE of is_archived: archiving
 * keeps the records (sell a property, keep its history; spec §3 design note).
 */
export async function setPropertyArchived(id: string, archived: boolean): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({ is_archived: archived })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

/**
 * Deletes an archived ledger for good. Its entries and recurring rules go with it
 * (on delete cascade). Only archived ledgers qualify: the filter is part of the
 * DELETE itself, so an active ledger can never be removed by this call.
 */
export async function deleteArchivedProperty(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('is_archived', true)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Only an archived ledger can be deleted. Archive it first.');
}

/** How many entries (expenses + income) a ledger holds, for a delete warning. */
export async function countLedgerEntries(id: string): Promise<number> {
  const [expenses, income] = await Promise.all([
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('property_id', id),
    supabase.from('income').select('id', { count: 'exact', head: true }).eq('property_id', id),
  ]);
  if (expenses.error) throw expenses.error;
  if (income.error) throw income.error;
  return (expenses.count ?? 0) + (income.count ?? 0);
}
