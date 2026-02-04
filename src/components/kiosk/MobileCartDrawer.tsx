import { CartItem, ServiceType } from '@/types/kiosk';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingCart, X, User, ConciergeBell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';

interface MobileCartDrawerProps {
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

export function MobileCartDrawer({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  serviceType,
  onServiceTypeChange,
}: MobileCartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = serviceType === 'waiter-service' ? subtotal * 0.10 : 0;
  const total = subtotal + serviceFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 left-4 h-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-button flex items-center justify-between px-6 z-40 md:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-background text-primary text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="font-semibold">Savat</span>
          </div>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-primary" />
              Sizning buyurtmangiz
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[40vh]">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground text-sm">Savat bo'sh</p>
              </div>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onServiceTypeChange('self-service')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  serviceType === 'self-service'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <User className={`w-5 h-5 mx-auto mb-1 ${serviceType === 'self-service' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">{serviceTranslations.selfService.label}</p>
                <p className="text-xs text-muted-foreground">{serviceTranslations.selfService.description}</p>
              </button>
              <button
                onClick={() => onServiceTypeChange('waiter-service')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  serviceType === 'waiter-service'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <ConciergeBell className={`w-5 h-5 mx-auto mb-1 ${serviceType === 'waiter-service' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">{serviceTranslations.waiterService.label}</p>
                <p className="text-xs text-muted-foreground">{serviceTranslations.waiterService.description}</p>
              </button>
            </div>
          </div>
        )}

        {/* Totals & Checkout */}
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
            <span className="text-muted-foreground font-medium">Jami</span>
            <span className="text-2xl font-bold text-foreground">{formatPrice(total)}</span>
          </div>
          <DrawerClose asChild>
            <Button
              onClick={onCheckout}
              disabled={items.length === 0}
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-50 disabled:shadow-none mt-2"
            >
              Buyurtma berish
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
