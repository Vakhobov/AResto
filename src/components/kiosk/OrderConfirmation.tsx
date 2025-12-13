import { Order } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderConfirmationProps {
  order: Order;
  onNewOrder: () => void;
  onViewReceipt: () => void;
}

export function OrderConfirmation({ order, onNewOrder, onViewReceipt }: OrderConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        className="w-32 h-32 rounded-full bg-kiosk-success/20 flex items-center justify-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.4 }}
          className="w-24 h-24 rounded-full bg-kiosk-success flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-bold text-foreground text-center mb-4"
      >
        Order Confirmed!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground text-lg text-center mb-8"
      >
        Your order has been placed successfully
      </motion.p>

      {/* Order Number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-card border border-border rounded-3xl p-8 mb-8"
      >
        <p className="text-muted-foreground text-center mb-2">Your Order Number</p>
        <p className="text-6xl font-bold text-primary text-center animate-pulse-glow">
          #{order.orderNumber.toString().padStart(3, '0')}
        </p>
      </motion.div>

      {/* Order Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-secondary/30 rounded-2xl p-6 mb-8 w-full max-w-sm"
      >
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Items</span>
          <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold">
          <span>Total Paid</span>
          <span className="text-primary">${order.total.toFixed(2)}</span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-col sm:flex-row gap-4 w-full max-w-sm"
      >
        <Button
          onClick={onViewReceipt}
          variant="outline"
          className="flex-1 h-14 text-lg rounded-2xl border-primary/30 hover:bg-primary/10"
        >
          <Printer className="w-5 h-5 mr-2" />
          View Receipt
        </Button>
        <Button
          onClick={onNewOrder}
          className="flex-1 h-14 text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-button"
        >
          <Home className="w-5 h-5 mr-2" />
          New Order
        </Button>
      </motion.div>
    </motion.div>
  );
}
