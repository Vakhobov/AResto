/**
 * shiftService.ts  — Supabase
 * ────────────────────────────
 * CRUD + realtime for the `shifts` table.
 * Uses supabase.rpc('apply_shift_order_summary') for atomic shift updates.
 */
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { CartItem } from '@/types/kiosk';

export type ShiftStatus = 'open' | 'closed';

export interface PaymentSummary {
  cash: number;
  card: number;
  nfc: number;
  click: number;
  payme: number;
  uzum: number;
  [key: string]: number;
}

export interface SoldItemsSummary {
  [itemName: string]: number;
}

export interface Shift {
  id: string;
  branchId: string;
  openedBy: string;
  closedBy?: string;
  status: ShiftStatus;
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
  totalOrders: number;
  totalRevenue: number;
  paymentSummary: PaymentSummary;
  soldItemsSummary: SoldItemsSummary;
}

// ─── Row → domain ─────────────────────────────────────────────────────────────

const emptyPayment = (): PaymentSummary => ({
  cash: 0, card: 0, nfc: 0, click: 0, payme: 0, uzum: 0,
});

const rowToShift = (row: any): Shift => ({
  id: row.id,
  branchId: row.branch_id,
  openedBy: row.opened_by,
  closedBy: row.closed_by ?? undefined,
  status: row.status as ShiftStatus,
  openedAt: new Date(row.opened_at),
  closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
  notes: row.notes ?? undefined,
  totalOrders: Number(row.total_orders ?? 0),
  totalRevenue: Number(row.total_revenue ?? 0),
  paymentSummary: (row.payment_summary as PaymentSummary) ?? emptyPayment(),
  soldItemsSummary: (row.sold_items_summary as SoldItemsSummary) ?? {},
});

// ─── Open / close ─────────────────────────────────────────────────────────────

export interface OpenShiftInput {
  branchId: string;
  openedBy: string;
  notes?: string;
}

export const openShift = async (input: OpenShiftInput): Promise<Shift> => {
  // Guard: no double-open
  const existing = await getActiveShift(input.branchId);
  if (existing) throw new Error('Bu filial uchun allaqachon ochiq smena mavjud');

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      branch_id: input.branchId,
      opened_by: input.openedBy,
      status: 'open',
      notes: input.notes ?? null,
      total_orders: 0,
      total_revenue: 0,
      payment_summary: emptyPayment(),
      sold_items_summary: {},
    })
    .select()
    .single();

  if (error) throw error;
  return rowToShift(data);
};

export const closeShift = async (
  shiftId: string,
  closedBy: string,
  notes?: string,
): Promise<void> => {
  const update: Record<string, any> = {
    status: 'closed',
    closed_by: closedBy,
    closed_at: new Date().toISOString(),
  };
  if (notes) update.notes = notes;

  const { error } = await supabase.from('shifts').update(update).eq('id', shiftId);
  if (error) throw error;
};

// ─── Update shift totals on order ─────────────────────────────────────────────

export const updateShiftOnOrder = async (
  shiftId: string,
  orderTotal: number,
  paymentMethod: string,
  items: CartItem[],
): Promise<void> => {
  const { error } = await supabase.rpc('apply_shift_order_summary', {
    p_shift_id: shiftId,
    p_order_total: orderTotal,
    p_payment_method: paymentMethod,
    p_items: items.map(i => ({ name: i.name, quantity: i.quantity })),
  });
  if (error) throw error;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getActiveShift = async (branchId: string): Promise<Shift | null> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToShift(data) : null;
};

export const getShifts = async (branchId: string | null): Promise<Shift[]> => {
  let q = supabase.from('shifts').select('*').order('opened_at', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToShift);
};

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export const subscribeToActiveShift = (
  branchId: string | null,
  callback: (shift: Shift | null) => void,
  onError?: (err: Error) => void,
): (() => void) => {

  const fetchAndNotify = async () => {
    console.log('[shiftService] fetchAndNotify started. branchId=', branchId);
    try {
      if (!branchId) {
        // SuperAdmin: get any open shift
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        console.log('[shiftService] SuperAdmin shift fetch result:', { data, error });
        if (error) throw error;
        callback(data ? rowToShift(data) : null);
      } else {
        const shift = await getActiveShift(branchId);
        console.log('[shiftService] Branch shift fetch result:', shift);
        callback(shift);
      }
    } catch (e) {
      console.error('[shiftService] fetchAndNotify error:', e);
      onError?.(e as Error);
    }
  };

  // Initial fetch
  fetchAndNotify();

  const filter = branchId ? `branch_id=eq.${branchId}` : undefined;
  const channelOpts: any = { event: '*', schema: 'public', table: 'shifts' };
  if (filter) channelOpts.filter = filter;

  const channel: RealtimeChannel = supabase
    .channel(`shifts:active:${branchId ?? 'all'}`)
    .on('postgres_changes', channelOpts, fetchAndNotify)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

export const subscribeToShifts = (
  branchId: string | null,
  callback: (shifts: Shift[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const fetchAndNotify = async () => {
    try {
      const shifts = await getShifts(branchId);
      callback(shifts);
    } catch (e) {
      onError?.(e as Error);
    }
  };

  fetchAndNotify();

  const channelOpts: any = { event: '*', schema: 'public', table: 'shifts' };
  if (branchId) channelOpts.filter = `branch_id=eq.${branchId}`;

  const channel: RealtimeChannel = supabase
    .channel(`shifts:all:${branchId ?? 'all'}`)
    .on('postgres_changes', channelOpts, fetchAndNotify)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};
