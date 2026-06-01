import type { DailyComparisonRow } from '@/types/dashboard';

export const DailyComparison = ({ rows }: { rows: DailyComparisonRow[] }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <h3 className="mb-3 text-xl font-semibold">Kunlik taqqoslash</h3>
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
          <p className="text-sm text-white/80">{r.label}</p>
          <div className="text-right">
            <p className="text-sm font-medium">{Math.round(r.value).toLocaleString('ru-RU')} so'm</p>
            <p className={`text-xs ${r.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
