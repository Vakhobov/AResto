/**
 * orderService.ts  — Supabase
 * ────────────────────────────
 * CRUD + realtime for `orders` + `order_items` tables.
 * createOrder calls the `create_order_with_items` DB function which:
 *   - checks for an open shift
 *   - atomically inserts order + items + bumps shift totals
 */
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, PaymentStatus } from '@/types/kiosk';
import { normalizeOrderStatus } from '@/lib/orderStatus';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { markTablePaymentPending, markTableAvailable } from './tableService';

// ─── Row → domain ─────────────────────────────────────────────────────────────

const rowToOrder = (row: any): Order => ({
  id: row.id,
  orderNumber: Number(row.order_number ?? 0),
  items: (row.order_items ?? []).map((oi: any) => ({
    id: oi.food_id ?? oi.id,
    name: oi.name,
    price: Number(oi.price),
    quantity: Number(oi.quantity),
    image: oi.image_url ?? '',
    category: oi.category_id ?? '',
    description: oi.description ?? undefined,
    ingredients: oi.ingredients ?? undefined,
    modelUrl: oi.model_3d_url ?? undefined,
    hasAR: Boolean(oi.ar_enabled),
    isExtraOrder: Boolean(oi.is_extra_order),
    extraBatchId: oi.extra_batch_id ?? null,
    available: true,
  })),
  subtotal: Number(row.subtotal ?? row.total),
  serviceFee: Number(row.service_fee ?? 0),
  total: Number(row.total ?? 0),
  serviceType: (row.service_type ?? 'self-service') as Order['serviceType'],
  createdAt: new Date(row.created_at),
  status: normalizeOrderStatus(row.status),
  orderType: (row.order_type ?? 'take-out') as Order['orderType'],
  tableNumber: row.table_number ?? undefined,
  paymentMethod: row.payment_method ?? undefined,
  paymentStatus: (row.payment_status ?? 'unpaid') as PaymentStatus,
  shiftId: row.shift_id ?? undefined,
  paymentMode: (row.payment_mode ?? 'prepaid') as 'prepaid' | 'postpaid',
  paymentRequestedAt: row.payment_requested_at ? new Date(row.payment_requested_at) : undefined,
  paymentCompletedAt: row.payment_completed_at ? new Date(row.payment_completed_at) : undefined,
  customerPhone: row.customer_phone ?? undefined,
  phoneLast4: row.phone_last4 ?? undefined,
});

// ─── Queries ──────────────────────────────────────────────────────────────────

const ordersQuery = (branchId: string) =>
  supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: true });

export const getOrders = async (branchId: string): Promise<Order[]> => {
  const { data, error } = await ordersQuery(branchId);
  if (error) throw error;
  return (data ?? []).map(rowToOrder);
};

