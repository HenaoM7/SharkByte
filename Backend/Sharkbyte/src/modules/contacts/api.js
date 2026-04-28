import client from '../../shared/api/client'

export const contactsApi = {
  getAll: (tenantId, params = {}) =>
    client.get('/api/v1/contacts', { params: { tenantId, ...params } }),

  getOne: (id, tenantId) =>
    client.get(`/api/v1/contacts/${id}`, { params: { tenantId } }),

  create: (data) =>
    client.post('/api/v1/contacts', data),

  update: (id, data) =>
    client.patch(`/api/v1/contacts/${id}`, data),

  remove: (id) =>
    client.delete(`/api/v1/contacts/${id}`),
}
