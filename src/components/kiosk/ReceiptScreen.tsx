import { Order } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <header className="flex items-center gap-4 p-6 border-b border-border print:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full w-12 h-12"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Receipt</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        {/* Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-8 w-full max-w-md shadow-card"
        >
          {/* Restaurant Header */}
          <div className="text-center mb-6 pb-6 border-b border-dashed border-border">
            <h2 className="text-2xl font-bold text-primary mb-1">QuickBite Kiosk</h2>
            <p className="text-muted-foreground text-sm">123 Food Street, City</p>
            <p className="text-muted-foreground text-sm">Tel: (555) 123-4567</p>
          </div>

          {/* Order Info */}
          <div className="mb-6 pb-6 border-b border-dashed border-border">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Order #</span>
              <span className="font-semibold text-foreground">
                {order.orderNumber.toString().padStart(3, '0')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
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
            <h3 className="font-semibold text-foreground mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="text-foreground font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Tax (0%)</span>
              <span className="text-foreground">$0.00</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">Thank you for your order!</p>
            <p>Please collect your order when called.</p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-border flex gap-4 print:hidden">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1 h-14 text-lg rounded-2xl border-primary/30 hover:bg-primary/10"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Receipt
        </Button>
        <Button
          onClick={onNewOrder}
          className="flex-1 h-14 text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-button"
        >
          Start New Order
        </Button>
      </div>
    </motion.div>
  );
}
