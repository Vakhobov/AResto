import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { RevenuePoint } from '@/types/dashboard';
import { formatPrice } from '@/lib/currency';

export const RevenueChart = ({ data }: { data: RevenuePoint[] }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <h3 className="mb-3 text-xl font-semibold">Daromad statistikasi</h3>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(value) => formatPrice(Number(value))} />
          <Tooltip formatter={(value: number) => formatPrice(Number(value))} />
          <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);
