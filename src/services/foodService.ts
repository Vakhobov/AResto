/**
 * foodService.ts  — Supabase
 * ──────────────────────────
 * CRUD + realtime for the `foods` table.
 * All queries are scoped by branch_id (enforced by RLS too).
 */
import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/types/kiosk';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Row → domain ─────────────────────────────────────────────────────────────

const rowToMenuItem = (row: any): MenuItem => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  price: Number(row.price),
  image: row.image_url ?? '',
  category: row.category_id ?? '',
  modelUrl: row.model_3d_url ?? undefined,
  hasAR: Boolean(row.ar_enabled),
  available: Boolean(row.available),
  ingredients: row.ingredients ?? undefined,
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createFood = async (
  branchId: string,
  food: Omit<MenuItem, 'id'>,
): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('foods')
    .insert({
      branch_id: branchId,
      category_id: food.category,
      name: food.name,
      description: food.description ?? null,
      price: food.price,
      image_url: food.image ?? '',
      model_3d_url: food.modelUrl ?? null,
      ar_enabled: food.hasAR ?? false,
      available: food.available ?? true,
      ingredients: food.ingredients ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToMenuItem(data);
};

export const updateFood = async (
  branchId: string,
  foodId: string,
  food: Partial<Omit<MenuItem, 'id'>>,
): Promise<void> => {
  const update: Record<string, any> = {};
  if (food.name        !== undefined) update.name         = food.name;
  if (food.description !== undefined) update.description  = food.description;
  if (food.price       !== undefined) update.price        = food.price;
  if (food.category    !== undefined) update.category_id  = food.category;
  if (food.image       !== undefined) update.image_url    = food.image;
  if (food.modelUrl    !== undefined) update.model_3d_url = food.modelUrl;
  if (food.hasAR       !== undefined) update.ar_enabled   = food.hasAR;
  if (food.available   !== undefined) update.available    = food.available;
  if (food.ingredients !== undefined) update.ingredients  = food.ingredients;

  const { error } = await supabase
    .from('foods')
    .update(update)
    .eq('id', foodId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

export const deleteFood = async (branchId: string, foodId: string): Promise<void> => {
  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', foodId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getFoods = async (branchId: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToMenuItem);
};

// ─── Realtime subscription ────────────────────────────────────────────────────

export const subscribeToFoods = (
  branchId: string,
  callback: (foods: MenuItem[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  // Initial fetch
  getFoods(branchId).then(callback).catch(e => onError?.(e));

  const channel: RealtimeChannel = supabase
    .channel(`foods:${branchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'foods', filter: `branch_id=eq.${branchId}` },
      async () => {
        try {
          const foods = await getFoods(branchId);
          callback(foods);
        } catch (e) {
          onError?.(e as Error);
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};