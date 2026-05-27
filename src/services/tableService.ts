/**
 * tableService.ts  — Supabase
 * ────────────────────────────
 * CRUD + realtime for the `restaurant_tables` table.
 */
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'inactive';

export interface RestaurantTable {
  id: string;
  number: number;
  name?: string;
  status: TableStatus;
  currentOrderId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TableInput = Omit<RestaurantTable, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Row → domain ─────────────────────────────────────────────────────────────

const rowToTable = (row: any): RestaurantTable => ({
  id: row.id,
  number: Number(row.number),
  name: row.name ?? undefined,
  status: row.status as TableStatus,
  currentOrderId: row.current_order_id ?? undefined,
  active: Boolean(row.active),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createTable = async (
  branchId: string,
  tableData: TableInput,
): Promise<RestaurantTable> => {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .insert({
      branch_id: branchId,
      number: tableData.number,
      name: tableData.name ?? null,
      status: tableData.status ?? 'available',
      current_order_id: tableData.currentOrderId ?? null,
      active: tableData.active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToTable(data);
};

export const updateTable = async (
  branchId: string,
  tableId: string,
  tableData: Partial<TableInput>,
): Promise<void> => {
  const update: Record<string, any> = {};
  if (tableData.number         !== undefined) update.number           = tableData.number;
  if (tableData.name           !== undefined) update.name             = tableData.name;
  if (tableData.status         !== undefined) update.status           = tableData.status;
  if (tableData.currentOrderId !== undefined) update.current_order_id = tableData.currentOrderId ?? null;
  if (tableData.active         !== undefined) update.active           = tableData.active;

  const { error } = await supabase
    .from('restaurant_tables')
    .update(update)
    .eq('id', tableId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

export const deleteTable = async (branchId: string, tableId: string): Promise<void> => {
  const { error } = await supabase
    .from('restaurant_tables')
    .delete()
    .eq('id', tableId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getTables = async (branchId: string): Promise<RestaurantTable[]> => {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('branch_id', branchId)
    .order('number', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToTable);
};

const getTableByNumber = async (
  branchId: string,
  tableNumber: number,
): Promise<RestaurantTable | null> => {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('branch_id', branchId)
    .eq('number', tableNumber)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToTable(data) : null;
};

export const markTableOccupied = async (
  branchId: string,
  tableNumber: number,
  orderId: string,
): Promise<void> => {
  // Use the DB function for atomicity + RLS enforcement
  const { error } = await supabase.rpc('mark_table_occupied', {
    p_branch_id: branchId,
    p_table_number: tableNumber,
    p_order_id: orderId,
  });
  if (error) throw error;
};

export const markTableAvailable = async (
  branchId: string,
  tableNumber: number,
): Promise<void> => {
  const table = await getTableByNumber(branchId, tableNumber);
  if (!table) return;
  await updateTable(branchId, table.id, { status: 'available', currentOrderId: undefined });
};

// ─── Realtime subscription ────────────────────────────────────────────────────

export const subscribeToTables = (
  branchId: string,
  callback: (tables: RestaurantTable[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  getTables(branchId).then(callback).catch(e => onError?.(e));

  const channel: RealtimeChannel = supabase
    .channel(`tables:${branchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'restaurant_tables', filter: `branch_id=eq.${branchId}` },
      async () => {
        try {
          const tables = await getTables(branchId);
          callback(tables);
        } catch (e) {
          onError?.(e as Error);
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};