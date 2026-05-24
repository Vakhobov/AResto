import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KitchenHeader from '@/components/kitchen/KitchenHeader';
import KitchenOrderCard from '@/components/kitchen/KitchenOrderCard';
import { subscribeToOrders, updateOrderStatus } from '@/services/orderService';
import { markTableAvailable } from '@/services/tableService';
import { Shift, subscribeToActiveShift } from '@/services/shiftService';
import { Order } from '@/types/kiosk';
import { CanonicalOrderStatus, normalizeOrderStatus, orderStatusLabelsUz } from '@/lib/orderStatus';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Kitchen = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // branchId validation: kitchen role MUST have branchId
  const branchId = userProfile?.branchId;
  
  // SuperAdmin can choose branch (future feature)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(branchId ?? null);

  const [orders, setOrders]           = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | CanonicalOrderStatus>('all');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [retrying, setRetrying]       = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);

  // (rendering for missing branch will happen later to avoid conditional hooks)

  useEffect(() => {
    if (!selectedBranch) {
      setLoading(false);
      setError('Filial tanlanmagan.');
      return;
    }

    setRetrying(false);
    const unsubscribe = subscribeToOrders(
      selectedBranch,
      nextOrders => {
        setOrders(nextOrders);
        setLoading(false);
        setError(null);
      },
      subscriptionError => {
        console.error('❌ Kitchen order subscription failed:', subscriptionError);
        const msg = 
          (subscriptionError as any)?.message?.includes('permission-denied')
            ? 'Sizda buyurtmalarni ko\'rishga ruxsat yo\'q.'
            : "Buyurtmalarni yuklab bo'lmadi. Internet aloqasini tekshiring.";
        setError(msg);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [selectedBranch]);

  useEffect(() => {
    if (!selectedBranch) {
      setActiveShift(null);
      setShiftLoading(false);
      return;
    }

    setShiftLoading(true);
    const unsubscribe = subscribeToActiveShift(
      selectedBranch,
      shift => {
        setActiveShift(shift);
        setShiftLoading(false);
      },
      shiftError => {
        console.error('Kitchen shift subscription failed:', shiftError);
        setActiveShift(null);
        setShiftLoading(false);
      },
    );

    return unsubscribe;
  }, [selectedBranch]);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);
    setLoading(true);
    // Re-trigger subscription by changing selectedBranch temporarily
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  const handleStatusChange = async (orderId: string, status: CanonicalOrderStatus) => {
    if (!selectedBranch) return;
    try {
      await updateOrderStatus(selectedBranch, orderId, status);

      if (status === 'served') {
        const order = orders.find(o => o.id === orderId);
        if (order?.orderType === 'dine-in' && order.tableNumber) {
          try {
            await markTableAvailable(selectedBranch, order.tableNumber);
          } catch (tableError) {
            console.error('Failed to mark table available:', tableError);
          }
        }
      }
    } catch (updateError: any) {
      console.error('Failed to update order status:', updateError);
      const msg = 
        updateError?.message?.includes('permission-denied')
          ? 'Buyurtmani yangilab bo\'lmadi. Ruxsat yo\'q.'
          : "Buyurtma holatini yangilab bo'lmadi. Qayta urinib ko'ring.";
      setError(msg);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const activeStatuses: CanonicalOrderStatus[] = ['new', 'preparing', 'ready'];
  const activeOrders = orders.filter(order => activeStatuses.includes(normalizeOrderStatus(order.status)));

  const filteredOrders = statusFilter === 'all'
    ? activeOrders
    : activeOrders.filter(order => normalizeOrderStatus(order.status) === statusFilter);

  const newCount       = activeOrders.filter(o => normalizeOrderStatus(o.status) === 'new').length;
  const preparingCount = activeOrders.filter(o => normalizeOrderStatus(o.status) === 'preparing').length;
  const readyCount     = activeOrders.filter(o => normalizeOrderStatus(o.status) === 'ready').length;

  const filters: Array<'all' | CanonicalOrderStatus> = ['all', 'new', 'preparing', 'ready'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* If branch not selected and user is kitchen, show error */}
      {(!selectedBranch && userProfile?.role === 'kitchen') && (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Filial Tanlanmagan</h1>
            <p className="text-muted-foreground mb-4">Foydalanuvchi filialga bog\'lanmagan. Admin bilan bog\'laning.</p>
          </div>
        </div>
      )}
      <KitchenHeader newCount={newCount} preparingCount={preparingCount} readyCount={readyCount} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6">
        {!shiftLoading && !activeShift && (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Smena yopiq. Menu qurilmalari hozir buyurtma qabul qilmaydi. Admin paneldan smenani oching.
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map(filter => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'default' : 'outline'}
              onClick={() => setStatusFilter(filter)}
              className="rounded-xl whitespace-nowrap"
              size="sm"
            >
              {filter === 'all'
                ? `Hammasi (${activeOrders.length})`
                : `${orderStatusLabelsUz[filter]} (${activeOrders.filter(o => normalizeOrderStatus(o.status) === filter).length})`}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <UtensilsCrossed className="h-16 w-16 md:h-24 md:w-24 mb-4 opacity-50 animate-pulse" />
            <p className="text-xl md:text-2xl">Buyurtmalar yuklanmoqda...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
            <UtensilsCrossed className="h-16 w-16 md:h-24 md:w-24 mb-4 opacity-50" />
            <p className="text-xl md:text-2xl text-destructive">{error}</p>
            <Button
              onClick={handleRetry}
              disabled={retrying}
              variant="outline"
              className="rounded-xl mt-4"
            >
              {retrying ? 'Qayta urinilmoqda...' : 'Qayta urini'}
            </Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <UtensilsCrossed className="h-16 w-16 md:h-24 md:w-24 mb-4 opacity-50" />
            <p className="text-xl md:text-2xl">Faol buyurtmalar yo'q</p>
            <p className="text-base md:text-lg">Yangi buyurtmalar kutilmoqda...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map(order => (
                <KitchenOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Kitchen;
