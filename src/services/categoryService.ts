/**
 * categoryService.ts  — Supabase
 * ───────────────────────────────
 * CRUD + realtime for the `categories` table.
 */
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CategoryInput = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Row → domain ─────────────────────────────────────────────────────────────

const rowToCategory = (row: any): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon ?? '',
  sortOrder: row.sort_order ?? 0,
  active: Boolean(row.active),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createCategory = async (
  branchId: string,
  data: CategoryInput,
): Promise<Category> => {
  const id = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

  const { data: row, error } = await supabase
    .from('categories')
    .insert({
      id,
      branch_id: branchId,
      name: data.name,
      icon: data.icon ?? '',
      sort_order: data.sortOrder ?? 0,
      active: data.active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToCategory(row);
};

export const updateCategory = async (
  branchId: string,
  categoryId: string,
  data: Partial<CategoryInput>,
): Promise<void> => {
  const update: Record<string, any> = {};
  if (data.name      !== undefined) update.name       = data.name;
  if (data.icon      !== undefined) update.icon       = data.icon;
  if (data.sortOrder !== undefined) update.sort_order = data.sortOrder;
  if (data.active    !== undefined) update.active     = data.active;

  const { error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', categoryId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

export const deleteCategory = async (branchId: string, categoryId: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getCategories = async (branchId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('branch_id', branchId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToCategory);
};

// ─── Realtime subscription ────────────────────────────────────────────────────

export const subscribeToCategories = (
  branchId: string,
  callback: (cats: Category[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  getCategories(branchId).then(callback).catch(e => onError?.(e));

  const channel: RealtimeChannel = supabase
    .channel(`categories:${branchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: `branch_id=eq.${branchId}` },
      async () => {
        try {
          const cats = await getCategories(branchId);
          callback(cats);
        } catch (e) {
          onError?.(e as Error);
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};