import { CartItem, ServiceType } from '@/types/kiosk';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingCart, User, ConciergeBell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';

interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  serviceType: ServiceType;
  onServiceTypeChange: (type: ServiceType) => void;
}

const serviceTranslations = {
  selfService: {
    label: "O'z-o'ziga xizmat",
    description: "Xizmat haqisiz",
  },
  waiterService: {
    label: "Ofitsiant xizmati", 
    description: "+10% xizmat haqi",
  },
};

export function CartPanel({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  serviceType,
  onServiceTypeChange,
}: CartPanelProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = serviceType === 'waiter-service' ? subtotal * 0.10 : 0;
  const total = subtotal + serviceFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="hidden md:flex w-80 min-h-screen bg-secondary/30 backdrop-blur-sm border-l border-border flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Buyurtmangiz</h2>
            <p className="text-sm text-muted-foreground">{itemCount} ta mahsulot</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-48 text-center"
            >
              <ShoppingCart className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">Savat bo'sh</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Mahsulotlarni qo'shish uchun bosing</p>
            </motion.div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card rounded-2xl p-3 border border-border"
              >
                <div className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-primary font-semibold text-sm mt-1">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (item.quantity === 1) {
                            onRemoveItem(item.id);
                          } else {
                            onUpdateQuantity(item.id, item.quantity - 1);
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4 text-foreground" />
                        )}
                      </motion.button>
                      
                      <span className="w-8 text-center font-semibold text-foreground">
                        {item.quantity}
                      </span>
                      
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Service Type Selection */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-3">Xizmat turi</p>
          <div className="space-y-2">
            <button
              onClick={() => onServiceTypeChange('self-service')}
              className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                serviceType === 'self-service'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <User className={`w-5 h-5 ${serviceType === 'self-service' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{serviceTranslations.selfService.label}</p>
                <p className="text-xs text-muted-foreground">{serviceTranslations.selfService.description}</p>
              </div>
            </button>
            <button
              onClick={() => onServiceTypeChange('waiter-service')}
              className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                serviceType === 'waiter-service'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <ConciergeBell className={`w-5 h-5 ${serviceType === 'waiter-service' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{serviceTranslations.waiterService.label}</p>
                <p className="text-xs text-muted-foreground">{serviceTranslations.waiterService.description}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Checkout */}
      <div className="p-4 border-t border-border bg-background/50 space-y-2">
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
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-muted-foreground">Jami</span>
          <span className="text-2xl font-bold text-foreground">{formatPrice(total)}</span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-50 disabled:shadow-none"
        >
          Buyurtma berish
        </Button>
      </div>
    </aside>
  );
}
