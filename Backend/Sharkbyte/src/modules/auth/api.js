import api from '../../shared/api/client'

export const authApi = {
  register: (data) =>
    api.post('/auth/register', data).then((r) => r.data),

  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  // Refresh usa la cookie refresh_token automáticamente (withCredentials=true en el cliente)
  refresh: () =>
    api.post('/auth/refresh', {}).then((r) => r.data),

  logout: () =>
    api.post('/auth/logout', {}).then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
}
