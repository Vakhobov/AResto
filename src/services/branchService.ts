/**
 * branchService.ts  — Supabase
 * ─────────────────────────────
 * CRUD for the `branches` table.
 */
import { supabase } from '@/lib/supabase';
import { Branch } from '@/types/auth';

// ─── Row → domain ─────────────────────────────────────────────────────────────

const rowToBranch = (row: any): Branch => ({
  id: row.id,
  name: row.name,
  active: Boolean(row.active),
  kitchenUserId: row.kitchen_user_id ?? null,
  menuUserId: row.menu_user_id ?? null,
  kitchenCredentials: row.kitchen_credentials
    ? { email: row.kitchen_credentials.email ?? '', password: row.kitchen_credentials.password ?? '' }
    : null,
  menuCredentials: row.menu_credentials
    ? { email: row.menu_credentials.email ?? '', password: row.menu_credentials.password ?? '' }
    : null,
  createdAt: new Date(row.created_at),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type BranchInput = {
  name: string;
  active?: boolean;
  kitchenUserId?: string | null;
  menuUserId?: string | null;
  kitchenCredentials?: { email: string; password: string } | null;
  menuCredentials?: { email: string; password: string } | null;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createBranch = async (data: BranchInput): Promise<Branch> => {
  const { data: row, error } = await supabase
    .from('branches')
    .insert({
      name: data.name,
      active: data.active ?? true,
      kitchen_user_id: data.kitchenUserId ?? null,
      menu_user_id: data.menuUserId ?? null,
      kitchen_credentials: data.kitchenCredentials ?? null,
      menu_credentials: data.menuCredentials ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToBranch(row);
};

export const updateBranch = async (
  branchId: string,
  data: Partial<BranchInput>,
): Promise<void> => {
  const update: Record<string, any> = {};
  if (data.name               !== undefined) update.name                = data.name;
  if (data.active             !== undefined) update.active              = data.active;
  if (data.kitchenUserId      !== undefined) update.kitchen_user_id     = data.kitchenUserId;
  if (data.menuUserId         !== undefined) update.menu_user_id        = data.menuUserId;
  if (data.kitchenCredentials !== undefined) update.kitchen_credentials = data.kitchenCredentials;
  if (data.menuCredentials    !== undefined) update.menu_credentials    = data.menuCredentials;

  const { error } = await supabase.from('branches').update(update).eq('id', branchId);
  if (error) throw error;
};

export const getBranches = async (): Promise<Branch[]> => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToBranch);
};

export const deleteBranch = async (branchId: string): Promise<void> => {
  // Cascade delete is handled by FK constraints in schema.sql
  const { error } = await supabase.from('branches').delete().eq('id', branchId);
  if (error) throw error;
};

export const subscribeToBranches = (
  callback: (branches: Branch[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  getBranches().then(callback).catch(e => onError?.(e));

  const channel = supabase
    .channel('branches:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, async () => {
      try { callback(await getBranches()); }
      catch (e) { onError?.(e as Error); }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};
