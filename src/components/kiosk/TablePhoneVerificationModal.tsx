import { useState } from 'react';
import { Order } from '@/types/kiosk';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TablePhoneVerificationModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (order: Order) => void;
}

export function TablePhoneVerificationModal({ order, isOpen, onClose, onVerified }: TablePhoneVerificationModalProps) {
  const [last4Digits, setLast4Digits] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = () => {
    if (!order) return;

    setIsVerifying(true);
    setError('');

    // Simulate verification delay
    setTimeout(() => {
      if (last4Digits === order.phoneLast4) {
        onVerified(order);
        setLast4Digits('');
        setError('');
      } else {
        setError("Telefon raqamining oxirgi 4 raqami noto'g'ri. Qaytadan urinib ko'ring.");
      }
      setIsVerifying(false);
    }, 500);
  };

  const handleClose = () => {
    setLast4Digits('');
    setError('');
    onClose();
  };

  if (!order) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card rounded-3xl p-6 w-full max-w-md shadow-2xl border border-border">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Stol #{order.tableNumber}</h2>
                    <p className="text-sm text-muted-foreground">Buyurtma #{order.orderNumber}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Order Info */}
              <div className="bg-secondary/50 rounded-2xl p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Holat:</span>
                  <span className="text-foreground font-medium capitalize">{order.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jami:</span>
                  <span className="text-foreground font-medium">{order.total.toLocaleString()} so'm</span>
                </div>
              </div>

              {/* Verification Input */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Bu stolga faol buyurtma mavjud. Buyurtmaga qo'shish uchun telefon raqamining oxirgi 4 raqamini kiriting
                  </label>
                  <input
                    type="text"
                    value={last4Digits}
                    onChange={(e) => {
                      // Only allow numbers and max 4 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setLast4Digits(value);
                      setError('');
                    }}
                    placeholder="****"
                    maxLength={4}
                    className="w-full px-4 py-4 text-center text-2xl tracking-widest rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <Button
                  onClick={handleVerify}
                  disabled={last4Digits.length !== 4 || isVerifying}
                  className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-50 disabled:shadow-none"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Tasdiqlanmoqda...</span>
                    </div>
                  ) : (
                    'Tasdiqlash va davom etish'
                  )}
                </Button>
              </div>

              {/* Hint */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Xavfsizlik uchun faqat buyurtma egasi buyurtmani ko'ra oladi
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
