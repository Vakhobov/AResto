export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: Category;
  description?: string;
  available: boolean;
}

export type Category = 'tacos' | 'burgers' | 'crepes' | 'drinks' | 'desserts' | 'chicken';

export interface CartItem extends MenuItem {
  quantity: number;
}

export type OrderType = 'dine-in' | 'take-out';

export type ServiceType = 'self-service' | 'waiter-service';

export interface Order {
  id: string;
  orderNumber: number;
  items: CartItem[];
  total: number;
  subtotal: number;
  serviceFee: number;
  serviceType: ServiceType;
  createdAt: Date;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  orderType: OrderType;
}

export type Language = 'uz' | 'en' | 'ru';

export type PaymentMethod = 'card' | 'nfc' | 'cash';

export type Screen = 'intro' | 'menu' | 'checkout' | 'payment' | 'confirmation' | 'receipt';
