import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PaymentMethodSlice } from '@/types/dashboard';

const COLORS = ['#F97316', '#2563EB', '#14B8A6', '#A855F7', '#22C55E', '#EAB308'];

export const PaymentMethodsChart = ({ data }: { data: PaymentMethodSlice[] }) => {
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-xl font-semibold">To'lov usullari</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={58} outerRadius={90} paddingAngle={2}>
              {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-sm text-white/80">Jami: {Math.round(total).toLocaleString('ru-RU')} so'm</p>
    </div>
  );
};
