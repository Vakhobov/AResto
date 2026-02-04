import { motion } from 'framer-motion';
import { Clock, Play, Check, UtensilsCrossed, ShoppingBag, User, ConciergeBell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types/kiosk';
import { formatPrice } from '@/lib/currency';

interface KitchenOrderCardProps {
  order: Order;
  onStartPreparing: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
}

const KitchenOrderCard = ({ order, onStartPreparing, onMarkReady }: KitchenOrderCardProps) => {
  const getElapsedTime = (createdAt: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hozirgina';
    if (diffMins === 1) return '1 daqiqa oldin';
    return `${diffMins} daqiqa oldin`;
  };

  const isPending = order.status === 'pending';
  const isPreparing = order.status === 'preparing';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 100 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card className={`h-full flex flex-col ${
        isPending 
          ? 'border-yellow-500/50 bg-yellow-500/5' 
          : 'border-blue-500/50 bg-blue-500/5'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-3xl md:text-4xl font-bold text-foreground">
              #{order.orderNumber}
            </span>
            <Badge 
              variant="outline" 
              className={`text-sm md:text-base px-2 md:px-3 py-1 ${
                isPending 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
              }`}
            >
              {isPending ? '🟡 KUTILMOQDA' : '🔵 TAYYORLANMOQDA'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
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
            {order.items.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 text-lg md:text-xl text-foreground"
              >
                <span className="font-bold text-primary">{item.quantity}×</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Jami:</span>
              <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4">
          {isPending ? (
            <Button 
              onClick={() => onStartPreparing(order.id)}
              className="w-full h-12 md:h-14 text-base md:text-lg bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-5 w-5 mr-2" />
              Tayyorlashni boshlash
            </Button>
          ) : (
            <Button 
              onClick={() => onMarkReady(order.id)}
              className="w-full h-12 md:h-14 text-base md:text-lg bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              Tayyor
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default KitchenOrderCard;
