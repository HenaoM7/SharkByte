import { create } from 'zustand'

let nextId = 0

export const useToastStore = create((set) => ({
  toasts: [],

  add(toast) {
    const id = ++nextId
    const entry = { id, type: 'info', duration: 4000, ...toast }
    set((s) => ({ toasts: [...s.toasts, entry] }))

    if (entry.duration > 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), entry.duration)
    }

    return id
  },

  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  clear() {
    set({ toasts: [] })
  },
}))
