import { CartItem } from '@/types/kiosk';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export function CartPanel({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartPanelProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="w-80 min-h-screen bg-secondary/30 backdrop-blur-sm border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Order</h2>
            <p className="text-sm text-muted-foreground">{itemCount} items</p>
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
              <p className="text-muted-foreground text-sm">Your cart is empty</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Tap items to add them</p>
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
                      ${(item.price * item.quantity).toFixed(2)}
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

      {/* Checkout */}
      <div className="p-4 border-t border-border bg-background/50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-foreground">${total.toFixed(2)}</span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-50 disabled:shadow-none"
        >
          Checkout
        </Button>
      </div>
    </aside>
  );
}
