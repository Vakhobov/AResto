import { useState, useCallback, useEffect } from 'react';
import { Category, CartItem, MenuItem, Language, Screen, Order, PaymentMethod, OrderType, ServiceType } from '@/types/kiosk';
import { saveOrder, updateOrderPaymentStatus, getOrderById } from '@/stores/orderStore';
import { menuItems as fallbackMenuItems, categories as fallbackCategories } from '@/data/menuData';
import { subscribeToFoods } from '@/services/foodService';
import { subscribeToCategories } from '@/services/categoryService';
import { markTableOccupied } from '@/services/tableService';
import { Shift, subscribeToActiveShift } from '@/services/shiftService';
import { CategorySidebar } from '@/components/kiosk/CategorySidebar';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { FoodItemCard } from '@/components/kiosk/FoodItemCard';
import { CartPanel } from '@/components/kiosk/CartPanel';
import { MobileCartDrawer } from '@/components/kiosk/MobileCartDrawer';
import { PaymentScreen } from '@/components/kiosk/PaymentScreen';
import { OrderConfirmation } from '@/components/kiosk/OrderConfirmation';
import { ReceiptScreen } from '@/components/kiosk/ReceiptScreen';
import { OrderTrackingScreen } from '@/components/kiosk/OrderTrackingScreen';
import { IntroScreen } from '@/components/kiosk/IntroScreen';
import { FoodDetailModal } from '@/components/kiosk/FoodDetailModal';
import { TableNumberScreen } from '@/components/kiosk/TableNumberScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  // branchId MUST come from authenticated user profile
  const { userProfile, error: authError } = useAuth();
  const branchId = userProfile?.branchId;

  const [activeCategory, setActiveCategory] = useState<Category>('tacos');
  const [language, setLanguage]             = useState<Language>('en');
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [screen, setScreen]                 = useState<Screen>('intro');
  const [orderType, setOrderType]           = useState<OrderType>('dine-in');
  const [serviceType, setServiceType]       = useState<ServiceType>('self-service');
  const [currentOrder, setCurrentOrder]     = useState<Order | null>(null);
  const [selectedItem, setSelectedItem]     = useState<MenuItem | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<number | null>(null);
  const [tableNumber, setTableNumber]       = useState<number | null>(() => {
    const saved = localStorage.getItem('aresto-table-number');
    return saved ? Number(saved) : null;
  });
  const [creatingOrder, setCreatingOrder]   = useState(false);
  const [menuItems, setMenuItems]           = useState<MenuItem[]>(fallbackMenuItems);
  const [categories, setCategories]         = useState<Array<{ id: string; name: string; icon: string }>>([...fallbackCategories]);
  const [usingLocalMenu, setUsingLocalMenu] = useState(false);
  const [menuError, setMenuError]           = useState<string | null>(null);
  const [activeShift, setActiveShift]       = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading]     = useState(true);
  const [shiftError, setShiftError]         = useState<string | null>(null);
  const { toast } = useToast();

  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  // Subscribe to foods and categories for this branch
  useEffect(() => {
    if (!branchId) return;

    const unsubFoods = subscribeToFoods(
      branchId,
      foods => {
        if (foods.length === 0) {
          setMenuError('Ratsiondan ovqat topilmadi. Admin bilan bog\'laning.');
        } else {
          setMenuItems(foods);
          setMenuError(null);
        }
        setUsingLocalMenu(false);
      },
      err => {
        console.error('❌ Menu subscription failed:', err);
        setMenuError(
          err instanceof Error && err.message.includes('permission-denied')
            ? 'Sizda menyu ko\'rishga ruxsat yo\'q.'
            : 'Menyu yuklanmadi. Internet aloqasini tekshiring.'
        );
        setMenuItems([]);
        setUsingLocalMenu(false);
      },
    );

    const unsubCats = subscribeToCategories(
      branchId,
      cats => {
        if (cats.length > 0) {
          setCategories(cats.map(c => ({ id: c.id, name: c.name, icon: c.icon })));
        } else {
          setCategories([...fallbackCategories]);
        }
      },
      err => {
        console.error('Categories subscription failed:', err);
        setCategories([...fallbackCategories]);
      },
    );

    return () => { unsubFoods(); unsubCats(); };
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;

    setShiftLoading(true);
    setShiftError(null);
    const unsubscribe = subscribeToActiveShift(
      branchId,
      shift => {
        setActiveShift(shift);
        setShiftLoading(false);
        setShiftError(null);
      },
      err => {
        console.error('Shift subscription failed:', err);
        setActiveShift(null);
        setShiftLoading(false);
        setShiftError("Smena holatini tekshirib bo'lmadi.");
      },
    );

    return unsubscribe;
  }, [branchId]);

  useEffect(() => {
    if (tableNumber !== null) {
      localStorage.setItem('aresto-table-number', String(tableNumber));
    } else {
      localStorage.removeItem('aresto-table-number');
    }
  }, [tableNumber]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    if (shiftLoading || !activeShift) {
      toast({
        title: 'Buyurtma qabul qilinmaydi',
        description: shiftLoading ? 'Smena holati tekshirilmoqda.' : "Hozircha smena ochilmagan. Oshxona buyurtma qabul qilmaydi.",
        variant: 'destructive',
      });
      return;
    }
    setPendingOrderNumber(prev => prev ?? Math.floor(100 + Math.random() * 900));
    setScreen('payment');
  }, [activeShift, cart.length, shiftLoading, toast]);

  const handlePaymentComplete = useCallback(async (method: PaymentMethod) => {
    if (!branchId) {
      toast({ title: 'Xato', description: 'Filial topilmadi.', variant: 'destructive' });
      return;
    }
    if (orderType === 'dine-in' && !tableNumber) {
      toast({ title: 'Stol raqami kerak', description: 'Dine-in buyurtma uchun stol raqamini kiriting.', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Savat bo'sh", description: 'Iltimos, avval mahsulot tanlang.', variant: 'destructive' });
      return;
    }
    if (shiftLoading || !activeShift) {
      toast({
        title: 'Buyurtma qabul qilinmaydi',
        description: shiftLoading ? 'Smena holati tekshirilmoqda.' : "Hozircha smena ochilmagan. Oshxona buyurtma qabul qilmaydi.",
        variant: 'destructive',
      });
      return;
    }

    setCreatingOrder(true);
    const subtotal    = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const serviceFee  = serviceType === 'waiter-service' ? subtotal * 0.10 : 0;
    const total       = subtotal + serviceFee;
    const orderNumber = pendingOrderNumber ?? Math.floor(100 + Math.random() * 900);
    const paymentStatus = method === 'cash' ? 'unpaid' : 'paid';

    const order: Omit<Order, 'id'> = {
      orderNumber,
      items: cart.map(item => ({ ...item, quantity: Number(item.quantity ?? 1) })),
      subtotal,
      serviceFee,
      total,
      serviceType,
      createdAt: new Date(),
      status: 'new',
      orderType,
      paymentMethod: method,
      paymentStatus,
      ...(orderType === 'dine-in' && tableNumber ? { tableNumber } : {}),
    };

    try {
      let savedOrder: Order;
      if (currentOrder?.id && currentOrder.orderNumber === orderNumber) {
        await updateOrderPaymentStatus(branchId, currentOrder.id, paymentStatus);
        savedOrder = { ...currentOrder, paymentStatus };
      } else {
        savedOrder = await saveOrder(branchId, order);
      }

      setCurrentOrder(savedOrder);
      setCart([]);
      setPendingOrderNumber(null);
      setScreen('confirmation');

      if (orderType === 'dine-in' && tableNumber) {
        try {
          await markTableOccupied(branchId, tableNumber, savedOrder.id);
        } catch (tableError) {
          console.error('Failed to mark table occupied:', tableError);
        }
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({
        title: 'Buyurtma saqlanmadi',
        description: error instanceof Error ? error.message : "Firebase sozlamalarini tekshiring.",
        variant: 'destructive',
      });
    } finally {
      setCreatingOrder(false);
    }
  }, [activeShift, branchId, cart, currentOrder, orderType, pendingOrderNumber, serviceType, shiftLoading, tableNumber, toast]);

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setCurrentOrder(null);
    setScreen('intro');
    setActiveCategory('tacos');
    setServiceType('self-service');
    setPendingOrderNumber(null);
    setTableNumber(null);
    localStorage.removeItem('aresto-table-number');
  }, []);

  const handleSelectOrderType = useCallback((type: OrderType) => {
    setOrderType(type);
    if (type === 'dine-in') {
      setScreen('table-select');
    } else {
      setTableNumber(null);
      localStorage.removeItem('aresto-table-number');
      setServiceType('self-service');
      setScreen('menu');
    }
  }, []);

  const handleTableNumberConfirm = useCallback((num: number) => {
    setTableNumber(num);
    setScreen('menu');
  }, []);

  const handleTrackOrder = useCallback(async () => {
    if (currentOrder && branchId) {
      setCurrentOrder(await getOrderById(branchId, currentOrder.id) ?? currentOrder);
    }
    setScreen('tracking');
  }, [currentOrder, branchId]);

  const subtotal   = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = serviceType === 'waiter-service' ? subtotal * 0.10 : 0;
  const total      = subtotal + serviceFee;
  const orderingDisabled = shiftLoading || !activeShift;
  const orderingDisabledMessage = shiftLoading
    ? 'Smena holati tekshirilmoqda...'
    : shiftError ?? "Smena yopiq. Oshxona hozir buyurtma qabul qilmaydi.";

  if (!branchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Filial Tanlanmagan</h1>
          <p className="text-muted-foreground mb-4">{authError || 'Foydalanuvchi filialga bog\'lanmagan. Admin bilan bog\'laning.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <AnimatePresence mode="wait">
        {screen === 'intro' && (
          <IntroScreen language={language} onLanguageChange={setLanguage} onSelectOrderType={handleSelectOrderType} />
        )}
        {screen === 'table-select' && (
          <TableNumberScreen branchId={branchId} language={language} onConfirm={handleTableNumberConfirm} onBack={() => setScreen('intro')} />
        )}
        {screen === 'payment' && (
          <PaymentScreen
            items={cart}
            subtotal={subtotal}
            serviceFee={serviceFee}
            total={total}
            orderType={orderType}
            serviceType={serviceType}
            tableNumber={tableNumber}
            orderNumber={pendingOrderNumber ?? 0}
            onBack={() => setScreen('menu')}
            onPaymentComplete={handlePaymentComplete}
            loading={creatingOrder}
          />
        )}
        {screen === 'confirmation' && currentOrder && (
          <OrderConfirmation
            order={currentOrder}
            onNewOrder={handleNewOrder}
            onViewReceipt={() => setScreen('receipt')}
            onTrackOrder={handleTrackOrder}
          />
        )}
        {screen === 'tracking' && currentOrder && (
          <OrderTrackingScreen
            order={currentOrder}
            branchId={branchId}
            onBack={() => {
              if (branchId) {
                getOrderById(branchId, currentOrder.id).then(o => setCurrentOrder(o ?? currentOrder));
              }
              setScreen('confirmation');
            }}
            onNewOrder={handleNewOrder}
          />
        )}
        {screen === 'receipt' && currentOrder && (
          <ReceiptScreen order={currentOrder} onBack={() => setScreen('confirmation')} onNewOrder={handleNewOrder} />
        )}
      </AnimatePresence>

      {screen === 'menu' && (
        <>
          {orderingDisabled && (
            <div className="w-full p-4 mx-auto border-b border-border bg-destructive/10 text-sm text-destructive">
              <div className="max-w-7xl mx-auto">
                {orderingDisabledMessage}
              </div>
            </div>
          )}
          {(usingLocalMenu || menuError) && (
            <div className="w-full p-4 mx-auto mb-4 rounded-3xl bg-secondary/40 border border-border text-sm text-foreground max-w-7xl">
              <p>{menuError ?? "Firestore menyu bo'sh. Lokal demo menyu ishlatilmoqda."}</p>
            </div>
          )}
          <CategorySidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} categories={categories} />
          <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <KioskHeader language={language} onLanguageChange={setLanguage} />
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 lg:p-6 pb-24 lg:pb-6">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4"
              >
                {filteredItems.map((item, index) => (
                  <FoodItemCard key={item.id} item={item} onAddToCart={addToCart} onViewDetails={setSelectedItem} index={index} />
                ))}
              </motion.div>
            </div>
          </main>
          <CartPanel
            items={cart}
            orderType={orderType}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            checkoutDisabled={orderingDisabled}
            disabledMessage={orderingDisabledMessage}
          />
          <MobileCartDrawer
            items={cart}
            orderType={orderType}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            checkoutDisabled={orderingDisabled}
            disabledMessage={orderingDisabledMessage}
          />
        </>
      )}

      <FoodDetailModal item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} />
    </div>
  );
};

export default Index;
