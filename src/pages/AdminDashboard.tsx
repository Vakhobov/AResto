import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, ChefHat, LogOut, Package, LayoutDashboard, Clock3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { DashboardCards } from '@/components/dashboard/DashboardCards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OrdersChart } from '@/components/dashboard/OrdersChart';
import { PaymentMethodsChart } from '@/components/dashboard/PaymentMethodsChart';
import { BestSellingFoods } from '@/components/dashboard/BestSellingFoods';
import { DailyComparison } from '@/components/dashboard/DailyComparison';
import { BusyHoursHeatmap } from '@/components/dashboard/BusyHoursHeatmap';
import { getDashboardAnalytics, resolveDateRange } from '@/services/dashboardService';
import type { DashboardAnalyticsData, DashboardRangeKey } from '@/types/dashboard';

const nav = [
  { label: 'Smena', icon: Clock3, to: '/admin' },
  { label: 'Menyu', icon: ChefHat, to: '/admin' },
  { label: 'Kategoriyalar', icon: Package, to: '/admin' },
  { label: 'Buyurtmalar', icon: ClipboardList, to: '/admin' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard', active: true },
];

const emptyData: DashboardAnalyticsData = {
  kpis: {
    revenue: { value: 0, changePercent: 0 },
    orders: { value: 0, changePercent: 0 },
    averageOrderValue: { value: 0, changePercent: 0 },
    cancelledOrders: { value: 0, changePercent: 0 },
    activeTables: { occupied: 0, total: 0 },
  },
  revenueSeries: [],
  ordersSeries: [],
  paymentMethods: [],
  bestSellingFoods: [],
  busyHours: [],
  dailyComparison: [],
};

const AdminDashboard = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<DashboardRangeKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardAnalyticsData>(emptyData);

  const branchId = userProfile?.branchId;
  const activeRange = useMemo(
    () => resolveDateRange(range, { start: customStart, end: customEnd }),
    [range, customStart, customEnd],
  );

  useEffect(() => {
    if (!branchId) return;
    let mounted = true;
    const fetchData = async () => {
      try {
        if (mounted) setLoading(true);
        const res = await getDashboardAnalytics(branchId, activeRange);
        if (mounted) setData(res);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [branchId, activeRange]);

  const onCustomStart = (v: string) => {
    setCustomStart(v);
    setRange('custom');
  };

  const onCustomEnd = (v: string) => {
    setCustomEnd(v);
    setRange('custom');
  };

  return (
    <div className="min-h-screen bg-black px-4 py-5 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin"><Button variant="ghost" size="icon" className="rounded-xl text-white"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-sm text-white/60">{userProfile?.branchName ?? 'Branch'} - Restoran boshqaruv paneli</p>
            </div>
          </div>
          <Button className="rounded-xl bg-orange-500 text-white hover:bg-orange-400" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>
            <LogOut className="mr-2 h-4 w-4" />Chiqish
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 md:grid-cols-5">
          {nav.map((n) => (
            <Link key={n.label} to={n.to} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm ${n.active ? 'border border-orange-500 bg-orange-500/20 text-orange-300' : 'text-white/80 hover:bg-white/5'}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
        </div>

        <DashboardFilters
          range={range}
          customStart={customStart}
          customEnd={customEnd}
          onRangeChange={setRange}
          onCustomStartChange={onCustomStart}
          onCustomEndChange={onCustomEnd}
        />

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/70">Yuklanmoqda...</div>
        ) : (
          <>
            <DashboardCards kpis={data.kpis} />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2"><RevenueChart data={data.revenueSeries} /></div>
              <PaymentMethodsChart data={data.paymentMethods} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2"><OrdersChart data={data.ordersSeries} /></div>
              <BestSellingFoods items={data.bestSellingFoods} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <DailyComparison rows={data.dailyComparison} />
              <BusyHoursHeatmap data={data.busyHours} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
