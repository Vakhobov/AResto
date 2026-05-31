/**
 * dashboardService.ts — Supabase
 * ────────────────────────────────
 * Analytics queries for the Admin Dashboard.
 * Fetches revenue stats, order counts, top items, payment breakdown, etc.
 */
import { supabase } from '@/lib/supabase';
import { Shift } from '@/services/shiftService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  averageOrderValue: number;
  totalMenuItems: number;
  activeCategories: number;
  pendingOrders: number;
}

export interface OrdersByStatus {
  new: number;
  preparing: number;
  ready: number;
  served: number;
  completed: number;
  cancelled: number;
}

export interface PaymentBreakdown {
  cash: number;
  card: number;
  nfc: number;
  click: number;
  payme: number;
  uzum: number;
}

export interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: number;
  total: number;
  status: string;
  orderType: string;
  paymentMethod: string | null;
  tableNumber: number | null;
  itemCount: number;
  createdAt: Date;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const getDashboardStats = async (branchId: string): Promise<DashboardStats> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today's orders
  const { data: todayOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id, total, status')
    .eq('branch_id', branchId)
    .gte('created_at', todayStart.toISOString());

  if (ordersError) throw ordersError;

  const orders = todayOrders ?? [];
  const completedOrders = orders.filter(o => !['cancelled'].includes(o.status));
  const todayRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const averageOrderValue = completedOrders.length > 0 ? todayRevenue / completedOrders.length : 0;
  const pendingOrders = orders.filter(o => ['new', 'pending', 'preparing'].includes(o.status)).length;

  // Menu items count
  const { count: menuCount } = await supabase
    .from('foods')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  // Active categories count
  const { count: catCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('active', true);

  return {
    todayRevenue,
    todayOrders: orders.length,
    averageOrderValue,
    totalMenuItems: menuCount ?? 0,
    activeCategories: catCount ?? 0,
    pendingOrders,
  };
};

// ─── Orders by Status ─────────────────────────────────────────────────────────

export const getOrdersByStatus = async (branchId: string): Promise<OrdersByStatus> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('branch_id', branchId)
    .gte('created_at', todayStart.toISOString());

  if (error) throw error;

  const result: OrdersByStatus = {
    new: 0, preparing: 0, ready: 0, served: 0, completed: 0, cancelled: 0,
  };

  (data ?? []).forEach(row => {
    const s = row.status as keyof OrdersByStatus;
    if (s in result) result[s]++;
    // Map 'pending' to 'new' for display
    if (row.status === 'pending') result.new++;
  });

  return result;
};

// ─── Payment Breakdown ────────────────────────────────────────────────────────

export const getPaymentBreakdown = async (branchId: string): Promise<PaymentBreakdown> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('payment_method, total')
    .eq('branch_id', branchId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'eq', 'cancelled');

  if (error) throw error;

  const result: PaymentBreakdown = {
    cash: 0, card: 0, nfc: 0, click: 0, payme: 0, uzum: 0,
  };

  (data ?? []).forEach(row => {
    const method = row.payment_method as keyof PaymentBreakdown;
    if (method && method in result) {
      result[method] += Number(row.total);
    }
  });

  return result;
};

// ─── Top Selling Items ────────────────────────────────────────────────────────

export const getTopSellingItems = async (branchId: string, limit = 10): Promise<TopSellingItem[]> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get today's order IDs
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('branch_id', branchId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'eq', 'cancelled');

  if (ordersError) throw ordersError;

  const orderIds = (orders ?? []).map(o => o.id);
  if (orderIds.length === 0) return [];

  // Get order items for those orders
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('name, quantity, price')
    .in('order_id', orderIds);

  if (itemsError) throw itemsError;

  // Aggregate by name
  const itemMap = new Map<string, { quantity: number; revenue: number }>();
  (items ?? []).forEach(item => {
    const existing = itemMap.get(item.name) ?? { quantity: 0, revenue: 0 };
    existing.quantity += Number(item.quantity);
    existing.revenue += Number(item.price) * Number(item.quantity);
    itemMap.set(item.name, existing);
  });

  return Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
};

// ─── Recent Orders ────────────────────────────────────────────────────────────

export const getRecentOrders = async (branchId: string, limit = 10): Promise<RecentOrder[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, total, status, order_type, payment_method, table_number, created_at, order_items(id)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    orderNumber: Number(row.order_number),
    total: Number(row.total),
    status: row.status,
    orderType: row.order_type,
    paymentMethod: row.payment_method,
    tableNumber: row.table_number,
    itemCount: (row.order_items as any[])?.length ?? 0,
    createdAt: new Date(row.created_at),
  }));
};

// ─── Weekly Revenue ───────────────────────────────────────────────────────────

export const getWeeklyRevenue = async (branchId: string): Promise<DailyRevenue[]> => {
  const result: DailyRevenue[] = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('orders')
      .select('total')
      .eq('branch_id', branchId)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString())
      .not('status', 'eq', 'cancelled');

    if (error) throw error;

    const orders = data ?? [];
    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

    result.push({
      date: dayStart.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }),
      revenue,
      orders: orders.length,
    });
  }

  return result;
};

// ─── Shift History (last N shifts) ────────────────────────────────────────────

export const getShiftHistory = async (branchId: string, limit = 5): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('branch_id', branchId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    branchId: row.branch_id,
    openedBy: row.opened_by,
    closedBy: row.closed_by ?? undefined,
    status: row.status as 'open' | 'closed',
    openedAt: new Date(row.opened_at),
    closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    notes: row.notes ?? undefined,
    totalOrders: Number(row.total_orders ?? 0),
    totalRevenue: Number(row.total_revenue ?? 0),
    paymentSummary: row.payment_summary ?? { cash: 0, card: 0, nfc: 0, click: 0, payme: 0, uzum: 0 },
    soldItemsSummary: row.sold_items_summary ?? {},
  }));
};
