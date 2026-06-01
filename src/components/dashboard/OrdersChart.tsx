import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { OrdersPoint } from '@/types/dashboard';

export const OrdersChart = ({ data }: { data: OrdersPoint[] }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <h3 className="mb-3 text-xl font-semibold">Buyurtmalar statistikasi</h3>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="orders" fill="#F97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
