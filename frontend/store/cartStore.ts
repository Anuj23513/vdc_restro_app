import { create } from 'zustand';
import { CartItem } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string, size?: string) => void;
  updateQuantity: (itemId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  loadCart: () => Promise<void>;
}

const CART_STORAGE_KEY = 'vdc_cart';

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,

  addItem: (item) => {
    const items = [...get().items];
    const existingIndex = items.findIndex(
      (i) => i.id === item.id && i.selectedSize === item.selectedSize
    );

    if (existingIndex >= 0) {
      items[existingIndex].quantity += item.quantity;
    } else {
      items.push(item);
    }

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.selectedPrice * i.quantity, 0);

    set({ items, totalItems, totalPrice });
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  },

  removeItem: (itemId, size) => {
    const items = get().items.filter(
      (i) => !(i.id === itemId && i.selectedSize === size)
    );

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.selectedPrice * i.quantity, 0);

    set({ items, totalItems, totalPrice });
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  },

  updateQuantity: (itemId, quantity, size) => {
    const items = [...get().items];
    const index = items.findIndex(
      (i) => i.id === itemId && i.selectedSize === size
    );

    if (index >= 0) {
      if (quantity <= 0) {
        items.splice(index, 1);
      } else {
        items[index].quantity = quantity;
      }
    }

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.selectedPrice * i.quantity, 0);

    set({ items, totalItems, totalPrice });
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  },

  clearCart: () => {
    set({ items: [], totalItems: 0, totalPrice: 0 });
    AsyncStorage.removeItem(CART_STORAGE_KEY);
  },

  loadCart: async () => {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        const items = JSON.parse(cartData);
        const totalItems = items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);
        const totalPrice = items.reduce((sum: number, i: CartItem) => sum + i.selectedPrice * i.quantity, 0);
        set({ items, totalItems, totalPrice });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  },
}));