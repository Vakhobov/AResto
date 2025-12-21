import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import KitchenHeader from '@/components/kitchen/KitchenHeader';
import KitchenOrderCard from '@/components/kitchen/KitchenOrderCard';
import { getOrders, updateOrderStatus } from '@/stores/orderStore';
import { Order } from '@/types/kiosk';

const Kitchen = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = () => {
    const allOrders = getOrders();
    // Filter to show only pending and preparing orders, sorted oldest first
    const activeOrders = allOrders
      .filter(o => o.status === 'pending' || o.status === 'preparing')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setOrders(activeOrders);
  };

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartPreparing = (orderId: string) => {
    updateOrderStatus(orderId, 'preparing');
    loadOrders();
  };

  const handleMarkReady = (orderId: string) => {
    updateOrderStatus(orderId, 'ready');
    loadOrders();
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <KitchenHeader 
        pendingCount={pendingCount} 
        preparingCount={preparingCount} 
      />

      <main className="flex-1 p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <UtensilsCrossed className="h-24 w-24 mb-4 opacity-50" />
            <p className="text-2xl">No active orders</p>
            <p className="text-lg">Waiting for new orders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {orders.map(order => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  onStartPreparing={handleStartPreparing}
                  onMarkReady={handleMarkReady}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Kitchen;
