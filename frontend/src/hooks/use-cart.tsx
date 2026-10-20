import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  image: string;
  minQuantity?: number;
}

interface CartStore {
  items: CartItem[];
  userId: number | null;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
  setUserId: (id: number | null) => void;
  total: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      addItem: (newItem) => set((state) => {
        const existing = state.items.find((i) => i.variantId === newItem.variantId);
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.variantId === newItem.variantId
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            ),
          };
        }
        return { items: [...state.items, newItem] };
      }),
      removeItem: (variantId) => set((state) => ({
        items: state.items.filter((i) => i.variantId !== variantId),
      })),
      updateQuantity: (variantId, quantity) => set((state) => ({
        items: state.items.map((i) =>
          i.variantId === variantId ? { ...i, quantity } : i
        ),
      })),
      clearCart: () => set({ items: [] }),
      setUserId: (id) => {
        const current = get();
        if (current.userId !== id) {
          set({ items: [], userId: id });
        }
      },
      total: () => get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    }),
    {
      name: 'cashplug-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
