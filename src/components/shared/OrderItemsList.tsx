import React from 'react';
import { formatPrice } from '@/lib/currency';
import type { CartItem } from '@/types/kiosk';

export const OrderItemsList: React.FC<{ items: CartItem[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;

  const normal = items.filter(i => !i.isExtraOrder);
  const extraAll = items.filter(i => i.isExtraOrder);

  // Determine the latest extra batch (server marks only the newest batch as extra,
  // but guard against multiple batches by choosing the last-seen batch id)
  const latestBatchId = extraAll.length > 0 ? extraAll[extraAll.length - 1].extraBatchId : null;
  const extra = latestBatchId ? extraAll.filter(i => i.extraBatchId === latestBatchId) : extraAll;

  return (
    <div className="space-y-2">
      {normal.map((item, idx) => (
        <div key={`n-${idx}`} className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="text-orange-400 font-semibold">{item.quantity}x</span><span className="text-foreground">{item.name}</span></div>
          <div className="text-sm text-foreground">{formatPrice(item.price * item.quantity)}</div>
        </div>
      ))}

      {extra.length > 0 && (
        <div className="pt-2">
          <div className="text-sm text-muted-foreground uppercase mb-2">Extra order</div>
          <div className="space-y-2">
            {extra.map((item, idx) => (
              <div key={`e-${idx}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="text-orange-400 font-semibold">{item.quantity}x</span><span className="text-foreground">{item.name}</span></div>
                <div className="text-sm text-foreground">{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItemsList;
