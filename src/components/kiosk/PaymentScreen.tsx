import { CartItem, PaymentMethod } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Banknote, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PaymentScreenProps {
  items: CartItem[];
  total: number;
  onBack: () => void;
  onPaymentComplete: (method: PaymentMethod) => void;
}

export function PaymentScreen({ items, total, onBack, onPaymentComplete }: PaymentScreenProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) return;
    setProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    onPaymentComplete(selectedMethod);
  };

  const paymentMethods = [
    { id: 'card' as PaymentMethod, icon: CreditCard, label: 'Credit / Debit Card', description: 'Insert or swipe your card' },
    { id: 'nfc' as PaymentMethod, icon: Smartphone, label: 'Contactless / NFC', description: 'Tap your phone or card' },
    { id: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash', description: 'Pay at the counter' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center gap-4 p-6 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full w-12 h-12"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Payment</h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Order Summary */}
        <div className="lg:w-1/3 p-6 border-b lg:border-b-0 lg:border-r border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-foreground font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="flex-1 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Select Payment Method</h2>
          <div className="grid gap-4 max-w-md mx-auto">
            {paymentMethods.map((method, index) => (
              <motion.button
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedMethod(method.id)}
                className={`
                  relative flex items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 touch-manipulation
                  ${selectedMethod === method.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 bg-card'
                  }
                `}
              >
                <div className={`
                  w-14 h-14 rounded-xl flex items-center justify-center
                  ${selectedMethod === method.id ? 'bg-primary' : 'bg-secondary'}
                `}>
                  <method.icon className={`w-7 h-7 ${selectedMethod === method.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">{method.label}</h3>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                {selectedMethod === method.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Pay Button */}
          <div className="mt-8 max-w-md mx-auto">
            <Button
              onClick={handlePayment}
              disabled={!selectedMethod || processing}
              className="w-full h-16 text-xl font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-50"
            >
              {processing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-6 h-6 border-3 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : (
                `Pay $${total.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
