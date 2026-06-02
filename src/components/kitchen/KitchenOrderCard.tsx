import { motion } from 'framer-motion';
import {
  Check,
  ChefHat,
  Clock,
  ConciergeBell,
  MapPin,
  PackageCheck,
  Play,
  ShoppingBag,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types/kiosk';
import { formatPrice } from '@/lib/currency';
import OrderItemsList from '@/components/shared/OrderItemsList';
import {
  CanonicalOrderStatus,
  getNextOrderStatus,
  normalizeOrderStatus,
  orderStatusLabels,
  orderStatusLabelsUz,
} from '@/lib/orderStatus';

interface KitchenOrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: CanonicalOrderStatus) => void;
}

const statusStyles: Record<CanonicalOrderStatus, string> = {
  new: 'border-yellow-500/50 bg-yellow-500/5',
  preparing: 'border-blue-500/50 bg-blue-500/5',
  ready: 'border-green-500/50 bg-green-500/5',
  served: 'border-border bg-card/60 opacity-75',
};

const badgeStyles: Record<CanonicalOrderStatus, string> = {
  new: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  ready: 'bg-green-500/20 text-green-400 border-green-500/50',
  served: 'bg-muted text-muted-foreground border-border',
};

const statusIcons = {
  new: Clock,
  preparing: ChefHat,
  ready: PackageCheck,
  served: Check,
};

const KitchenOrderCard = ({ order, onStatusChange }: KitchenOrderCardProps) => {
  const getElapsedTime = (createdAt: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hozirgina';
    if (diffMins === 1) return '1 daqiqa oldin';
    return `${diffMins} daqiqa oldin`;
  };

  const status = normalizeOrderStatus(order.status);
  const nextStatus = getNextOrderStatus(order.status);
  const StatusIcon = statusIcons[status];

  const buttonLabel = {
    preparing: 'Tayyorlashni boshlash',
    ready: 'Tayyor',
    served: 'Yetkazildi',
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 100 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card className={`h-full flex flex-col ${statusStyles[status]}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl md:text-4xl font-bold text-foreground">
              #{order.orderNumber}
            </span>
            <Badge
              variant="outline"
              className={`text-sm md:text-base px-2 md:px-3 py-1 gap-1 ${badgeStyles[status]}`}
            >
              <StatusIcon className="h-4 w-4" />
              {orderStatusLabelsUz[status]}
            </Badge>
          </div>

          {order.tableNumber && (
            <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-emerald-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-xl font-bold">Stol #{order.tableNumber}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-base md:text-lg">{getElapsedTime(order.createdAt)}</span>
            </div>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${
                order.orderType === 'dine-in'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/50'
              }`}
            >
              {order.orderType === 'dine-in' ? (
                <>
                  <UtensilsCrossed className="h-3 w-3" />
                  Bu yerda
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3 w-3" />
                  Olib ketish
                </>
              )}
            </Badge>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${
                order.serviceType === 'waiter-service'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
              }`}
            >
              {order.serviceType === 'waiter-service' ? (
                <>
                  <ConciergeBell className="h-3 w-3" />
                  Ofitsiant
                </>
              ) : (
                <>
                  <User className="h-3 w-3" />
                  O'zi
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="space-y-2">
            <OrderItemsList items={order.items} />
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Holat:</span>
              <span className="font-semibold text-foreground">{orderStatusLabels[status]}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>Jami:</span>
              <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4">
          {nextStatus ? (
            <Button
              onClick={() => onStatusChange(order.id, nextStatus)}
              className="w-full h-12 md:h-14 text-base md:text-lg bg-primary hover:bg-primary/90"
            >
              {nextStatus === 'preparing' ? (
                <Play className="h-5 w-5 mr-2" />
              ) : (
                <Check className="h-5 w-5 mr-2" />
              )}
              {buttonLabel[nextStatus]}
            </Button>
          ) : (
            <Button
              disabled
              variant="secondary"
              className="w-full h-12 md:h-14 text-base md:text-lg"
            >
              <Check className="h-5 w-5 mr-2" />
              Xizmat ko'rsatildi
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default KitchenOrderCard;
