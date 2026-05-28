import { useState } from 'react'
import { useAuthStore } from './store'
import { authApi } from './api'

// Core auth state — components use this to read user/isAuthenticated
export const useAuth = () => useAuthStore()

// Login mutation with loading/error state
export const useLogin = () => {
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.login(email, password)
      // Tokens en cookies httpOnly — solo guardamos info del usuario en Zustand
      setAuth(data.user)
      return data
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Credenciales incorrectas'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { login, loading, error, clearError: () => setError(null) }
}

// Register mutation — creates Tenant + User and auto-logs in
export const useRegister = () => {
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const register = async (data) => {
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.register(data)
      // Tokens en cookies httpOnly — solo guardamos info del usuario en Zustand
      setAuth(result.user)
      return result
    } catch (err) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Error al crear la cuenta')
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { register, loading, error, clearError: () => setError(null) }
}

// Logout — limpia cookies en backend + estado local
export const useLogout = () => {
  const { logout } = useAuthStore()
  return async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignorar errores de red — siempre limpiar estado local
    } finally {
      logout()
    }
  }
}

export const useForgotPassword = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const forgotPassword = async (email) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await authApi.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al enviar el email'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { forgotPassword, loading, error, success, clearError: () => setError(null) }
}

export const useResetPassword = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const resetPassword = async (token, newPassword) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await authApi.resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Token inválido o expirado'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { resetPassword, loading, error, success, clearError: () => setError(null) }
}

export const useChangePassword = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true)
    setError(null)
    try {
      await authApi.changePassword(currentPassword, newPassword)
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al cambiar la contraseña'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { changePassword, loading, error, clearError: () => setError(null) }
}
