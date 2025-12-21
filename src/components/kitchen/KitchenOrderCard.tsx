import { motion } from 'framer-motion';
import { Clock, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types/kiosk';

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
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    return `${diffMins} min ago`;
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
            <span className="text-4xl font-bold text-foreground">
              #{order.orderNumber}
            </span>
            <Badge 
              variant="outline" 
              className={`text-base px-3 py-1 ${
                isPending 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
              }`}
            >
              {isPending ? '🟡 PENDING' : '🔵 PREPARING'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <Clock className="h-4 w-4" />
            <span className="text-lg">{getElapsedTime(order.createdAt)}</span>
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 text-xl text-foreground"
              >
                <span className="font-bold text-primary">{item.quantity}×</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="pt-4">
          {isPending ? (
            <Button 
              onClick={() => onStartPreparing(order.id)}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Preparing
            </Button>
          ) : (
            <Button 
              onClick={() => onMarkReady(order.id)}
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              Ready
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default KitchenOrderCard;
