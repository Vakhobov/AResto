import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  Clock,
  CreditCard,
  BarChart3,
  RefreshCw,
  Loader2,
  UtensilsCrossed,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Banknote,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/currency';
import {
  getDashboardStats,
  getOrdersByStatus,
  getPaymentBreakdown,
  getTopSellingItems,
  getRecentOrders,
  getWeeklyRevenue,
  DashboardStats,
  OrdersByStatus,
  PaymentBreakdown,
  TopSellingItem,
  RecentOrder,
  DailyRevenue,
} from '@/services/dashboardService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  branchId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (d: Date) =>
  d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'Yangi', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  pending: { label: 'Kutilmoqda', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  preparing: { label: 'Tayyorlanmoqda', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  ready: { label: 'Tayyor', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  served: { label: 'Yetkazildi', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  completed: { label: 'Tugatildi', color: 'bg-gray-500/20 text-gray-600 border-gray-500/30' },
  cancelled: { label: 'Bekor', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
};

const paymentIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  nfc: <Wifi className="w-4 h-4" />,
  click: <Smartphone className="w-4 h-4" />,
  payme: <Smartphone className="w-4 h-4" />,
  uzum: <Smartphone className="w-4 h-4" />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ branchId }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
  const [topItems, setTopItems] = useState<TopSellingItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async (showRefresh = false) => {
    if (!branchId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsData, statusData, paymentData, itemsData, ordersData, revenueData] =
        await Promise.all([
          getDashboardStats(branchId),
          getOrdersByStatus(branchId),
          getPaymentBreakdown(branchId),
          getTopSellingItems(branchId, 8),
          getRecentOrders(branchId, 8),
          getWeeklyRevenue(branchId),
        ]);

      setStats(statsData);
      setOrdersByStatus(statusData);
      setPaymentBreakdown(paymentData);
      setTopItems(itemsData);
      setRecentOrders(ordersData);
      setWeeklyRevenue(revenueData);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!branchId) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-2xl">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">SuperAdmin uchun dashboard mavjud emas. Filial tanlang.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
        <span className="text-muted-foreground">Dashboard yuklanmoqda...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-2xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 font-medium mb-2">Xato yuz berdi</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button onClick={() => fetchData()} variant="outline" className="rounded-xl gap-2">
          <RefreshCw className="w-4 h-4" />Qayta yuklash
        </Button>
      </div>
    );
  }

  const maxRevenue = Math.max(...weeklyRevenue.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bugungi ko'rsatkichlar</h2>
          <p className="text-xs text-muted-foreground">
            Oxirgi yangilanish: {formatTime(lastUpdated)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="rounded-xl gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Yangilash
        </Button>
      </div>

      {/* ── Key Metrics Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Bugungi daromad</p>
          <p className="text-lg font-bold text-primary">{formatPrice(stats?.todayRevenue ?? 0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Buyurtmalar</p>
          <p className="text-lg font-bold text-foreground">{stats?.todayOrders ?? 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">O'rtacha chek</p>
          <p className="text-lg font-bold text-foreground">{formatPrice(stats?.averageOrderValue ?? 0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Kutilmoqda</p>
          <p className="text-lg font-bold text-orange-500">{stats?.pendingOrders ?? 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Menyu</p>
          <p className="text-lg font-bold text-foreground">{stats?.totalMenuItems ?? 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-pink-500/15 flex items-center justify-center">
              <Layers className="w-4 h-4 text-pink-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Kategoriyalar</p>
          <p className="text-lg font-bold text-foreground">{stats?.activeCategories ?? 0}</p>
        </motion.div>
      </div>

      {/* ── Weekly Revenue Chart ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Haftalik daromad
          </h3>
        </div>
        <div className="flex items-end gap-2 h-40">
          {weeklyRevenue.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end h-28">
                <span className="text-[10px] text-muted-foreground mb-1">
                  {day.orders > 0 ? day.orders : ''}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}%` }}
                  transition={{ delay: 0.4 + idx * 0.05, type: 'spring', stiffness: 100 }}
                  className={`w-full max-w-[40px] rounded-t-lg ${
                    idx === weeklyRevenue.length - 1
                      ? 'bg-primary'
                      : 'bg-primary/30'
                  }`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{day.date}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Two Column: Orders by Status + Payment Breakdown ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orders by Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            Buyurtmalar holati
          </h3>
          <div className="space-y-3">
            {ordersByStatus && Object.entries(ordersByStatus).map(([status, count]) => {
              if (count === 0) return null;
              const config = statusLabels[status];
              if (!config) return null;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{count}</span>
                </div>
              );
            })}
            {ordersByStatus && Object.values(ordersByStatus).every(v => v === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Bugun buyurtmalar yo'q
              </p>
            )}
          </div>
        </motion.div>

        {/* Payment Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            To'lov usullari
          </h3>
          <div className="space-y-3">
            {paymentBreakdown && Object.entries(paymentBreakdown).map(([method, amount]) => {
              if (amount === 0) return null;
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {paymentIcons[method]}
                    <span className="text-sm text-muted-foreground capitalize">{method}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatPrice(amount)}</span>
                </div>
              );
            })}
            {paymentBreakdown && Object.values(paymentBreakdown).every(v => v === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Bugun to'lovlar yo'q
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Two Column: Top Items + Recent Orders ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Selling Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-muted-foreground" />
            Top mahsulotlar (bugun)
          </h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item, idx) => {
                const maxQty = topItems[0]?.quantity ?? 1;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="text-sm text-foreground truncate max-w-[140px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{item.quantity} ta</span>
                        <span className="text-xs font-medium text-primary">{formatPrice(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.quantity / maxQty) * 100}%` }}
                        transition={{ delay: 0.5 + idx * 0.05 }}
                        className="h-full bg-primary/60 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Bugun sotilgan mahsulotlar yo'q
            </p>
          )}
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            So'nggi buyurtmalar
          </h3>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map(order => {
                const config = statusLabels[order.status] ?? statusLabels.new;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-primary">#{order.orderNumber}</span>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {order.itemCount} ta · {order.orderType === 'dine-in' ? `Stol ${order.tableNumber}` : 'Olib ketish'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Buyurtmalar yo'q
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