export const getOrderById = async (branchId: string, orderId: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('branch_id', branchId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToOrder(data) : null;
};

export const getActiveOrderByTableNumber = async (
  branchId: string,
  tableNumber: number,
): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('branch_id', branchId)
    .eq('table_number', tableNumber)
    .in('status', ['new', 'preparing', 'ready'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToOrder(data) : null;
};

export const addExtraItemsToOrder = async (
  branchId: string,
  orderId: string,
  items: Order['items'],
  subtotal: number,
  serviceFee: number,
  total: number,
): Promise<Order> => {
  console.log('addExtraItemsToOrder called with:', { branchId, orderId, items: items.length, subtotal, serviceFee, total });
  if (!branchId) throw new Error('branchId is required');
  if (!orderId) throw new Error('orderId is required');

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const orderItems = items.map(i => ({
    food_id: i.id && isUuid(i.id) ? i.id : null,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    image_url: i.image ?? '',
    category_id: i.category ?? '',
    description: i.description ?? null,
    ingredients: i.ingredients ?? null,
    model_3d_url: i.modelUrl ?? null,
    ar_enabled: i.hasAR ?? false,
  }));

  // Call the SECURITY DEFINER RPC function
  const { data, error } = await supabase.rpc('add_extra_items_to_order', {
    p_branch_id: branchId,
    p_order_id: orderId,
    p_items: orderItems,
    p_subtotal: subtotal,
    p_service_fee: serviceFee,
    p_total: total,
  });

  if (error) {
    console.error('RPC error:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Failed to add extra items: No data returned from RPC');
  }

  console.log('RPC returned order:', data.id);

  // Fetch the updated order with items
  const updatedOrder = await getOrderById(branchId, orderId);
  if (!updatedOrder) throw new Error('Failed to retrieve updated order');
  return updatedOrder;
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createOrder = async (
  branchId: string,
  orderData: Omit<Order, 'id'>,
): Promise<Order> => {
  if (!branchId) throw new Error('branchId is required');

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const items = orderData.items.map(i => ({
    food_id: i.id && isUuid(i.id) ? i.id : null,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    image_url: i.image ?? '',
    category_id: i.category ?? '',
    description: i.description ?? null,
    ingredients: i.ingredients ?? null,
    model_3d_url: i.modelUrl ?? null,
    ar_enabled: i.hasAR ?? false,
  }));

  // Use the DB function — it checks for open shift, creates order atomically
  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_branch_id: branchId,
    p_items: items,
    p_subtotal: orderData.subtotal ?? orderData.total,
    p_service_fee: orderData.serviceFee ?? 0,
    p_total: orderData.total,
    p_service_type: orderData.serviceType ?? 'self-service',
    p_order_type: orderData.orderType,
    p_table_number: orderData.tableNumber ?? null,
    p_payment_method: orderData.paymentMethod ?? null,
    p_payment_status: orderData.paymentStatus ?? 'unpaid',
    p_customer_phone: orderData.customerPhone ?? null,
    p_phone_last4: orderData.phoneLast4 ?? null,
  });

  if (error) throw error;

  // Set the payment_mode to postpaid if requested
  if (orderData.paymentMode === 'postpaid') {
    await supabase
      .from('orders')
      .update({ payment_mode: 'postpaid' })
      .eq('id', data.id);
  }

  // Fetch the full order with items
  const created = await getOrderById(branchId, data.id);
  if (!created) throw new Error('Order was created but could not be retrieved');
  return created;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateOrderStatus = async (
  branchId: string,
  orderId: string,
  status: OrderStatus,
): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ status: normalizeOrderStatus(status) })
    .eq('id', orderId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

export const updatePaymentStatus = async (
  branchId: string,
  orderId: string,
  paymentStatus: PaymentStatus,
): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus })
    .eq('id', orderId)
    .eq('branch_id', branchId);

  if (error) throw error;
};

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export const subscribeToOrders = (
  branchId: string,
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  // Initial fetch
  getOrders(branchId).then(callback).catch(e => onError?.(e));

  const channel: RealtimeChannel = supabase
    .channel(`orders:${branchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` },
      async () => {
        try {
          const orders = await getOrders(branchId);
          callback(orders);
        } catch (e) {
          onError?.(e as Error);
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

export const subscribeToOrder = (
  branchId: string,
  orderId: string,
  callback: (order: Order | null) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  getOrderById(branchId, orderId).then(callback).catch(e => onError?.(e));

  const channel: RealtimeChannel = supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      async () => {
        try {
          const order = await getOrderById(branchId, orderId);
          callback(order);
        } catch (e) {
          onError?.(e as Error);
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

export const requestCashierPayment = async (
  branchId: string,
  orderId: string,
): Promise<void> => {
  const order = await getOrderById(branchId, orderId);
  if (!order) throw new Error('Order not found');

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'pending',
      payment_requested_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('branch_id', branchId);

  if (error) throw error;

  if (order.tableNumber) {
    await markTablePaymentPending(branchId, order.tableNumber);
  }
};

export const completeCashierPayment = async (
  branchId: string,
  orderId: string,
  method: string,
  cashierId?: string,
): Promise<void> => {
  const order = await getOrderById(branchId, orderId);
  if (!order) throw new Error('Order not found');

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      payment_status: 'paid',
      payment_method: method,
      payment_completed_at: new Date().toISOString(),
      cashier_id: cashierId ?? null,
    })
    .eq('id', orderId)
    .eq('branch_id', branchId);

  if (error) throw error;

  if (order.tableNumber) {
    await markTableAvailable(branchId, order.tableNumber);
  }
};

// No-op stub kept for compatibility — offline queuing is not needed with Supabase
export const syncOfflineOrders = async (_branchId: string): Promise<void> => {};
