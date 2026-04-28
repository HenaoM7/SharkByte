import api from '../../shared/api/client'

export const usersApi = {
  getAll: (params = {}) =>
    api.get('/api/v1/users', { params }).then((r) => r.data),

  create: (data) =>
    api.post('/api/v1/users', data).then((r) => r.data),

  update: (id, data) =>
    api.patch(`/api/v1/users/${id}`, data).then((r) => r.data),

  deactivate: (id) =>
    api.patch(`/api/v1/users/${id}/deactivate`).then((r) => r.data),

  activate: (id) =>
    api.patch(`/api/v1/users/${id}/activate`).then((r) => r.data),
}
