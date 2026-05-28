import { useToastStore } from '../store/toastStore'

export function useToast() {
  const add = useToastStore((s) => s.add)

  return {
    success: (message, opts) => add({ type: 'success', message, ...opts }),
    error: (message, opts) => add({ type: 'error', message, duration: 6000, ...opts }),
    warning: (message, opts) => add({ type: 'warning', message, ...opts }),
    info: (message, opts) => add({ type: 'info', message, ...opts }),
  }
}
