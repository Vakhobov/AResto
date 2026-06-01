import { formatPrice } from '@/lib/currency';
import type { BestSellingFoodItem } from '@/types/dashboard';

export const BestSellingFoods = ({ items }: { items: BestSellingFoodItem[] }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <h3 className="mb-3 text-xl font-semibold">Eng ko'p sotilgan mahsulotlar</h3>
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3">
          <span className="w-4 text-sm text-white/60">{idx + 1}</span>
          <img src={item.imageUrl || '/placeholder.svg'} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="text-xs text-white/60">{item.quantity} ta</p>
          </div>
          <p className="text-sm text-white/90">{formatPrice(item.revenue)}</p>
        </div>
      ))}
    </div>
  </div>
);
