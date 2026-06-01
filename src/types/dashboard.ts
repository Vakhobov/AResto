export type DashboardRangeKey = 'today' | 'yesterday' | '7d' | '30d' | '3m' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface KpiMetric {
  value: number;
  changePercent: number;
}

export interface DashboardKpis {
  revenue: KpiMetric;
  orders: KpiMetric;
  averageOrderValue: KpiMetric;
  cancelledOrders: KpiMetric;
  activeTables: {
    occupied: number;
    total: number;
  };
}

export interface RevenuePoint {
  label: string;
  revenue: number;
}

export interface OrdersPoint {
  label: string;
  orders: number;
}

export interface PaymentMethodSlice {
  name: string;
  value: number;
  amount: number;
}

export interface BestSellingFoodItem {
  id: string;
  name: string;
  imageUrl: string;
  quantity: number;
  revenue: number;
}

export interface BusyHourRow {
  hour: number;
  orders: number;
  revenue: number;
}

export interface DailyComparisonRow {
  label: string;
  value: number;
  changePercent: number;
}

export interface DashboardAnalyticsData {
  kpis: DashboardKpis;
  revenueSeries: RevenuePoint[];
  ordersSeries: OrdersPoint[];
  paymentMethods: PaymentMethodSlice[];
  bestSellingFoods: BestSellingFoodItem[];
  busyHours: BusyHourRow[];
  dailyComparison: DailyComparisonRow[];
}
