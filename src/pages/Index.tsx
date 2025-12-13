import { useState, useCallback } from 'react';
import { Category, CartItem, MenuItem, Language, Screen, Order, PaymentMethod } from '@/types/kiosk';
import { saveOrder } from '@/stores/orderStore';
import { menuItems } from '@/data/menuData';
import { CategorySidebar } from '@/components/kiosk/CategorySidebar';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { FoodItemCard } from '@/components/kiosk/FoodItemCard';
import { CartPanel } from '@/components/kiosk/CartPanel';
import { PaymentScreen } from '@/components/kiosk/PaymentScreen';
import { OrderConfirmation } from '@/components/kiosk/OrderConfirmation';
import { ReceiptScreen } from '@/components/kiosk/ReceiptScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('tacos');
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [screen, setScreen] = useState<Screen>('menu');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your order`,
      duration: 1500,
    });
  }, [toast]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    setScreen('payment');
  }, [cart.length]);

  const handlePaymentComplete = useCallback((method: PaymentMethod) => {
    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber: Math.floor(100 + Math.random() * 900),
      items: [...cart],
      total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      createdAt: new Date(),
      status: 'pending',
    };
    saveOrder(order);
    setCurrentOrder(order);
    setCart([]);
    setScreen('confirmation');
  }, [cart]);

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setCurrentOrder(null);
    setScreen('menu');
    setActiveCategory('tacos');
  }, []);

  const handleViewReceipt = useCallback(() => {
    setScreen('receipt');
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence mode="wait">
        {screen === 'payment' && (
          <PaymentScreen
            items={cart}
            total={total}
            onBack={() => setScreen('menu')}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {screen === 'confirmation' && currentOrder && (
          <OrderConfirmation
            order={currentOrder}
            onNewOrder={handleNewOrder}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {screen === 'receipt' && currentOrder && (
          <ReceiptScreen
            order={currentOrder}
            onBack={() => setScreen('confirmation')}
            onNewOrder={handleNewOrder}
          />
        )}
      </AnimatePresence>

      {screen === 'menu' && (
        <>
          {/* Category Sidebar */}
          <CategorySidebar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <KioskHeader
              language={language}
              onLanguageChange={setLanguage}
            />

            {/* Food Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredItems.map((item, index) => (
                  <FoodItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={addToCart}
                    index={index}
                  />
                ))}
              </motion.div>
            </div>
          </main>

          {/* Cart Panel */}
          <CartPanel
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
          />
        </>
      )}
    </div>
  );
};

export default Index;
