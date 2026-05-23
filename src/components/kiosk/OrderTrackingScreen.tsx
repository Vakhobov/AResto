import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChefHat,
  Clock,
  CreditCard,
  Home,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  User,
  ConciergeBell,
  UtensilsCrossed,
} from 'lucide-react';
import { Order } from '@/types/kiosk';
import { getOrderById, subscribeToOrder } from '@/stores/orderStore';
import {
  getOrderStatusStepIndex,
  normalizeOrderStatus,
  orderStatusLabels,
  orderStatusLabelsUz,
  orderStatusSteps,
} from '@/lib/orderStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface OrderTrackingScreenProps {
  order: Order;
  branchId: string;
  onBack: () => void;
  onNewOrder: () => void;
}

const statusIcons = {
  new: Clock,
  preparing: ChefHat,
  ready: PackageCheck,
  served: Check,
};

export function OrderTrackingScreen({ order, branchId, onBack, onNewOrder }: OrderTrackingScreenProps) {
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(order);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrder(
      branchId,
      order.id,
      nextOrder => {
        setTrackedOrder(nextOrder);
        setLoading(false);
        setError(nextOrder ? null : "Buyurtma topilmadi.");
      },
      subscriptionError => {
        console.error('Order tracking subscription failed:', subscriptionError);
        setError("Buyurtmani yuklab bo'lmadi. Firebase sozlamalarini tekshiring.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [branchId, order.id]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4 text-center"
      >
        <Clock className="h-16 w-16 text-primary animate-pulse mb-4" />
        <p className="text-xl font-semibold text-foreground">Buyurtma yuklanmoqda...</p>
      </motion.div>
    );
  }

  if (error || !trackedOrder) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4 text-center"
      >
        <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-xl font-semibold text-destructive">{error ?? "Buyurtma topilmadi."}</p>
        <Button onClick={onBack} className="mt-6 rounded-2xl bg-primary hover:bg-primary/90">
          <ArrowLeft className="mr-2 h-5 w-5" />
          Orqaga
        </Button>
      </motion.div>
    );
  }

  const activeStep = getOrderStatusStepIndex(trackedOrder.status);
  const status = normalizeOrderStatus(trackedOrder.status);
  const paymentPaid = trackedOrder.paymentStatus !== 'unpaid';

  const handleRefresh = async () => {
    setTrackedOrder(await getOrderById(branchId, trackedOrder.id) ?? trackedOrder);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      <header className="flex items-center justify-between gap-4 p-4 md:p-6 border-b border-border bg-card/40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full w-10 h-10 md:w-12 md:h-12"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Buyurtmani kuzatish</h1>
            <p className="text-sm text-muted-foreground">Track Order</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="rounded-2xl gap-2 border-primary/30 hover:bg-primary/10"
        >
          <RefreshCw className="w-4 h-4" />
          Yangilash
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-[1.2fr_0.8fr] md:gap-6">
          <section className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buyurtma raqami</p>
                <p className="text-5xl md:text-6xl font-bold text-primary">
                  #{trackedOrder.orderNumber.toString().padStart(3, '0')}
                </p>
              </div>
              <Badge className="w-fit rounded-full bg-primary/15 text-primary border-primary/30 px-4 py-2 text-sm" variant="outline">
                {orderStatusLabelsUz[status]} / {orderStatusLabels[status]}
              </Badge>
            </div>

            <div className="mt-8">
              <div className="relative grid grid-cols-4 gap-2">
                <div className="absolute left-[12.5%] right-[12.5%] top-6 h-1 rounded-full bg-secondary" />
                <div
                  className="absolute left-[12.5%] top-6 h-1 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(0, activeStep) * 25}%` }}
                />
                {orderStatusSteps.map((step, index) => {
                  const StepIcon = statusIcons[step];
                  const isDone = index <= activeStep;
                  const isCurrent = index === activeStep;

                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center text-center">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
                          isDone
                            ? 'border-primary bg-primary text-primary-foreground shadow-button'
                            : 'border-border bg-card text-muted-foreground',
                          isCurrent && 'ring-4 ring-primary/20',
                        )}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-foreground sm:text-sm">
                        {orderStatusLabels[step]}
                      </p>
                      <p className="text-xs text-muted-foreground">{orderStatusLabelsUz[step]}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">Buyurtma turi</p>
                <div className="mt-2 flex items-center gap-2 font-semibold text-foreground">
                  {trackedOrder.orderType === 'dine-in' ? (
                    <>
                      <UtensilsCrossed className="h-4 w-4 text-primary" />
                      Bu yerda / Dine In
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      Olib ketish / Take Out
                    </>
                  )}
                </div>
              </div>

              {trackedOrder.orderType === 'dine-in' && trackedOrder.tableNumber && (
                <div className="rounded-2xl bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground">Stol raqami</p>
                  <div className="mt-2 flex items-center gap-2 font-semibold text-foreground">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    Stol #{trackedOrder.tableNumber}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">Xizmat turi</p>
                <div className="mt-2 flex items-center gap-2 font-semibold text-foreground">
                  {trackedOrder.serviceType === 'waiter-service' ? (
                    <>
                      <ConciergeBell className="h-4 w-4 text-primary" />
                      Ofitsiant xizmati
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-primary" />
                      O'z-o'ziga xizmat
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">To'lov holati</p>
                <div className="mt-2 flex items-center gap-2 font-semibold text-foreground">
                  <CreditCard className={cn('h-4 w-4', paymentPaid ? 'text-kiosk-success' : 'text-yellow-400')} />
                  {paymentPaid ? "To'langan / Paid" : "Kassada to'lanadi"}
                </div>
              </div>
            </div>
          </section>

          <aside className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-card">
            <h2 className="text-lg font-bold text-foreground">Buyurtma tarkibi</h2>
            <div className="mt-4 space-y-3">
              {trackedOrder.items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-2xl bg-secondary/30 p-3">
                  <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-semibold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                    <p className="text-sm font-semibold text-primary">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Oraliq jami</span>
                <span className="text-foreground">{formatPrice(trackedOrder.subtotal)}</span>
              </div>
              {trackedOrder.serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Xizmat haqi</span>
                  <span className="text-foreground">{formatPrice(trackedOrder.serviceFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 text-xl font-bold">
                <span>Jami</span>
                <span className="text-primary">{formatPrice(trackedOrder.total)}</span>
              </div>
            </div>

            <Button
              onClick={onNewOrder}
              className="mt-6 h-12 w-full rounded-2xl bg-primary hover:bg-primary/90 shadow-button"
            >
              <Home className="mr-2 h-5 w-5" />
              Yangi buyurtma
            </Button>
          </aside>
        </div>
      </main>
    </motion.div>
  );
}
