import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Single source of truth for authentication state.
// Tokens ya NO se almacenan en localStorage — viven en cookies httpOnly (seguro contra XSS).
// Solo se persiste la info del usuario para renderizar la UI sin esperar a /auth/me.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) =>
        set({ user, isAuthenticated: true }),

      setUser: (user) =>
        set({ user, isAuthenticated: true }),

      logout: () =>
        set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'sharkbyte-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
