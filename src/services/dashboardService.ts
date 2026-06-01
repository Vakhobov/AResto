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

type StatsRpcResponse = {
  total_revenue: number;
  total_orders: number;
  avg_order: number;
  cancelled_orders: number;
  paid_orders: number;
  dine_in_count: number;
  take_out_count: number;
  active_tables: number;
  total_tables: number;
};

type HourlyRow = {
  hour: number;
  revenue: number;
  order_count: number;
};

type DailyRow = {
  date: string;
  revenue: number;
  order_count: number;
};

type PaymentRow = {
  payment_method: string;
  total_amount: number;
  order_count: number;
};

type ProductRow = {
  food_id: string;
  name: string;
  image_url: string;
  total_quantity: number;
  total_revenue: number;
};

const PM_LABELS: Record<string, string> = {
  cash: 'Naqd',
  click: 'Click',
  payme: 'Payme',
  uzum: 'Uzum',
  card: 'Karta',
  nfc: 'NFC',
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

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

const getDaysForRangeKey = (key: DashboardRangeKey) => {
  switch (key) {
    case '7d': return 6;
    case '30d': return 29;
    case '3m': return 89;
    case 'year': return 364;
    default: return undefined;
  }
};

export const getDashboardAnalytics = async (
  branchId: string,
  range: DateRange,
  rangeKey: DashboardRangeKey,
): Promise<DashboardAnalyticsData> => {
  const prev = previousRange(range);
  const dateString = formatDate(range.start);
  const useHourlyRpc = rangeKey === 'today' || rangeKey === 'yesterday' || (
    rangeKey === 'custom' && formatDate(range.start) === formatDate(range.end)
  );
  const useDailyRevenueRpc = getDaysForRangeKey(rangeKey) !== undefined;

  const statsPromise = supabase.rpc<StatsRpcResponse>('get_branch_stats', {
    p_branch_id: branchId,
    p_from: range.start.toISOString(),
    p_to: range.end.toISOString(),
  });

  const paymentsPromise = supabase.rpc<PaymentRow>('get_payment_breakdown', {
    p_branch_id: branchId,
    p_from: range.start.toISOString(),
    p_to: range.end.toISOString(),
  });

  const productsPromise = supabase.rpc<ProductRow>('get_top_products', {
    p_branch_id: branchId,
    p_from: range.start.toISOString(),
    p_to: range.end.toISOString(),
    p_limit: 5,
  });

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

  const [statsRes, paymentsRes, productsRes, ordersRes, prevOrdersRes, itemsRes, tablesRes] = await Promise.all([
    statsPromise,
    paymentsPromise,
    productsPromise,
    ordersQ,
    prevOrdersQ,
    itemsQ,
    tablesQ,
  ]);

  if (statsRes.error) throw statsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (productsRes.error) throw productsRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (prevOrdersRes.error) throw prevOrdersRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (tablesRes.error) throw tablesRes.error;

  const stats = statsRes.data ?? {
    total_revenue: 0,
    total_orders: 0,
    avg_order: 0,
    cancelled_orders: 0,
    paid_orders: 0,
    dine_in_count: 0,
    take_out_count: 0,
    active_tables: 0,
    total_tables: 0,
  };

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const prevOrders = (prevOrdersRes.data ?? []) as Array<{ total: number; status: string }>;
  const orderItems = (itemsRes.data ?? []) as Array<{ id: string; name: string; image_url: string; quantity: number; price: number }>;
  const tables = tablesRes.data ?? [];

  const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const prevCancelled = prevOrders.filter((o) => o.status === 'cancelled').length;

  const paymentMethods = (paymentsRes.data ?? []) as PaymentRow[];
  const bestSellingFoods = (productsRes.data ?? []) as ProductRow[];

  const paymentMap = new Map<string, { count: number; amount: number }>();
  paymentMethods.forEach((row) => {
    const key = row.payment_method ?? 'unknown';
    paymentMap.set(key, { count: Number(row.order_count ?? 0), amount: Number(row.total_amount ?? 0) });
  });

  const foodsMap = new Map<string, { id: string; name: string; imageUrl: string; quantity: number; revenue: number }>();
  orderItems.forEach((item) => {
    const key = item.name;
    if (!foodsMap.has(key)) {
      foodsMap.set(key, { id: item.food_id ?? item.id, name: item.name, imageUrl: item.image_url, quantity: 0, revenue: 0 });
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

  const getHourlySeries = async () => {
    const hourlyRes = await supabase.rpc<HourlyRow>('get_hourly_revenue', {
      p_branch_id: branchId,
      p_date: dateString,
    });
    if (hourlyRes.error) throw hourlyRes.error;

    const rows = hourlyRes.data ?? [];
    const revenueSeries = rows.map((row) => ({ label: `${String(row.hour).padStart(2, '0')}:00`, revenue: Number(row.revenue ?? 0) }));
    const ordersSeries = rows.map((row) => ({ label: `${String(row.hour).padStart(2, '0')}:00`, orders: Number(row.order_count ?? 0) }));
    return { revenueSeries, ordersSeries };
  };

  const getBusyHours = async () => {
    const activityRes = await supabase.rpc<HourlyRow>('get_hourly_activity', {
      p_branch_id: branchId,
      p_date: dateString,
    });
    if (activityRes.error) throw activityRes.error;

    return (activityRes.data ?? []).map((row) => ({ hour: Number(row.hour), orders: Number(row.order_count ?? 0), revenue: Number(row.revenue ?? 0) }));
  };

  const getDailySeries = async () => {
    const days = getDaysForRangeKey(rangeKey);
    if (days === undefined) {
      return buildSeries(orders, range);
    }

    const dailyRes = await supabase.rpc<DailyRow>('get_daily_revenue', {
      p_branch_id: branchId,
      p_days: days,
    });
    if (dailyRes.error) throw dailyRes.error;

    const rows = dailyRes.data ?? [];
    return {
      revenueSeries: rows.map((row) => ({ label: row.date, revenue: Number(row.revenue ?? 0) })),
      ordersSeries: rows.map((row) => ({ label: row.date, orders: Number(row.order_count ?? 0) })),
    };
  };

  const { revenueSeries, ordersSeries } = useHourlyRpc
    ? await getHourlySeries()
    : await getDailySeries();

  const busyHours = useHourlyRpc ? await getBusyHours() : Array.from(busyHoursMap.entries()).map(([hour, v]) => ({ hour, orders: v.orders, revenue: v.revenue }));

  return {
    kpis: {
      revenue: { value: stats.total_revenue ?? 0, changePercent: pct(revenue, prevRevenue) },
      orders: { value: stats.total_orders ?? 0, changePercent: pct(stats.total_orders ?? 0, prevOrders.length) },
      averageOrderValue: { value: stats.avg_order ?? 0, changePercent: pct(stats.avg_order ?? 0, prevOrders.length ? prevRevenue / prevOrders.length : 0) },
      cancelledOrders: { value: stats.cancelled_orders ?? 0, changePercent: pct(stats.cancelled_orders ?? 0, prevCancelled) },
      activeTables: {
        occupied: stats.active_tables ?? 0,
        total: stats.total_tables ?? 0,
      },
    },
    revenueSeries,
    ordersSeries,
    paymentMethods: Array.from(paymentMap.entries()).map(([k, v]) => ({ name: PM_LABELS[k] ?? k, value: v.count, amount: v.amount })),
    bestSellingFoods: bestSellingFoods.map((row) => ({
      id: row.food_id,
      name: row.name,
      imageUrl: row.image_url,
      quantity: Number(row.total_quantity ?? 0),
      revenue: Number(row.total_revenue ?? 0),
    })),
    busyHours,
    dailyComparison,
  };
};
