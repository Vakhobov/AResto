import { useState, useCallback } from 'react';
import { Category, CartItem, MenuItem, Language, Screen, Order, PaymentMethod, OrderType, ServiceType } from '@/types/kiosk';
import { saveOrder } from '@/stores/orderStore';
import { menuItems } from '@/data/menuData';
import { CategorySidebar } from '@/components/kiosk/CategorySidebar';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { FoodItemCard } from '@/components/kiosk/FoodItemCard';
import { CartPanel } from '@/components/kiosk/CartPanel';
import { MobileCartDrawer } from '@/components/kiosk/MobileCartDrawer';
import { PaymentScreen } from '@/components/kiosk/PaymentScreen';
import { OrderConfirmation } from '@/components/kiosk/OrderConfirmation';
import { ReceiptScreen } from '@/components/kiosk/ReceiptScreen';
import { IntroScreen } from '@/components/kiosk/IntroScreen';
import { AnimatePresence, motion } from 'framer-motion';

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('tacos');
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [screen, setScreen] = useState<Screen>('intro');
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [serviceType, setServiceType] = useState<ServiceType>('self-service');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

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
    // Removed toast notification - silent add with animation only
  }, []);

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
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const serviceFee = serviceType === 'waiter-service' ? subtotal * 0.10 : 0;
    const total = subtotal + serviceFee;
    
    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber: Math.floor(100 + Math.random() * 900),
      items: [...cart],
      subtotal,
      serviceFee,
      total,
      serviceType,
      createdAt: new Date(),
      status: 'pending',
      orderType,
    };
    saveOrder(order);
    setCurrentOrder(order);
    setCart([]);
    setScreen('confirmation');
  }, [cart, orderType, serviceType]);

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setCurrentOrder(null);
    setScreen('intro');
    setActiveCategory('tacos');
    setServiceType('self-service');
  }, []);

  const handleSelectOrderType = useCallback((type: OrderType) => {
    setOrderType(type);
    setScreen('menu');
  }, []);

  const handleViewReceipt = useCallback(() => {
    setScreen('receipt');
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = serviceType === 'waiter-service' ? subtotal * 0.10 : 0;
  const total = subtotal + serviceFee;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AnimatePresence mode="wait">
        {screen === 'intro' && (
          <IntroScreen
            language={language}
            onLanguageChange={setLanguage}
            onSelectOrderType={handleSelectOrderType}
          />
        )}

        {screen === 'payment' && (
          <PaymentScreen
            items={cart}
            subtotal={subtotal}
            serviceFee={serviceFee}
            total={total}
            orderType={orderType}
            serviceType={serviceType}
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
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 pb-24 md:pb-6">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
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

          {/* Desktop Cart Panel */}
          <CartPanel
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
          />

          {/* Mobile Cart Drawer */}
          <MobileCartDrawer
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
          />
        </>
      )}
    </div>
  );
};

export default Index;
