import { Order } from '@/types/kiosk';

// Simple in-memory store for orders (persisted to localStorage)
const STORAGE_KEY = 'kiosk-orders';

export const getOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const orders = JSON.parse(stored);
      return orders.map((order: Order) => ({
        ...order,
        createdAt: new Date(order.createdAt),
      }));
    }
  } catch (e) {
    console.error('Failed to load orders:', e);
  }
  return [];
};

export const saveOrder = (order: Order): void => {
  try {
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Failed to save order:', e);
  }
};

export const updateOrderStatus = (orderId: string, status: Order['status']): void => {
  try {
    const orders = getOrders();
    const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update order:', e);
  }
};

export const clearOrders = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
