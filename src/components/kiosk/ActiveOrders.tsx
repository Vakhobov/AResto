import { useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types/kiosk';
import { getOrders } from '@/services/orderService';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, ChefHat, ArrowLeft, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ActiveOrdersProps {
  onSelectOrder: (order: Order) => void;
}

const statusConfig = {
  'new': { label: 'Yangi', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'preparing': { label: 'Tayyorlanmoqda', icon: ChefHat, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  'ready': { label: 'Tayyor', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
};

export function ActiveOrders({ onSelectOrder }: ActiveOrdersProps) {
  const { userProfile } = useAuth();
  const branchId = userProfile?.branchId;
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;

    const fetchOrders = async () => {
      try {
        const allOrders = await getOrders(branchId);
        const activeOrders = allOrders.filter(order => 
          ['new', 'preparing', 'ready'].includes(order.status)
        );
        setOrders(activeOrders);
      } catch (error) {
        console.error('Failed to fetch active orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [branchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Faol buyurtmalar</h1>
            <p className="text-sm text-muted-foreground">Jami {orders.length} ta faol buyurtma</p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Faol buyurtmalar yo'q</h2>
            <p className="text-muted-foreground">Hozircha faol buyurtmalar mavjud emas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.new;
              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onSelectOrder(order)}
                  className="bg-card rounded-2xl p-5 border border-border cursor-pointer hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Buyurtma #{order.orderNumber}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.orderType === 'dine-in' ? `Stol #${order.tableNumber}` : 'Olib ketish'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>Telefon raqami bilan tasdiqlash</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mahsulotlar:</span>
                      <span className="text-foreground">{order.items.length} ta</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Jami:</span>
                      <span className="font-semibold text-foreground">{order.total.toLocaleString()} so'm</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
