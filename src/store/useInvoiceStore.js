import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useInvoiceStore = create(
  persist(
    (set) => ({
      invoiceType: 'sale',
      selectedParty: '',
      items: [],

      setInvoiceType: (type) => set({ invoiceType: type, items: [], selectedParty: '' }),
      setSelectedParty: (partyId) => set({ selectedParty: partyId }),

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.product_id === item.product_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      updateQuantity: (productId, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product_id === productId ? { ...i, quantity: qty } : i
          ),
        })),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        })),

      clearCart: () => set({ items: [], selectedParty: '' }),
    }),
    {
      name: 'invoice-cart-storage',
    }
  )
);
