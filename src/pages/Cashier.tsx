import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  ChefHat,
  LogOut,
  ArrowLeft,
  Loader2,
  MapPin,
  RefreshCw,
  CreditCard,
  QrCode,
  Smartphone,
  WalletCards,
  Check,
  AlertCircle,
  Building2,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RestaurantTable, subscribeToTables, getTables } from '@/services/tableService';
import { Order, subscribeToOrders, getOrders, completeCashierPayment } from '@/services/orderService';
import { getBranchPaymentMode } from '@/services/paymentModeService';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';

export default function Cashier() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const branchId = userProfile?.branchId;

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'prepaid' | 'postpaid' | null>(null);

  // Load payment mode and check if cashier page is relevant
  useEffect(() => {
    if (!branchId) return;
    getBranchPaymentMode(branchId).then(mode => {
      setPaymentMode(mode);
    });
  }, [branchId]);

  // Subscribe to tables and orders
  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubTables = subscribeToTables(
      branchId,
      (updatedTables) => {
        setTables(updatedTables);
        setLoading(false);
      },
      (err) => {
        console.error('Tables subscription error:', err);
        toast({
          title: "Xato",
          description: "Stollarni yuklab bo'lmadi.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    const unsubOrders = subscribeToOrders(
      branchId,
      (updatedOrders) => {
        setOrders(updatedOrders);
      },
      (err) => {
        console.error('Orders subscription error:', err);
      }
    );

    return () => {
      unsubTables();
      unsubOrders();
    };
  }, [branchId, toast]);

  // Map orders by ID for fast lookup
  const activeOrdersMap = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach(o => {
      if (o.status !== 'completed' && o.status !== 'cancelled') {
        map.set(o.id, o);
      }
    });
    return map;
  }, [orders]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleCompletePayment = async (orderId: string, method: string) => {
    if (!branchId) return;
    setProcessingId(orderId);
    try {
      await completeCashierPayment(branchId, orderId, method, userProfile?.uid ?? undefined);
      toast({
        title: "To'lov qabul qilindi! ✅",
        description: `Buyurtma muvaffaqiyatli yakunlandi (${method.toUpperCase()}).`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "To'lovni saqlashda xato",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const statusColors = {
    available: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    occupied: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    payment_pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse',
    reserved: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    inactive: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };

  const statusLabels = {
    available: 'Bo\'sh',
    occupied: 'Band',
    payment_pending: 'Hisob kutilmoqda 🔔',
    reserved: 'Band qilingan',
    inactive: 'Nofaol',
  };

  if (!branchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Filial aniqlanmadi</h1>
          <p className="text-muted-foreground text-sm mb-4">Sizning profilingiz hech qanday filialga bog'lanmagan.</p>
          <Button onClick={handleLogout} className="rounded-xl w-full">Chiqish</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 p-4 mb-6 md:mb-8 border-b border-border bg-card/40 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Kassa Paneli (Cashier)</h1>
            <p className="text-xs text-muted-foreground">
              {userProfile?.branchName ? `${userProfile.branchName} · ` : ''}Stollar to'lovi va hisob-kitob
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {paymentMode === 'prepaid' && (
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-medium">
              Prepaid rejim
            </span>
          )}
          <Button asChild variant="outline" className="hidden sm:flex gap-2 rounded-xl">
            <Link to="/kitchen"><ChefHat className="w-4 h-4" />Oshxona</Link>
          </Button>
          <Button asChild variant="outline" className="hidden sm:flex gap-2 rounded-xl">
            <Link to="/admin"><UtensilsCrossed className="w-4 h-4" />Admin</Link>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Yuklanmoqda...</span>
        </div>
      ) : tables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-card border border-border rounded-3xl">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-bold text-foreground">Stollar mavjud emas</h2>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            SuperAdmin orqali ushbu filial uchun stollarni sozlang.
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {tables.map(table => {
            const activeOrder = table.currentOrderId ? activeOrdersMap.get(table.currentOrderId) : null;
            const isPendingPayment = table.status === 'payment_pending';
            
            return (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`
                  bg-card border rounded-3xl p-5 flex flex-col justify-between transition-all duration-300
                  ${isPendingPayment ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30' : 'border-border'}
                `}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPendingPayment ? 'bg-amber-500/10 text-amber-400' : 'bg-primary/10 text-primary'}`}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">Stol #{table.number}</h3>
                        <p className="text-xs text-muted-foreground">{table.name ?? `Stol № ${table.number}`}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[table.status]}`}>
                      {statusLabels[table.status] || table.status}
                    </span>
                  </div>

                  {activeOrder ? (
                    <div className="space-y-3 bg-secondary/30 rounded-2xl p-3 border border-border/50 text-sm mb-4">
                      <div className="flex justify-between font-semibold border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">Buyurtma №{activeOrder.orderNumber}</span>
                        <span className="text-primary">{formatPrice(activeOrder.total)}</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {activeOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border/40 pt-2 text-xs space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Oraliq jami</span>
                          <span>{formatPrice(activeOrder.subtotal)}</span>
                        </div>
                        {activeOrder.serviceFee > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Xizmat haqi (10%)</span>
                            <span>{formatPrice(activeOrder.serviceFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-foreground font-semibold pt-1 border-t border-border/20">
                          <span>Jami</span>
                          <span>{formatPrice(activeOrder.total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground/60 text-xs border border-dashed border-border/80 rounded-2xl mb-4">
                      Buyurtma yo'q
                    </div>
                  )}
                </div>

                {isPendingPayment && activeOrder && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground text-center">To'lovni qabul qilish:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCompletePayment(activeOrder.id, 'cash')}
                        disabled={processingId !== null}
                        className="rounded-xl gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 h-9"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        Naqd
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCompletePayment(activeOrder.id, 'card')}
                        disabled={processingId !== null}
                        className="rounded-xl gap-1 text-xs bg-blue-600 hover:bg-blue-700 h-9"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Karta
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleCompletePayment(activeOrder.id, 'click')}
                        disabled={processingId !== null}
                        className="rounded-xl text-[10px] h-8 border-border hover:bg-primary/10"
                      >
                        Click
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleCompletePayment(activeOrder.id, 'payme')}
                        disabled={processingId !== null}
                        className="rounded-xl text-[10px] h-8 border-border hover:bg-primary/10"
                      >
                        Payme
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleCompletePayment(activeOrder.id, 'uzum')}
                        disabled={processingId !== null}
                        className="rounded-xl text-[10px] h-8 border-border hover:bg-primary/10"
                      >
                        Uzum
                      </Button>
                    </div>
                    {processingId === activeOrder.id && (
                      <div className="flex items-center justify-center text-xs text-muted-foreground gap-1.5 pt-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                        Yangilanmoqda...
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
