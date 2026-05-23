export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: Category;
  description?: string;
  available: boolean;
  ingredients?: string[];
  modelUrl?: string;
  hasAR?: boolean;
}

export type Category = string;

export interface CartItem extends MenuItem {
  quantity: number;
}

export type OrderType = 'dine-in' | 'take-out';

export type ServiceType = 'self-service' | 'waiter-service';

export type OrderStatus = 'new' | 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

export interface Order {
  id: string;
  orderNumber: number;
  items: CartItem[];
  total: number;
  subtotal: number;
  serviceFee: number;
  serviceType: ServiceType;
  createdAt: Date;
  status: OrderStatus;
  orderType: OrderType;
  tableNumber?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  shiftId?: string;
}

export type Language = 'uz' | 'en' | 'ru';

export type PaymentMethod = 'card' | 'nfc' | 'cash' | 'click' | 'payme' | 'uzum';

export type Screen = 'intro' | 'table-select' | 'menu' | 'checkout' | 'payment' | 'confirmation' | 'receipt' | 'tracking';
