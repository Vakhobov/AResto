import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DashboardRangeKey } from '@/types/dashboard';

const FILTERS: Array<{ key: DashboardRangeKey; label: string }> = [
  { key: 'today', label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
  { key: '7d', label: '7 kun' },
  { key: '30d', label: '30 kun' },
  { key: '3m', label: '3 oy' },
  { key: 'year', label: 'Yil' },
];

interface Props {
  range: DashboardRangeKey;
  customStart: string;
  customEnd: string;
  onRangeChange: (v: DashboardRangeKey) => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

export const DashboardFilters = ({ range, customStart, customEnd, onRangeChange, onCustomStartChange, onCustomEndChange }: Props) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {FILTERS.map((f) => (
        <Button
          key={f.key}
          size="sm"
          variant={range === f.key ? 'default' : 'outline'}
          className={range === f.key ? 'rounded-xl bg-orange-500 hover:bg-orange-400 text-white' : 'rounded-xl border-white/15 bg-white/5 text-white/80'}
          onClick={() => onRangeChange(f.key)}
        >
          {f.label}
        </Button>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-orange-400" />
      <Input type="date" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)} className="w-[145px] rounded-xl border-white/15 bg-white/5" />
      <span className="text-sm text-white/60">-</span>
      <Input type="date" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} className="w-[145px] rounded-xl border-white/15 bg-white/5" />
    </div>
  </div>
);
