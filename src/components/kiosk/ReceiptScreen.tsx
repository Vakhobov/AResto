import { Order } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, UtensilsCrossed, ShoppingBag, User, ConciergeBell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';

interface ReceiptScreenProps {
  order: Order;
  onBack: () => void;
  onNewOrder: () => void;
}

export function ReceiptScreen({ order, onBack, onNewOrder }: ReceiptScreenProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center gap-4 p-4 md:p-6 border-b border-border print:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full w-10 h-10 md:w-12 md:h-12"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Chek</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
        {/* Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-6 md:p-8 w-full max-w-md shadow-card"
        >
          {/* Restaurant Header */}
          <div className="text-center mb-6 pb-6 border-b border-dashed border-border">
            <h2 className="text-xl md:text-2xl font-bold text-primary mb-1">Tasty Kiosk</h2>
            <p className="text-muted-foreground text-sm">Toshkent shahri, Amir Temur ko'chasi</p>
            <p className="text-muted-foreground text-sm">Tel: +998 71 123-45-67</p>
          </div>

          {/* Order Info */}
          <div className="mb-6 pb-6 border-b border-dashed border-border">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Buyurtma #</span>
              <span className="font-semibold text-foreground">
                {order.orderNumber.toString().padStart(3, '0')}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Buyurtma turi</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                {order.orderType === 'dine-in' ? (
                  <>
                    <UtensilsCrossed className="w-3 h-3" />
                    Bu yerda
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3 h-3" />
                    Olib ketish
                  </>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Xizmat turi</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                {order.serviceType === 'self-service' ? (
                  <>
                    <User className="w-3 h-3" />
                    O'z-o'ziga xizmat
                  </>
                ) : (
                  <>
                    <ConciergeBell className="w-3 h-3" />
                    Ofitsiant xizmati
                  </>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sana</span>
              <span className="text-foreground">
                {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6 pb-6 border-b border-dashed border-border">
            <h3 className="font-semibold text-foreground mb-4">Buyurtma tarkibi</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="text-foreground font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Oraliq jami</span>
              <span className="text-foreground">{formatPrice(order.subtotal)}</span>
            </div>
            {order.serviceFee > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Xizmat haqi (10%)</span>
                <span className="text-foreground">{formatPrice(order.serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-border">
              <span>Jami</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">Xaridingiz uchun rahmat!</p>
            <p>Buyurtmangiz tayyor bo'lganda chaqiramiz.</p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="p-4 md:p-6 border-t border-border flex flex-col sm:flex-row gap-3 md:gap-4 print:hidden">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1 h-12 md:h-14 text-base md:text-lg rounded-2xl border-primary/30 hover:bg-primary/10"
        >
          <Printer className="w-5 h-5 mr-2" />
          Chekni chop etish
        </Button>
        <Button
          onClick={onNewOrder}
          className="flex-1 h-12 md:h-14 text-base md:text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-button"
        >
          Yangi buyurtma
        </Button>
      </div>
    </motion.div>
  );
}
