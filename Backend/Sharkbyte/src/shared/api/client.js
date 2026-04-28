import axios from 'axios'

// Lazy getter — avoids circular dependency with modules/auth/store.js
// Initialize in app/providers.jsx via: initApiClient(() => useAuthStore.getState())
let _getAuthState = () => ({ logout: () => {} })

export const initApiClient = (getter) => {
  _getAuthState = getter
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
  withCredentials: true, // Envía cookies httpOnly en cada request (tokens seguros)
})

// Normalize error: convert Axios errors into typed AppError objects
export function parseApiError(err) {
  if (!err.response) {
    return {
      type: 'network',
      status: null,
      message: 'Sin conexión con el servidor. Verifica tu red.',
    }
  }

  const { status, data } = err.response
  const serverMessage = data?.message ?? null

  if (status === 400) {
    const detail = Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage
    return { type: 'validation', status, message: detail ?? 'Datos inválidos.' }
  }
  if (status === 401) return { type: 'unauthorized', status, message: 'Sesión expirada. Inicia sesión nuevamente.' }
  if (status === 403) return { type: 'forbidden', status, message: 'No tienes permisos para realizar esta acción.' }
  if (status === 404) return { type: 'not_found', status, message: serverMessage ?? 'Recurso no encontrado.' }
  if (status === 409) return { type: 'conflict', status, message: serverMessage ?? 'El recurso ya existe.' }
  if (status === 429) return { type: 'rate_limit', status, message: 'Límite de uso alcanzado. Actualiza tu plan.' }
  if (status >= 500) return { type: 'server', status, message: 'Error interno del servidor. Intenta más tarde.' }

  return { type: 'unknown', status, message: serverMessage ?? `Error ${status}.` }
}

// 401 → renovar via cookie refresh_token (sin body). Si falla → logout
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const { logout } = _getAuthState()
      try {
        // El backend lee refresh_token de la cookie httpOnly automáticamente
        await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        // Reintentar el request original — la nueva access_token cookie ya fue seteada
        return api(original)
      } catch {
        logout()
        // Limpiar cookies en el backend
        axios.post(
          `${import.meta.env.VITE_API_URL}/auth/logout`,
          {},
          { withCredentials: true }
        ).catch(() => {})
      }
    }
    return Promise.reject(err)
  }
)

export default api
