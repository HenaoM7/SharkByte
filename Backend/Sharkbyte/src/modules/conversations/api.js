import client from '../../shared/api/client'

export const conversationsApi = {
  getConversations: (tenantId, params = {}) =>
    client.get('/api/v1/conversations', { params: { tenantId, ...params } }),

  getMessages: (conversationId, params = {}) =>
    client.get(`/api/v1/conversations/${conversationId}/messages`, { params }),

  updateStatus: (id, status, tenantId) =>
    client.patch(`/api/v1/conversations/${id}/status`, { status }, { params: { tenantId } }),

  updateCategory: (id, category, tenantId) =>
    client.patch(`/api/v1/conversations/${id}/category`, { category }, { params: { tenantId } }),
}
