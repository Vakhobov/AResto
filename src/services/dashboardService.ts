import { supabase } from '@/lib/supabase';
import type {
  DashboardAnalyticsData,
  DateRange,
  DailyComparisonRow,
  DashboardRangeKey,
} from '@/types/dashboard';

type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  payment_method: string | null;
};

const PM_LABELS: Record<string, string> = {
  cash: 'Naqd',
  click: 'Click',
  payme: 'Payme',
  uzum: 'Uzum',
  card: 'Karta',
  nfc: 'NFC',
};

export const resolveDateRange = (
  key: DashboardRangeKey,
  custom?: { start?: string; end?: string },
): DateRange => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (key === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (key === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (key === '7d') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (key === '30d') {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else if (key === '3m') {
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
  } else if (key === 'year') {
    start.setFullYear(start.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);
  } else {
    const s = custom?.start ? new Date(custom.start) : now;
    const e = custom?.end ? new Date(custom.end) : now;
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const previousRange = ({ start, end }: DateRange): DateRange => {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration - 1),
    end: new Date(start.getTime() - 1),
  };
};

const pct = (current: number, prev: number) => {
  if (!prev && !current) return 0;
  if (!prev) return 100;
  return ((current - prev) / prev) * 100;
};

const buildSeries = (orders: OrderRow[], range: DateRange) => {
  const hours = new Map<number, { revenue: number; orders: number }>();
  const days = new Map<string, { revenue: number; orders: number }>();

  for (let i = 0; i < 24; i += 1) hours.set(i, { revenue: 0, orders: 0 });

  orders.forEach((o) => {
    const d = new Date(o.created_at);
    const h = d.getHours();
    const key = d.toLocaleDateString('en-CA');
    const amount = Number(o.total ?? 0);

    const hourRow = hours.get(h);
    if (hourRow) {
      hourRow.revenue += amount;
      hourRow.orders += 1;
    }
    if (!days.has(key)) days.set(key, { revenue: 0, orders: 0 });
    const dayRow = days.get(key)!;
    dayRow.revenue += amount;
    dayRow.orders += 1;
  });

  const isDaily = range.end.getTime() - range.start.getTime() <= 36 * 60 * 60 * 1000;
  if (isDaily) {
    return {
      revenueSeries: Array.from(hours.entries()).map(([hour, v]) => ({ label: `${String(hour).padStart(2, '0')}:00`, revenue: v.revenue })),
      ordersSeries: Array.from(hours.entries()).map(([hour, v]) => ({ label: `${String(hour).padStart(2, '0')}:00`, orders: v.orders })),
    };
  }
  return {
    revenueSeries: Array.from(days.entries()).map(([label, v]) => ({ label, revenue: v.revenue })),
    ordersSeries: Array.from(days.entries()).map(([label, v]) => ({ label, orders: v.orders })),
  };
};

export const getDashboardAnalytics = async (
  branchId: string,
  range: DateRange,
): Promise<DashboardAnalyticsData> => {
  const prev = previousRange(range);

  const ordersQ = supabase
    .from('orders')
    .select('id, created_at, total, status, payment_method')
    .eq('branch_id', branchId)
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString());

  const prevOrdersQ = supabase
    .from('orders')
    .select('id, total, status')
    .eq('branch_id', branchId)
    .gte('created_at', prev.start.toISOString())
    .lte('created_at', prev.end.toISOString());

  const itemsQ = supabase
    .from('order_items')
    .select('id, name, image_url, quantity, price, orders!inner(branch_id, created_at)')
    .eq('orders.branch_id', branchId)
    .gte('orders.created_at', range.start.toISOString())
    .lte('orders.created_at', range.end.toISOString());

  const tablesQ = supabase
    .from('restaurant_tables')
    .select('id, status')
    .eq('branch_id', branchId)
    .eq('active', true);

  const [ordersRes, prevOrdersRes, itemsRes, tablesRes] = await Promise.all([ordersQ, prevOrdersQ, itemsQ, tablesQ]);
  if (ordersRes.error) throw ordersRes.error;
  if (prevOrdersRes.error) throw prevOrdersRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (tablesRes.error) throw tablesRes.error;

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const prevOrders = (prevOrdersRes.data ?? []) as Array<{ total: number; status: string }>;
  const orderItems = (itemsRes.data ?? []) as Array<{ id: string; name: string; image_url: string; quantity: number; price: number }>;
  const tables = tablesRes.data ?? [];

  const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const prevCancelled = prevOrders.filter((o) => o.status === 'cancelled').length;

  const paymentMap = new Map<string, { count: number; amount: number }>();
  orders.forEach((o) => {
    const pm = o.payment_method ?? 'cash';
    if (!paymentMap.has(pm)) paymentMap.set(pm, { count: 0, amount: 0 });
    const row = paymentMap.get(pm)!;
    row.count += 1;
    row.amount += Number(o.total ?? 0);
  });

  const foodsMap = new Map<string, { id: string; name: string; imageUrl: string; quantity: number; revenue: number }>();
  orderItems.forEach((item) => {
    const key = item.name;
    if (!foodsMap.has(key)) {
      foodsMap.set(key, { id: item.id, name: item.name, imageUrl: item.image_url, quantity: 0, revenue: 0 });
    }
    const row = foodsMap.get(key)!;
    row.quantity += Number(item.quantity ?? 0);
    row.revenue += Number(item.price ?? 0) * Number(item.quantity ?? 0);
  });

  const busyHoursMap = new Map<number, { orders: number; revenue: number }>();
  for (let i = 0; i < 24; i += 1) busyHoursMap.set(i, { orders: 0, revenue: 0 });
  orders.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    const row = busyHoursMap.get(h)!;
    row.orders += 1;
    row.revenue += Number(o.total ?? 0);
  });

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const comparisonRanges: Array<{ label: string; start: Date; end: Date }> = [
    { label: 'Bugun', start: new Date(new Date(now).setHours(0, 0, 0, 0)), end: new Date(new Date(now).setHours(23, 59, 59, 999)) },
    { label: 'Kecha', start: new Date(new Date(now.getTime() - oneDay).setHours(0, 0, 0, 0)), end: new Date(new Date(now.getTime() - oneDay).setHours(23, 59, 59, 999)) },
    { label: "O'tgan hafta (shu kun)", start: new Date(new Date(now.getTime() - 7 * oneDay).setHours(0, 0, 0, 0)), end: new Date(new Date(now.getTime() - 7 * oneDay).setHours(23, 59, 59, 999)) },
    { label: "O'tgan oy (shu kun)", start: new Date(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0)), end: new Date(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)) },
  ];

  const dailyComparison: DailyComparisonRow[] = comparisonRanges.map((r, index, arr) => {
    const value = orders
      .filter((o) => {
        const d = new Date(o.created_at).getTime();
        return d >= r.start.getTime() && d <= r.end.getTime();
      })
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    const prevValue = index === arr.length - 1 ? 0 : orders
      .filter((o) => {
        const d = new Date(o.created_at).getTime();
        return d >= arr[index + 1].start.getTime() && d <= arr[index + 1].end.getTime();
      })
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    return { label: r.label, value, changePercent: pct(value, prevValue) };
  });

  const { revenueSeries, ordersSeries } = buildSeries(orders, range);
  return {
    kpis: {
      revenue: { value: revenue, changePercent: pct(revenue, prevRevenue) },
      orders: { value: orders.length, changePercent: pct(orders.length, prevOrders.length) },
      averageOrderValue: { value: orders.length ? revenue / orders.length : 0, changePercent: pct(orders.length ? revenue / orders.length : 0, prevOrders.length ? prevRevenue / prevOrders.length : 0) },
      cancelledOrders: { value: cancelled, changePercent: pct(cancelled, prevCancelled) },
      activeTables: {
        occupied: tables.filter((t) => t.status === 'occupied').length,
        total: tables.length,
      },
    },
    revenueSeries,
    ordersSeries,
    paymentMethods: Array.from(paymentMap.entries()).map(([k, v]) => ({ name: PM_LABELS[k] ?? k, value: v.count, amount: v.amount })),
    bestSellingFoods: Array.from(foodsMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    busyHours: Array.from(busyHoursMap.entries()).map(([hour, v]) => ({ hour, orders: v.orders, revenue: v.revenue })),
    dailyComparison,
  };
};
