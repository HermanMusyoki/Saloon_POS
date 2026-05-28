import { create } from 'zustand'
import type { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  customerId: number | null
  employeeId: number | null
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateDiscount: (id: string, discount: number) => void
  setCustomer: (id: number | null) => void
  setEmployee: (id: number | null) => void
  clearCart: () => void
  totals: () => { subtotal: number; discount: number; tax: number; total: number }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  employeeId: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, item] }
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    })),

  updateDiscount: (id, discount) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, discount_amount: discount } : i)),
    })),

  setCustomer: (id) => set({ customerId: id }),
  setEmployee: (id) => set({ employeeId: id }),

  clearCart: () => set({ items: [], customerId: null, employeeId: null }),

  totals: () => {
    const { items } = get()
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const discount = items.reduce((sum, i) => sum + i.discount_amount * i.quantity, 0)
    const taxable = subtotal - discount
    const tax = 0 // configure tax rate as needed
    return { subtotal, discount, tax, total: taxable + tax }
  },
}))
