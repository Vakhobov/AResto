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

export interface Order {
  id: string;
  orderNumber: number;
  items: CartItem[];
  total: number;
  createdAt: Date;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
}

export type Language = 'uz' | 'en' | 'ru';

export type PaymentMethod = 'card' | 'nfc' | 'cash';

export type Screen = 'menu' | 'checkout' | 'payment' | 'confirmation' | 'receipt';
