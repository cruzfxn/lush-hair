import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  cartId: string | null;
  token: string | null;
  customerName: string | null;
  lastOrder: OrderConfirmation | null;
  setCartId: (cartId: string | null) => void;
  setAuth: (token: string, customerName: string) => void;
  clearAuth: () => void;
  setLastOrder: (order: OrderConfirmation) => void;
}

export interface OrderConfirmation {
  id: string;
  total: number;
  items: Array<{
    id: number;
    name: string;
    selectedOptions: Record<string, string>;
    selectedColour: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cartId: null,
      token: null,
      customerName: null,
      lastOrder: null,
      setCartId: (cartId) => set({ cartId }),
      setAuth: (token, customerName) => set({ token, customerName }),
      clearAuth: () => set({ token: null, customerName: null, cartId: null }),
      setLastOrder: (lastOrder) => set({ lastOrder }),
    }),
    { name: 'hair-store-cart' },
  ),
);
