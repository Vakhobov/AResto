import type { BusyHourRow } from '@/types/dashboard';

const intensity = (value: number, max: number) => {
  if (max <= 0) return 'bg-white/5';
  const ratio = value / max;
  if (ratio > 0.8) return 'bg-orange-500';
  if (ratio > 0.6) return 'bg-orange-500/80';
  if (ratio > 0.4) return 'bg-orange-500/60';
  if (ratio > 0.2) return 'bg-orange-500/35';
  return 'bg-white/10';
};

export const BusyHoursHeatmap = ({ data }: { data: BusyHourRow[] }) => {
  const max = Math.max(...data.map((d) => d.orders), 0);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-xl font-semibold">Soatlik faollik</h3>
      <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
        {data.map((d) => (
          <div key={d.hour} className="space-y-1 text-center">
            <div className={`h-9 rounded-md ${intensity(d.orders, max)}`} />
            <p className="text-xs text-white/60">{String(d.hour).padStart(2, '0')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
