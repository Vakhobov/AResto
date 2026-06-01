import { TrendingDown, TrendingUp, Wallet, ShoppingBag, CircleOff, Armchair } from 'lucide-react';
import type { DashboardKpis } from '@/types/dashboard';
import { formatPrice } from '@/lib/currency';

const sum = (v: number) => formatPrice(v);
const change = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const KpiCard = ({ title, value, delta, icon: Icon }: { title: string; value: string; delta: number; icon: any }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-4 backdrop-blur-xl">
    <div className="flex items-center justify-between">
      <p className="text-sm text-white/70">{title}</p>
      <div className="rounded-full border border-orange-500/40 p-2 text-orange-400"><Icon className="h-4 w-4" /></div>
    </div>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
    <div className={`mt-1 flex items-center gap-1 text-sm ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {change(delta)}
    </div>
  </div>
);

export const DashboardCards = ({ kpis }: { kpis: DashboardKpis }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
    <KpiCard title="Jami daromad" value={sum(kpis.revenue.value)} delta={kpis.revenue.changePercent} icon={Wallet} />
    <KpiCard title="Buyurtmalar soni" value={String(kpis.orders.value)} delta={kpis.orders.changePercent} icon={ShoppingBag} />
    <KpiCard title="O'rtacha buyurtma" value={sum(kpis.averageOrderValue.value)} delta={kpis.averageOrderValue.changePercent} icon={TrendingUp} />
    <KpiCard title="Bekor qilingan" value={String(kpis.cancelledOrders.value)} delta={kpis.cancelledOrders.changePercent} icon={CircleOff} />
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/70">Faol stollar</p>
        <div className="rounded-full border border-orange-500/40 p-2 text-orange-400"><Armchair className="h-4 w-4" /></div>
      </div>
      <p className="mt-2 text-2xl font-semibold">{kpis.activeTables.occupied}</p>
      <p className="text-sm text-white/60">Jami: {kpis.activeTables.total} ta stol</p>
    </div>
  </div>
);
