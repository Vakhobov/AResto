import { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Banknote,
  Check,
  ConciergeBell,
  CreditCard,
  MapPin,
  QrCode,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  User,
  WalletCards,
} from 'lucide-react';
import { CartItem, PaymentMethod, OrderType, ServiceType } from '@/types/kiosk';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';

interface PaymentScreenProps {
  items: CartItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  orderNumber: number;
  orderType: OrderType;
  serviceType: ServiceType;
  tableNumber?: number | null;
  onBack: () => void;
  onPaymentComplete: (method: PaymentMethod) => void | Promise<void>;
  loading?: boolean;
}

const qrMethods: PaymentMethod[] = ['click', 'payme', 'uzum'];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: 'Karta',
  nfc: 'NFC',
  cash: 'Naqd pul',
  click: 'Click',
  payme: 'Payme',
  uzum: 'Uzum',
};

export function PaymentScreen({
  items,
  subtotal,
  serviceFee,
  total,
  orderNumber,
  orderType,
  serviceType,
  tableNumber,
  onBack,
  onPaymentComplete,
  loading = false,
}: PaymentScreenProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  const isQrMethod = selectedMethod ? qrMethods.includes(selectedMethod) : false;
  const safeOrderNumber = orderNumber || 1;

  const qrData = useMemo(() => {
    if (!selectedMethod || !isQrMethod) return '';

    return JSON.stringify({
      restaurant: 'AResto',
      orderNumber: safeOrderNumber,
      tableNumber: orderType === 'dine-in' ? tableNumber ?? null : null,
      amount: formatPrice(total),
      method: paymentMethodLabels[selectedMethod],
    });
  }, [isQrMethod, orderType, safeOrderNumber, selectedMethod, tableNumber, total]);

  const handlePayment = async () => {
    if (!selectedMethod) return;
    setProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, isQrMethod ? 800 : 2000));
      await onPaymentComplete(selectedMethod);
    } finally {
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { id: 'card' as PaymentMethod, icon: CreditCard, label: 'Karta', description: 'Kredit yoki debit karta' },
    { id: 'nfc' as PaymentMethod, icon: Smartphone, label: 'NFC', description: "Telefon yoki karta bilan to'lang" },
    { id: 'cash' as PaymentMethod, icon: Banknote, label: 'Naqd pul', description: "Kassada to'lang" },
    { id: 'click' as PaymentMethod, icon: QrCode, label: 'Click', description: "Click orqali QR to'lov" },
    { id: 'payme' as PaymentMethod, icon: WalletCards, label: 'Payme', description: "Payme orqali QR to'lov" },
    { id: 'uzum' as PaymentMethod, icon: QrCode, label: 'Uzum', description: "Uzum orqali QR to'lov" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      <header className="flex items-center gap-4 p-4 md:p-6 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          disabled={loading}
          className="rounded-full w-10 h-10 md:w-12 md:h-12"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">To'lov</h1>
          <p className="text-sm text-muted-foreground">Order #{safeOrderNumber}</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-auto">
        <div className="lg:w-1/3 p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Buyurtma tafsilotlari</h2>

          <div className="mb-4 rounded-2xl bg-card border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buyurtma #</span>
              <span className="font-bold text-primary">{safeOrderNumber}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Jami summa</span>
              <span className="font-bold text-foreground">{formatPrice(total)}</span>
            </div>
            {orderType === 'dine-in' && tableNumber && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Stol</span>
                <span className="font-bold text-emerald-400">#{tableNumber}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary">
              {orderType === 'dine-in' ? (
                <>
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="font-medium text-sm">Bu yerda</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span className="font-medium text-sm">Olib ketish</span>
                </>
              )}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-foreground">
              {serviceType === 'self-service' ? (
                <>
                  <User className="w-4 h-4" />
                  <span className="font-medium text-sm">O'z-o'ziga xizmat</span>
                </>
              ) : (
                <>
                  <ConciergeBell className="w-4 h-4" />
                  <span className="font-medium text-sm">Ofitsiant xizmati</span>
                </>
              )}
            </div>
            {orderType === 'dine-in' && tableNumber && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <MapPin className="w-4 h-4" />
                <span className="font-medium text-sm">Stol #{tableNumber}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6 max-h-40 lg:max-h-none overflow-auto">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-foreground font-medium">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Oraliq jami</span>
              <span className="text-foreground">{formatPrice(subtotal)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Xizmat haqi (10%)</span>
                <span className="text-foreground">{formatPrice(serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-border">
              <span>Jami</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 md:mb-6">To'lov usulini tanlang</h2>
          <div className="grid gap-3 md:gap-4 max-w-2xl mx-auto md:grid-cols-2">
            {paymentMethods.map((method, index) => (
              <motion.button
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => !loading && setSelectedMethod(method.id)}
                className={`
                  relative flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 touch-manipulation
                  ${selectedMethod === method.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-card'
                  }
                `}
              >
                <div className={`
                  w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0
                  ${selectedMethod === method.id ? 'bg-primary' : 'bg-secondary'}
                `}>
                  <method.icon className={`w-6 h-6 md:w-7 md:h-7 ${selectedMethod === method.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{method.label}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{method.description}</p>
                </div>
                {selectedMethod === method.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {isQrMethod && selectedMethod && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 max-w-md mx-auto rounded-3xl bg-card border border-border p-5 md:p-6 text-center shadow-card"
            >
              <div className="mx-auto mb-4 w-fit rounded-2xl bg-white p-4">
                <QRCodeCanvas value={qrData} size={220} level="M" includeMargin />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {paymentMethodLabels[selectedMethod]} QR
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Demo QR kod. Haqiqiy to'lov API ulanmagan.
              </p>
              <div className="mt-4 rounded-2xl bg-secondary/40 p-3 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <span className="text-foreground font-semibold">#{safeOrderNumber}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-primary font-semibold">{formatPrice(total)}</span>
                </div>
                {orderType === 'dine-in' && tableNumber && (
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Table</span>
                    <span className="text-emerald-400 font-semibold">#{tableNumber}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div className="mt-6 md:mt-8 max-w-md mx-auto">
            <Button
              onClick={handlePayment}
              disabled={!selectedMethod || processing || loading}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-50"
            >
              {processing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-6 h-6 border-3 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : isQrMethod ? (
                'Simulate Payment Success'
              ) : (
                `To'lash ${formatPrice(total)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
