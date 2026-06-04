import { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CreditCard,
  QrCode,
  Smartphone,
  Check,
  Loader2,
  Banknote,
  WalletCards,
  Clock,
} from 'lucide-react';
import { Order, PaymentMethod } from '@/types/kiosk';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';
import { requestCashierPayment, completeCashierPayment } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  branchId: string;
  onPaymentComplete: () => void;
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

export function PayBillModal({
  isOpen,
  onClose,
  order,
  branchId,
  onPaymentComplete,
}: PayBillModalProps) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cashierRequested, setCashierRequested] = useState(false);

  const isQrMethod = selectedMethod ? qrMethods.includes(selectedMethod) : false;

  const qrData = useMemo(() => {
    if (!selectedMethod || !isQrMethod) return '';

    return JSON.stringify({
      restaurant: 'AResto - Postpaid',
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber ?? null,
      amount: formatPrice(order.total),
      method: paymentMethodLabels[selectedMethod],
    });
  }, [isQrMethod, order.id, order.orderNumber, order.tableNumber, order.total, selectedMethod]);

  const handlePayAtCashier = async () => {
    setSubmitting(true);
    try {
      await requestCashierPayment(branchId, order.id);
      setCashierRequested(true);
      toast({
        title: "Kassir chaqirildi 🔔",
        description: "Kassir stolingizga to'lov qabul qilish uchun keladi.",
      });
      // Delay closing to let them see status
      setTimeout(() => {
        onPaymentComplete();
        onClose();
      }, 3000);
    } catch (err) {
      console.error(err);
      toast({
        title: "Xato",
        description: "Chaqiruv amalga oshmadi. Iltimos qayta urining.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateQrPayment = async () => {
    if (!selectedMethod) return;
    setSubmitting(true);
    try {
      // Simulate network request delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await completeCashierPayment(branchId, order.id, selectedMethod);
      toast({
        title: "To'lov muvaffaqiyatli yakunlandi! 🎉",
        description: "Buyurtma to'landi. Rahmat!",
      });
      onPaymentComplete();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: "To'lov xatosi",
        description: "Simulyatsiya xatolik bilan tugadi.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: 'click' as PaymentMethod, icon: QrCode, label: 'Click', description: "Click orqali QR to'lov" },
    { id: 'payme' as PaymentMethod, icon: WalletCards, label: 'Payme', description: "Payme orqali QR to'lov" },
    { id: 'uzum' as PaymentMethod, icon: QrCode, label: 'Uzum', description: "Uzum orqali QR to'lov" },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Hisobni to'lash</h2>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {cashierRequested ? (
              <div className="text-center py-10 space-y-4">
                <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Kassir to'lovi kutilmoqda</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Iltimos kuting, kassir stol #{order.tableNumber} ga naqd yoki karta bilan to'lovni qabul qilish uchun keladi.
                </p>
              </div>
            ) : (
              <>
                {/* Order Summary */}
                <div className="rounded-2xl bg-secondary/40 border border-border p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Buyurtma</p>
                      <p className="font-bold text-foreground">#{order.orderNumber.toString().padStart(3, '0')}</p>
                    </div>
                    {order.tableNumber && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Stol raqami</p>
                        <p className="font-bold text-emerald-400">#{order.tableNumber}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Jami to'lov:</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>

                {!selectedMethod ? (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-muted-foreground">To'lov turini tanlang:</p>

                    {/* Kassada to'lash Option */}
                    <button
                      onClick={handlePayAtCashier}
                      disabled={submitting}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/50 bg-card transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Kassirni chaqirish (Naqd/Karta)</h3>
                        <p className="text-xs text-muted-foreground">Kassir stolingizga terminal yoki naqd to'lov bilan keladi</p>
                      </div>
                    </button>

                    {/* QR Payments Section */}
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Telefon orqali (QR to'lov)</p>
                      <div className="grid gap-3">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/50 bg-card transition-all"
                          >
                            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                              <method.icon className="w-6 h-6" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{method.label}</h3>
                              <p className="text-xs text-muted-foreground">{method.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* QR Code Canvas */}
                    <div className="max-w-xs mx-auto bg-white p-4 rounded-2xl border border-border shadow-md">
                      <QRCodeCanvas value={qrData} size={220} level="M" includeMargin />
                    </div>

                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground">
                        {paymentMethodLabels[selectedMethod]} QR to'lovi
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Demo QR kod. To'lov simulyatsiyasi uchun quyidagi tugmani bosing.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedMethod(null)}
                        disabled={submitting}
                        className="flex-1 h-12 rounded-2xl"
                      >
                        Orqaga
                      </Button>
                      <Button
                        onClick={handleSimulateQrPayment}
                        disabled={submitting}
                        className="flex-[2] h-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-button"
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "To'lovni simulyatsiya qilish"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
