import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../modules/auth/store'

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

// Activity events that reset the inactivity timer
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

export function useInactivityLogout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const reset = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logout()
      }, INACTIVITY_MS)
    }

    // Start the timer immediately
    reset()

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }))

    return () => {
      clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [isAuthenticated, logout])
}
